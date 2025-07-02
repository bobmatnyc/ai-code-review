/**
 * @fileoverview Prompt strategy interface and base class.
 *
 * This module defines the interface and base class for prompt strategies,
 * which are responsible for generating and formatting prompts for different
 * models and review types.
 */

import { PromptTemplate as LangChainPromptTemplate } from '@langchain/core/prompts';
import type { ReviewOptions, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';
import type { PromptCache } from '../cache/PromptCache';
import type { PromptManager } from '../PromptManager';

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
    projectDocs?: ProjectDocs | null,
  ): Promise<string>;

  /**
   * Format a prompt for a specific model
   * @param prompt Raw prompt
   * @param options Review options
   * @returns Formatted prompt (can be synchronous or asynchronous)
   */
  formatPrompt(prompt: string, options: ReviewOptions): string | Promise<string>;

  /**
   * Get a LangChain prompt template
   * @param prompt Raw prompt template
   * @param options Review options
   * @returns LangChain prompt template (can be asynchronous)
   */
  getLangChainTemplate(
    prompt: string,
    options: ReviewOptions,
  ): LangChainPromptTemplate | Promise<LangChainPromptTemplate>;

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
    _projectDocs?: ProjectDocs | null,
  ): Promise<string> {
    try {
      // Check if we should use a cached prompt
      if (options.useCache !== false) {
        const cachedPrompt = this.promptCache.getBestPrompt(reviewType);
        if (cachedPrompt) {
          logger.info(
            `Using cached prompt for ${reviewType} review type (rating: ${cachedPrompt.rating})`,
          );
          return await Promise.resolve(this.formatPrompt(cachedPrompt.content, options));
        }
      }

      // Get the prompt template from the prompt manager
      const promptTemplate = await this.promptManager.getPromptTemplate(reviewType, options);

      // Format the prompt
      return await Promise.resolve(this.formatPrompt(promptTemplate, options));
    } catch (error) {
      logger.error(
        `Error generating prompt: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Format a prompt for a specific model
   * @param prompt Raw prompt
   * @param options Review options
   * @returns Formatted prompt (can be synchronous or asynchronous)
   */
  abstract formatPrompt(prompt: string, options: ReviewOptions): string | Promise<string>;

  /**
   * Get a LangChain prompt template
   * @param prompt Raw prompt template
   * @param options Review options
   * @returns LangChain prompt template
   */
  async getLangChainTemplate(
    prompt: string,
    options: ReviewOptions,
  ): Promise<LangChainPromptTemplate> {
    // Format the prompt first using the model-specific formatter
    const formattedPrompt = await Promise.resolve(this.formatPrompt(prompt, options));

    // Create the LangChain template with appropriate input variables
    return new LangChainPromptTemplate({
      template: formattedPrompt,
      inputVariables: this.extractInputVariables(formattedPrompt),
    });
  }

  /**
   * Extract input variables from a prompt template
   * @param prompt Prompt template
   * @returns Array of input variable names
   */
  protected extractInputVariables(prompt: string): string[] {
    // Extract variable names from the template using regex
    // Matches patterns like {{VARIABLE_NAME}} or {VARIABLE_NAME}
    const variableMatches = prompt.match(/{{(\w+)}}|{(\w+)}/g) || [];

    // Extract the variable names without the braces
    return variableMatches.map((match) => {
      // Remove {{ and }} or { and }
      return match.replace(/{{|}}/g, '').replace(/{|}/g, '');
    });
  }

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
