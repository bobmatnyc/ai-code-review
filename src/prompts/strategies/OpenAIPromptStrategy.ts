/**
 * @fileoverview OpenAI-specific prompt strategy.
 *
 * This module provides a prompt strategy optimized for OpenAI models
 * like GPT-4.
 */

import type { ReviewOptions } from '../../types/review';
import type { PromptCache } from '../cache/PromptCache';
import type { PromptManager } from '../PromptManager';
import { PromptStrategy } from './PromptStrategy';

/**
 * Prompt strategy for OpenAI models
 */
export class OpenAIPromptStrategy extends PromptStrategy {
  /**
   * Create a new OpenAI prompt strategy
   * @param promptManager Prompt manager instance
   * @param promptCache Prompt cache instance
   */
  constructor(promptManager: PromptManager, promptCache: PromptCache) {
    super(promptManager, promptCache);
  }

  /**
   * Format a prompt for OpenAI models
   * @param prompt Raw prompt
   * @param options Review options
   * @returns Formatted prompt
   */
  formatPrompt(prompt: string, _options: ReviewOptions): string {
    // OpenAI models work well with detailed instructions
    // We can add some OpenAI-specific optimizations here

    // Add a detailed format reminder for OpenAI
    let formattedPrompt = prompt;

    // Add a note about being detailed for OpenAI models
    if (!formattedPrompt.includes('step-by-step')) {
      formattedPrompt +=
        '\n\nProvide a step-by-step analysis of the code, identifying patterns and potential issues systematically.';
    }

    // Add a note about reasoning for OpenAI models
    if (!formattedPrompt.includes('reasoning')) {
      formattedPrompt +=
        '\n\nExplain your reasoning for each suggestion, including why it is an issue and the benefits of fixing it.';
    }

    // Add a note about alternatives for OpenAI models
    if (!formattedPrompt.includes('alternative approaches')) {
      formattedPrompt +=
        '\n\nWhen appropriate, suggest alternative approaches or design patterns that could improve the code.';
    }

    return formattedPrompt;
  }

  /**
   * Get the name of the strategy
   * @returns Strategy name
   */
  getName(): string {
    return 'openai';
  }

  /**
   * Get the description of the strategy
   * @returns Strategy description
   */
  getDescription(): string {
    return 'Prompt strategy optimized for OpenAI models like GPT-4';
  }
}
