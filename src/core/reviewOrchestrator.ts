/**
 * @fileoverview Review orchestrator module.
 *
 * This module is responsible for coordinating the review process,
 * selecting the appropriate API client, and managing the review workflow.
 */

/**
 * Helper function to parse and display provider and model information
 * 
 * @param modelName The full model name (e.g., 'openai:gpt-4.1')
 * @returns An object with provider and model display information
 */
function getProviderDisplayInfo(modelName: string): { provider: string; model: string } {
  try {
    // Try to parse the model string using the utilities from modelMaps
    const { provider, modelName: extractedModelName } = parseModelString(modelName);
    
    return {
      provider: provider.charAt(0).toUpperCase() + provider.slice(1), // Capitalize provider name
      model: extractedModelName
    };
  } catch (error) {
    // If parsing fails, use a fallback approach
    const parts = modelName.split(':');
    
    if (parts.length === 2) {
      return {
        provider: parts[0].charAt(0).toUpperCase() + parts[0].slice(1), // Capitalize provider name
        model: parts[1]
      };
    }
    
    // If format is not recognized, return unknown provider and original model name
    return {
      provider: 'Unknown',
      model: modelName
    };
  }
}

import path from 'path';
import { createDirectory } from '../utils/fileSystem';
import { ReviewOptions } from '../types/review';
import { FileInfo, discoverFiles, readFilesContent } from './fileDiscovery';
import logger from '../utils/logger';
import { getApiKeyType } from '../utils/apiUtils';
import { runApiConnectionTests } from '../__tests__/apiConnection.test';
import { getConfig } from '../utils/config';
import {
  estimateFromFilePaths,
  formatEstimation
} from '../utils/estimationUtils';
import { parseModelString } from '../clients/utils/modelMaps';
import {
  listModels,
  printCurrentModel,
  listModelConfigs
} from '../clients/utils/modelLister';

// Import strategy-related modules
import { StrategyFactory } from '../strategies/StrategyFactory';
import { selectApiClient } from './ApiClientSelector';
import { readProjectDocs } from '../utils/projectDocs';
import { saveReviewOutput } from '../core/OutputManager';
import { displayReviewInteractively } from '../core/InteractiveDisplayManager';

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
  // Initialize configuration with CLI options (e.g., model override, API keys)
  getConfig(options);
  try {
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
    if (options.individual) {
      logger.info(
        `Starting individual ${options.type} reviews for ${effectiveTarget}...`
      );
    } else if (options.type === 'architectural') {
      logger.info(`Starting architectural review for ${effectiveTarget}...`);
    } else {
      logger.info(
        `Starting consolidated ${options.type} review for ${effectiveTarget}...`
      );
    }

    // Determine the project path
    const projectPath = process.cwd();
    const projectName = path.basename(projectPath);

    // Create output directory
    const outputBaseDir = path.resolve(projectPath, 'ai-code-review-docs');
    await createDirectory(outputBaseDir);

    // Log project information
    logger.info(`Project: ${projectName}`);
    logger.info(`Project path: ${projectPath}`);

    // Discover files to review
    const filesToReview = await discoverFiles(
      effectiveTarget,
      projectPath,
      options.includeTests
    );

    if (filesToReview.length === 0) {
      return; // No files to review, exit early
    }

    // If estimate flag is set, calculate and display token usage and cost estimates
    if (options.estimate) {
      logger.info('Calculating token usage and cost estimates...');

      // Get the model name from environment variables
      const modelName =
        process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';

      try {
        // Read file contents for token analysis
        const fileInfos = await readFilesContent(filesToReview, projectPath);
        
        // Use the new TokenAnalyzer for more comprehensive analysis
        const { TokenAnalyzer } = await import('../analysis/tokens');
        const { estimateMultiPassReviewCost, formatMultiPassEstimation } = await import('../utils/estimationUtils');
        
        const tokenAnalysisOptions = {
          reviewType: options.type,
          modelName: modelName,
          contextMaintenanceFactor: options.contextMaintenanceFactor || 0.15
        };
        
        const tokenAnalysis = TokenAnalyzer.analyzeFiles(fileInfos, tokenAnalysisOptions);
        
        // Get cost estimate based on token analysis
        const costEstimation = await estimateMultiPassReviewCost(
          fileInfos,
          options.type,
          modelName,
          {
            passCount: tokenAnalysis.chunkingRecommendation.chunkingRecommended ? 
              tokenAnalysis.estimatedPassesNeeded : 1,
            contextMaintenanceFactor: tokenAnalysisOptions.contextMaintenanceFactor
          }
        );
        
        // Get provider and model information
        const providerInfo = getProviderDisplayInfo(modelName);
        
        // Display a summary without file details
        logger.info(`
=== Token Usage and Cost Estimation ===

Provider: ${providerInfo.provider}
Model: ${providerInfo.model}
Files: ${tokenAnalysis.fileCount} (${(tokenAnalysis.totalSizeInBytes / 1024 / 1024).toFixed(2)} MB total)

Token Information:
  Estimated Total Tokens: ${tokenAnalysis.estimatedTotalTokens.toLocaleString()}
  Context Window Size: ${tokenAnalysis.contextWindowSize.toLocaleString()}
  Context Utilization: ${(tokenAnalysis.estimatedTotalTokens / tokenAnalysis.contextWindowSize * 100).toFixed(2)}%

${tokenAnalysis.chunkingRecommendation.chunkingRecommended ? 
  `Multi-Pass Analysis:
  Chunking Required: Yes
  Reason: ${tokenAnalysis.chunkingRecommendation.reason}
  Estimated Passes: ${tokenAnalysis.estimatedPassesNeeded}` : 
  `Multi-Pass Analysis:
  Chunking Required: No
  Reason: ${tokenAnalysis.chunkingRecommendation.reason}`}

Estimated Cost: ${costEstimation.formattedCost}

Note: This is an estimate based on approximate token counts and may vary
      based on the actual content and model behavior.
`);
        
        // If chunking is recommended, inform the user that it will be automatic
        if (tokenAnalysis.chunkingRecommendation.chunkingRecommended) {
          logger.info('\nImportant: Multi-pass review will be automatically enabled when needed. No flag required.');
        }
      } catch (error) {
        // Fall back to the legacy estimator if TokenAnalyzer fails
        logger.warn('Advanced token analysis failed, falling back to basic estimation');
        
        // Estimate token usage and cost using the legacy estimator
        const estimation = await estimateFromFilePaths(
          filesToReview,
          options.type,
          modelName
        );

        // Get provider and model information
        const providerInfo = getProviderDisplayInfo(modelName);
        
        // Display the estimation results without file details
        logger.info(`
=== Token Usage and Cost Estimation ===

Review Type: ${options.type}
Provider: ${providerInfo.provider}
Model: ${providerInfo.model}
Files: ${estimation.fileCount} (${(estimation.totalFileSize / 1024 / 1024).toFixed(2)} MB total)

Token Usage:
  Input Tokens: ${estimation.inputTokens.toLocaleString()}
  Estimated Output Tokens: ${estimation.outputTokens.toLocaleString()}
  Total Tokens: ${estimation.totalTokens.toLocaleString()}

Estimated Cost: ${estimation.formattedCost}

Note: This is an estimate based on approximate token counts and may vary
      based on the actual content and model behavior.
`);
      }

      return; // Exit after displaying the estimation
    }

    // Check if interactive mode is appropriate for individual reviews
    // Interactive mode with individual reviews only makes sense for a single file
    // because we can't effectively display multiple individual reviews interactively
    if (options.interactive && options.individual && filesToReview.length > 1) {
      logger.warn(
        'Interactive mode with individual reviews is only supported for single file reviews.'
      );
      logger.warn(
        'Switching to consolidated review mode for interactive review of multiple files.'
      );
      options.individual = false; // Force consolidated mode for multiple files in interactive mode
    }

    // Create output directory for reviews
    const actualProjectName = projectName || 'unknown-project';

    // Read file contents
    const fileInfos = await readFilesContent(filesToReview, projectPath);

    // Read project documentation if enabled
    let projectDocs = null;
    if (options.includeProjectDocs) {
      logger.info('Reading project documentation...');
      projectDocs = await readProjectDocs(projectPath);
    }
    
    // Get the API client configuration
    const apiClientConfig = await selectApiClient();
    
    // Perform token analysis to check if content exceeds context window
    if (!options.multiPass && !options.individual) {
      try {
        logger.info('Analyzing token usage to determine review strategy...');
        
        // Use the new TokenAnalyzer for more comprehensive analysis
        const { TokenAnalyzer } = await import('../analysis/tokens');
        
        const tokenAnalysisOptions = {
          reviewType: options.type,
          modelName: apiClientConfig.modelName,
          contextMaintenanceFactor: options.contextMaintenanceFactor || 0.15
        };
        
        const tokenAnalysis = TokenAnalyzer.analyzeFiles(fileInfos, tokenAnalysisOptions);
        
        // If chunking is recommended, provide analysis and ask for confirmation unless noConfirm is true
        if (tokenAnalysis.chunkingRecommendation.chunkingRecommended) {
          // Get cost estimate based on token analysis
          const { estimateMultiPassReviewCost, formatMultiPassEstimation } = await import('../utils/estimationUtils');
          
          const costEstimation = await estimateMultiPassReviewCost(
            fileInfos,
            options.type,
            apiClientConfig.modelName,
            {
              passCount: tokenAnalysis.estimatedPassesNeeded,
              contextMaintenanceFactor: tokenAnalysisOptions.contextMaintenanceFactor
            }
          );
          
          // Get provider and model information
          const providerInfo = getProviderDisplayInfo(apiClientConfig.modelName);
          
          // Display token analysis and cost estimation
          logger.info(`
=== Multi-Pass Review Required ===

Content exceeds model context window. Multi-pass review is recommended.

Provider: ${providerInfo.provider}
Model: ${providerInfo.model}
Files: ${tokenAnalysis.fileCount} (${(tokenAnalysis.totalSizeInBytes / 1024 / 1024).toFixed(2)} MB total)

Token Information:
  Estimated Total Tokens: ${tokenAnalysis.estimatedTotalTokens.toLocaleString()}
  Context Window Size: ${tokenAnalysis.contextWindowSize.toLocaleString()}
  Context Utilization: ${(tokenAnalysis.estimatedTotalTokens / tokenAnalysis.contextWindowSize * 100).toFixed(2)}%

Multi-Pass Analysis:
  Reason: ${tokenAnalysis.chunkingRecommendation.reason}
  Estimated Passes: ${tokenAnalysis.estimatedPassesNeeded}

Estimated Cost: ${costEstimation.formattedCost}
`);
          
          // Ask for confirmation unless noConfirm flag is set
          if (!options.noConfirm) {
            try {
              const readline = require('readline');
              const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
              });
              
              const answer = await new Promise<string>((resolve) => {
                rl.question('Proceed with multi-pass review? (y/N): ', (answer: string) => {
                  resolve(answer.trim().toLowerCase());
                  rl.close();
                });
              });
              
              if (answer === 'y' || answer === 'yes') {
                logger.info('Proceeding with multi-pass review...');
                options.multiPass = true;
              } else {
                logger.info('Multi-pass review cancelled. To proceed without confirmation, use the --no-confirm flag.');
                process.exit(0);
              }
            } catch (error) {
              // If there's an error with the readline interface, fall back to automatic mode
              logger.warn('Could not get user confirmation. Proceeding with multi-pass review automatically.');
              options.multiPass = true;
            }
          } else {
            // If noConfirm flag is set, proceed automatically
            logger.info('Proceeding with multi-pass review automatically (--no-confirm flag is set).');
            options.multiPass = true;
          }
        }
      } catch (error) {
        // If token analysis fails, log the error but continue with standard review
        logger.warn('Token analysis failed. Continuing with standard review strategy.');
        logger.debug(`Token analysis error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Create and execute the appropriate strategy based on review options
    logger.info(`Creating ${options.multiPass ? 'multi-pass ' : ''}${options.type} review strategy...`);
    const strategy = StrategyFactory.createStrategy(options);

    // Execute the strategy
    logger.info(`Executing review strategy...`);
    const review = await strategy.execute(
      fileInfos,
      actualProjectName,
      projectDocs,
      options,
      apiClientConfig
    );

    // Get the target name (last part of the path)
    const targetName = path.basename(effectiveTarget);

    // Save the review output with file tree
    const outputPath = await saveReviewOutput(
      review,
      options,
      outputBaseDir,
      apiClientConfig.modelName,
      targetName,
      fileInfos
    );

    // If interactive mode is enabled, display the review results
    if (options.interactive) {
      await displayReviewInteractively(outputPath, projectPath, options);
    }

    logger.info('Review completed!');
  } catch (error) {
    logger.error(
      `An unexpected error occurred during the review process: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
