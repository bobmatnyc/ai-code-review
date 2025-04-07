/**
 * @fileoverview Base interface for token and cost estimators.
 *
 * This module defines the common interface that all estimator implementations
 * must follow, ensuring consistent behavior across different AI providers.
 */

/**
 * Cost information for an API call
 */
export interface CostInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  formattedCost: string;
}

/**
 * Base interface for token and cost estimators
 */
export interface TokenEstimator {
  /**
   * Estimate the number of tokens in a text
   * @param text Text to estimate tokens for
   * @param modelName Optional model name to use for tokenization
   * @returns Estimated token count
   */
  estimateTokenCount(text: string, modelName?: string): number;

  /**
   * Calculate the cost for a given number of input and output tokens
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @param modelName Name of the model (optional, uses default if not provided)
   * @returns Estimated cost in USD
   */
  calculateCost(inputTokens: number, outputTokens: number, modelName?: string): number;

  /**
   * Format a cost value as a currency string
   * @param cost Cost value in USD
   * @returns Formatted cost string
   */
  formatCost(cost: number): string;

  /**
   * Get cost information based on token counts
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @param modelName Name of the model (optional)
   * @returns Cost information
   */
  getCostInfo(inputTokens: number, outputTokens: number, modelName?: string): CostInfo;

  /**
   * Get cost information based on text
   * @param inputText Input text
   * @param outputText Output text
   * @param modelName Name of the model (optional)
   * @returns Cost information
   */
  getCostInfoFromText(inputText: string, outputText: string, modelName?: string): CostInfo;

  /**
   * Get the default model name for this estimator
   * @returns Default model name
   */
  getDefaultModel(): string;

  /**
   * Check if this estimator supports a given model
   * @param modelName Name of the model to check
   * @returns True if the model is supported, false otherwise
   */
  supportsModel(modelName: string): boolean;
}
