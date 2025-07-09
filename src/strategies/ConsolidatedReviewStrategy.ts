/**
 * @fileoverview Consolidated review strategy implementation.
 *
 * This module implements the consolidated review strategy, which analyzes multiple files
 * together to provide a comprehensive review of the codebase.
 */

import type { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import type { FileInfo, ReviewOptions, ReviewResult } from '../types/review';
import { collectCIData } from '../utils/ciDataCollector';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import { BaseReviewStrategy } from './ReviewStrategy';

/**
 * Strategy for consolidated reviews of multiple files
 */
export class ConsolidatedReviewStrategy extends BaseReviewStrategy {
  /**
   * Execute the consolidated review strategy
   * @param files Files to review
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  async execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult> {
    logger.info(`Executing consolidated ${this.reviewType} review strategy...`);

    // Collect CI data if we're reviewing TypeScript files
    let ciData;
    if (
      options.language === 'typescript' ||
      files.some((f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
    ) {
      logger.info('Collecting CI data for TypeScript project...');
      ciData = await collectCIData(process.cwd());
      options.ciData = ciData;
    }

    // Generate the review using the selected API client
    return generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      options,
      apiClientConfig,
    );
  }
}
