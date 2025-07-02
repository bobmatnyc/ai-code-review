/**
 * @fileoverview Gemini-specific token and cost estimator.
 *
 * This module provides token counting and cost estimation specifically
 * for Google's Gemini models, with accurate pricing information.
 */

import { AbstractTokenEstimator } from './abstractEstimator';

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
 * Gemini-specific token and cost estimator
 */
export class GeminiTokenEstimator extends AbstractTokenEstimator {
  private static instance: GeminiTokenEstimator;

  /**
   * Get the singleton instance of the estimator
   * @returns GeminiTokenEstimator instance
   */
  public static getInstance(): GeminiTokenEstimator {
    if (!GeminiTokenEstimator.instance) {
      GeminiTokenEstimator.instance = new GeminiTokenEstimator();
    }
    return GeminiTokenEstimator.instance;
  }

  /**
   * Pricing information for Gemini models
   */
  private MODEL_PRICING: Record<string, ModelPricing> = {
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

    // Default fallback pricing
    default: {
      type: 'standard',
      inputTokenCost: 0.001, // $1.00 per 1M tokens
      outputTokenCost: 0.002, // $2.00 per 1M tokens
    },
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
  }

  /**
   * Get the pricing for a specific model
   * @param modelName Name of the model
   * @returns Pricing information for the model
   */
  private getModelPricing(modelName: string): ModelPricing {
    return this.MODEL_PRICING[modelName] || this.MODEL_PRICING['default'];
  }

  /**
   * Calculate the cost for a specific tier
   * @param tokens Number of tokens
   * @param tokenCost Cost per 1K tokens
   * @param tierStart Start of the tier
   * @param tierEnd End of the tier (or undefined for no upper limit)
   * @returns Cost for this tier
   */
  private calculateTierCost(
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
   * Calculate the cost for a given number of input and output tokens
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @param modelName Name of the model (optional, uses default if not provided)
   * @returns Estimated cost in USD
   */
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    modelName: string = this.getDefaultModel(),
  ): number {
    const pricing = this.getModelPricing(modelName);

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

        inputCost += this.calculateTierCost(
          inputTokens,
          tiers[i].inputTokenCost,
          tierStart,
          tierEnd,
        );
      }

      // Calculate output token cost across tiers
      for (let i = 0; i < tiers.length; i++) {
        const tierStart = tiers[i].threshold;
        const tierEnd = i < tiers.length - 1 ? tiers[i + 1].threshold : undefined;

        outputCost += this.calculateTierCost(
          outputTokens,
          tiers[i].outputTokenCost,
          tierStart,
          tierEnd,
        );
      }
    }

    return inputCost + outputCost;
  }

  /**
   * Get the default model name for this estimator
   * @returns Default model name
   */
  getDefaultModel(): string {
    return 'gemini-1.5-pro';
  }

  /**
   * Check if this estimator supports a given model
   * @param modelName Name of the model to check
   * @returns True if the model is supported, false otherwise
   */
  supportsModel(modelName: string): boolean {
    return modelName in this.MODEL_PRICING || modelName.startsWith('gemini-');
  }
}
