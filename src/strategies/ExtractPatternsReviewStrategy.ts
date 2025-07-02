/**
 * @fileoverview Extract patterns review strategy implementation.
 *
 * This module implements the extract patterns review strategy, which analyzes
 * codebases to extract detailed patterns, architecture, and design decisions
 * for creating exemplar project libraries.
 */

import type { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import type { FileInfo, ReviewOptions, ReviewResult } from '../types/review';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import { BaseReviewStrategy } from './ReviewStrategy';

/**
 * Strategy for extracting code patterns and architectural insights
 */
export class ExtractPatternsReviewStrategy extends BaseReviewStrategy {
  /**
   * Create a new extract patterns review strategy
   */
  constructor() {
    super('extract-patterns');
  }

  /**
   * Execute the extract patterns review strategy
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
    logger.info('Executing extract patterns review strategy...');

    // Enhance options for pattern extraction
    const enhancedOptions: ReviewOptions = {
      ...options,
      type: this.reviewType,
      // Enable comprehensive analysis features
      includeProjectDocs: true,
      includeDependencyAnalysis: true,
      enableSemanticChunking: true,
    };

    // Generate the review using the selected API client
    return generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      enhancedOptions,
      apiClientConfig,
    );
  }
}
