/**
 * @fileoverview Review orchestrator module.
 *
 * This module is responsible for coordinating the review process,
 * selecting the appropriate API client, and managing the review workflow.
 */

import * as path from 'node:path';
import { runApiConnectionTests } from '../__tests__/apiConnection.test';
import { listModelConfigs, listModels } from '../clients/utils/modelLister';
import type { ProgrammingLanguage } from '../types/common';
import type { ReviewOptions } from '../types/review';
import { getApiKeyType } from '../utils/api/apiUtils';
import { getConfig } from '../utils/config';
import configManager from '../utils/configManager';
import { createDirectory } from '../utils/fileSystem';
import logger from '../utils/logger';
import { readProjectDocs } from '../utils/projectDocs';
// Import other dependencies
import { selectApiClient } from './ApiClientSelector';
import { performEstimation } from './handlers/EstimationHandler';
// Import handlers
import { discoverFilesForReview, readFilesForReview } from './handlers/FileProcessingHandler';
import { createOutputDirectory, handleReviewOutput } from './handlers/OutputHandler';
import { executeReview } from './handlers/ReviewExecutor';
import { performSemanticAnalysis } from './handlers/SemanticAnalysisHandler';

/**
 * Validate review options and target path
 * @param target Target path for review
 * @param options Review options
 * @returns Effective target path (with default applied)
 */
function validateOptions(target: string, options: ReviewOptions): string {
  if (options === undefined) {
    throw new Error('Review options object must be provided');
  }

  if (!options.type) {
    throw new Error('Review type must be specified in options');
  }

  // Ensure target is defined with a default of "." for current directory
  const effectiveTarget = target || '.';

  // Log if we're using the default target
  if (!target || target.trim() === '') {
    logger.info('No target path provided, defaulting to current directory (".")');
  }

  // Add debug information if debug mode is enabled
  if (options.debug) {
    logger.debug(`[ORCHESTRATOR] Effective target: "${effectiveTarget}"`);
    logger.debug(`[ORCHESTRATOR] Review type: "${options.type}"`);
    logger.debug(`Review options: ${JSON.stringify(options, null, 2)}`);
    logger.debug(
      `Target path: ${effectiveTarget}${!target || target.trim() === '' ? ' (defaulted to ".")' : ''}`,
    );
    logger.debug(`Selected model: ${process.env.AI_CODE_REVIEW_MODEL || 'not set'}`);
    logger.debug(`API key type: ${getApiKeyType() || 'None'}`);
  }

  return effectiveTarget;
}

/**
 * Handle model listing operations (--listmodels, --models flags)
 * @param options Review options
 * @returns true if a listing was performed (should exit), false otherwise
 */
function handleModelListing(options: ReviewOptions): boolean {
  if (options.listmodels) {
    logger.info('Listing available models based on configured API keys...');
    listModels(false); // Show all models, not just available ones
    return true;
  }

  if (options.models) {
    logger.info('Listing all supported models and their configuration names...');
    listModelConfigs();
    return true;
  }

  return false;
}

/**
 * Detect project language and framework
 * @param projectPath Path to the project
 * @param options Review options (will be modified with detected language/framework)
 * @returns Framework detection result or null
 */
async function detectProjectFramework(projectPath: string, options: ReviewOptions): Promise<any> {
  if (options.language) {
    return null; // Language already specified
  }

  try {
    const { detectFramework } = await import('../utils/detection');
    const result = await detectFramework(projectPath);

    if (!result) {
      return null;
    }

    options.language = result.language as ProgrammingLanguage;
    options.framework = result.framework;

    // Log framework detection results
    if (result.framework !== 'none' && result.confidence > 0.6) {
      logger.info(
        `Detected language: ${result.language}, framework: ${result.framework} (confidence: ${result.confidence.toFixed(2)})`,
      );

      if (result.frameworkVersion) {
        logger.info(`Framework version: ${result.frameworkVersion}`);
      }

      if (result.additionalFrameworks?.length && result.additionalFrameworks.length > 0) {
        logger.info(`Additional frameworks detected: ${result.additionalFrameworks.join(', ')}`);
      }

      logCssFrameworks(result.cssFrameworks);
    } else {
      logger.info(`Detected language: ${result.language}, no specific framework detected`);
      logCssFrameworks(result.cssFrameworks);
    }

    return result;
  } catch (error) {
    logger.debug(
      `Error detecting language/framework: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Log CSS frameworks if detected
 * @param cssFrameworks Array of CSS framework info
 */
function logCssFrameworks(cssFrameworks?: Array<{ name: string; version?: string }>): void {
  if (cssFrameworks?.length && cssFrameworks.length > 0) {
    const cssFrameworksStr = cssFrameworks
      .map((cf) => (cf.version ? `${cf.name} (${cf.version})` : cf.name))
      .join(', ');
    logger.info(`CSS frameworks detected: ${cssFrameworksStr}`);
  }
}

/**
 * Perform token analysis if needed
 * @param fileInfos Files to analyze
 * @param options Review options
 * @param apiClientConfig API client configuration
 * @returns Token analysis result or null
 */
async function performTokenAnalysisIfNeeded(
  fileInfos: any[],
  options: ReviewOptions,
  apiClientConfig: any,
): Promise<any> {
  if (options.multiPass) {
    return null; // Skip token analysis in multi-pass mode
  }

  try {
    logger.info('Analyzing token usage to determine review strategy...');

    const { TokenAnalyzer } = await import('../analysis/tokens');

    const tokenAnalysisOptions = {
      reviewType: options.type,
      modelName: apiClientConfig.modelName,
      contextMaintenanceFactor: options.contextMaintenanceFactor || 0.15,
      forceSinglePass: options.forceSinglePass,
      batchTokenLimit: options.batchTokenLimit,
    };

    // Log if forceSinglePass is enabled
    if (options.forceSinglePass) {
      logger.info(
        'Force single-pass mode is enabled. This will override the chunking recommendation.',
      );
      logger.info(
        "Note: This may result in token limit errors if the content exceeds the model's context window.",
      );

      // Special note for Gemini models
      if (
        apiClientConfig.modelName.includes('gemini-1.5') ||
        apiClientConfig.modelName.includes('gemini-2.')
      ) {
        const version = apiClientConfig.modelName.includes('gemini-2.') ? '2.x' : '1.5';
        logger.info(
          `Using Gemini ${version} model with 1,048,576 token context window in single-pass mode.`,
        );
      }
    }

    const tokenAnalysis = TokenAnalyzer.analyzeFiles(fileInfos, tokenAnalysisOptions);

    // Try semantic chunking for intelligent code analysis
    await performSemanticAnalysis(fileInfos, options);

    return tokenAnalysis;
  } catch (error) {
    logger.warn(
      `Token analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    logger.info('Proceeding with review without token analysis');
    return null;
  }
}

/**
 * Orchestrate the code review process
 *
 * This function is the main entry point for the code review process. It coordinates
 * the entire review workflow, including:
 * - Validating inputs and environment variables
 * - Selecting the appropriate API client based on available API keys
 * - Discovering files to review
 * - Handling different review types (consolidated, individual, architectural)
 * - Managing output directories and file generation
 * - Supporting interactive mode for real-time feedback
 *
 * @param target Path to the file or directory to review
 * @param options Review options including type, output format, and interactive mode
 * @throws Error if the review process fails for any reason
 */
export async function orchestrateReview(target: string, options: ReviewOptions): Promise<void> {
  // Initialize configuration
  getConfig();
  try {
    // Validate input parameters
    const effectiveTarget = validateOptions(target, options);

    // Handle model listing operations
    if (handleModelListing(options)) {
      return; // Exit after listing models
    }

    // Test API connections if requested
    if (options.testApi) {
      logger.info('Testing API connections before starting review...');
      await runApiConnectionTests();
      logger.info('API connection tests completed. Proceeding with review...');
    }

    // Log the review type
    if (options.type === 'architectural') {
      logger.info(`Starting architectural review for ${effectiveTarget}...`);
    } else if (options.type === 'coding-test') {
      logger.info(`Starting coding test evaluation for ${effectiveTarget}...`);
    } else if (options.type === 'extract-patterns') {
      logger.info(`Starting pattern extraction for ${effectiveTarget}...`);
    } else if (options.type === 'unused-code') {
      logger.info(`Starting unused code review for ${effectiveTarget}...`);
    } else {
      logger.info(`Starting ${options.type} review for ${effectiveTarget}...`);
    }

    // Determine the project path
    const projectPath = process.cwd();
    const projectName = path.basename(projectPath);

    // Create output directory using the centralized function
    const configOutputDir = configManager.getPathsConfig().outputDir;
    const outputBaseDir = createOutputDirectory(projectPath, {
      outputDir: options.outputDir,
      configOutputDir: configOutputDir,
    });

    // Create the directory
    await createDirectory(outputBaseDir);

    // Log project information
    logger.info(`Project: ${projectName}`);
    logger.info(`Project path: ${projectPath}`);

    // Detect language and framework
    const _frameworkDetectionResult = await detectProjectFramework(projectPath, options);

    // Discover files to review
    const filesToReview = await discoverFilesForReview(effectiveTarget, projectPath, options);

    if (filesToReview.length === 0) {
      return; // No files to review, exit early
    }

    // If estimate flag is set, calculate and display token usage and cost estimates
    if (options.estimate) {
      // Get the model name from config (which includes project config overrides)
      const config = getConfig();
      const modelName = config.selectedModel;

      try {
        // Read file contents for token analysis
        const { fileInfos, errors } = await readFilesForReview(filesToReview, projectPath);

        // If we have errors reading files, report them but continue
        if (errors.length > 0) {
          console.warn(`Warning: Failed to read ${errors.length} file(s):`);
          for (const error of errors) {
            console.warn(`  - ${error.path}: ${error.error}`);
          }
        }

        // Ensure we have at least some files to analyze
        if (fileInfos.length === 0) {
          throw new Error(
            'No files could be read for review. Please check file permissions and paths.',
          );
        }

        // Perform estimation
        await performEstimation(fileInfos, filesToReview, options, modelName);
      } catch (error) {
        logger.error(
          `Estimation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return; // Exit after displaying the estimation
    }

    // Read file contents
    const { fileInfos } = await readFilesForReview(filesToReview, projectPath);

    // Read project documentation if enabled
    let projectDocs = null;
    if (options.includeProjectDocs) {
      logger.info('Reading project documentation...');
      projectDocs = await readProjectDocs(projectPath);
    }

    // Get the API client configuration
    const apiClientConfig = await selectApiClient(options);

    // Log writer model if configured
    const config = getConfig(options as any);
    logger.debug(`Config writerModel: ${config.writerModel}`);
    if (config.writerModel) {
      logger.info(`Using writer model for consolidation: ${config.writerModel}`);
    }

    // Perform token analysis to check if content exceeds context window
    const tokenAnalysis = await performTokenAnalysisIfNeeded(fileInfos, options, apiClientConfig);

    // Execute the review
    const reviewResult = await executeReview(
      fileInfos,
      options,
      apiClientConfig as any,
      projectDocs,
      tokenAnalysis,
    );

    // Handle review output
    await handleReviewOutput(reviewResult, options, outputBaseDir);
  } catch (error) {
    handleOrchestrationError(error, options);
  }
}

/**
 * Handle errors during orchestration
 * @param error The error that occurred
 * @param options Review options (for debug mode)
 * @throws Error Always re-throws after logging
 */
async function handleOrchestrationError(error: unknown, options: ReviewOptions): Promise<never> {
  const { TokenLimitError } = await import('../utils/apiErrorHandler');

  // Handle token limit errors with helpful guidance
  if (error instanceof TokenLimitError) {
    logger.error('');
    logger.error('==========================================');
    logger.error('TOKEN LIMIT EXCEEDED');
    logger.error('==========================================');
    logger.error(`The codebase is too large for single-pass review.`);
    if (error.tokenCount) {
      logger.error(`Content size: ${error.tokenCount.toLocaleString()} tokens`);
    }
    logger.error('');
    logger.error(
      'SOLUTION: Use the --multi-pass flag to automatically split the review into multiple passes:',
    );
    logger.error('');
    logger.error('  ai-code-review --multi-pass');
    logger.error('');
    logger.error(
      'This will intelligently chunk your codebase and maintain context between passes.',
    );
    logger.error('==========================================');
    logger.error('');

    if (options.debug && error.stack) {
      logger.debug(`Error stack trace: ${error.stack}`);
    }

    // Re-throw with a cleaner message
    throw new Error('Token limit exceeded. Please use --multi-pass flag for large codebases.');
  }

  // Handle any other errors
  logger.error(`Review failed: ${error instanceof Error ? error.message : String(error)}`);

  if (error instanceof Error && error.stack && options.debug) {
    logger.debug(`Error stack trace: ${error.stack}`);
  }

  throw error;
}
