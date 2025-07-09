/**
 * @fileoverview Review execution handler for code review
 *
 * This module handles the execution of code reviews using different strategies
 * based on review type and options.
 */

import * as path from 'node:path';
import type { TokenAnalysisResult } from '../../analysis/tokens';
import { StrategyFactory } from '../../strategies/StrategyFactory';
import type { ReviewOptions, ReviewResult } from '../../types/review';
import logger from '../../utils/logger';
import type { FileInfo } from '../fileDiscovery';

/**
 * Execute code review using appropriate strategy
 *
 * @param fileInfos Array of file information objects
 * @param options Review options
 * @param apiClientConfig API client configuration
 * @param projectDocs Project documentation
 * @param semanticResult Semantic analysis result (if available)
 * @param tokenAnalysis Token analysis result (if available)
 * @returns Promise that resolves to review result
 */
export async function executeReview(
  fileInfos: FileInfo[],
  options: ReviewOptions,
  apiClientConfig: { modelName: string; [key: string]: unknown },
  projectDocs: unknown = null,
  tokenAnalysis: TokenAnalysisResult | null = null,
): Promise<ReviewResult> {
  // Create strategy based on review type
  const strategy = StrategyFactory.createStrategy(options);

  if (!strategy) {
    throw new Error(`Unsupported review type: ${options.type}`);
  }

  logger.info(`Using ${options.type} review strategy`);

  // Determine if we need multi-pass review
  const needsMultiPass = determineIfMultiPassNeeded(options, tokenAnalysis);

  if (needsMultiPass) {
    logger.info('Using multi-pass review due to content size or complexity');
  }

  // Get project name
  const projectPath = process.cwd();
  const projectName = path.basename(projectPath);

  // Execute the review
  const reviewResult = await strategy.execute(
    fileInfos,
    projectName,
    projectDocs as any,
    options,
    apiClientConfig as any,
  );

  return reviewResult;
}

/**
 * Determine if multi-pass review is needed
 *
 * @param options Review options
 * @param tokenAnalysis Token analysis result (if available)
 * @returns Whether multi-pass review is needed
 */
export function determineIfMultiPassNeeded(
  options: ReviewOptions,
  tokenAnalysis: TokenAnalysisResult | null,
): boolean {
  // If multi-pass is explicitly enabled, use it
  if (options.multiPass) {
    return true;
  }

  // If force single-pass is enabled, don't use multi-pass
  if (options.forceSinglePass) {
    return false;
  }

  // If we have token analysis, use its recommendation
  if (tokenAnalysis?.chunkingRecommendation) {
    return tokenAnalysis.chunkingRecommendation.chunkingRecommended;
  }

  // Default to false if we can't determine
  return false;
}
