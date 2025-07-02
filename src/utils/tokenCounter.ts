/**
 * @fileoverview Token counting utilities for AI model interactions.
 *
 * This module re-exports the token counting functionality from the clients/utils directory
 * to provide a simplified import path for consumers. This allows the token counting
 * implementation to be moved or refactored without breaking client code.
 *
 * The token counter is responsible for:
 * - Counting tokens for input and output text using model-specific tokenizers
 * - Calculating approximate API costs based on token usage and model pricing
 * - Supporting different tokenizers for various AI models (Claude, GPT, Gemini)
 *
 * @example
 * import { countTokens, estimateCost } from '../utils/tokenCounter';
 *
 * const text = "Some text to analyze";
 * const tokenCount = countTokens(text, 'gpt-4');
 * const cost = estimateCost(tokenCount, 0, 'gpt-4');
 */
export * from '../clients/utils/tokenCounter';
