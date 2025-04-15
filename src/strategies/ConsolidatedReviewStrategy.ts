/**
 * @fileoverview Consolidated review strategy implementation.
 *
 * This module implements the consolidated review strategy, which analyzes multiple files
 * together to provide a comprehensive review of the codebase.
 */

import { BaseReviewStrategy } from './ReviewStrategy';
import {
  FileInfo,
  ReviewOptions,
  ReviewResult,
  ReviewType
} from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';
import { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import logger from '../utils/logger';

/**
 * Strategy for consolidated reviews of multiple files
 */
export class ConsolidatedReviewStrategy extends BaseReviewStrategy {
  /**
   * Create a new consolidated review strategy
   * @param reviewType Type of review to perform
   */
  constructor(reviewType: ReviewType) {
    super(reviewType);
  }

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
    apiClientConfig: ApiClientConfig
  ): Promise<ReviewResult> {
    logger.info(`Executing consolidated ${this.reviewType} review strategy...`);

    // Generate the review using the selected API client
    return generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      options,
      apiClientConfig
    );
  }
}
