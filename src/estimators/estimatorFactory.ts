/**
 * @fileoverview Factory for creating token and cost estimators.
 *
 * This module provides a factory for creating the appropriate estimator
 * based on the model name or provider.
 */

import { AnthropicTokenEstimator } from './anthropicEstimator';
import type { TokenEstimator } from './baseEstimator';
import { GeminiTokenEstimator } from './geminiEstimator';
import { OpenAITokenEstimator } from './openaiEstimator';
import { OpenRouterTokenEstimator } from './openRouterEstimator';

/**
 * Factory for creating token and cost estimators
 */
export class EstimatorFactory {
  private static instance: EstimatorFactory;

  /**
   * Get the singleton instance of the factory
   * @returns EstimatorFactory instance
   */
  public static getInstance(): EstimatorFactory {
    if (!EstimatorFactory.instance) {
      EstimatorFactory.instance = new EstimatorFactory();
    }
    return EstimatorFactory.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the appropriate estimator for a given model
   * @param modelName Name of the model
   * @returns TokenEstimator instance
   */
  getEstimatorForModel(modelName: string): TokenEstimator {
    // Check if the model name includes a provider prefix
    if (modelName.includes(':')) {
      const [provider] = modelName.split(':');
      return this.getEstimatorForProvider(provider);
    }

    // Try to determine the provider from the model name
    if (modelName.startsWith('gemini-')) {
      return GeminiTokenEstimator.getInstance();
    }
    if (modelName.startsWith('claude-') || modelName.startsWith('anthropic/')) {
      return AnthropicTokenEstimator.getInstance();
    }
    if (modelName.startsWith('gpt-') || modelName.startsWith('openai/')) {
      return OpenAITokenEstimator.getInstance();
    }
    if (modelName.startsWith('openrouter-')) {
      return OpenRouterTokenEstimator.getInstance();
    }

    // Default to Gemini estimator
    return GeminiTokenEstimator.getInstance();
  }

  /**
   * Get the estimator for a specific provider
   * @param provider Provider name
   * @returns TokenEstimator instance
   */
  getEstimatorForProvider(provider: string): TokenEstimator {
    switch (provider.toLowerCase()) {
      case 'gemini':
        return GeminiTokenEstimator.getInstance();
      case 'anthropic':
        return AnthropicTokenEstimator.getInstance();
      case 'openai':
        return OpenAITokenEstimator.getInstance();
      case 'openrouter':
        return OpenRouterTokenEstimator.getInstance();
      default:
        return GeminiTokenEstimator.getInstance();
    }
  }

  /**
   * Get the default estimator
   * @returns TokenEstimator instance
   */
  getDefaultEstimator(): TokenEstimator {
    // Default to Gemini estimator
    return GeminiTokenEstimator.getInstance();
  }
}
