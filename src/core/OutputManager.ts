/**
 * @fileoverview Output manager module.
 *
 * This module is responsible for formatting and saving review outputs to files.
 * It centralizes the logic for generating output paths and writing review results.
 */

import path from 'path';
import fs from 'fs/promises';
import { ReviewResult, ReviewOptions } from '../types/review';
import { formatReviewOutput } from '../formatters/outputFormatter';
import { generateVersionedOutputPath } from '../utils/fileSystem';
import { logError } from '../utils/errorLogger';
import logger from '../utils/logger';

/**
 * Format and save a review result to a file
 * @param review Review result to save
 * @param options Review options
 * @param outputBaseDir Base directory for output
 * @param modelName Name of the model used for the review
 * @param targetName Name of the target file or directory
 * @returns Promise resolving to the path of the saved file
 */
export async function saveReviewOutput(
  review: ReviewResult,
  options: ReviewOptions,
  outputBaseDir: string,
  modelName: string,
  targetName: string
): Promise<string> {
  try {
    // Generate a versioned output path
    const extension = options.output === 'json' ? '.json' : '.md';
    
    const outputPath = await generateVersionedOutputPath(
      outputBaseDir,
      options.type + '-review',
      extension,
      modelName,
      targetName
    );

    // Format the review output
    const formattedOutput = formatReviewOutput(review, options.output);

    // Write the output to the file
    await fs.writeFile(outputPath, formattedOutput);
    logger.info(`Review saved to: ${outputPath}`);

    return outputPath;
  } catch (error: unknown) {
    if (error instanceof Error) {
      const errorLogPath = await logError(error, {
        operation: 'writeFile',
        outputPath: 'unknown',
        reviewType: options.type
      });

      logger.error(`Error saving review output:`);
      logger.error(`  Message: ${error.message}`);
      logger.error(`  Error details logged to: ${errorLogPath}`);
    } else {
      logger.error(`Unknown error saving review output: ${String(error)}`);
    }

    throw error;
  }
}
