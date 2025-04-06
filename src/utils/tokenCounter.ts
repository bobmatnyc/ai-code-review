/**
 * @fileoverview Token counting and cost estimation utilities for AI API usage.
 *
 * This module provides utilities for estimating token usage and associated costs
 * when using various AI APIs including Google's Gemini and OpenRouter models.
 * It implements approximation methods for token counting and maintains current
 * pricing information for different AI models.
 *
 * Key responsibilities:
 * - Estimating token counts for input and output text
 * - Calculating approximate API costs based on token usage and model
 * - Tracking different pricing tiers for various AI models
 * - Providing cost information for review outputs
 * - Supporting cost-aware decision making for API usage
 *
 * These utilities help users understand the resource usage and costs associated
 * with their code reviews, enabling better planning and resource allocation.
 */

/**
 * Utility functions for estimating token counts and costs for AI API calls
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
 * Current pricing for various AI models (as of April 2024)
 * Sources:
 * - https://ai.google.dev/pricing
 * - https://openrouter.ai/docs#models
 */
const MODEL_PRICING: Record<string, { inputTokenCost: number; outputTokenCost: number }> = {
  // Gemini models
  'gemini-1.5-pro': {
    inputTokenCost: 0.00025,  // Cost per 1K input tokens in USD
    outputTokenCost: 0.0005,  // Cost per 1K output tokens in USD
  },
  'gemini-1.5-flash': {
    inputTokenCost: 0.000125,
    outputTokenCost: 0.000375,
  },
  'gemini-1.0-pro': {
    inputTokenCost: 0.000125,
    outputTokenCost: 0.000375,
  },

  // OpenRouter models (approximate costs)
  'anthropic/claude-3-opus': {
    inputTokenCost: 0.015,
    outputTokenCost: 0.075,
  },
  'anthropic/claude-3-sonnet': {
    inputTokenCost: 0.003,
    outputTokenCost: 0.015,
  },
  'openai/gpt-4-turbo': {
    inputTokenCost: 0.01,
    outputTokenCost: 0.03,
  },
  'openai/gpt-4o': {
    inputTokenCost: 0.005,
    outputTokenCost: 0.015,
  },
  'anthropic/claude-2.1': {
    inputTokenCost: 0.0008,
    outputTokenCost: 0.0024,
  },
  'google/gemini-pro': {
    inputTokenCost: 0.0005,
    outputTokenCost: 0.0015,
  },

  // Default fallback pricing
  'default': {
    inputTokenCost: 0.001,
    outputTokenCost: 0.002,
  },
};

/**
 * Get the pricing for a specific model
 * @param modelName Name of the model
 * @returns Pricing information for the model
 */
function getModelPricing(modelName: string): { inputTokenCost: number; outputTokenCost: number } {
  // Handle OpenRouter model names (remove the 'openrouter-' prefix)
  if (modelName.startsWith('openrouter-')) {
    const actualModelName = modelName.substring('openrouter-'.length);
    return MODEL_PRICING[actualModelName] || MODEL_PRICING['default'];
  }

  // Handle Gemini model names
  return MODEL_PRICING[modelName] || MODEL_PRICING['default'];
}

/**
 * Calculate the estimated cost for an AI API call
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param modelName Name of the model used
 * @returns Estimated cost in USD
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelName: string = 'gemini-1.5-pro'
): number {
  const pricing = getModelPricing(modelName);
  const inputCost = (inputTokens / 1000) * pricing.inputTokenCost;
  const outputCost = (outputTokens / 1000) * pricing.outputTokenCost;
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
 * Calculate cost information for an API call based on text
 * @param inputText Input text sent to the API
 * @param outputText Output text received from the API
 * @param modelName Name of the model used
 * @returns Cost information
 */
export function getCostInfoFromText(
  inputText: string,
  outputText: string,
  modelName: string = 'gemini-1.5-pro'
): CostInfo {
  const inputTokens = estimateTokenCount(inputText);
  const outputTokens = estimateTokenCount(outputText);
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(inputTokens, outputTokens, modelName);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    formattedCost: formatCost(estimatedCost),
  };
}

/**
 * Calculate cost information for an API call based on token counts
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param modelName Name of the model used
 * @returns Cost information
 */
export function getCostInfo(
  inputTokens: number,
  outputTokens: number,
  modelName: string = 'gemini-1.5-pro'
): CostInfo {
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(inputTokens, outputTokens, modelName);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    formattedCost: formatCost(estimatedCost),
  };
}
