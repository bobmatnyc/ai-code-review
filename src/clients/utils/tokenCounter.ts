/**
 * @fileoverview Token counting and cost estimation utilities for AI API usage.
 *
 * This module provides utilities for estimating token usage and associated costs
 * when using various AI APIs including Google's Gemini and OpenRouter models.
 * It implements accurate token counting using model-specific tokenizers and maintains
 * current pricing information for different AI models.
 *
 * Key responsibilities:
 * - Counting tokens for input and output text using model-specific tokenizers
 * - Calculating approximate API costs based on token usage and model
 * - Tracking different pricing tiers for various AI models
 * - Providing cost information for review outputs
 * - Supporting cost-aware decision making for API usage
 *
 * These utilities help users understand the resource usage and costs associated
 * with their code reviews, enabling better planning and resource allocation.
 */

import { countTokens } from '../../tokenizers';

/**
 * Utility functions for estimating token counts and costs for AI API calls
 */

/**
 * Count tokens in a text using the appropriate tokenizer for a model
 * @param text Text to count tokens for
 * @param modelName Name of the model (optional)
 * @returns Token count
 */
export function estimateTokenCount(text: string, modelName?: string): number {
  return countTokens(text, modelName || 'fallback');
}

/**
 * Current pricing for various AI models (as of April 2024)
 * Sources:
 * - https://ai.google.dev/gemini-api/docs/pricing
 * - https://openrouter.ai/models
 */

/**
 * Interface for model pricing with standard per-token costs
 */
interface StandardPricing {
  inputTokenCost: number; // Cost per 1K input tokens in USD
  outputTokenCost: number; // Cost per 1K output tokens in USD
  type: 'standard';
}

/**
 * Interface for model pricing with tiered costs based on token count
 */
interface TieredPricing {
  type: 'tiered';
  tiers: {
    threshold: number; // Token threshold for this tier
    inputTokenCost: number; // Cost per 1K input tokens in USD for this tier
    outputTokenCost: number; // Cost per 1K output tokens in USD for this tier
  }[];
}

/**
 * Union type for different pricing models
 */
type ModelPricing = StandardPricing | TieredPricing;

/**
 * Pricing information for various AI models
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini 2.5 models
  'gemini-2.5-pro': {
    type: 'tiered',
    tiers: [
      {
        threshold: 0,
        inputTokenCost: 0.00125, // $1.25 per 1M tokens (≤200k tokens)
        outputTokenCost: 0.01, // $10.00 per 1M tokens (≤200k tokens)
      },
      {
        threshold: 200000,
        inputTokenCost: 0.0025, // $2.50 per 1M tokens (>200k tokens)
        outputTokenCost: 0.015, // $15.00 per 1M tokens (>200k tokens)
      },
    ],
  },
  'gemini-2.5-pro-preview': {
    type: 'tiered',
    tiers: [
      {
        threshold: 0,
        inputTokenCost: 0.00125, // $1.25 per 1M tokens (≤200k tokens)
        outputTokenCost: 0.01, // $10.00 per 1M tokens (≤200k tokens)
      },
      {
        threshold: 200000,
        inputTokenCost: 0.0025, // $2.50 per 1M tokens (>200k tokens)
        outputTokenCost: 0.015, // $15.00 per 1M tokens (>200k tokens)
      },
    ],
  },
  'gemini-2.5-pro-exp': {
    type: 'tiered',
    tiers: [
      {
        threshold: 0,
        inputTokenCost: 0.00125, // $1.25 per 1M tokens (≤200k tokens)
        outputTokenCost: 0.01, // $10.00 per 1M tokens (≤200k tokens)
      },
      {
        threshold: 200000,
        inputTokenCost: 0.0025, // $2.50 per 1M tokens (>200k tokens)
        outputTokenCost: 0.015, // $15.00 per 1M tokens (>200k tokens)
      },
    ],
  },
  'gemini-2.0-flash': {
    type: 'standard',
    inputTokenCost: 0.0001, // $0.10 per 1M tokens
    outputTokenCost: 0.0004, // $0.40 per 1M tokens
  },
  'gemini-2.0-flash-lite': {
    type: 'standard',
    inputTokenCost: 0.000075, // $0.075 per 1M tokens
    outputTokenCost: 0.0003, // $0.30 per 1M tokens
  },

  // Gemini 1.5 models
  'gemini-1.5-pro': {
    type: 'tiered',
    tiers: [
      {
        threshold: 0,
        inputTokenCost: 0.00125, // $1.25 per 1M tokens (≤128k tokens)
        outputTokenCost: 0.005, // $5.00 per 1M tokens (≤128k tokens)
      },
      {
        threshold: 128000,
        inputTokenCost: 0.0025, // $2.50 per 1M tokens (>128k tokens)
        outputTokenCost: 0.01, // $10.00 per 1M tokens (>128k tokens)
      },
    ],
  },
  'gemini-1.5-flash': {
    type: 'tiered',
    tiers: [
      {
        threshold: 0,
        inputTokenCost: 0.000075, // $0.075 per 1M tokens (≤128k tokens)
        outputTokenCost: 0.0003, // $0.30 per 1M tokens (≤128k tokens)
      },
      {
        threshold: 128000,
        inputTokenCost: 0.00015, // $0.15 per 1M tokens (>128k tokens)
        outputTokenCost: 0.0006, // $0.60 per 1M tokens (>128k tokens)
      },
    ],
  },
  'gemini-1.5-flash-8b': {
    type: 'tiered',
    tiers: [
      {
        threshold: 0,
        inputTokenCost: 0.0000375, // $0.0375 per 1M tokens (≤128k tokens)
        outputTokenCost: 0.00015, // $0.15 per 1M tokens (≤128k tokens)
      },
      {
        threshold: 128000,
        inputTokenCost: 0.000075, // $0.075 per 1M tokens (>128k tokens)
        outputTokenCost: 0.0003, // $0.30 per 1M tokens (>128k tokens)
      },
    ],
  },

  // OpenRouter models
  'anthropic/claude-3-opus': {
    type: 'standard',
    inputTokenCost: 0.015, // $15.00 per 1M tokens
    outputTokenCost: 0.075, // $75.00 per 1M tokens
  },
  'anthropic/claude-3-sonnet': {
    type: 'standard',
    inputTokenCost: 0.003, // $3.00 per 1M tokens
    outputTokenCost: 0.015, // $15.00 per 1M tokens
  },
  'openai/gpt-4-turbo': {
    type: 'standard',
    inputTokenCost: 0.01, // $10.00 per 1M tokens
    outputTokenCost: 0.03, // $30.00 per 1M tokens
  },
  'openai/gpt-4o': {
    type: 'standard',
    inputTokenCost: 0.0025, // $2.50 per 1M tokens
    outputTokenCost: 0.01, // $10.00 per 1M tokens
  },
  'anthropic/claude-2.1': {
    type: 'standard',
    inputTokenCost: 0.008, // $8.00 per 1M tokens
    outputTokenCost: 0.024, // $24.00 per 1M tokens
  },

  // Default fallback pricing
  default: {
    type: 'standard',
    inputTokenCost: 0.001, // $1.00 per 1M tokens
    outputTokenCost: 0.002, // $2.00 per 1M tokens
  },
};

/**
 * Get the pricing for a specific model
 * @param modelName Name of the model
 * @returns Pricing information for the model
 */
function getModelPricing(modelName: string): ModelPricing {
  // Handle OpenRouter model names (remove the 'openrouter-' prefix)
  if (modelName.startsWith('openrouter-')) {
    const actualModelName = modelName.substring('openrouter-'.length);
    return MODEL_PRICING[actualModelName] || MODEL_PRICING.default;
  }

  // Handle Gemini model names
  return MODEL_PRICING[modelName] || MODEL_PRICING.default;
}

/**
 * Calculate the cost for a specific tier
 * @param tokens Number of tokens
 * @param tokenCost Cost per 1K tokens
 * @param tierStart Start of the tier
 * @param tierEnd End of the tier (or undefined for no upper limit)
 * @returns Cost for this tier
 */
function calculateTierCost(
  tokens: number,
  tokenCost: number,
  tierStart: number,
  tierEnd?: number,
): number {
  // Calculate how many tokens fall within this tier
  const tierTokens = tierEnd
    ? Math.min(Math.max(0, tokens - tierStart), tierEnd - tierStart)
    : Math.max(0, tokens - tierStart);

  // Calculate the cost for this tier
  return (tierTokens / 1000) * tokenCost;
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
  modelName = 'gemini-1.5-pro',
): number {
  const pricing = getModelPricing(modelName);

  let inputCost = 0;
  let outputCost = 0;

  if (pricing.type === 'standard') {
    // Standard pricing is simple - just multiply by the cost per token
    inputCost = (inputTokens / 1000) * pricing.inputTokenCost;
    outputCost = (outputTokens / 1000) * pricing.outputTokenCost;
  } else if (pricing.type === 'tiered') {
    // Tiered pricing requires calculating costs for each tier
    const tiers = pricing.tiers;

    // Calculate input token cost across tiers
    for (let i = 0; i < tiers.length; i++) {
      const tierStart = tiers[i].threshold;
      const tierEnd = i < tiers.length - 1 ? tiers[i + 1].threshold : undefined;

      inputCost += calculateTierCost(inputTokens, tiers[i].inputTokenCost, tierStart, tierEnd);
    }

    // Calculate output token cost across tiers
    for (let i = 0; i < tiers.length; i++) {
      const tierStart = tiers[i].threshold;
      const tierEnd = i < tiers.length - 1 ? tiers[i + 1].threshold : undefined;

      outputCost += calculateTierCost(outputTokens, tiers[i].outputTokenCost, tierStart, tierEnd);
    }
  }

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
  cost: number; // Alias for estimatedCost for backward compatibility
  passCount?: number; // Number of passes in multi-pass review
  perPassCosts?: PassCostInfo[]; // Cost breakdown per pass
  contextMaintenanceFactor?: number; // Factor for context maintenance
}

/**
 * Cost information for a single pass in a multi-pass review
 */
export interface PassCostInfo {
  passNumber: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
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
  modelName = 'gemini-1.5-pro',
): CostInfo {
  const inputTokens = estimateTokenCount(inputText, modelName);
  const outputTokens = estimateTokenCount(outputText, modelName);
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(inputTokens, outputTokens, modelName);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    formattedCost: formatCost(estimatedCost),
    cost: estimatedCost, // Alias for backward compatibility
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
  modelName = 'gemini-1.5-pro',
): CostInfo {
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(inputTokens, outputTokens, modelName);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    formattedCost: formatCost(estimatedCost),
    cost: estimatedCost, // Alias for backward compatibility
  };
}
