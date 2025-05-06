/**
 * @fileoverview Individual review strategy implementation.
 * 
 * This module implements an individual review strategy using the abstract strategy
 * base class. It handles reviewing individual files separately, using the appropriate
 * API client for the selected model.
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
import logger from '../../utils/logger';
import { ClientFactory } from '../../clients/factory';

/**
 * Strategy for individual file code reviews
 */
export class IndividualReviewStrategy extends AbstractStrategy {
  /**
   * Constructor
   * @param reviewType The type of review to perform
   */
  constructor(reviewType: ReviewType) {
    super(reviewType);
  }
  
  /**
   * Execute the individual review strategy
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
        throw new Error('Invalid input for individual review');
      }
      
      // For individual reviews, we only review the first file
      if (files.length === 0) {
        throw new Error('No files to review');
      }
      
      // Log execution start
      logger.info(
        `Executing individual ${this.reviewType} review for ${files[0].path} in ${projectName}`
      );
      
      // Create the client
      const client = ClientFactory.createClient();
      
      // Initialize the client
      await client.initialize();
      
      // Generate the review for the first file
      const result = await client.generateReview(
        files[0].content,
        files[0].path,
        this.reviewType,
        projectDocs,
        options
      );
      
      // Log execution completion
      this.logExecutionCompletion(result);
      
      return result;
    } catch (error) {
      this.handleError(error, 'execution');
    }
  }
}