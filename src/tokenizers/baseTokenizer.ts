/**
 * @fileoverview Base interface for tokenizers.
 *
 * This module defines the common interface that all tokenizer implementations
 * must follow, ensuring consistent behavior across different AI providers.
 */

/**
 * Base interface for tokenizers
 */
export interface Tokenizer {
  /**
   * Count the number of tokens in a text
   * @param text Text to count tokens for
   * @returns Actual token count
   */
  countTokens(text: string): number;

  /**
   * Get the model name or family this tokenizer is for
   * @returns Model name or family
   */
  getModelName(): string;

  /**
   * Check if this tokenizer supports a given model
   * @param modelName Name of the model to check
   * @returns True if the model is supported, false otherwise
   */
  supportsModel(modelName: string): boolean;
}

/**
 * Factory function type for creating tokenizers
 */
export type TokenizerFactory = () => Tokenizer;

/**
 * Registry of tokenizers
 */
export class TokenizerRegistry {
  private static tokenizers: Tokenizer[] = [];

  /**
   * Register a tokenizer
   * @param tokenizer Tokenizer to register
   */
  static register(tokenizer: Tokenizer): void {
    TokenizerRegistry.tokenizers.push(tokenizer);
  }

  /**
   * Get a tokenizer for a specific model
   * @param modelName Name of the model
   * @returns Tokenizer for the model, or undefined if none found
   */
  static getTokenizer(modelName: string): Tokenizer | undefined {
    return TokenizerRegistry.tokenizers.find(t => t.supportsModel(modelName));
  }

  /**
   * Get all registered tokenizers
   * @returns Array of all registered tokenizers
   */
  static getAllTokenizers(): Tokenizer[] {
    return [...TokenizerRegistry.tokenizers];
  }
}

/**
 * Fallback tokenizer that uses a simple character-based approximation
 */
export class FallbackTokenizer implements Tokenizer {
  /**
   * Count the number of tokens in a text using a simple approximation
   * @param text Text to count tokens for
   * @returns Estimated token count
   */
  countTokens(text: string): number {
    // A rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Get the model name for this tokenizer
   * @returns 'fallback'
   */
  getModelName(): string {
    return 'fallback';
  }

  /**
   * This tokenizer is used as a fallback for any model
   * @returns Always true
   */
  supportsModel(modelName: string): boolean {
    return true;
  }
}

// Register the fallback tokenizer
TokenizerRegistry.register(new FallbackTokenizer());

/**
 * Get the appropriate tokenizer for a model
 * @param modelName Name of the model
 * @returns Tokenizer for the model (falls back to FallbackTokenizer if none found)
 */
export function getTokenizer(modelName: string): Tokenizer {
  // Simple pattern matching for common model families
  const modelNameLower = modelName.toLowerCase();

  if (modelNameLower.includes('gpt')) {
    return TokenizerRegistry.getAllTokenizers().find(t => t.getModelName() === 'gpt') || new FallbackTokenizer();
  }

  if (modelNameLower.includes('claude')) {
    return TokenizerRegistry.getAllTokenizers().find(t => t.getModelName() === 'claude') || new FallbackTokenizer();
  }

  if (modelNameLower.includes('gemini')) {
    return TokenizerRegistry.getAllTokenizers().find(t => t.getModelName() === 'gemini') || new FallbackTokenizer();
  }

  // If no specific tokenizer matches, fall back to the fallback tokenizer
  return new FallbackTokenizer();
}

/**
 * Count tokens in a text using the appropriate tokenizer for a model
 * @param text Text to count tokens for
 * @param modelName Name of the model
 * @returns Token count
 */
export function countTokens(text: string, modelName: string): number {
  const tokenizer = getTokenizer(modelName);
  return tokenizer.countTokens(text);
}
