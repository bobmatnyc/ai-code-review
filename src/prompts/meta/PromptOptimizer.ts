/**
 * @fileoverview Prompt optimizer for improving code review prompts.
 *
 * This module provides functionality for analyzing and improving code review prompts
 * based on the results they generate and user feedback.
 */

import fs from 'fs/promises';
import path from 'path';
import type { ApiClientConfig } from '../../core/ApiClientSelector';
import type { ReviewResult, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import type { PromptCache } from '../cache/PromptCache';
import type { PromptManager } from '../PromptManager';

/**
 * Feedback on review quality
 */
export interface ReviewFeedback {
  /**
   * Rating from 1-5 (1 = poor, 5 = excellent)
   */
  rating: number;

  /**
   * Comments on the review quality
   */
  comments?: string;

  /**
   * Specific aspects that were good
   */
  positiveAspects?: string[];

  /**
   * Specific aspects that could be improved
   */
  negativeAspects?: string[];
}

/**
 * Optimizer for code review prompts
 */
export class PromptOptimizer {
  private promptManager: PromptManager;
  private promptCache: PromptCache;

  /**
   * Create a new prompt optimizer
   * @param promptManager Prompt manager instance
   * @param promptCache Prompt cache instance
   */
  constructor(promptManager: PromptManager, promptCache: PromptCache) {
    this.promptManager = promptManager;
    this.promptCache = promptCache;
  }

  /**
   * Optimize a prompt based on review results and feedback
   * @param originalPrompt Original prompt template
   * @param reviewResult Review result generated with the prompt
   * @param feedback Feedback on the review quality
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the optimized prompt
   */
  async optimizePrompt(
    originalPrompt: string,
    reviewResult: ReviewResult,
    feedback: ReviewFeedback,
    apiClientConfig: ApiClientConfig,
  ): Promise<string> {
    try {
      logger.info('Optimizing prompt based on feedback...');

      // Load the meta-prompt template
      const metaPromptTemplate = await this.loadMetaPromptTemplate();

      // Format the meta-prompt
      const metaPrompt = this.formatMetaPrompt(
        metaPromptTemplate,
        originalPrompt,
        reviewResult,
        feedback,
      );

      // Generate the optimized prompt using the appropriate API client
      const optimizedPrompt = await this.generateOptimizedPrompt(metaPrompt, apiClientConfig);

      // Cache the optimized prompt
      await this.cacheOptimizedPrompt(reviewResult.reviewType, optimizedPrompt, feedback.rating);

      return optimizedPrompt;
    } catch (error) {
      logger.error(
        `Error optimizing prompt: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Return the original prompt if optimization fails
      return originalPrompt;
    }
  }

  /**
   * Load the meta-prompt template for prompt optimization
   * @returns Promise resolving to the meta-prompt template
   */
  private async loadMetaPromptTemplate(): Promise<string> {
    try {
      // Try to load from the package directory first
      const packagePath = path.resolve(__dirname, 'prompt-optimization.md');
      try {
        return await fs.readFile(packagePath, 'utf-8');
      } catch (error) {
        // If that fails, try to load from the current directory
        const localPath = path.resolve(
          process.cwd(),
          'src',
          'prompts',
          'meta',
          'prompt-optimization.md',
        );
        return await fs.readFile(localPath, 'utf-8');
      }
    } catch (error) {
      logger.error(
        `Error loading meta-prompt template: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to load meta-prompt template');
    }
  }

  /**
   * Format the meta-prompt with the original prompt, review results, and feedback
   * @param metaPromptTemplate Meta-prompt template
   * @param originalPrompt Original prompt template
   * @param reviewResult Review result generated with the prompt
   * @param feedback Feedback on the review quality
   * @returns Formatted meta-prompt
   */
  private formatMetaPrompt(
    metaPromptTemplate: string,
    originalPrompt: string,
    reviewResult: ReviewResult,
    feedback: ReviewFeedback,
  ): string {
    // Format the feedback as a string
    const feedbackStr = this.formatFeedback(feedback);

    // Replace placeholders in the meta-prompt template
    return metaPromptTemplate
      .replace('{{ORIGINAL_PROMPT}}', originalPrompt)
      .replace('{{REVIEW_RESULTS}}', reviewResult.content)
      .replace('{{FEEDBACK}}', feedbackStr);
  }

  /**
   * Format feedback as a string
   * @param feedback Feedback on the review quality
   * @returns Formatted feedback string
   */
  private formatFeedback(feedback: ReviewFeedback): string {
    let feedbackStr = `Rating: ${feedback.rating}/5\n\n`;

    if (feedback.comments) {
      feedbackStr += `Comments: ${feedback.comments}\n\n`;
    }

    if (feedback.positiveAspects && feedback.positiveAspects.length > 0) {
      feedbackStr += 'Positive Aspects:\n';
      feedback.positiveAspects.forEach((aspect) => {
        feedbackStr += `- ${aspect}\n`;
      });
      feedbackStr += '\n';
    }

    if (feedback.negativeAspects && feedback.negativeAspects.length > 0) {
      feedbackStr += 'Areas for Improvement:\n';
      feedback.negativeAspects.forEach((aspect) => {
        feedbackStr += `- ${aspect}\n`;
      });
      feedbackStr += '\n';
    }

    return feedbackStr;
  }

  /**
   * Generate an optimized prompt using the appropriate API client
   * @param metaPrompt Meta-prompt for prompt optimization
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the optimized prompt
   */
  private async generateOptimizedPrompt(
    metaPrompt: string,
    _apiClientConfig: ApiClientConfig,
  ): Promise<string> {
    // For now, we'll use a simple placeholder implementation
    // In a real implementation, this would use the appropriate API client
    // to generate an optimized prompt based on the meta-prompt

    logger.info('Generating optimized prompt...');

    // Extract the revised prompt from the meta-prompt response
    // This is a placeholder implementation
    const optimizedPrompt = metaPrompt;

    return optimizedPrompt;
  }

  /**
   * Cache an optimized prompt for future use
   * @param reviewType Type of review
   * @param optimizedPrompt Optimized prompt template
   * @param rating Rating of the optimized prompt
   */
  private async cacheOptimizedPrompt(
    reviewType: ReviewType,
    optimizedPrompt: string,
    rating: number,
  ): Promise<void> {
    try {
      // Cache the optimized prompt
      await this.promptCache.cachePrompt(reviewType, optimizedPrompt, rating);
      logger.info(`Cached optimized prompt for ${reviewType} review type`);
    } catch (error) {
      logger.error(
        `Error caching optimized prompt: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
