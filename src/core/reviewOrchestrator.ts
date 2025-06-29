/**
 * @fileoverview Review orchestrator module.
 *
 * This module is responsible for coordinating the review process,
 * selecting the appropriate API client, and managing the review workflow.
 */

import * as path from 'path';
import { createDirectory } from '../utils/fileSystem';
import { ReviewOptions } from '../types/review';
import logger from '../utils/logger';
import { getApiKeyType } from '../utils/api/apiUtils';
import { runApiConnectionTests } from '../__tests__/apiConnection.test';
import { getConfig } from '../utils/config';
import { ProgrammingLanguage } from '../types/common';

import configManager from '../utils/configManager';
import {
  listModels,
  listModelConfigs
} from '../clients/utils/modelLister';

// Import handlers
import { discoverFilesForReview, readFilesForReview } from './handlers/FileProcessingHandler';
import { performEstimation } from './handlers/EstimationHandler';
import { performSemanticAnalysis } from './handlers/SemanticAnalysisHandler';
import { executeReview } from './handlers/ReviewExecutor';
import { handleReviewOutput, createOutputDirectory } from './handlers/OutputHandler';

// Import other dependencies
import { selectApiClient } from './ApiClientSelector';
import { readProjectDocs } from '../utils/projectDocs';

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
export async function orchestrateReview(
  target: string,
  options: ReviewOptions
): Promise<void> {
  // Initialize configuration 
  getConfig();
  try {
    // Validate input parameters
    if (options === undefined) {
      throw new Error('Review options object must be provided');
    }
    
    // Validate that options contains a review type
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
      logger.debug(`Review options: ${JSON.stringify(options, null, 2)}`);
      logger.debug(`Target path: ${effectiveTarget}${(!target || target.trim() === '') ? ' (defaulted to ".")' : ''}`);
      logger.debug(
        `Selected model: ${process.env.AI_CODE_REVIEW_MODEL || 'not set'}`
      );
      logger.debug(`API key type: ${getApiKeyType() || 'None'}`);
    }

    // If listmodels flag is set, list available models and exit
    if (options.listmodels) {
      logger.info('Listing available models based on configured API keys...');
      listModels(false); // Show all models, not just available ones
      return; // Exit after listing models
    }

    // If models flag is set, list all supported models and their configuration names
    if (options.models) {
      logger.info(
        'Listing all supported models and their configuration names...'
      );
      listModelConfigs();
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
    } else {
      logger.info(
        `Starting consolidated ${options.type} review for ${effectiveTarget}...`
      );
    }

    // Determine the project path
    const projectPath = process.cwd();
    const projectName = path.basename(projectPath);

    // Create output directory using the centralized function
    const configOutputDir = configManager.getPathsConfig().outputDir;
    const outputBaseDir = createOutputDirectory(projectPath, {
      outputDir: options.outputDir,
      configOutputDir: configOutputDir
    });

    // Create the directory
    await createDirectory(outputBaseDir);

    // Log project information
    logger.info(`Project: ${projectName}`);
    logger.info(`Project path: ${projectPath}`);
    
    // Detect language and framework
    let frameworkDetectionResult = null;
    if (!options.language) {
      try {
        const { detectFramework } = await import('../utils/detection');
        frameworkDetectionResult = await detectFramework(projectPath);
        
        if (frameworkDetectionResult) {
          options.language = frameworkDetectionResult.language as ProgrammingLanguage;
          options.framework = frameworkDetectionResult.framework;
          
          if (frameworkDetectionResult.framework !== 'none' && frameworkDetectionResult.confidence > 0.6) {
            logger.info(`Detected language: ${frameworkDetectionResult.language}, framework: ${frameworkDetectionResult.framework} (confidence: ${frameworkDetectionResult.confidence.toFixed(2)})`);
            
            if (frameworkDetectionResult.frameworkVersion) {
              logger.info(`Framework version: ${frameworkDetectionResult.frameworkVersion}`);
            }
            
            if (frameworkDetectionResult.additionalFrameworks && frameworkDetectionResult.additionalFrameworks.length > 0) {
              logger.info(`Additional frameworks detected: ${frameworkDetectionResult.additionalFrameworks.join(', ')}`);
            }
            
            if (frameworkDetectionResult.cssFrameworks && frameworkDetectionResult.cssFrameworks.length > 0) {
              const cssFrameworksStr = frameworkDetectionResult.cssFrameworks.map(cf => 
                cf.version ? `${cf.name} (${cf.version})` : cf.name
              ).join(', ');
              logger.info(`CSS frameworks detected: ${cssFrameworksStr}`);
            }
          } else {
            logger.info(`Detected language: ${frameworkDetectionResult.language}, no specific framework detected`);
            
            // Still log CSS frameworks if detected
            if (frameworkDetectionResult.cssFrameworks && frameworkDetectionResult.cssFrameworks.length > 0) {
              const cssFrameworksStr = frameworkDetectionResult.cssFrameworks.map(cf => 
                cf.version ? `${cf.name} (${cf.version})` : cf.name
              ).join(', ');
              logger.info(`CSS frameworks detected: ${cssFrameworksStr}`);
            }
          }
        }
      } catch (error) {
        logger.debug(`Error detecting language/framework: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Discover files to review
    const filesToReview = await discoverFilesForReview(
      effectiveTarget,
      projectPath,
      options
    );
    
    if (filesToReview.length === 0) {
      return; // No files to review, exit early
    }

    // If estimate flag is set, calculate and display token usage and cost estimates
    if (options.estimate) {
      // Get the model name from options or environment variables
      const modelName =
        options.model || process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';
      
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
          throw new Error('No files could be read for review. Please check file permissions and paths.');
        }
        
        // Perform estimation
        await performEstimation(fileInfos, filesToReview, options, modelName);
      } catch (error) {
        logger.error(`Estimation failed: ${error instanceof Error ? error.message : String(error)}`);
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
    let tokenAnalysis = null;
    
    if (!options.multiPass) {
      try {
        logger.info('Analyzing token usage to determine review strategy...');
        
        // Use the new TokenAnalyzer for more comprehensive analysis
        const { TokenAnalyzer } = await import('../analysis/tokens');
        
        const tokenAnalysisOptions = {
          reviewType: options.type,
          modelName: apiClientConfig.modelName,
          contextMaintenanceFactor: options.contextMaintenanceFactor || 0.15,
          forceSinglePass: options.forceSinglePass
        };
        
        // Log if forceSinglePass is enabled
        if (options.forceSinglePass) {
          logger.info('Force single-pass mode is enabled. This will override the chunking recommendation.');
          logger.info('Note: This may result in token limit errors if the content exceeds the model\'s context window.');
          
          // Special note for Gemini models
          if (apiClientConfig.modelName.includes('gemini-1.5')) {
            logger.info('Using Gemini 1.5 model with 1M token context window in single-pass mode.');
          }
        }
        
        tokenAnalysis = TokenAnalyzer.analyzeFiles(fileInfos, tokenAnalysisOptions);
        
        // Try semantic chunking for intelligent code analysis
        await performSemanticAnalysis(fileInfos, options);
      } catch (error) {
        logger.warn(`Token analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        logger.info('Proceeding with review without token analysis');
      }
    }
    
    // Execute the review
    const reviewResult = await executeReview(
      fileInfos,
      options,
      apiClientConfig as any,
      projectDocs,
      tokenAnalysis
    );
    
    // Handle review output
    await handleReviewOutput(reviewResult, options, outputBaseDir);
    
  } catch (error) {
    // Handle any uncaught errors
    logger.error(`Review failed: ${error instanceof Error ? error.message : String(error)}`);
    
    if (error instanceof Error && error.stack && options.debug) {
      logger.debug(`Error stack trace: ${error.stack}`);
    }
    
    throw error;
  }
}