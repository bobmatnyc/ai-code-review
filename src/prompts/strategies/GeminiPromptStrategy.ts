/**
 * @fileoverview Gemini-specific prompt strategy.
 *
 * This module provides a prompt strategy optimized for Google's Gemini models.
 */

import type { ReviewOptions } from '../../types/review';
import { PromptStrategy } from './PromptStrategy';

/**
 * Prompt strategy for Gemini models
 */
export class GeminiPromptStrategy extends PromptStrategy {
  /**
   * Format a prompt for Gemini models
   * @param prompt Raw prompt
   * @param options Review options
   * @returns Formatted prompt
   */
  formatPrompt(prompt: string, _options: ReviewOptions): string {
    // Gemini models work well with structured prompts
    // We can add some Gemini-specific optimizations here

    // Add a structured format reminder for Gemini
    let formattedPrompt = prompt;

    // Add a note about being structured for Gemini models
    if (!formattedPrompt.includes('structured format')) {
      formattedPrompt +=
        '\n\nPlease provide your review in a clear, structured format with headings and bullet points for better readability.';
    }

    // Add a note about code examples for Gemini models
    if (!formattedPrompt.includes('code examples')) {
      formattedPrompt +=
        '\n\nWhen suggesting improvements, include specific code examples that show both the current code and your recommended changes.';
    }

    // Add a note about prioritization for Gemini models
    if (!formattedPrompt.includes('prioritize')) {
      formattedPrompt +=
        '\n\nPrioritize your suggestions based on their impact and importance. Focus on the most critical issues first.';
    }

    return formattedPrompt;
  }

  /**
   * Get the name of the strategy
   * @returns Strategy name
   */
  getName(): string {
    return 'gemini';
  }

  /**
   * Get the description of the strategy
   * @returns Strategy description
   */
  getDescription(): string {
    return 'Prompt strategy optimized for Google Gemini models';
  }
}
