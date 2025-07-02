/**
 * @fileoverview Architectural review strategy implementation.
 *
 * This module implements the architectural review strategy, which analyzes the entire
 * codebase structure and design patterns to provide high-level feedback.
 */

import type { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import type { FileInfo, ReviewOptions, ReviewResult /* , ReviewType */ } from '../types/review'; // ReviewType not used
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import { BaseReviewStrategy } from './ReviewStrategy';

/**
 * Strategy for architectural reviews
 */
export class ArchitecturalReviewStrategy extends BaseReviewStrategy {
  /**
   * Create a new architectural review strategy
   */
  constructor() {
    super('architectural');
  }

  /**
   * Execute the architectural review strategy
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
    logger.info('Executing architectural review strategy...');

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
