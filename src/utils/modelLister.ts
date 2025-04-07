/**
 * @fileoverview Utility for listing available models based on configured API keys.
 *
 * This module provides functions for listing all available models across different
 * AI providers based on which API keys are configured in the environment.
 */

import { getGoogleApiKey, getOpenRouterApiKey, getAnthropicApiKey, getOpenAIApiKey } from './envLoader';
import logger from './logger';
import chalk from 'chalk';
import {
  MODEL_MAP,
  getModelsByProvider
} from './modelMaps';

/**
 * Model information interface
 */
interface ModelInfo {
  name: string;
  displayName: string;
  provider: string;
  description: string;
  contextWindow?: number;
  apiKeyRequired: string;
  apiKeyStatus: 'available' | 'missing';
}

/**
 * Get all available Gemini models
 * @returns Array of Gemini model information
 */
function getGeminiModels(): ModelInfo[] {
  const apiKey = getGoogleApiKey();
  const apiKeyStatus = apiKey.apiKey ? 'available' : 'missing';

  return getModelsByProvider('gemini').map(modelKey => {
    const modelData = MODEL_MAP[modelKey];
    return {
      name: modelKey,
      displayName: modelData.displayName,
      provider: 'Google',
      description: modelData.description || '',
      contextWindow: modelData.contextWindow || 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    };
  });
}

/**
 * Get all available Anthropic models
 * @returns Array of Anthropic model information
 */
function getAnthropicModels(): ModelInfo[] {
  const apiKey = getAnthropicApiKey();
  const apiKeyStatus = apiKey.apiKey ? 'available' : 'missing';

  return getModelsByProvider('anthropic').map(modelKey => {
    const modelData = MODEL_MAP[modelKey];
    return {
      name: modelKey,
      displayName: modelData.displayName,
      provider: 'Anthropic',
      description: modelData.description || 'Anthropic Claude model',
      contextWindow: modelData.contextWindow || 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      apiKeyStatus
    };
  });
}

/**
 * Get all available OpenAI models
 * @returns Array of OpenAI model information
 */
function getOpenAIModels(): ModelInfo[] {
  const apiKey = getOpenAIApiKey();
  const apiKeyStatus = apiKey.apiKey ? 'available' : 'missing';

  return getModelsByProvider('openai').map(modelKey => {
    const modelData = MODEL_MAP[modelKey];
    return {
      name: modelKey,
      displayName: modelData.displayName,
      provider: 'OpenAI',
      description: modelData.description || 'OpenAI model',
      contextWindow: modelData.contextWindow || 16000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      apiKeyStatus
    };
  });
}

/**
 * Get all available OpenRouter models
 * @returns Array of OpenRouter model information
 */
function getOpenRouterModels(): ModelInfo[] {
  const apiKey = getOpenRouterApiKey();
  const apiKeyStatus = apiKey.apiKey ? 'available' : 'missing';

  return getModelsByProvider('openrouter').map(modelKey => {
    const modelData = MODEL_MAP[modelKey];
    return {
      name: modelKey,
      displayName: modelData.displayName,
      provider: 'OpenRouter',
      description: modelData.description || 'Model via OpenRouter',
      contextWindow: modelData.contextWindow || 32000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      apiKeyStatus
    };
  });
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
 * Print a list of all models with their availability status
 * @param showOnlyAvailable Whether to show only available models
 */
export function listModels(showOnlyAvailable: boolean = false): void {
  const models = showOnlyAvailable ? getAvailableModels() : getAllModels();

  // Group models by provider
  const modelsByProvider: Record<string, ModelInfo[]> = {};

  models.forEach(model => {
    if (!modelsByProvider[model.provider]) {
      modelsByProvider[model.provider] = [];
    }
    modelsByProvider[model.provider].push(model);
  });

  // Print models by provider
  console.log(chalk.bold('\nAvailable AI Models for Code Review:'));
  console.log(chalk.dim('-----------------------------------'));

  Object.entries(modelsByProvider).forEach(([provider, providerModels]) => {
    console.log(chalk.bold(`\n${provider} Models:`));

    providerModels.forEach(model => {
      const statusColor = model.apiKeyStatus === 'available' ? chalk.green : chalk.red;
      const statusText = model.apiKeyStatus === 'available' ? 'AVAILABLE' : 'MISSING API KEY';

      console.log(`  ${chalk.cyan(model.displayName)} (${chalk.yellow(model.name)})`);
      console.log(`    ${chalk.dim('Description:')} ${model.description}`);
      if (model.contextWindow) {
        console.log(`    ${chalk.dim('Context Window:')} ${model.contextWindow.toLocaleString()} tokens`);
      }
      console.log(`    ${chalk.dim('API Key Required:')} ${model.apiKeyRequired}`);
      console.log(`    ${chalk.dim('Status:')} ${statusColor(statusText)}`);
      console.log();
    });
  });

  // Print summary
  const availableCount = models.filter(model => model.apiKeyStatus === 'available').length;
  const totalCount = models.length;

  console.log(chalk.dim('-----------------------------------'));
  console.log(`${chalk.bold('Summary:')} ${availableCount} of ${totalCount} models available`);

  if (availableCount === 0) {
    console.log(chalk.yellow('\nNo API keys configured. Please set at least one of the following environment variables:'));
    console.log(`  - ${chalk.cyan('AI_CODE_REVIEW_GOOGLE_API_KEY')} for Gemini models`);
    console.log(`  - ${chalk.cyan('AI_CODE_REVIEW_ANTHROPIC_API_KEY')} for Claude models`);
    console.log(`  - ${chalk.cyan('AI_CODE_REVIEW_OPENAI_API_KEY')} for OpenAI models`);
    console.log(`  - ${chalk.cyan('AI_CODE_REVIEW_OPENROUTER_API_KEY')} for OpenRouter models`);
  }
}

/**
 * Get the current model from environment variables
 * @returns The current model information or undefined if not found
 */
export function getCurrentModel(): ModelInfo | undefined {
  const modelName = process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';
  return getAllModels().find(model => model.name === modelName);
}

/**
 * Print information about the current model
 */
export function printCurrentModel(): void {
  const model = getCurrentModel();

  if (!model) {
    console.log(chalk.yellow(`\nCurrent model not found: ${process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro'}`));
    return;
  }

  const statusColor = model.apiKeyStatus === 'available' ? chalk.green : chalk.red;
  const statusText = model.apiKeyStatus === 'available' ? 'AVAILABLE' : 'MISSING API KEY';

  console.log(chalk.bold('\nCurrent Model:'));
  console.log(chalk.dim('-----------------------------------'));
  console.log(`${chalk.cyan(model.displayName)} (${chalk.yellow(model.name)})`);
  console.log(`${chalk.dim('Provider:')} ${model.provider}`);
  console.log(`${chalk.dim('Description:')} ${model.description}`);
  if (model.contextWindow) {
    console.log(`${chalk.dim('Context Window:')} ${model.contextWindow.toLocaleString()} tokens`);
  }
  console.log(`${chalk.dim('API Key Required:')} ${model.apiKeyRequired}`);
  console.log(`${chalk.dim('Status:')} ${statusColor(statusText)}`);

  if (model.apiKeyStatus !== 'available') {
    console.log(chalk.yellow(`\nAPI key missing. Please set ${model.apiKeyRequired} in your .env.local file.`));
  }
}
