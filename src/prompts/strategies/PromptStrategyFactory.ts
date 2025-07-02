/**
 * @fileoverview Factory for creating prompt strategies.
 *
 * This module provides a factory for creating prompt strategies based on
 * the model provider and user preferences.
 */

import logger from '../../utils/logger';
import type { PromptCache } from '../cache/PromptCache';
import type { PromptManager } from '../PromptManager';
import { AnthropicPromptStrategy } from './AnthropicPromptStrategy';
import { GeminiPromptStrategy } from './GeminiPromptStrategy';
import { LangChainPromptStrategy } from './LangChainPromptStrategy';
import { OpenAIPromptStrategy } from './OpenAIPromptStrategy';
import type { PromptStrategy } from './PromptStrategy';

/**
 * Factory for creating prompt strategies
 */
export class PromptStrategyFactory {
  private static strategies: Map<string, PromptStrategy> = new Map();

  /**
   * Create a prompt strategy based on the model provider
   * @param provider Model provider (e.g., 'anthropic', 'gemini', 'openai')
   * @param promptManager Prompt manager instance
   * @param promptCache Prompt cache instance
   * @returns The appropriate prompt strategy
   */
  static createStrategy(
    provider: string,
    promptManager: PromptManager,
    promptCache: PromptCache,
  ): PromptStrategy {
    // Normalize the provider name
    const normalizedProvider = provider.toLowerCase();

    // Check if we already have a strategy for this provider
    if (PromptStrategyFactory.strategies.has(normalizedProvider)) {
      return PromptStrategyFactory.strategies.get(normalizedProvider)!;
    }

    // Create a new strategy based on the provider
    let strategy: PromptStrategy;

    switch (normalizedProvider) {
      case 'anthropic':
        strategy = new AnthropicPromptStrategy(promptManager, promptCache);
        break;
      case 'gemini':
        strategy = new GeminiPromptStrategy(promptManager, promptCache);
        break;
      case 'openai':
        strategy = new OpenAIPromptStrategy(promptManager, promptCache);
        break;
      case 'langchain':
        strategy = new LangChainPromptStrategy(promptManager, promptCache);
        break;
      default:
        // Default to Anthropic strategy
        logger.warn(`Unknown provider: ${provider}. Using default strategy.`);
        strategy = new AnthropicPromptStrategy(promptManager, promptCache);
    }

    // Cache the strategy
    PromptStrategyFactory.strategies.set(normalizedProvider, strategy);

    return strategy;
  }

  /**
   * Get all available prompt strategies
   * @param promptManager Prompt manager instance
   * @param promptCache Prompt cache instance
   * @returns Array of all available prompt strategies
   */
  static getAllStrategies(
    promptManager: PromptManager,
    promptCache: PromptCache,
  ): PromptStrategy[] {
    return [
      new AnthropicPromptStrategy(promptManager, promptCache),
      new GeminiPromptStrategy(promptManager, promptCache),
      new OpenAIPromptStrategy(promptManager, promptCache),
      new LangChainPromptStrategy(promptManager, promptCache),
    ];
  }
}
