/**
 * @fileoverview Factory for creating API clients based on model selection.
 *
 * This module provides a factory for creating the appropriate API client
 * based on the selected model. It handles client instantiation, model detection,
 * and initialization.
 */

import { getConfig } from '../../utils/config';
import logger from '../../utils/logger';
import type { AbstractClient } from '../base';
import { AnthropicClient, GeminiClient, OpenAIClient, OpenRouterClient } from '../implementations';

/**
 * Client type enum
 */
export enum ClientType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  OPEN_ROUTER = 'openrouter',
  UNKNOWN = 'unknown',
}

/**
 * Factory for creating API clients
 */
export class ClientFactory {
  /**
   * Create an appropriate client instance based on the selected model
   * @param overrideModel Optional model to use instead of the configured one
   * @returns The client instance
   */
  public static createClient(overrideModel?: string): AbstractClient {
    const config = getConfig();
    const selectedModel = overrideModel || config.selectedModel || '';

    // Detect the client type from the model name
    const clientType = ClientFactory.detectClientType(selectedModel);

    // Create the appropriate client
    switch (clientType) {
      case ClientType.OPENAI:
        logger.info(`Creating OpenAI client for model: ${selectedModel}`);
        return new OpenAIClient();

      case ClientType.ANTHROPIC:
        logger.info(`Creating Anthropic client for model: ${selectedModel}`);
        return new AnthropicClient();

      case ClientType.GEMINI:
        logger.info(`Creating Gemini client for model: ${selectedModel}`);
        return new GeminiClient();

      case ClientType.OPEN_ROUTER:
        logger.info(`Creating OpenRouter client for model: ${selectedModel}`);
        return new OpenRouterClient();

      default:
        logger.warn(
          `Unsupported client type for model: ${selectedModel}, falling back to OpenAI client`,
        );
        return new OpenAIClient();
    }
  }

  /**
   * Detect the client type from the model name
   * @param modelName The model name to check
   * @returns The detected client type
   */
  private static detectClientType(modelName: string): ClientType {
    if (!modelName) {
      return ClientType.UNKNOWN;
    }

    // Parse the model name to get the provider/adapter
    const [adapter] = modelName.includes(':') ? modelName.split(':') : [modelName];

    // Return the appropriate client type
    switch (adapter.toLowerCase()) {
      case 'openai':
      case 'gpt':
        return ClientType.OPENAI;
      case 'anthropic':
      case 'claude':
        return ClientType.ANTHROPIC;
      case 'gemini':
      case 'google':
        return ClientType.GEMINI;
      case 'openrouter':
        return ClientType.OPEN_ROUTER;
      default:
        return ClientType.UNKNOWN;
    }
  }
}
