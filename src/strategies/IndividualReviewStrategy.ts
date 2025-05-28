/**
 * @fileoverview Individual review strategy implementation.
 *
 * This module implements the individual review strategy, which analyzes each file
 * separately to provide detailed feedback.
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
import logger from '../utils/logger';
import { collectCIData } from '../utils/ciDataCollector';

// Import the OpenAI wrapper for individual reviews
import { generateOpenAIReview, initializeAnyOpenAIModel } from '../clients/openaiClientWrapper';

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

    // Collect CI data once for all files if reviewing TypeScript
    let ciData = undefined;
    if (options.language === 'typescript' || files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))) {
      logger.info('Collecting CI data for TypeScript project...');
      ciData = await collectCIData(process.cwd());
      options.ciData = ciData;
    }

    // For now, just review the first file to maintain compatibility with the current interface
    const file = files[0];

    logger.info(`Reviewing: ${file.relativePath || file.path}`);

    // Use the appropriate API client based on the client type
    let review: ReviewResult;

    try {
      if (apiClientConfig.clientType === 'OpenRouter') {
        // Dynamically import the OpenRouter client
        const { generateOpenRouterReview, initializeAnyOpenRouterModel } =
          await import('../clients/openRouterClient.js');

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
        // Dynamically import the Gemini client
        const { generateReview: generateGeminiReview } = 
          await import('../clients/geminiClient.js');
        
        review = await generateGeminiReview(
          file.content,
          file.path,
          this.reviewType,
          projectDocs,
          options
        );
      } else if (apiClientConfig.clientType === 'Anthropic') {
        // Dynamically import the Anthropic client
        const { generateAnthropicReview, initializeAnthropicClient } =
          await import('../clients/anthropicClient.js');

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
        // Use the OpenAI client wrapper for individual reviews
        await initializeAnyOpenAIModel();
        review = await generateOpenAIReview(
          file.content,
          file.path,
          this.reviewType,
          projectDocs,
          options
        );
      } else {
        throw new Error(
          `No API client configured. Please set up one of the following: ` +
          `Google (AI_CODE_REVIEW_GOOGLE_API_KEY), ` +
          `Anthropic (AI_CODE_REVIEW_ANTHROPIC_API_KEY), ` +
          `OpenAI (AI_CODE_REVIEW_OPENAI_API_KEY), or ` +
          `OpenRouter (AI_CODE_REVIEW_OPENROUTER_API_KEY)`
        );
      }

      return review;
    } catch (error) {
      logger.error(
        `Error generating review for ${file.path}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
}
