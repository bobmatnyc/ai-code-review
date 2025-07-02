/**
 * @fileoverview Abstract base class for review strategies.
 *
 * This module defines an abstract base class that encapsulates common functionality
 * across different review strategy implementations. It provides a unified interface
 * for executing reviews with different approaches and configurations.
 */

import type { ApiClientConfig } from '../../core/ApiClientSelector';
import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';

/**
 * Abstract base class for review strategies
 */
export abstract class AbstractStrategy {
  /**
   * The review type (quick-fixes, architectural, security, etc.)
   */
  protected reviewType: ReviewType;

  /**
   * Constructor
   * @param reviewType The type of review to perform
   */
  constructor(reviewType: ReviewType) {
    this.reviewType = reviewType;
  }

  /**
   * Execute the review strategy
   * @param files Array of file information objects
   * @param projectName Name of the project
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  public abstract execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult>;

  /**
   * Get the review type
   * @returns The review type
   */
  public getReviewType(): ReviewType {
    return this.reviewType;
  }

  /**
   * Validate the input parameters
   * @param files Array of file information objects
   * @param projectName Name of the project
   * @returns Whether the input is valid
   */
  protected validateInput(files: FileInfo[], projectName: string): boolean {
    if (!files || files.length === 0) {
      logger.error('No files provided for review');
      return false;
    }

    if (!projectName) {
      logger.error('No project name provided');
      return false;
    }

    return true;
  }

  /**
   * Log the review execution start
   * @param files Array of file information objects
   * @param projectName Name of the project
   */
  protected logExecutionStart(files: FileInfo[], projectName: string): void {
    logger.info(
      `Executing ${this.reviewType} review for ${projectName} with ${files.length} files`,
    );
  }

  /**
   * Log the review execution completion
   * @param result The review result
   */
  protected logExecutionCompletion(result: ReviewResult): void {
    logger.info(
      `Completed ${this.reviewType} review, generated ${result.content.length} characters of content`,
    );
  }

  /**
   * Handle errors during review execution
   * @param error The error that occurred
   * @param operation The operation that was being performed
   * @throws The processed error
   */
  protected handleError(error: unknown, operation: string): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error during ${this.reviewType} review ${operation}: ${errorMessage}`);
    throw error;
  }
}
