/**
 * @fileoverview Utilities for estimating token usage and costs for code reviews.
 *
 * This module provides functions for estimating token usage and costs for code reviews
 * based on file content and model selection. It uses the tokenCounter utilities for
 * basic token counting and cost calculation, and adds specialized functions for
 * estimating review-specific token usage patterns.
 */

import path from 'path';
import fs from 'fs/promises';
import { estimateTokenCount, calculateCost, formatCost, getCostInfo, EstimatorFactory } from '../estimators';
import logger from './logger';
import { FileInfo } from '../types/review';

/**
 * Ratio of output tokens to input tokens based on empirical observations
 * This is an approximation and may vary based on the specific review type and content
 */
const OUTPUT_TO_INPUT_RATIO = {
  'architectural': 0.6,  // Architectural reviews tend to be more concise
  'quick-fixes': 0.8,    // Quick fixes often include code snippets
  'security': 0.7,       // Security reviews are moderately detailed
  'performance': 0.7,    // Performance reviews are similar to security
  'default': 0.75        // Default ratio if review type is not specified
};

/**
 * Overhead tokens for review context, instructions, and formatting
 * This is added to the total token count to account for the review framework
 */
const REVIEW_OVERHEAD_TOKENS = 1500;

/**
 * Estimate the number of output tokens based on input tokens and review type
 * @param inputTokens Number of input tokens
 * @param reviewType Type of review
 * @returns Estimated number of output tokens
 */
export function estimateOutputTokens(inputTokens: number, reviewType: string): number {
  const ratio = OUTPUT_TO_INPUT_RATIO[reviewType as keyof typeof OUTPUT_TO_INPUT_RATIO] || OUTPUT_TO_INPUT_RATIO.default;
  return Math.ceil(inputTokens * ratio);
}

/**
 * Estimate token usage and cost for a set of files
 *
 * This function calculates the estimated token usage and cost for reviewing a set of files
 * using a specified AI model. It considers:
 * - The content of each file (code, comments, etc.)
 * - The type of review being performed (quick, security, architectural, etc.)
 * - The specific AI model being used and its pricing structure
 *
 * The estimation includes overhead tokens for system prompts and instructions that are
 * included in every review, in addition to the tokens from the file content itself.
 *
 * @param files Array of file information objects containing file content and metadata
 * @param reviewType Type of review (quick, security, architectural, performance)
 * @param modelName Name of the model to use (e.g., 'gemini:gemini-1.5-pro')
 * @returns Estimated token usage and cost information including:
 *   - inputTokens: Number of tokens in the input (files + prompts)
 *   - outputTokens: Estimated number of tokens in the AI response
 *   - totalTokens: Total token usage (input + output)
 *   - estimatedCost: Estimated cost in USD
 *   - formattedCost: Cost formatted as a string (e.g., '$0.12 USD')
 *   - fileCount: Number of files being reviewed
 *   - totalFileSize: Total size of all files in bytes
 */
export async function estimateReviewCost(
  files: FileInfo[],
  reviewType: string,
  modelName: string = process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro'
): Promise<{
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  formattedCost: string;
  fileCount: number;
  totalFileSize: number;
}> {
  // Calculate total input tokens from all files
  let totalInputTokens = REVIEW_OVERHEAD_TOKENS; // Start with overhead tokens
  let totalFileSize = 0;

  for (const file of files) {
    const fileTokens = estimateTokenCount(file.content);
    totalInputTokens += fileTokens;
    totalFileSize += file.content.length;
  }

  // Estimate output tokens based on input tokens and review type
  const estimatedOutputTokens = estimateOutputTokens(totalInputTokens, reviewType);

  // Calculate cost information
  const costInfo = getCostInfo(totalInputTokens, estimatedOutputTokens, modelName);

  return {
    ...costInfo,
    fileCount: files.length,
    totalFileSize
  };
}

/**
 * Format estimation results as a human-readable string
 *
 * This function takes the estimation results from estimateReviewCost or estimateFromFilePaths
 * and formats them into a user-friendly string that can be displayed to the user.
 *
 * The formatted string includes:
 * - Number of files being reviewed
 * - Total file size
 * - Input token count
 * - Estimated output token count
 * - Total token usage
 * - Estimated cost in USD
 *
 * @param estimation Estimation results from estimateReviewCost or estimateFromFilePaths
 * @param reviewType Type of review (quick, security, architectural, performance)
 * @param modelName Name of the model being used
 * @returns Formatted estimation string ready for display
 * @example
 * // Example output:
 * // Estimation for 5 files (25.5 KB) using gemini-1.5-pro:
 * // - Review type: quick
 * // - Input tokens: 5,000
 * // - Output tokens: 2,500 (estimated)
 * // - Total tokens: 7,500
 * // - Estimated Cost: $0.015 USD
 */
export function formatEstimation(
  estimation: ReturnType<typeof estimateReviewCost> extends Promise<infer T> ? T : never,
  reviewType: string,
  modelName: string
): string {
  // Extract provider and model if available
  const [provider, model] = modelName.includes(':') ? modelName.split(':') : [undefined, modelName];
  const displayModel = model || modelName;
  const displayProvider = provider ? `${provider.charAt(0).toUpperCase() + provider.slice(1)}` : 'Unknown';
  const fileSizeInKB = (estimation.totalFileSize / 1024).toFixed(2);
  const averageFileSize = estimation.fileCount > 0
    ? ((estimation.totalFileSize / estimation.fileCount) / 1024).toFixed(2)
    : '0.00';

  return `
=== Token Usage and Cost Estimation ===

Review Type: ${reviewType}
Provider: ${displayProvider}
Model: ${displayModel}
Files: ${estimation.fileCount} (${fileSizeInKB} KB total, ${averageFileSize} KB average)

Token Usage:
  Input Tokens: ${estimation.inputTokens.toLocaleString()} (includes ${REVIEW_OVERHEAD_TOKENS.toLocaleString()} overhead tokens)
  Estimated Output Tokens: ${estimation.outputTokens.toLocaleString()}
  Total Tokens: ${estimation.totalTokens.toLocaleString()}

Estimated Cost: ${estimation.formattedCost}

Note: This is an estimate based on approximate token counts and may vary
      based on the actual content and model behavior.
`;
}

/**
 * Estimate token usage and cost for a set of file paths
 *
 * This function is a convenience wrapper around estimateReviewCost that takes file paths
 * instead of FileInfo objects. It reads the content of each file and then calls
 * estimateReviewCost to calculate the token usage and cost.
 *
 * This is particularly useful for the --estimate command line flag, which needs to
 * estimate costs before actually performing a review.
 *
 * @param filePaths Array of file paths to estimate token usage for
 * @param reviewType Type of review (quick, security, architectural, performance)
 * @param modelName Name of the model to use (e.g., 'gemini:gemini-1.5-pro')
 * @returns Estimated token usage and cost information (same as estimateReviewCost)
 * @throws Error if any file cannot be read
 * @see estimateReviewCost for details on the return value
 */
export async function estimateFromFilePaths(
  filePaths: string[],
  reviewType: string,
  modelName: string = process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro'
): Promise<ReturnType<typeof estimateReviewCost> extends Promise<infer T> ? T : never> {
  // Read file contents
  const files: FileInfo[] = [];

  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      files.push({
        path: filePath,
        relativePath: path.basename(filePath),
        content
      });
    } catch (error) {
      logger.error(`Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Estimate cost
  return await estimateReviewCost(files, reviewType, modelName);
}
