/**
 * @fileoverview Review strategy interface and base class.
 *
 * This module defines the interface and base class for review strategies,
 * which encapsulate the logic for different types of code reviews.
 */

import type { ApiClientConfig } from '../core/ApiClientSelector';
import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import type { ProjectDocs } from '../utils/projectDocs';

/**
 * Interface for review strategies
 */
export interface IReviewStrategy {
  /**
   * Execute the review strategy
   * @param files Files to review
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult>;
}

/**
 * Base class for review strategies
 */
export abstract class BaseReviewStrategy implements IReviewStrategy {
  protected reviewType: ReviewType;

  /**
   * Create a new review strategy
   * @param reviewType Type of review to perform
   */
  constructor(reviewType: ReviewType) {
    this.reviewType = reviewType;
  }

  /**
   * Execute the review strategy
   * @param files Files to review
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  abstract execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult>;
}
