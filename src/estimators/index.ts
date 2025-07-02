/**
 * @fileoverview Index file for token and cost estimators.
 *
 * This module exports all the estimator classes and interfaces.
 */

export { AbstractTokenEstimator } from './abstractEstimator';
export { AnthropicTokenEstimator } from './anthropicEstimator';
export type { CostInfo, TokenEstimator } from './baseEstimator';
export { EstimatorFactory } from './estimatorFactory';
export { GeminiTokenEstimator } from './geminiEstimator';
export { OpenAITokenEstimator } from './openaiEstimator';
export { OpenRouterTokenEstimator } from './openRouterEstimator';

import type { CostInfo } from './baseEstimator';
// Re-export common functions for backward compatibility
import { EstimatorFactory } from './estimatorFactory';

const factory = EstimatorFactory.getInstance();
const defaultEstimator = factory.getDefaultEstimator();

/**
 * Estimate the number of tokens in a text
 * @param text Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  return defaultEstimator.estimateTokenCount(text);
}

/**
 * Calculate the cost for a given number of input and output tokens
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param modelName Name of the model (optional)
 * @returns Estimated cost in USD
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelName?: string,
): number {
  if (modelName) {
    const estimator = factory.getEstimatorForModel(modelName);
    return estimator.calculateCost(inputTokens, outputTokens, modelName);
  }
  return defaultEstimator.calculateCost(inputTokens, outputTokens);
}

/**
 * Format a cost value as a currency string
 * @param cost Cost value in USD
 * @returns Formatted cost string
 */
export function formatCost(cost: number): string {
  return defaultEstimator.formatCost(cost);
}

/**
 * Get cost information based on token counts
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param modelName Name of the model (optional)
 * @returns Cost information
 */
export function getCostInfo(
  inputTokens: number,
  outputTokens: number,
  modelName?: string,
): CostInfo {
  if (modelName) {
    const estimator = factory.getEstimatorForModel(modelName);
    return estimator.getCostInfo(inputTokens, outputTokens, modelName);
  }
  return defaultEstimator.getCostInfo(inputTokens, outputTokens);
}

/**
 * Get cost information based on text
 * @param inputText Input text
 * @param outputText Output text
 * @param modelName Name of the model (optional)
 * @returns Cost information
 */
export function getCostInfoFromText(
  inputText: string,
  outputText: string,
  modelName?: string,
): CostInfo {
  if (modelName) {
    const estimator = factory.getEstimatorForModel(modelName);
    return estimator.getCostInfoFromText(inputText, outputText, modelName);
  }
  return defaultEstimator.getCostInfoFromText(inputText, outputText);
}
