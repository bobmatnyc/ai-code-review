/**
 * @fileoverview Anthropic-specific token and cost estimator.
 *
 * This module provides token counting and cost estimation specifically
 * for Anthropic's Claude models, with accurate pricing information.
 */

import { getApiNameFromKey } from '../clients/utils/modelMaps';
import { AbstractTokenEstimator } from './abstractEstimator';

/**
 * Anthropic-specific token and cost estimator
 */
export class AnthropicTokenEstimator extends AbstractTokenEstimator {
  private static instance: AnthropicTokenEstimator;

  /**
   * Get the singleton instance of the estimator
   * @returns AnthropicTokenEstimator instance
   */
  public static getInstance(): AnthropicTokenEstimator {
    if (!AnthropicTokenEstimator.instance) {
      AnthropicTokenEstimator.instance = new AnthropicTokenEstimator();
    }
    return AnthropicTokenEstimator.instance;
  }

  /**
   * Pricing information for Anthropic models
   */
  private MODEL_PRICING: Record<string, { inputTokenCost: number; outputTokenCost: number }> = {
    // Claude 3 models
    'claude-3-opus-20240229': {
      inputTokenCost: 0.015, // $15.00 per 1M tokens
      outputTokenCost: 0.075, // $75.00 per 1M tokens
    },
    'claude-3-sonnet-20240229': {
      inputTokenCost: 0.003, // $3.00 per 1M tokens
      outputTokenCost: 0.015, // $15.00 per 1M tokens
    },
    'claude-3-haiku-20240307': {
      inputTokenCost: 0.00025, // $0.25 per 1M tokens
      outputTokenCost: 0.00125, // $1.25 per 1M tokens
    },

    // Claude 3.5 models
    'claude-3-5-sonnet-20241022': {
      inputTokenCost: 0.003, // $3.00 per 1M tokens
      outputTokenCost: 0.015, // $15.00 per 1M tokens
    },
    'claude-3-5-haiku-20241022': {
      inputTokenCost: 0.0008, // $0.80 per 1M tokens
      outputTokenCost: 0.004, // $4.00 per 1M tokens
    },

    // Claude 3.7 models
    'claude-3-7-sonnet-20250219': {
      inputTokenCost: 0.003, // $3.00 per 1M tokens (estimated)
      outputTokenCost: 0.015, // $15.00 per 1M tokens (estimated)
    },

    // Claude 4 models
    'claude-sonnet-4-20250514': {
      inputTokenCost: 0.003, // $3.00 per 1M tokens
      outputTokenCost: 0.015, // $15.00 per 1M tokens
    },
    'claude-opus-4-20250514': {
      inputTokenCost: 0.015, // $15.00 per 1M tokens
      outputTokenCost: 0.075, // $75.00 per 1M tokens
    },

    // Claude 2 models
    'claude-2.1': {
      inputTokenCost: 0.008, // $8.00 per 1M tokens
      outputTokenCost: 0.024, // $24.00 per 1M tokens
    },
    'claude-2.0': {
      inputTokenCost: 0.008, // $8.00 per 1M tokens
      outputTokenCost: 0.024, // $24.00 per 1M tokens
    },

    // Claude Instant models
    'claude-instant-1.2': {
      inputTokenCost: 0.0008, // $0.80 per 1M tokens
      outputTokenCost: 0.0024, // $2.40 per 1M tokens
    },

    // Default fallback pricing (using Claude 3 Sonnet as default)
    default: {
      inputTokenCost: 0.003, // $3.00 per 1M tokens
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
    // If modelName includes provider prefix (e.g., "anthropic:claude-4-opus"),
    // use getApiNameFromKey to get the API identifier
    const apiIdentifier = modelName.includes(':') ? getApiNameFromKey(modelName) : modelName;

    return this.MODEL_PRICING[apiIdentifier] || this.MODEL_PRICING['default'];
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
    // getModelPricing now handles the model name extraction
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
    return 'claude-3-sonnet-20240229';
  }

  /**
   * Check if this estimator supports a given model
   * @param modelName Name of the model to check
   * @returns True if the model is supported, false otherwise
   */
  supportsModel(modelName: string): boolean {
    return modelName in this.MODEL_PRICING || modelName.startsWith('claude-');
  }
}
