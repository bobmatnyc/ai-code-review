/**
 * @fileoverview Command handler for the code review functionality.
 *
 * This module implements the core code review command handler that processes user input,
 * identifies files to review, coordinates the review process, and manages output generation.
 * It supports multiple review types and modes, including individual file reviews, consolidated
 * reviews, and architectural reviews.
 *
 * Key responsibilities:
 * - Parsing and validating command-line arguments
 * - Identifying and filtering files for review based on user input
 * - Coordinating with the appropriate review handler
 * - Managing output file generation and organization
 * - Supporting interactive streaming mode for real-time feedback
 * - Handling errors and providing user feedback
 *
 * The module is designed to be flexible and extensible to support different review types
 * and output formats while maintaining a consistent user experience.
 */

import path from 'path';
import {
  fileExists,
  directoryExists,
  createDirectory,
  validatePath
} from '../utils/fileSystem';
import { getFilesToReview } from '../utils/fileFilters';
import { runApiConnectionTests } from '../tests/apiConnectionTest';
import { ReviewOptions } from '../types/review';
import logger from '../utils/logger';

// Import review handlers from separate modules
import { handleConsolidatedReview } from '../handlers/consolidatedReviewHandler';
import { handleArchitecturalReview } from '../handlers/architecturalReviewHandler';
import { handleIndividualFileReviews } from '../handlers/individualReviewHandler';

// Import API utilities
import { getApiKeyType } from '../utils/apiUtils';

/**
 * Main entry point for the code review command
 * @param target Path to the file or directory to review
 * @param options Review options
 */
export async function reviewCode(
  target: string,
  options: ReviewOptions
): Promise<void> {
  // Add debug information if debug mode is enabled
  if (options.debug) {
    logger.debug(`Review options: ${JSON.stringify(options, null, 2)}`);
    logger.debug(`Target path: ${target}`);
    logger.debug(
      `Selected model: ${process.env.AI_CODE_REVIEW_MODEL || 'not set'}`
    );
    logger.debug(`API key type: ${getApiKeyType() || 'None'}`);
  }

  // Test API connections if requested
  if (options.testApi) {
    logger.info('Testing API connections before starting review...');
    await runApiConnectionTests();
    logger.info('API connection tests completed. Proceeding with review...');
  }

  if (options.individual) {
    logger.info(`Starting individual ${options.type} reviews for ${target}...`);
  } else if (options.type === 'architectural') {
    logger.info(`Starting architectural review for ${target}...`);
  } else {
    logger.info(
      `Starting consolidated ${options.type} review for ${target}...`
    );
  }

  // Determine the project path
  const projectPath = process.cwd();
  const projectName = path.basename(projectPath);

  // Validate that the target exists
  const isFile = await fileExists(target);
  const isDirectory = await directoryExists(target);

  if (!isFile && !isDirectory) {
    logger.error(`Target not found: ${target}`);
    process.exit(1);
  }

  // Create output directory
  const outputBaseDir = path.resolve(projectPath, 'ai-code-review-docs');
  await createDirectory(outputBaseDir);

  // Log project information
  logger.info(`Project: ${projectName}`);
  logger.info(`Project path: ${projectPath}`);
  logger.info(`Reviewing project: ${projectPath}`);

  // Validate the target path using our secure validatePath function
  let targetPath;
  try {
    targetPath = validatePath(target, projectPath);
  } catch (error) {
    logger.error(`Invalid target path: ${target}`);
    logger.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }

  // Get files to review
  const filesToReview = await getFilesToReview(
    targetPath,
    isFile,
    options.includeTests
  );

  if (filesToReview.length === 0) {
    logger.info('No files found to review.');
    return;
  }

  // Check if interactive mode is appropriate for individual reviews
  if (options.interactive && options.individual && filesToReview.length > 1) {
    logger.warn(
      'Interactive mode with individual reviews is only supported for single file reviews.'
    );
    logger.warn(
      'Switching to consolidated review mode for interactive review of multiple files.'
    );
    options.individual = false;
  }

  logger.info(`Found ${filesToReview.length} files to review.`);

  // Create output directory for reviews
  const actualProjectName = projectName || 'unknown-project';

  // Handle architectural and consolidated reviews differently
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
}
