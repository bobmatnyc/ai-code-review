/**
 * @fileoverview Token counting and cost estimation utilities for Gemini API usage.
 *
 * This module provides utilities for estimating token usage and associated costs
 * when using the Gemini API. It implements approximation methods for token counting
 * and maintains current pricing information for different Gemini models.
 *
 * Key responsibilities:
 * - Estimating token counts for input and output text
 * - Calculating approximate API costs based on token usage
 * - Tracking different pricing tiers for various Gemini models
 * - Providing cost information for review outputs
 * - Supporting cost-aware decision making for API usage
 *
 * These utilities help users understand the resource usage and costs associated
 * with their code reviews, enabling better planning and resource allocation.
 */

/**
 * Utility functions for estimating token counts and costs for Gemini API calls
 */

/**
 * Rough estimate of tokens based on character count
 * This is a simple approximation - actual token count depends on the tokenizer
 * @param text Text to count tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // A rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Current pricing for Gemini 1.5 Pro model (as of April 2023)
 * Source: https://ai.google.dev/pricing
 */
const GEMINI_PRICING = {
  // Cost per 1K input tokens in USD
  inputTokenCost: 0.00025,
  // Cost per 1K output tokens in USD
  outputTokenCost: 0.0005,
};

/**
 * Calculate the estimated cost for a Gemini API call
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @returns Estimated cost in USD
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * GEMINI_PRICING.inputTokenCost;
  const outputCost = (outputTokens / 1000) * GEMINI_PRICING.outputTokenCost;
  return inputCost + outputCost;
}

/**
 * Format a cost value as a currency string
 * @param cost Cost value in USD
 * @returns Formatted cost string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(6)} USD`;
}

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
 * Calculate cost information for an API call
 * @param inputText Input text sent to the API
 * @param outputText Output text received from the API
 * @returns Cost information
 */
export function getCostInfo(inputText: string, outputText: string): CostInfo {
  const inputTokens = estimateTokenCount(inputText);
  const outputTokens = estimateTokenCount(outputText);
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(inputTokens, outputTokens);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    formattedCost: formatCost(estimatedCost),
  };
}
