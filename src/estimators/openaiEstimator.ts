/**
 * @fileoverview OpenAI-specific token and cost estimator.
 *
 * This module provides token counting and cost estimation specifically
 * for OpenAI's models, with accurate pricing information.
 */

import { AbstractTokenEstimator } from './abstractEstimator';

/**
 * OpenAI-specific token and cost estimator
 */
export class OpenAITokenEstimator extends AbstractTokenEstimator {
  private static instance: OpenAITokenEstimator;

  /**
   * Get the singleton instance of the estimator
   * @returns OpenAITokenEstimator instance
   */
  public static getInstance(): OpenAITokenEstimator {
    if (!OpenAITokenEstimator.instance) {
      OpenAITokenEstimator.instance = new OpenAITokenEstimator();
    }
    return OpenAITokenEstimator.instance;
  }

  /**
   * Pricing information for OpenAI models
   */
  private MODEL_PRICING: Record<string, { inputTokenCost: number; outputTokenCost: number }> = {
    // GPT-4o models
    'gpt-4o': {
      inputTokenCost: 0.005, // $5.00 per 1M tokens
      outputTokenCost: 0.015, // $15.00 per 1M tokens
    },

    // GPT-4 Turbo models
    'gpt-4-turbo': {
      inputTokenCost: 0.01, // $10.00 per 1M tokens
      outputTokenCost: 0.03, // $30.00 per 1M tokens
    },
    'gpt-4-turbo-preview': {
      inputTokenCost: 0.01, // $10.00 per 1M tokens
      outputTokenCost: 0.03, // $30.00 per 1M tokens
    },

    // GPT-4 models
    'gpt-4': {
      inputTokenCost: 0.03, // $30.00 per 1M tokens
      outputTokenCost: 0.06, // $60.00 per 1M tokens
    },
    'gpt-4-32k': {
      inputTokenCost: 0.06, // $60.00 per 1M tokens
      outputTokenCost: 0.12, // $120.00 per 1M tokens
    },

    // GPT-3.5 Turbo models
    'gpt-3.5-turbo': {
      inputTokenCost: 0.0005, // $0.50 per 1M tokens
      outputTokenCost: 0.0015, // $1.50 per 1M tokens
    },
    'gpt-3.5-turbo-16k': {
      inputTokenCost: 0.001, // $1.00 per 1M tokens
      outputTokenCost: 0.002, // $2.00 per 1M tokens
    },

    // O3 reasoning models
    o3: {
      inputTokenCost: 0.015, // $15.00 per 1M tokens
      outputTokenCost: 0.06, // $60.00 per 1M tokens
    },
    'o3-mini': {
      inputTokenCost: 0.003, // $3.00 per 1M tokens
      outputTokenCost: 0.012, // $12.00 per 1M tokens
    },

    // Default fallback pricing (using GPT-4o as default)
    default: {
      inputTokenCost: 0.005, // $5.00 per 1M tokens
      outputTokenCost: 0.015, // $15.00 per 1M tokens
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
  private getModelPricing(modelName: string): {
    inputTokenCost: number;
    outputTokenCost: number;
  } {
    return this.MODEL_PRICING[modelName] || this.MODEL_PRICING.default;
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
    const inputCost = (inputTokens / 1000) * pricing.inputTokenCost;
    const outputCost = (outputTokens / 1000) * pricing.outputTokenCost;
    return inputCost + outputCost;
  }

  /**
   * Get the default model name for this estimator
   * @returns Default model name
   */
  getDefaultModel(): string {
    return 'gpt-4o';
  }

  /**
   * Check if this estimator supports a given model
   * @param modelName Name of the model to check
   * @returns True if the model is supported, false otherwise
   */
  supportsModel(modelName: string): boolean {
    return (
      modelName in this.MODEL_PRICING || modelName.startsWith('gpt-') || modelName.startsWith('o3')
    );
  }
}
