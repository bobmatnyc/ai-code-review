/**
 * @fileoverview Abstract base class for token and cost estimators.
 * 
 * This module provides a common implementation for token estimators that
 * can be extended by specific provider implementations.
 */

import { CostInfo, TokenEstimator } from './baseEstimator';

/**
 * Abstract base class for token and cost estimators
 */
export abstract class AbstractTokenEstimator implements TokenEstimator {
  /**
   * Estimate the number of tokens in a text
   * @param text Text to estimate tokens for
   * @returns Estimated token count
   */
  estimateTokenCount(text: string): number {
    // A rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Calculate the cost for a given number of input and output tokens
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @param modelName Name of the model (optional, uses default if not provided)
   * @returns Estimated cost in USD
   */
  abstract calculateCost(inputTokens: number, outputTokens: number, modelName?: string): number;
  
  /**
   * Format a cost value as a currency string
   * @param cost Cost value in USD
   * @returns Formatted cost string
   */
  formatCost(cost: number): string {
    return `$${cost.toFixed(6)} USD`;
  }
  
  /**
   * Get cost information based on token counts
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @param modelName Name of the model (optional)
   * @returns Cost information
   */
  getCostInfo(inputTokens: number, outputTokens: number, modelName?: string): CostInfo {
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = this.calculateCost(inputTokens, outputTokens, modelName);
    
    return {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      formattedCost: this.formatCost(estimatedCost)
    };
  }
  
  /**
   * Get cost information based on text
   * @param inputText Input text
   * @param outputText Output text
   * @param modelName Name of the model (optional)
   * @returns Cost information
   */
  getCostInfoFromText(inputText: string, outputText: string, modelName?: string): CostInfo {
    const inputTokens = this.estimateTokenCount(inputText);
    const outputTokens = this.estimateTokenCount(outputText);
    
    return this.getCostInfo(inputTokens, outputTokens, modelName);
  }
  
  /**
   * Get the default model name for this estimator
   * @returns Default model name
   */
  abstract getDefaultModel(): string;
  
  /**
   * Check if this estimator supports a given model
   * @param modelName Name of the model to check
   * @returns True if the model is supported, false otherwise
   */
  abstract supportsModel(modelName: string): boolean;
}
