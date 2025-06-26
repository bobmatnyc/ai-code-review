/**
 * @fileoverview Output handling for code review results
 * 
 * This module handles saving and displaying code review results
 * in different formats.
 */

import * as path from 'path';
import logger from '../../utils/logger';
import { ReviewOptions, ReviewResult } from '../../types/review';
import { saveReviewOutput } from '../OutputManager';
import { displayReviewInteractively } from '../InteractiveDisplayManager';

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
  outputBaseDir: string
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
        targetName
      );
      
      logger.info(`Review saved to: ${outputPath}`);
      
      // Display review interactively if requested
      if (options.interactive) {
        try {
          await displayReviewInteractively(outputPath, process.cwd(), options);
        } catch (error) {
          logger.error(`Failed to display review interactively: ${
            error instanceof Error ? error.message : String(error)
          }`);
        }
      }
    } catch (error) {
      logger.error(`Failed to save review output: ${
        error instanceof Error ? error.message : String(error)
      }`);
    }
  }
  
  // Log completion message
  logger.info('Review completed successfully');
  
  // Log cost information if available
  if (reviewResult.cost) {
    logger.info(`Estimated cost: ${reviewResult.cost}`);
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
  options: { outputDir?: string; configOutputDir?: string }
): string {
  // Get the output directory from options, config, or default
  const defaultOutputDir = 'ai-code-review-docs';
  const configOutputDir = options.configOutputDir || defaultOutputDir;
  const outputDir = options.outputDir || configOutputDir;
  
  // Determine if the path is absolute or relative
  const outputBaseDir = path.isAbsolute(outputDir) 
    ? outputDir 
    : path.resolve(projectPath, outputDir);
  
  // Log the output directory
  if (outputDir !== defaultOutputDir) {
    logger.info(`Using custom output directory: ${outputBaseDir}`);
  }
  
  return outputBaseDir;
}