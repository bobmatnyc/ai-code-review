/**
 * @fileoverview Tokenizer implementation for Anthropic Claude models.
 *
 * This module provides a tokenizer implementation for Anthropic Claude models
 * using the @anthropic-ai/tokenizer library.
 */

import { countTokens as claudeCountTokens } from '@anthropic-ai/tokenizer';
import { type Tokenizer, TokenizerRegistry } from './baseTokenizer';

/**
 * Tokenizer for Anthropic Claude models
 */
export class ClaudeTokenizer implements Tokenizer {
  private modelPatterns: RegExp[] = [/claude/i];

  /**
   * Count the number of tokens in a text using the Claude tokenizer
   * @param text Text to count tokens for
   * @returns Actual token count
   */
  countTokens(text: string): number {
    try {
      return claudeCountTokens(text);
    } catch (error) {
      console.warn(`Error counting tokens with Claude tokenizer: ${error}`);
      // Fall back to character-based approximation
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get the model name for this tokenizer
   * @returns 'claude'
   */
  getModelName(): string {
    return 'claude';
  }

  /**
   * Check if this tokenizer supports a given model
   * @param modelName Name of the model to check
   * @returns True if the model is supported, false otherwise
   */
  supportsModel(modelName: string): boolean {
    // Convert to lowercase for case-insensitive matching
    const lowerModelName = modelName.toLowerCase();
    return this.modelPatterns.some((pattern) => pattern.test(lowerModelName));
  }
}

// Register the Claude tokenizer
TokenizerRegistry.register(new ClaudeTokenizer());
