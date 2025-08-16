/**
 * @fileoverview Factory for creating API clients based on model selection.
 *
 * This module provides a factory for creating the appropriate API client
 * based on the selected model. It handles client instantiation, model detection,
 * and initialization.
 * 
 * The factory includes robust model name cleaning to handle malformed input
 * such as trailing quotes or backticks that can occur during configuration
 * or environment variable parsing.
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
    
    // Clean the model name early to handle malformed quotes and backticks
    const cleanedModel = selectedModel.replace(/['"``]/g, '').trim();
    
    logger.debug(`[ClientFactory] Creating client for model: ${selectedModel} (cleaned: ${cleanedModel})`);

    // Detect the client type from the cleaned model name
    const clientType = ClientFactory.detectClientType(cleanedModel);
    
    logger.debug(`[ClientFactory] Detected client type: ${clientType}`);

    // Create the appropriate client
    switch (clientType) {
      case ClientType.OPENAI:
        logger.info(`Creating OpenAI client for model: ${cleanedModel}`);
        return new OpenAIClient();

      case ClientType.ANTHROPIC:
        logger.info(`Creating Anthropic client for model: ${cleanedModel}`);
        return new AnthropicClient();

      case ClientType.GEMINI:
        logger.info(`Creating Gemini client for model: ${cleanedModel}`);
        return new GeminiClient();

      case ClientType.OPEN_ROUTER:
        logger.info(`Creating OpenRouter client for model: ${cleanedModel}`);
        return new OpenRouterClient();

      default:
        logger.warn(
          `Unsupported client type for model: "${selectedModel}" (cleaned: "${cleanedModel}"), falling back to OpenAI client`,
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
      logger.debug('[ClientFactory] No model name provided, returning UNKNOWN');
      return ClientType.UNKNOWN;
    }

    // Clean up the model name by removing malformed quotes, backticks, and whitespace
    const cleanedModelName = modelName.replace(/['"``]/g, '').trim();
    
    logger.debug(`[ClientFactory] Original model: ${modelName}, cleaned: ${cleanedModelName}`);

    // Parse the cleaned model name to get the provider/adapter
    const [adapter, restOfModel] = cleanedModelName.includes(':') ? cleanedModelName.split(':') : [cleanedModelName, ''];
    
    logger.debug(`[ClientFactory] Detecting client type for model: ${cleanedModelName}, adapter: ${adapter}`);

    // Return the appropriate client type based on the adapter/prefix
    const adapterLower = adapter.toLowerCase();
    switch (adapterLower) {
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
        // If no prefix, try to detect based on model name patterns
        if (adapterLower.startsWith('gpt-') || adapterLower.startsWith('o1-') || adapterLower.startsWith('o3-')) {
          logger.debug(`[ClientFactory] Detected OpenAI model by pattern: ${adapter}`);
          return ClientType.OPENAI;
        } else if (adapterLower.startsWith('claude-')) {
          logger.debug(`[ClientFactory] Detected Anthropic model by pattern: ${adapter}`);
          return ClientType.ANTHROPIC;
        } else if (adapterLower.startsWith('gemini-')) {
          logger.debug(`[ClientFactory] Detected Gemini model by pattern: ${adapter}`);
          return ClientType.GEMINI;
        }
        
        logger.debug(`[ClientFactory] Unknown adapter: "${adapter}" for model: "${cleanedModelName}"`);
        return ClientType.UNKNOWN;
    }
  }
}
