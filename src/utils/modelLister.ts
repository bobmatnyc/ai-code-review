/**
 * @fileoverview Utility for listing available models based on configured API keys.
 * 
 * This module provides functions for listing all available models across different
 * AI providers based on which API keys are configured in the environment.
 */

import { getGoogleApiKey, getOpenRouterApiKey, getAnthropicApiKey, getOpenAIApiKey } from './envLoader';
import logger from './logger';
import chalk from 'chalk';

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
  
  return [
    {
      name: 'gemini:gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro',
      provider: 'Google',
      description: 'Latest model with improved capabilities',
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    },
    {
      name: 'gemini:gemini-2.5-pro-preview',
      displayName: 'Gemini 2.5 Pro Preview',
      provider: 'Google',
      description: 'Latest preview model',
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    },
    {
      name: 'gemini:gemini-2.5-pro-exp',
      displayName: 'Gemini 2.5 Pro Experimental',
      provider: 'Google',
      description: 'Experimental version of 2.5 Pro',
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    },
    {
      name: 'gemini:gemini-2.0-flash',
      displayName: 'Gemini 2.0 Flash',
      provider: 'Google',
      description: 'Balanced performance and quality',
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    },
    {
      name: 'gemini:gemini-2.0-flash-lite',
      displayName: 'Gemini 2.0 Flash Lite',
      provider: 'Google',
      description: 'Lighter version of 2.0 Flash',
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    },
    {
      name: 'gemini:gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      provider: 'Google',
      description: 'Recommended for most code reviews',
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    },
    {
      name: 'gemini:gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash',
      provider: 'Google',
      description: 'Faster but less detailed reviews',
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    },
    {
      name: 'gemini:gemini-1.5-flash-8b',
      displayName: 'Gemini 1.5 Flash 8B',
      provider: 'Google',
      description: 'Smallest and fastest 1.5 model',
      contextWindow: 1000000,
      apiKeyRequired: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      apiKeyStatus
    }
  ];
}

/**
 * Get all available Anthropic models
 * @returns Array of Anthropic model information
 */
function getAnthropicModels(): ModelInfo[] {
  const apiKey = getAnthropicApiKey();
  const apiKeyStatus = apiKey.apiKey ? 'available' : 'missing';
  
  return [
    {
      name: 'anthropic:claude-3-opus-20240229',
      displayName: 'Claude 3 Opus',
      provider: 'Anthropic',
      description: 'Highest quality, most detailed reviews',
      contextWindow: 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      apiKeyStatus
    },
    {
      name: 'anthropic:claude-3-sonnet-20240229',
      displayName: 'Claude 3 Sonnet',
      provider: 'Anthropic',
      description: 'Good balance of quality and speed',
      contextWindow: 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      apiKeyStatus
    },
    {
      name: 'anthropic:claude-3-haiku-20240307',
      displayName: 'Claude 3 Haiku',
      provider: 'Anthropic',
      description: 'Fast, efficient reviews',
      contextWindow: 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      apiKeyStatus
    }
  ];
}

/**
 * Get all available OpenAI models
 * @returns Array of OpenAI model information
 */
function getOpenAIModels(): ModelInfo[] {
  const apiKey = getOpenAIApiKey();
  const apiKeyStatus = apiKey.apiKey ? 'available' : 'missing';
  
  return [
    {
      name: 'openai:gpt-4o',
      displayName: 'GPT-4o',
      provider: 'OpenAI',
      description: 'Latest OpenAI model, best performance',
      contextWindow: 128000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openai:gpt-4-turbo',
      displayName: 'GPT-4 Turbo',
      provider: 'OpenAI',
      description: 'Strong performance on complex code',
      contextWindow: 128000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openai:gpt-4',
      displayName: 'GPT-4',
      provider: 'OpenAI',
      description: 'Reliable performance for detailed reviews',
      contextWindow: 8192,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openai:gpt-3.5-turbo',
      displayName: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      description: 'Fast, cost-effective reviews',
      contextWindow: 16385,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      apiKeyStatus
    }
  ];
}

/**
 * Get all available OpenRouter models
 * @returns Array of OpenRouter model information
 */
function getOpenRouterModels(): ModelInfo[] {
  const apiKey = getOpenRouterApiKey();
  const apiKeyStatus = apiKey.apiKey ? 'available' : 'missing';
  
  return [
    {
      name: 'openrouter:anthropic/claude-3-opus',
      displayName: 'Claude 3 Opus (via OpenRouter)',
      provider: 'OpenRouter',
      description: 'Highest quality, most detailed reviews',
      contextWindow: 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openrouter:anthropic/claude-3-sonnet',
      displayName: 'Claude 3 Sonnet (via OpenRouter)',
      provider: 'OpenRouter',
      description: 'Good balance of quality and speed',
      contextWindow: 200000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openrouter:openai/gpt-4-turbo',
      displayName: 'GPT-4 Turbo (via OpenRouter)',
      provider: 'OpenRouter',
      description: 'Strong performance on complex code',
      contextWindow: 128000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openrouter:openai/gpt-4o',
      displayName: 'GPT-4o (via OpenRouter)',
      provider: 'OpenRouter',
      description: 'Latest OpenAI model',
      contextWindow: 128000,
      apiKeyRequired: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      apiKeyStatus
    },
    {
      name: 'openrouter:anthropic/claude-2.1',
      displayName: 'Claude 2.1 (via OpenRouter)',
      provider: 'OpenRouter',
      description: 'Reliable performance',
      contextWindow: 100000,
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
