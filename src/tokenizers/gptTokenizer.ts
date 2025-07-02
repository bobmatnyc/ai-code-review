/**
 * @fileoverview Tokenizer implementation for OpenAI GPT models.
 *
 * This module provides a tokenizer implementation for OpenAI GPT models
 * using the gpt-tokenizer library.
 */

import { encode } from 'gpt-tokenizer';
import { type Tokenizer, TokenizerRegistry } from './baseTokenizer';

/**
 * Tokenizer for OpenAI GPT models
 */
export class GPTTokenizer implements Tokenizer {
  private modelPatterns: RegExp[] = [/gpt/i];

  /**
   * Count the number of tokens in a text using the GPT tokenizer
   * @param text Text to count tokens for
   * @returns Actual token count
   */
  countTokens(text: string): number {
    try {
      const tokens = encode(text);
      return tokens.length;
    } catch (error) {
      console.warn(`Error counting tokens with GPT tokenizer: ${error}`);
      // Fall back to character-based approximation
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get the model name for this tokenizer
   * @returns 'gpt'
   */
  getModelName(): string {
    return 'gpt';
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

// Register the GPT tokenizer
TokenizerRegistry.register(new GPTTokenizer());
