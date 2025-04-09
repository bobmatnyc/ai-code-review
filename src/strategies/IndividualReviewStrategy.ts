/**
 * @fileoverview Individual review strategy implementation.
 *
 * This module implements the individual review strategy, which analyzes each file
 * separately to provide detailed feedback.
 */

import { BaseReviewStrategy } from './ReviewStrategy';
import { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';
import { ApiClientConfig } from '../core/ApiClientSelector';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import { createDirectory, generateVersionedOutputPath } from '../utils/fileSystem';
import { formatReviewOutput } from '../formatters/outputFormatter';
import { logError } from '../utils/errorLogger';
import { displayReviewResults } from '../utils/reviewActionHandler';
import { getPriorityFilterFromArgs } from '../utils/priorityFilter';

// Import only the Gemini client by default
import { generateReview } from '../clients/geminiClient';

/**
 * Strategy for individual file reviews
 */
export class IndividualReviewStrategy extends BaseReviewStrategy {
  /**
   * Create a new individual review strategy
   * @param reviewType Type of review to perform
   */
  constructor(reviewType: ReviewType) {
    super(reviewType);
  }

  /**
   * Execute the individual review strategy
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
    logger.info(`Executing individual ${this.reviewType} review strategy...`);
    
    // This strategy processes each file individually
    // For now, we'll just return a placeholder result
    // In a future implementation, we'll need to modify the orchestrator to handle multiple results
    
    if (files.length === 0) {
      throw new Error('No files to review');
    }
    
    // For now, just review the first file to maintain compatibility with the current interface
    const file = files[0];
    
    logger.info(`Reviewing: ${file.relativePath || file.path}`);
    
    // Use the appropriate API client based on the client type
    let review: ReviewResult;
    
    try {
      if (apiClientConfig.clientType === 'OpenRouter') {
        // Dynamically import the OpenRouter client
        const { generateOpenRouterReview, initializeAnyOpenRouterModel } = await import('../clients/openRouterClient.js');
        
        // Initialize OpenRouter model if needed
        await initializeAnyOpenRouterModel();
        
        review = await generateOpenRouterReview(
          file.content,
          file.path,
          this.reviewType,
          projectDocs,
          options
        );
      } else if (apiClientConfig.clientType === 'Google') {
        review = await generateReview(
          file.content,
          file.path,
          this.reviewType,
          projectDocs,
          options
        );
      } else if (apiClientConfig.clientType === 'Anthropic') {
        // Dynamically import the Anthropic client
        const { generateAnthropicReview, initializeAnthropicClient } = await import('../clients/anthropicClient.js');
        
        // Initialize Anthropic model if needed
        await initializeAnthropicClient();
        
        review = await generateAnthropicReview(
          file.content,
          file.path,
          this.reviewType,
          projectDocs,
          options
        );
      } else if (apiClientConfig.clientType === 'OpenAI') {
        // Dynamically import the OpenAI client
        const { generateOpenAIReview, initializeAnyOpenAIModel } = await import('../clients/openaiClient.js');
        
        // Initialize OpenAI model if needed
        await initializeAnyOpenAIModel();
        
        review = await generateOpenAIReview(
          file.content,
          file.path,
          this.reviewType,
          projectDocs,
          options
        );
      } else {
        // No API client available, use mock responses
        logger.warn('No API client available. Using mock responses.');
        review = await generateReview(
          file.content,
          file.path,
          this.reviewType,
          projectDocs,
          options
        );
      }
      
      return review;
    } catch (error) {
      logger.error(`Error generating review for ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
