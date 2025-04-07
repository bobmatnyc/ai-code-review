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

// Import review handlers
import { handleConsolidatedReview } from '../handlers/consolidatedReviewHandler';
import { handleArchitecturalReview } from '../handlers/architecturalReviewHandler';
import { handleIndividualFileReviews } from '../handlers/individualReviewHandler';

/**
 * Orchestrate the code review process
 * @param target Path to the file or directory to review
 * @param options Review options
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
    if (options.interactive && options.individual && filesToReview.length > 1) {
      logger.warn('Interactive mode with individual reviews is only supported for single file reviews.');
      logger.warn('Switching to consolidated review mode for interactive review of multiple files.');
      options.individual = false;
    }

    // Create output directory for reviews
    const actualProjectName = projectName || 'unknown-project';

    // Handle different review types
    if (options.type === 'architectural') {
      await handleArchitecturalReview(
        actualProjectName,
        projectPath,
        filesToReview,
        outputBaseDir,
        options,
        target
      );
    } else if (options.individual) {
      // Process each file individually if --individual flag is set
      await handleIndividualFileReviews(
        actualProjectName,
        projectPath,
        filesToReview,
        outputBaseDir,
        options
      );
    } else {
      // Generate a consolidated review by default
      await handleConsolidatedReview(
        actualProjectName,
        projectPath,
        filesToReview,
        outputBaseDir,
        options,
        target
      );
    }

    logger.info('Review completed!');
  } catch (error) {
    logger.error(`An unexpected error occurred during the review process: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
