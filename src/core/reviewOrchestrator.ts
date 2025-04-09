/**
 * @fileoverview Review orchestrator module.
 *
 * This module is responsible for coordinating the review process,
 * selecting the appropriate API client, and managing the review workflow.
 */

import path from 'path';
import { createDirectory } from '../utils/fileSystem';
import { ReviewOptions } from '../types/review';
import { FileInfo, discoverFiles, readFilesContent } from './fileDiscovery';
import logger from '../utils/logger';
import { getApiKeyType } from '../utils/apiUtils';
import { runApiConnectionTests } from '../tests/apiConnectionTest';
import { estimateFromFilePaths, formatEstimation } from '../utils/estimationUtils';
import { listModels, printCurrentModel } from '../clients/utils/modelLister';

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
  try {
    // Add debug information if debug mode is enabled
    if (options.debug) {
      logger.debug(`Review options: ${JSON.stringify(options, null, 2)}`);
      logger.debug(`Target path: ${target}`);
      logger.debug(`Selected model: ${process.env.AI_CODE_REVIEW_MODEL || 'not set'}`);
      logger.debug(`API key type: ${getApiKeyType() || 'None'}`);
    }

    // If listmodels flag is set, list available models and exit
    if (options.listmodels) {
      logger.info('Listing available models based on configured API keys...');
      listModels(false); // Show all models, not just available ones
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
      logger.info(`Starting individual ${options.type} reviews for ${target}...`);
    } else if (options.type === 'architectural') {
      logger.info(`Starting architectural review for ${target}...`);
    } else {
      logger.info(`Starting consolidated ${options.type} review for ${target}...`);
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
    const filesToReview = await discoverFiles(target, projectPath, options.includeTests);

    if (filesToReview.length === 0) {
      return; // No files to review, exit early
    }

    // If estimate flag is set, calculate and display token usage and cost estimates
    if (options.estimate) {
      logger.info('Calculating token usage and cost estimates...');

      // Get the model name from environment variables
      const modelName = process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';

      // Estimate token usage and cost
      const estimation = await estimateFromFilePaths(filesToReview, options.type, modelName);

      // Display the estimation results
      const formattedEstimation = formatEstimation(estimation, options.type, modelName);
      logger.info(formattedEstimation);

      return; // Exit after displaying the estimation
    }

    // Check if interactive mode is appropriate for individual reviews
    // Interactive mode with individual reviews only makes sense for a single file
    // because we can't effectively display multiple individual reviews interactively
    if (options.interactive && options.individual && filesToReview.length > 1) {
      logger.warn('Interactive mode with individual reviews is only supported for single file reviews.');
      logger.warn('Switching to consolidated review mode for interactive review of multiple files.');
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

    // Create and execute the appropriate strategy based on review options
    logger.info(`Creating ${options.type} review strategy...`);
    const strategy = StrategyFactory.createStrategy(options);

    // Select the appropriate API client
    const apiClientConfig = await selectApiClient();

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
    const targetName = path.basename(target || 'unknown');

    // Save the review output
    const outputPath = await saveReviewOutput(
      review,
      options,
      outputBaseDir,
      apiClientConfig.modelName,
      targetName
    );

    // If interactive mode is enabled, display the review results
    if (options.interactive) {
      await displayReviewInteractively(outputPath, projectPath, options);
    }

    logger.info('Review completed!');
  } catch (error) {
    logger.error(`An unexpected error occurred during the review process: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
