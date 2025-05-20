/**
 * @fileoverview Review orchestrator module.
 *
 * This module is responsible for coordinating the review process,
 * selecting the appropriate API client, and managing the review workflow.
 */

import * as path from 'path';
import { createDirectory } from '../utils/fileSystem';
import { ReviewOptions } from '../types/review';
import { FileInfo, discoverFiles, readFilesContent } from './fileDiscovery';
import logger from '../utils/logger';
import { getApiKeyType } from '../utils/apiUtils';
import { runApiConnectionTests } from '../__tests__/apiConnection.test';
import { getConfig } from '../utils/config';
import { ProgrammingLanguage } from '../types/common';
import {
  estimateFromFilePaths
} from '../utils/estimationUtils';
import { parseModelString } from '../clients/utils/modelMaps';
import configManager from '../utils/configManager';
import {
  listModels,
  listModelConfigs
} from '../clients/utils/modelLister';

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

    // Get the output directory from options, config, or default
    const defaultOutputDir = 'ai-code-review-docs';
    const configOutputDir = configManager.getPathsConfig().outputDir || defaultOutputDir;
    const cliOptions = options as any; // Using any here as a temporary workaround
    const outputDir = cliOptions.outputDir || configOutputDir;
    
    // Determine if the path is absolute or relative
    const outputBaseDir = path.isAbsolute(outputDir) 
      ? outputDir 
      : path.resolve(projectPath, outputDir);
    
    // Create output directory
    await createDirectory(outputBaseDir);
    
    // Log the output directory
    if (outputDir !== defaultOutputDir) {
      logger.info(`Using custom output directory: ${outputBaseDir}`);
    }

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
    let filesToReview: string[];
    try {
      filesToReview = await discoverFiles(
        effectiveTarget,
        projectPath,
        options.includeTests
      );
      
      // Log the number of files discovered
      logger.info(`Discovered ${filesToReview.length} files to review`);
      
      if (filesToReview.length === 0) {
        logger.warn(`No files found for review in ${effectiveTarget}`);
        logger.info('This could be due to:');
        logger.info('1. The path does not exist or is not accessible');
        logger.info('2. All files are excluded by .gitignore patterns');
        logger.info('3. There are no supported file types in the specified path');
        
        if (!options.includeTests) {
          logger.info('4. Test files are excluded by default. Use --include-tests to include them');
        }
        
        return; // No files to review, exit early
      }
      
      // In debug mode, list the first few files discovered
      if (options.debug && filesToReview.length > 0) {
        const maxFilesToLog = 10;
        logger.debug(`First ${Math.min(filesToReview.length, maxFilesToLog)} files to review:`);
        for (let i = 0; i < Math.min(filesToReview.length, maxFilesToLog); i++) {
          logger.debug(`  - ${filesToReview[i]}`);
        }
        
        if (filesToReview.length > maxFilesToLog) {
          logger.debug(`  ... and ${filesToReview.length - maxFilesToLog} more files`);
        }
      }
    } catch (error) {
      // Handle file discovery errors
      logger.error(`Failed to discover files for review: ${
        error instanceof Error ? error.message : String(error)
      }`);
      
      if (error instanceof Error && error.stack) {
        logger.debug(`Error stack trace: ${error.stack}`);
      }
      
      throw new Error(`Could not discover files to review in ${effectiveTarget}. Please verify the path exists and is accessible.`);
    }

    // If estimate flag is set, calculate and display token usage and cost estimates
    if (options.estimate) {
      logger.info('Calculating token usage and cost estimates...');

      // Get the model name from environment variables
      const modelName =
        process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';

      try {
        // Read file contents for token analysis
        const { fileInfos, errors } = await readFilesContent(filesToReview, projectPath);
        
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
        
        // Use the new TokenAnalyzer for more comprehensive analysis
        const { TokenAnalyzer } = await import('../analysis/tokens');
        const { estimateMultiPassReviewCost } = await import('../utils/estimationUtils');
        
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
  Reason: ${tokenAnalysis.chunkingRecommendation.reason || 'Content exceeds context window'}
  Estimated Passes: ${tokenAnalysis.estimatedPassesNeeded}` : 
  `Multi-Pass Analysis:
  Chunking Required: No
  Reason: ${tokenAnalysis.chunkingRecommendation.reason || 'Content fits within context window'}`}

Estimated Cost: ${costEstimation.formattedCost || 'Unable to estimate cost'}

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
    let fileInfos: FileInfo[] = [];
    let errors: Array<{ path: string; error: string }> = [];
    
    try {
      logger.info('Reading file contents...');
      const result = await readFilesContent(filesToReview, projectPath);
      fileInfos = result.fileInfos;
      errors = result.errors;
      
      // Log statistics about the read operation
      logger.info(`Successfully read ${fileInfos.length} out of ${filesToReview.length} files`);
      
      // If we have errors reading files, report them but continue
      if (errors.length > 0) {
        logger.warn(`Failed to read ${errors.length} file(s):`);
        
        // Log the first 10 errors
        const maxErrorsToLog = 10;
        errors.slice(0, maxErrorsToLog).forEach(error => {
          logger.warn(`  ${error.path}: ${error.error}`);
        });
        
        // If there are more errors, just mention the count
        if (errors.length > maxErrorsToLog) {
          logger.warn(`  ... and ${errors.length - maxErrorsToLog} more errors`);
        }
        
        // In debug mode, log all errors
        if (options.debug) {
          logger.debug('All file read errors:');
          errors.forEach(error => {
            logger.debug(`  ${error.path}: ${error.error}`);
          });
        }
      }
      
      // Ensure we have at least some files to review
      if (fileInfos.length === 0) {
        const errorMessage = 'No files could be read for review.';
        logger.error(errorMessage);
        
        // Provide more detailed guidance based on the errors
        if (errors.length > 0) {
          logger.error('Errors encountered while reading files:');
          const commonErrorPatterns = {
            permission: ['permission denied', 'EACCES'],
            notFound: ['no such file', 'ENOENT'],
            encoding: ['encoding', 'invalid byte', 'character'],
            size: ['too large', 'exceeds', 'size limit']
          };
          
          // Categorize errors to provide better guidance
          const categorizedErrors = {
            permission: 0,
            notFound: 0,
            encoding: 0,
            size: 0,
            other: 0
          };
          
          errors.forEach(error => {
            const errorLowerCase = error.error.toLowerCase();
            let categorized = false;
            
            for (const [category, patterns] of Object.entries(commonErrorPatterns)) {
              if (patterns.some(pattern => errorLowerCase.includes(pattern.toLowerCase()))) {
                categorizedErrors[category as keyof typeof categorizedErrors]++;
                categorized = true;
                break;
              }
            }
            
            if (!categorized) {
              categorizedErrors.other++;
            }
          });
          
          // Provide guidance based on error categories
          if (categorizedErrors.permission > 0) {
            logger.error(`  - ${categorizedErrors.permission} file(s) could not be read due to permission issues. Check file permissions.`);
          }
          if (categorizedErrors.notFound > 0) {
            logger.error(`  - ${categorizedErrors.notFound} file(s) were not found. The file list may be out of date.`);
          }
          if (categorizedErrors.encoding > 0) {
            logger.error(`  - ${categorizedErrors.encoding} file(s) had encoding issues. These might be binary files not suitable for review.`);
          }
          if (categorizedErrors.size > 0) {
            logger.error(`  - ${categorizedErrors.size} file(s) were too large to process.`);
          }
          if (categorizedErrors.other > 0) {
            logger.error(`  - ${categorizedErrors.other} file(s) failed due to other issues.`);
          }
        }
        
        throw new Error(`${errorMessage} Please check file permissions and paths.`);
      }
    } catch (error) {
      // Handle file reading errors not caught by readFilesContent
      if (error instanceof Error && error.message.includes('No files could be read')) {
        // This is an error we created above, so just rethrow it
        throw error;
      } else {
        // This is an unexpected error
        logger.error(`Unexpected error when reading file contents: ${
          error instanceof Error ? error.message : String(error)
        }`);
        
        if (error instanceof Error && error.stack) {
          logger.debug(`Error stack trace: ${error.stack}`);
        }
        
        throw new Error(`Failed to read files for review: ${
          error instanceof Error ? error.message : String(error)
        }`);
      }
    }

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
          const { estimateMultiPassReviewCost } = await import('../utils/estimationUtils');
          
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
  Reason: ${tokenAnalysis.chunkingRecommendation.reason || 'Content exceeds context window'}
  Estimated Passes: ${tokenAnalysis.estimatedPassesNeeded}

Estimated Cost: ${costEstimation.formattedCost || 'Unable to estimate cost'}
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
    
    let strategy;
    try {
      strategy = StrategyFactory.createStrategy(options);
      
      if (!strategy) {
        throw new Error(`Failed to create strategy for review type: ${options.type}`);
      }
      
      logger.info(`Created strategy: ${strategy.constructor.name}`);
    } catch (error) {
      // Handle strategy creation errors
      logger.error(`Failed to create review strategy: ${
        error instanceof Error ? error.message : String(error)
      }`);
      
      // Provide troubleshooting guidance
      logger.error('This might be due to:');
      logger.error('1. An invalid review type or option combination');
      logger.error('2. Missing configuration for the requested strategy');
      logger.error('3. A plugin that failed to load correctly');
      
      throw new Error(`Could not create review strategy. Please check your review options and configuration.`);
    }

    // Execute the strategy
    logger.info(`Executing review strategy...`);
    let review;
    try {
      // Log any extra strategy-specific parameters
      if (options.multiPass) {
        logger.info(`Using multi-pass mode with context maintenance factor: ${options.contextMaintenanceFactor || 0.15}`);
      }
      
      // Start timing the execution
      const startTime = Date.now();
      
      review = await strategy.execute(
        fileInfos,
        actualProjectName,
        projectDocs,
        options,
        apiClientConfig
      );
      
      // Log execution timing
      const executionTime = (Date.now() - startTime) / 1000;
      logger.info(`Strategy execution completed in ${executionTime.toFixed(2)} seconds`);
      
      // Validate the review result
      if (!review || !review.content) {
        throw new Error('Strategy execution returned an empty or invalid review result');
      }
    } catch (error) {
      // Handle strategy execution errors
      logger.error(`Failed to execute review strategy: ${
        error instanceof Error ? error.message : String(error)
      }`);
      
      if (error instanceof Error && error.stack) {
        logger.debug(`Error stack trace: ${error.stack}`);
      }
      
      // Check if this is an API-related error and provide better guidance
      const errorString = String(error);
      if (errorString.includes('API') || errorString.includes('authentication') || 
          errorString.includes('key') || errorString.includes('token')) {
        logger.error('This appears to be an API or authentication error. Please check:');
        logger.error('1. Your API keys are correctly set in the environment variables');
        logger.error('2. You have sufficient quota and permissions with the API provider');
        logger.error('3. The selected model is available and correctly configured');
        logger.error(`Run with --test-api flag to test API connections`);
      }
      
      throw new Error(`Failed to execute review strategy: ${
        error instanceof Error ? error.message : String(error)
      }`);
    }

    // Get the target name (last part of the path)
    const targetName = path.basename(effectiveTarget);
    
    // Save the review output with file tree
    let outputPath: string;
    try {
      logger.info('Saving review output...');
      outputPath = await saveReviewOutput(
        review,
        options,
        outputBaseDir,
        apiClientConfig.modelName,
        targetName,
        fileInfos
      );
      
      logger.info(`Review output saved to: ${outputPath}`);
    } catch (error) {
      // Handle output saving errors
      logger.error(`Failed to save review output: ${
        error instanceof Error ? error.message : String(error)
      }`);
      
      if (error instanceof Error && error.stack) {
        logger.debug(`Error stack trace: ${error.stack}`);
      }
      
      throw new Error('Failed to save review output. Please check directory permissions and available disk space.');
    }
    
    // If interactive mode is enabled, display the review results
    if (options.interactive) {
      try {
        logger.info('Displaying review results interactively...');
        await displayReviewInteractively(outputPath, projectPath, options);
        logger.info('Interactive review session completed');
      } catch (error) {
        // Handle interactive display errors
        logger.error(`Failed to display review interactively: ${
          error instanceof Error ? error.message : String(error)
        }`);
        
        if (error instanceof Error && error.stack) {
          logger.debug(`Error stack trace: ${error.stack}`);
        }
        
        // Don't throw an error here, as the review has been completed and saved
        logger.info(`Review output is available at: ${outputPath}`);
      }
    }
    
    // Calculate and log review summary statistics
    try {
      // Calculate some basic stats about the review
      const reviewSizeKB = Math.round(review.content.length / 1024);
      const filesReviewed = fileInfos.length;
      const totalSizeKB = Math.round(
        fileInfos.reduce((sum, file) => sum + file.content.length, 0) / 1024
      );
      
      // Log summary information
      logger.info('Review Summary:');
      logger.info(`- Files reviewed: ${filesReviewed}`);
      logger.info(`- Total size of reviewed files: ${totalSizeKB} KB`);
      logger.info(`- Review content size: ${reviewSizeKB} KB`);
      logger.info(`- Review type: ${options.type}${options.multiPass ? ' (multi-pass)' : ''}`);
      
      if (review.costInfo || review.cost) {
        const costInfo = review.costInfo || review.cost;
        if (costInfo) {
          const { inputTokens, outputTokens, totalTokens, estimatedCost } = costInfo;
          logger.info(`- Tokens: ${totalTokens?.toLocaleString() || 'N/A'} (${inputTokens?.toLocaleString() || 'N/A'} in, ${outputTokens?.toLocaleString() || 'N/A'} out)`);
          logger.info(`- Estimated cost: $${estimatedCost?.toFixed(6) || 'N/A'}`);
        }
      }
      
      logger.info(`- Output saved to: ${outputPath}`);
    } catch (error) {
      // Just log any errors with summary statistics, don't fail the whole process
      logger.debug(`Error generating summary statistics: ${
        error instanceof Error ? error.message : String(error)
      }`);
    }
    
    logger.info('Review completed successfully!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`An error occurred during the review process: ${errorMessage}`);
    
    // Log the error stack trace in debug mode
    if (error instanceof Error && error.stack && options?.debug) {
      logger.debug(`Error stack trace: ${error.stack}`);
    }
    
    // Check if this is related to an API key issue
    if (errorMessage.includes('API key') || 
        errorMessage.includes('authentication') || 
        errorMessage.includes('credentials')) {
      logger.error('This appears to be an API key or authentication issue.');
      logger.error('Please check:');
      logger.error('1. You have set the appropriate API keys in your environment variables');
      logger.error('2. The API keys are correctly formatted and valid');
      logger.error('3. Your API key has sufficient permissions and quota');
      logger.error('');
      logger.error('Required environment variables depend on your chosen model:');
      logger.error('- For Google Gemini: AI_CODE_REVIEW_GOOGLE_API_KEY');
      logger.error('- For Anthropic Claude: AI_CODE_REVIEW_ANTHROPIC_API_KEY');
      logger.error('- For OpenAI: AI_CODE_REVIEW_OPENAI_API_KEY');
      logger.error('- For OpenRouter: AI_CODE_REVIEW_OPENROUTER_API_KEY');
      logger.error('');
      logger.error('You can run with the --test-api flag to diagnose API connection issues.');
    }
    // Check if this is a file or directory not found issue
    else if (errorMessage.includes('no such file') || 
             errorMessage.includes('ENOENT') || 
             errorMessage.includes('not found') ||
             errorMessage.includes('does not exist')) {
      logger.error('This appears to be a file or directory not found issue.');
      logger.error('Please check:');
      logger.error('1. The target path exists and is accessible');
      logger.error('2. You are running the command from the correct directory');
      logger.error('3. File permissions allow reading the targeted files');
    }
    // Check if this is a model-related issue
    else if (errorMessage.includes('model') && 
            (errorMessage.includes('not found') || 
             errorMessage.includes('unavailable') || 
             errorMessage.includes('invalid'))) {
      logger.error('This appears to be an issue with the AI model configuration.');
      logger.error('Please check:');
      logger.error('1. The model specified in AI_CODE_REVIEW_MODEL is valid');
      logger.error('2. You have the correct API key for the model provider');
      logger.error('3. The model is available and not deprecated');
      logger.error('');
      logger.error('You can use --listmodels to see available models based on your API keys.');
    }
    // Check if this is a file reading or processing issue
    else if (errorMessage.includes('read') || 
             errorMessage.includes('file') || 
             errorMessage.includes('permission') || 
             errorMessage.includes('access')) {
      logger.error('This appears to be a file access or processing issue.');
      logger.error('Please check:');
      logger.error('1. You have read permissions for all files in the target path');
      logger.error('2. None of the files are locked by other processes');
      logger.error('3. The files are valid and not corrupted');
    }
    
    // General advice for all errors
    logger.error('');
    logger.error('For more detailed information, run with the --debug flag.');
    logger.error('If the issue persists, please report it with the error details above.');
    
    // Exit with error code
    process.exit(1);
  }
}
