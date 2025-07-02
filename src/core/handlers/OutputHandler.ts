/**
 * @fileoverview Output handling for code review results
 *
 * This module handles saving and displaying code review results
 * in different formats.
 */

import * as path from 'path';
import type { ReviewOptions, ReviewResult } from '../../types/review';
import logger from '../../utils/logger';
import { displayReviewInteractively } from '../InteractiveDisplayManager';
import { saveReviewOutput } from '../OutputManager';

// Define TokenUsage interface for this module
interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/**
 * Handle review output based on options
 *
 * @param reviewResult Review result to handle
 * @param options Review options
 * @param outputBaseDir Base directory for output
 * @returns Promise that resolves when output handling is complete
 */
export async function handleReviewOutput(
  reviewResult: ReviewResult,
  options: ReviewOptions,
  outputBaseDir: string,
): Promise<void> {
  // Save review output to file
  if (options.output !== 'none') {
    try {
      const targetName = path.basename(options.target || '.');
      const modelName = options.model || 'unknown-model';

      const outputPath = await saveReviewOutput(
        reviewResult,
        options,
        outputBaseDir,
        modelName,
        targetName,
      );

      logger.info(`Review saved to: ${outputPath}`);

      // Display review interactively if requested
      if (options.interactive) {
        try {
          await displayReviewInteractively(outputPath, process.cwd(), options);
        } catch (error) {
          logger.error(
            `Failed to display review interactively: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    } catch (error) {
      logger.error(
        `Failed to save review output: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Log completion message
  logger.info('Review completed successfully');

  // Log cost information if available
  if (reviewResult.cost) {
    // Use formattedCost if available, otherwise fall back to string representation
    const costDisplay =
      typeof reviewResult.cost === 'object' && reviewResult.cost.formattedCost
        ? reviewResult.cost.formattedCost
        : reviewResult.cost;
    logger.info(`Estimated cost: ${costDisplay}`);
  }

  // Log token usage if available
  if ((reviewResult as any).tokenUsage) {
    const { input, output, total } = (reviewResult as any).tokenUsage as TokenUsage;
    logger.info(`Token usage: ${input} input + ${output} output = ${total} total`);
  }
}

/**
 * Create output directory for review
 *
 * @param projectPath Project path
 * @param options Review options
 * @returns Output base directory
 */
export function createOutputDirectory(
  projectPath: string,
  options: { outputDir?: string; configOutputDir?: string },
): string {
  // Get the output directory from options, config, or default
  const defaultOutputDir = 'ai-code-review-docs';
  const configOutputDir = options.configOutputDir || defaultOutputDir;
  const outputDir = options.outputDir || configOutputDir;

  // Basic security validation: prevent obvious path traversal attempts
  if (outputDir.includes('..')) {
    throw new Error('Output directory path cannot contain ".." for security reasons');
  }

  // Determine if the path is absolute or relative
  let outputBaseDir: string;

  if (path.isAbsolute(outputDir)) {
    outputBaseDir = outputDir;
  } else {
    outputBaseDir = path.resolve(projectPath, outputDir);
  }

  // Log the output directory
  if (options.outputDir) {
    logger.info(`Using custom output directory: ${outputBaseDir}`);
  }

  return outputBaseDir;
}
