/**
 * @fileoverview Handler for consolidated code reviews.
 *
 * This module implements the consolidated review functionality, which analyzes multiple files
 * together to provide a comprehensive review of the codebase. It coordinates with the
 * appropriate modules for API client selection, review generation, output management,
 * and interactive display.
 */

import path from 'path';
import fs from 'fs/promises';
import { ReviewOptions, ReviewType, FileInfo } from '../types/review';
import { readProjectDocs } from '../utils/projectDocs';
import logger from '../utils/logger';
import { logError } from '../utils/errorLogger';

// Import the new modules
import { selectApiClient } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import { saveReviewOutput } from '../core/OutputManager';
import { displayReviewInteractively } from '../core/InteractiveDisplayManager';

/**
 * Handle consolidated review for multiple files
 * @param project - The project name
 * @param projectPath - The absolute path to the project
 * @param filesToReview - An array of file paths to review
 * @param outputBaseDir - The base directory for output
 * @param options - Review options including type, output format, and interactive mode
 * @param originalTarget - The original target path specified by the user
 * @returns Promise that resolves when the review is complete
 */
export async function handleConsolidatedReview(
  project: string,
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions,
  originalTarget: string = ''
): Promise<void> {
  logger.info(`Generating consolidated review for ${filesToReview.length} files...`);

  // Read project documentation if enabled
  let projectDocs = null;
  if (options.includeProjectDocs) {
    logger.info('Reading project documentation...');
    projectDocs = await readProjectDocs(projectPath);
  }

  // Collect file information
  const fileInfos: FileInfo[] = [];

  for (const filePath of filesToReview) {
    try {
      // Get relative path from project root
      const relativePath = path.relative(projectPath, filePath);

      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Add to file infos
      fileInfos.push({
        path: filePath,
        relativePath,
        content: fileContent
      });
    } catch (error) {
      logger.error(`Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    // Select the appropriate API client
    const apiClientConfig = await selectApiClient();

    // Generate the review using the selected API client
    const review = await generateReview(
      fileInfos,
      project,
      options.type as ReviewType,
      projectDocs,
      options,
      apiClientConfig
    );

    // Get the target name (last part of the path)
    const targetName = path.basename(originalTarget || 'unknown');

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
  } catch (apiError: unknown) {
    if (apiError instanceof Error) {
      // Log the error
      const errorLogPath = await logError(apiError, {
        project,
        reviewType: options.type,
        operation: 'generateConsolidatedReview',
        fileCount: fileInfos.length
      });

      // Check if it's a rate limit error
      if (apiError.message && apiError.message.includes('Rate limit exceeded')) {
        logger.error('Rate limit exceeded. The review will continue with a fallback model.');
        logger.error(`Error details logged to: ${errorLogPath}`);
        logger.error('You can try again later or reduce the number of files being reviewed.');
      } else {
        logger.error(`Error generating consolidated review:`);
        logger.error(`  Message: ${apiError.message}`);
        logger.error(`  Error details logged to: ${errorLogPath}`);
      }
    } else {
      logger.error(`Unknown error generating consolidated review: ${String(apiError)}`);
    }
  }
}


