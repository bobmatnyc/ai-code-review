/**
 * @fileoverview Anthropic-specific prompt strategy.
 *
 * This module provides a prompt strategy optimized for Anthropic models
 * like Claude.
 */

import type { ReviewOptions } from '../../types/review';
import type { PromptCache } from '../cache/PromptCache';
import type { PromptManager } from '../PromptManager';
import { PromptStrategy } from './PromptStrategy';

/**
 * Prompt strategy for Anthropic models
 */
export class AnthropicPromptStrategy extends PromptStrategy {
  /**
   * Create a new Anthropic prompt strategy
   * @param promptManager Prompt manager instance
   * @param promptCache Prompt cache instance
   */
  constructor(promptManager: PromptManager, promptCache: PromptCache) {
    super(promptManager, promptCache);
  }

  /**
   * Format a prompt for Anthropic models
   * @param prompt Raw prompt
   * @param options Review options
   * @returns Formatted prompt
   */
  formatPrompt(prompt: string, _options: ReviewOptions): string {
    // Anthropic models work well with the default prompt format
    // but we can add some Anthropic-specific optimizations here

    // Add a reminder to be concise and actionable
    let formattedPrompt = prompt;

    // Add a note about being concise for Claude models
    if (!formattedPrompt.includes('Be concise and actionable')) {
      formattedPrompt +=
        '\n\nRemember to be concise and actionable in your review. Focus on the most important issues and provide clear, specific recommendations.';
    }

    // Add a note about code examples for Claude models
    if (!formattedPrompt.includes('code examples')) {
      formattedPrompt +=
        '\n\nWhen suggesting fixes, provide specific code examples that demonstrate the recommended changes.';
    }

    return formattedPrompt;
  }

  /**
   * Get the name of the strategy
   * @returns Strategy name
   */
  getName(): string {
    return 'anthropic';
  }

  /**
   * Get the description of the strategy
   * @returns Strategy description
   */
  getDescription(): string {
    return 'Prompt strategy optimized for Anthropic models like Claude';
  }
}
