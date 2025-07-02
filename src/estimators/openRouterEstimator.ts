/**
 * @fileoverview OpenRouter-specific token and cost estimator.
 *
 * This module provides token counting and cost estimation specifically
 * for models available through OpenRouter, with accurate pricing information.
 */

import { AbstractTokenEstimator } from './abstractEstimator';
import { AnthropicTokenEstimator } from './anthropicEstimator';
import { OpenAITokenEstimator } from './openaiEstimator';

/**
 * OpenRouter-specific token and cost estimator
 */
export class OpenRouterTokenEstimator extends AbstractTokenEstimator {
  private static instance: OpenRouterTokenEstimator;
  private anthropicEstimator: AnthropicTokenEstimator;
  private openaiEstimator: OpenAITokenEstimator;

  /**
   * Get the singleton instance of the estimator
   * @returns OpenRouterTokenEstimator instance
   */
  public static getInstance(): OpenRouterTokenEstimator {
    if (!OpenRouterTokenEstimator.instance) {
      OpenRouterTokenEstimator.instance = new OpenRouterTokenEstimator();
    }
    return OpenRouterTokenEstimator.instance;
  }

  /**
   * Pricing information for OpenRouter-specific models
   * Note: Many models are provided by other providers and use their pricing
   */
  private MODEL_PRICING: Record<string, { inputTokenCost: number; outputTokenCost: number }> = {
    // Models with OpenRouter-specific pricing
    'mistralai/mistral-7b-instruct': {
      inputTokenCost: 0.0002, // $0.20 per 1M tokens
      outputTokenCost: 0.0002, // $0.20 per 1M tokens
    },
    'mistralai/mistral-small': {
      inputTokenCost: 0.002, // $2.00 per 1M tokens
      outputTokenCost: 0.006, // $6.00 per 1M tokens
    },
    'mistralai/mistral-medium': {
      inputTokenCost: 0.0027, // $2.70 per 1M tokens
      outputTokenCost: 0.0081, // $8.10 per 1M tokens
    },
    'mistralai/mistral-large': {
      inputTokenCost: 0.008, // $8.00 per 1M tokens
      outputTokenCost: 0.024, // $24.00 per 1M tokens
    },

    // Default fallback pricing
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
    this.anthropicEstimator = AnthropicTokenEstimator.getInstance();
    this.openaiEstimator = OpenAITokenEstimator.getInstance();
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
    // Handle OpenRouter model names (remove the 'openrouter-' prefix if present)
    if (modelName.startsWith('openrouter-')) {
      modelName = modelName.substring('openrouter-'.length);
    }

    // Check if it's an OpenRouter-specific model
    if (modelName in this.MODEL_PRICING) {
      return this.MODEL_PRICING[modelName];
    }

    // Check if it's an Anthropic model
    if (modelName.startsWith('anthropic/') || modelName.includes('claude')) {
      const anthropicModel = modelName.startsWith('anthropic/')
        ? modelName.substring('anthropic/'.length)
        : modelName;
      return this.anthropicEstimator.supportsModel(anthropicModel)
        ? {
            inputTokenCost: this.anthropicEstimator.calculateCost(1000, 0, anthropicModel) / 1000,
            outputTokenCost: this.anthropicEstimator.calculateCost(0, 1000, anthropicModel) / 1000,
          }
        : this.MODEL_PRICING['default'];
    }

    // Check if it's an OpenAI model
    if (modelName.startsWith('openai/') || modelName.includes('gpt')) {
      const openaiModel = modelName.startsWith('openai/')
        ? modelName.substring('openai/'.length)
        : modelName;
      return this.openaiEstimator.supportsModel(openaiModel)
        ? {
            inputTokenCost: this.openaiEstimator.calculateCost(1000, 0, openaiModel) / 1000,
            outputTokenCost: this.openaiEstimator.calculateCost(0, 1000, openaiModel) / 1000,
          }
        : this.MODEL_PRICING['default'];
    }

    // Default fallback
    return this.MODEL_PRICING['default'];
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
    // Apply OpenRouter's markup (approximately 10%)
    const OPENROUTER_MARKUP = 1.1;

    const pricing = this.getModelPricing(modelName);
    const inputCost = (inputTokens / 1000) * pricing.inputTokenCost;
    const outputCost = (outputTokens / 1000) * pricing.outputTokenCost;
    return (inputCost + outputCost) * OPENROUTER_MARKUP;
  }

  /**
   * Get the default model name for this estimator
   * @returns Default model name
   */
  getDefaultModel(): string {
    return 'openai/gpt-4o';
  }

  /**
   * Check if this estimator supports a given model
   * @param modelName Name of the model to check
   * @returns True if the model is supported, false otherwise
   */
  supportsModel(modelName: string): boolean {
    // OpenRouter supports a wide range of models from different providers
    return (
      modelName.startsWith('openrouter-') ||
      modelName.includes('/') ||
      this.anthropicEstimator.supportsModel(modelName) ||
      this.openaiEstimator.supportsModel(modelName)
    );
  }
}
