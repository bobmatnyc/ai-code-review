/**
 * @fileoverview Prompt strategy interface and base class.
 *
 * This module defines the interface and base class for prompt strategies,
 * which are responsible for generating and formatting prompts for different
 * models and review types.
 */

import { ReviewOptions, ReviewType } from '../../types/review';
import { ProjectDocs } from '../../utils/projectDocs';
import { PromptManager } from '../PromptManager';
import { PromptCache } from '../cache/PromptCache';
import logger from '../../utils/logger';

/**
 * Interface for prompt strategies
 */
export interface IPromptStrategy {
  /**
   * Generate a prompt for a review
   * @param reviewType Type of review
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Promise resolving to the generated prompt
   */
  generatePrompt(
    reviewType: ReviewType,
    options: ReviewOptions,
    projectDocs?: ProjectDocs | null
  ): Promise<string>;
  
  /**
   * Format a prompt for a specific model
   * @param prompt Raw prompt
   * @param options Review options
   * @returns Formatted prompt
   */
  formatPrompt(prompt: string, options: ReviewOptions): string;
  
  /**
   * Get the name of the strategy
   * @returns Strategy name
   */
  getName(): string;
  
  /**
   * Get the description of the strategy
   * @returns Strategy description
   */
  getDescription(): string;
}

/**
 * Base class for prompt strategies
 */
export abstract class PromptStrategy implements IPromptStrategy {
  protected promptManager: PromptManager;
  protected promptCache: PromptCache;
  
  /**
   * Create a new prompt strategy
   * @param promptManager Prompt manager instance
   * @param promptCache Prompt cache instance
   */
  constructor(promptManager: PromptManager, promptCache: PromptCache) {
    this.promptManager = promptManager;
    this.promptCache = promptCache;
  }
  
  /**
   * Generate a prompt for a review
   * @param reviewType Type of review
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Promise resolving to the generated prompt
   */
  async generatePrompt(
    reviewType: ReviewType,
    options: ReviewOptions,
    projectDocs?: ProjectDocs | null
  ): Promise<string> {
    try {
      // Check if we should use a cached prompt
      if (options.useCache !== false) {
        const cachedPrompt = this.promptCache.getBestPrompt(reviewType);
        if (cachedPrompt) {
          logger.info(`Using cached prompt for ${reviewType} review type (rating: ${cachedPrompt.rating})`);
          return this.formatPrompt(cachedPrompt.content, options);
        }
      }
      
      // Get the prompt template from the prompt manager
      const promptTemplate = await this.promptManager.getPromptTemplate(reviewType, options);
      
      // Format the prompt
      return this.formatPrompt(promptTemplate, options);
    } catch (error) {
      logger.error(`Error generating prompt: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Format a prompt for a specific model
   * @param prompt Raw prompt
   * @param options Review options
   * @returns Formatted prompt
   */
  abstract formatPrompt(prompt: string, options: ReviewOptions): string;
  
  /**
   * Get the name of the strategy
   * @returns Strategy name
   */
  abstract getName(): string;
  
  /**
   * Get the description of the strategy
   * @returns Strategy description
   */
  abstract getDescription(): string;
}
