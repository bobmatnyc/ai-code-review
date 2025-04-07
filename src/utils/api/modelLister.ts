/**
 * @fileoverview Utility for listing available models based on configured API keys.
 *
 * This module provides functions for listing all available models across different
 * AI providers based on which API keys are configured in the environment.
 */

import { getApiKeyForProvider } from '../config';
import logger from '../logger';
import chalk from 'chalk';

/**
 * Model information interface
 */
export interface ModelInfo {
  name: string;
  displayName: string;
  provider: string;
  description: string;
  contextWindow?: number;
  apiKeyRequired: string;
  apiKeyStatus: 'available' | 'missing';
}

/**
 * Get Gemini models
 * @returns Array of Gemini model information
 */
export function getGeminiModels(): ModelInfo[] {
  const apiKeyStatus = getApiKeyForProvider('gemini') ? 'available' : 'missing';

  return [
    {
      name: 'gemini:gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      provider: 'Google',
      description: "Google's most capable multimodal model",
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    },
    {
      name: 'gemini:gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash',
      provider: 'Google',
      description: 'Faster, more cost-effective version of Gemini 1.5',
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    },
    {
      name: 'gemini:gemini-1.0-pro',
      displayName: 'Gemini 1.0 Pro',
      provider: 'Google',
      description: 'Previous generation Gemini model',
      contextWindow: 32000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    }
  ];
}

/**
 * Get Anthropic models
 * @returns Array of Anthropic model information
 */
export function getAnthropicModels(): ModelInfo[] {
  const apiKeyStatus = getApiKeyForProvider('anthropic')
    ? 'available'
    : 'missing';

  return [
    {
      name: 'anthropic:claude-3-opus-20240229',
      displayName: 'Claude 3 Opus',
      provider: 'Anthropic',
      description: "Anthropic's most powerful model",
      contextWindow: 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      apiKeyStatus
    },
    {
      name: 'anthropic:claude-3-sonnet-20240229',
      displayName: 'Claude 3 Sonnet',
      provider: 'Anthropic',
      description: 'Balanced performance and cost',
      contextWindow: 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      apiKeyStatus
    },
    {
      name: 'anthropic:claude-3-haiku-20240307',
      displayName: 'Claude 3 Haiku',
      provider: 'Anthropic',
      description: 'Fastest and most cost-effective Claude model',
      contextWindow: 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      apiKeyStatus
    }
  ];
}

/**
 * Get OpenAI models
 * @returns Array of OpenAI model information
 */
export function getOpenAIModels(): ModelInfo[] {
  const apiKeyStatus = getApiKeyForProvider('openai') ? 'available' : 'missing';

  return [
    {
      name: 'openai:gpt-4o',
      displayName: 'GPT-4o',
      provider: 'OpenAI',
      description: "OpenAI's most capable multimodal model",
      contextWindow: 128000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openai:gpt-4-turbo',
      displayName: 'GPT-4 Turbo',
      provider: 'OpenAI',
      description: 'Powerful model with good context window',
      contextWindow: 128000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openai:gpt-3.5-turbo',
      displayName: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      description: 'Fast and cost-effective model',
      contextWindow: 16000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      apiKeyStatus
    }
  ];
}

/**
 * Get OpenRouter models
 * @returns Array of OpenRouter model information
 */
export function getOpenRouterModels(): ModelInfo[] {
  const apiKeyStatus = getApiKeyForProvider('openrouter')
    ? 'available'
    : 'missing';

  return [
    {
      name: 'openrouter:anthropic/claude-3-opus',
      displayName: 'Claude 3 Opus (via OpenRouter)',
      provider: 'OpenRouter',
      description: "Anthropic's most powerful model via OpenRouter",
      contextWindow: 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openrouter:openai/gpt-4o',
      displayName: 'GPT-4o (via OpenRouter)',
      provider: 'OpenRouter',
      description: "OpenAI's most capable model via OpenRouter",
      contextWindow: 128000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openrouter:google/gemini-pro',
      displayName: 'Gemini Pro (via OpenRouter)',
      provider: 'OpenRouter',
      description: "Google's model via OpenRouter",
      contextWindow: 32000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      apiKeyStatus
    }
  ];
}

/**
 * Get all available models across all providers
 * @returns Array of all model information
 */
export function getAllModels(): ModelInfo[] {
  return [
    ...getGeminiModels(),
    ...getAnthropicModels(),
    ...getOpenAIModels(),
    ...getOpenRouterModels()
  ];
}

/**
 * Get all available models based on configured API keys
 * @returns Array of available model information
 */
export function getAvailableModels(): ModelInfo[] {
  return getAllModels().filter(model => model.apiKeyStatus === 'available');
}

/**
 * Display models in the console
 * @param models Array of model information
 * @param showUnavailable Whether to show unavailable models
 */
export function displayModels(
  models: ModelInfo[],
  showUnavailable: boolean = false
): void {
  // Group models by provider
  const modelsByProvider: Record<string, ModelInfo[]> = {};

  models.forEach(model => {
    if (!modelsByProvider[model.provider]) {
      modelsByProvider[model.provider] = [];
    }

    if (model.apiKeyStatus === 'available' || showUnavailable) {
      modelsByProvider[model.provider].push(model);
    }
  });

  // Display models by provider
  Object.entries(modelsByProvider).forEach(([provider, providerModels]) => {
    if (providerModels.length === 0) {
      return;
    }

    logger.info(`\n${chalk.bold(provider)} Models:`);

    providerModels.forEach(model => {
      const status =
        model.apiKeyStatus === 'available'
          ? chalk.green('✓ Available')
          : chalk.red('✗ API Key Missing');

      logger.info(`  ${chalk.bold(model.displayName)} (${model.name})`);
      logger.info(`    ${model.description}`);
      logger.info(
        `    Context Window: ${model.contextWindow?.toLocaleString() || 'Unknown'} tokens`
      );
      logger.info(`    Status: ${status}`);
      logger.info('');
    });
  });
}
