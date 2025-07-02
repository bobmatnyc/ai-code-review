/**
 * @fileoverview Tokenizer implementation for Google Gemini models.
 *
 * This module provides a tokenizer implementation for Google Gemini models.
 *
 * Note: The Google Generative AI library doesn't currently expose a tokenizer,
 * so we use a character-based approximation for now. This should be updated
 * when Google provides an official tokenizer.
 */

// The Google Generative AI library doesn't currently expose a tokenizer
// import { countTokens as geminiCountTokens } from '@google/generative-ai';
import { type Tokenizer, TokenizerRegistry } from './baseTokenizer';

/**
 * Tokenizer for Google Gemini models
 */
export class GeminiTokenizer implements Tokenizer {
  private modelPatterns: RegExp[] = [/gemini/i];

  /**
   * Count the number of tokens in a text using an approximation for Gemini models
   * @param text Text to count tokens for
   * @returns Estimated token count
   */
  countTokens(text: string): number {
    // Gemini uses a different tokenizer than GPT models, but the character ratio is similar
    // This is a rough approximation until Google provides an official tokenizer
    // For Gemini, approximately 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Get the model name for this tokenizer
   * @returns 'gemini'
   */
  getModelName(): string {
    return 'gemini';
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

// Register the Gemini tokenizer
TokenizerRegistry.register(new GeminiTokenizer());
