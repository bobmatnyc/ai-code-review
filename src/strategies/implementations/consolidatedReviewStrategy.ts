/**
 * @fileoverview Consolidated review strategy implementation.
 * 
 * This module implements a consolidated review strategy using the abstract strategy
 * base class. It handles reviewing multiple files as a consolidated unit, using
 * the appropriate API client for the selected model.
 */

import { AbstractStrategy } from '../base';
import {
  FileInfo,
  ReviewOptions,
  ReviewResult,
  ReviewType
} from '../../types/review';
import { ProjectDocs } from '../../utils/projectDocs';
import { ApiClientConfig } from '../../core/ApiClientSelector';
// import logger from '../../utils/logger';
// import { ClientFactory } from '../../clients/factory';
import { generateReview } from '../../core/ReviewGenerator';

/**
 * Strategy for consolidated code reviews
 */
export class ConsolidatedReviewStrategy extends AbstractStrategy {
  /**
   * Constructor
   * @param reviewType The type of review to perform
   */
  constructor(reviewType: ReviewType) {
    super(reviewType);
  }
  
  /**
   * Execute the consolidated review strategy
   * @param files Array of file information objects
   * @param projectName Name of the project
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  public async execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig
  ): Promise<ReviewResult> {
    try {
      // Validate input
      if (!this.validateInput(files, projectName)) {
        throw new Error('Invalid input for consolidated review');
      }
      
      // Log execution start
      this.logExecutionStart(files, projectName);
      
      // Use the core ReviewGenerator to generate the review
      const result = await generateReview(
        files,
        projectName,
        this.reviewType,
        projectDocs,
        options,
        apiClientConfig
      );
      
      // Log execution completion
      this.logExecutionCompletion(result);
      
      return result;
    } catch (error) {
      this.handleError(error, 'execution');
    }
  }
}