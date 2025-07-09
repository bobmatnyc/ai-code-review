/**
 * @fileoverview Utilities for estimating token usage and costs for code reviews.
 *
 * This module provides functions for estimating token usage and costs for code reviews
 * based on file content and model selection. It uses the tokenCounter utilities for
 * basic token counting and cost calculation, and adds specialized functions for
 * estimating review-specific token usage patterns.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { estimateTokenCount, formatCost, getCostInfo } from '../estimators';
import type { FileInfo } from '../types/review';
import logger from './logger';

/**
 * Ratio of output tokens to input tokens based on empirical observations
 * This is an approximation and may vary based on the specific review type and content
 */
const OUTPUT_TO_INPUT_RATIO = {
  architectural: 0.6, // Architectural reviews tend to be more concise
  'quick-fixes': 0.8, // Quick fixes often include code snippets
  security: 0.7, // Security reviews are moderately detailed
  performance: 0.7, // Performance reviews are similar to security
  default: 0.75, // Default ratio if review type is not specified
};

/**
 * Overhead tokens for review context, instructions, and formatting
 * This is added to the total token count to account for the review framework
 */
const REVIEW_OVERHEAD_TOKENS = 1500;

/**
 * Context maintenance overhead factor for multi-pass reviews
 * This factor is applied to estimate additional tokens needed for maintaining context
 */
const MULTI_PASS_CONTEXT_MAINTENANCE_FACTOR = 0.15;

/**
 * Additional overhead tokens per pass in multi-pass reviews
 * This accounts for pass management, coordination, and state tracking
 */
const MULTI_PASS_OVERHEAD_PER_PASS = 800;

/**
 * Estimate the number of output tokens based on input tokens and review type
 * @param inputTokens Number of input tokens
 * @param reviewType Type of review
 * @returns Estimated number of output tokens
 */
export function estimateOutputTokens(inputTokens: number, reviewType: string): number {
  const ratio =
    OUTPUT_TO_INPUT_RATIO[reviewType as keyof typeof OUTPUT_TO_INPUT_RATIO] ||
    OUTPUT_TO_INPUT_RATIO.default;
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
  modelName: string = process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro',
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
    totalFileSize,
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
  modelName: string,
): string {
  // Extract provider and model if available
  const [provider, model] = modelName.includes(':') ? modelName.split(':') : [undefined, modelName];
  const displayModel = model || modelName;
  const displayProvider = provider
    ? `${provider.charAt(0).toUpperCase() + provider.slice(1)}`
    : 'Unknown';
  const fileSizeInKB = (estimation.totalFileSize / 1024).toFixed(2);
  const averageFileSize =
    estimation.fileCount > 0
      ? (estimation.totalFileSize / estimation.fileCount / 1024).toFixed(2)
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
  modelName: string = process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro',
): Promise<ReturnType<typeof estimateReviewCost> extends Promise<infer T> ? T : never> {
  // Read file contents
  const files: FileInfo[] = [];

  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      files.push({
        path: filePath,
        relativePath: path.basename(filePath),
        content,
      });
    } catch (error) {
      logger.error(
        `Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Estimate cost
  return await estimateReviewCost(files, reviewType, modelName);
}

/**
 * Estimate token usage and cost for a multi-pass review
 *
 * This function extends the standard token estimation by accounting for the overhead
 * of multi-pass reviews, including context maintenance between passes and additional
 * overhead for each pass.
 *
 * @param files Array of file information objects containing file content and metadata
 * @param reviewType Type of review (quick, security, architectural, performance)
 * @param modelName Name of the model to use (e.g., 'gemini:gemini-1.5-pro')
 * @param options Additional estimation options
 * @param options.passCount Number of passes to estimate (if known)
 * @param options.contextMaintenanceFactor Factor for context maintenance overhead (0-1)
 * @returns Estimated token usage and cost information for multi-pass review
 */
export async function estimateMultiPassReviewCost(
  files: FileInfo[],
  reviewType: string,
  modelName: string = process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro',
  options: {
    passCount?: number;
    contextMaintenanceFactor?: number;
  } = {},
): Promise<{
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  formattedCost: string;
  fileCount: number;
  totalFileSize: number;
  passCount: number;
  perPassCosts: {
    passNumber: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  }[];
}> {
  // Calculate total input tokens from all files
  let totalFileTokens = 0;
  let totalFileSize = 0;

  for (const file of files) {
    const fileTokens = estimateTokenCount(file.content);
    totalFileTokens += fileTokens;
    totalFileSize += file.content.length;
  }

  // Calculate or determine the number of passes
  const contextMaintenanceFactor =
    options.contextMaintenanceFactor || MULTI_PASS_CONTEXT_MAINTENANCE_FACTOR;

  // Get a rough estimate of context window size based on the model
  // This is a simplified approach - in production we'd get this from modelMaps.ts
  const getContextWindow = (model: string): number => {
    if (model.includes('claude')) return 200000;
    if (model.includes('gpt-4o')) return 128000;
    if (model.includes('gpt-4')) return 128000;
    if (model.includes('gemini')) return 1000000;
    return 100000; // Default
  };

  const contextWindow = getContextWindow(modelName);
  const effectiveContextSize = Math.floor(contextWindow * (1 - contextMaintenanceFactor));

  // Determine number of passes if not provided
  const passCount =
    options.passCount || Math.max(1, Math.ceil(totalFileTokens / effectiveContextSize));

  // Calculate tokens per pass (roughly equal distribution for estimation)
  const tokensPerPass = totalFileTokens / passCount;

  // Calculate per-pass costs
  const perPassCosts = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalEstimatedCost = 0;

  for (let i = 0; i < passCount; i++) {
    // Each pass has standard overhead plus context maintenance overhead
    const passInputTokens = Math.ceil(
      tokensPerPass + REVIEW_OVERHEAD_TOKENS + MULTI_PASS_OVERHEAD_PER_PASS,
    );

    // For passes after the first, add context from previous passes
    const contextTokens = i > 0 ? Math.ceil(i * MULTI_PASS_OVERHEAD_PER_PASS * 1.5) : 0;
    const totalPassInputTokens = passInputTokens + contextTokens;

    // Estimate output tokens
    const passOutputTokens = estimateOutputTokens(totalPassInputTokens, reviewType);

    // Calculate cost for this pass
    const passCostInfo = getCostInfo(totalPassInputTokens, passOutputTokens, modelName);

    perPassCosts.push({
      passNumber: i + 1,
      inputTokens: totalPassInputTokens,
      outputTokens: passOutputTokens,
      totalTokens: totalPassInputTokens + passOutputTokens,
      estimatedCost: passCostInfo.estimatedCost,
    });

    // Accumulate totals
    totalInputTokens += totalPassInputTokens;
    totalOutputTokens += passOutputTokens;
    totalEstimatedCost += passCostInfo.estimatedCost;
  }

  return {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    estimatedCost: totalEstimatedCost,
    formattedCost: formatCost(totalEstimatedCost),
    fileCount: files.length,
    totalFileSize,
    passCount,
    perPassCosts,
  };
}

/**
 * Format multi-pass estimation results as a human-readable string
 *
 * @param estimation Multi-pass estimation results
 * @param reviewType Type of review
 * @param modelName Name of the model being used
 * @returns Formatted estimation string
 */
export function formatMultiPassEstimation(
  estimation: ReturnType<typeof estimateMultiPassReviewCost> extends Promise<infer T> ? T : never,
  reviewType: string,
  modelName: string,
): string {
  // Extract provider and model if available
  const [provider, model] = modelName.includes(':') ? modelName.split(':') : [undefined, modelName];
  const displayModel = model || modelName;
  const displayProvider = provider
    ? `${provider.charAt(0).toUpperCase() + provider.slice(1)}`
    : 'Unknown';
  const fileSizeInKB = (estimation.totalFileSize / 1024).toFixed(2);
  const averageFileSize =
    estimation.fileCount > 0
      ? (estimation.totalFileSize / estimation.fileCount / 1024).toFixed(2)
      : '0.00';

  let output = `
=== Multi-Pass Token Usage and Cost Estimation ===

Review Type: ${reviewType}
Provider: ${displayProvider}
Model: ${displayModel}
Files: ${estimation.fileCount} (${fileSizeInKB} KB total, ${averageFileSize} KB average)
Passes: ${estimation.passCount}

Total Token Usage:
  Input Tokens: ${estimation.inputTokens.toLocaleString()}
  Estimated Output Tokens: ${estimation.outputTokens.toLocaleString()}
  Total Tokens: ${estimation.totalTokens.toLocaleString()}

Estimated Total Cost: ${estimation.formattedCost}

Per-Pass Breakdown:
`;

  estimation.perPassCosts.forEach((passCost) => {
    output += `  Pass ${passCost.passNumber}:
    Input Tokens: ${passCost.inputTokens.toLocaleString()}
    Output Tokens: ${passCost.outputTokens.toLocaleString()}
    Cost: ${formatCost(passCost.estimatedCost)}
`;
  });

  output += `
Note: This is an estimate based on approximate token counts and may vary
      based on the actual content and model behavior.
`;

  return output;
}
