/**
 * @fileoverview API client selector module.
 *
 * This module is responsible for selecting the appropriate API client based on
 * available API keys and user preferences. It centralizes the logic for determining
 * which AI provider to use for code reviews.
 */

import type { AbstractClient } from '../clients/base/abstractClient';
// Import the client wrappers directly
import { initializeAnyOpenRouterModel } from '../clients/openRouterClientWrapper';
import { getApiKeyType } from '../utils/api/apiUtils';
import { getConfig } from '../utils/config';
import logger from '../utils/logger';

/**
 * API client types supported by the application
 */
export type ApiClientType = 'OpenRouter' | 'Google' | 'Anthropic' | 'OpenAI' | 'None';

/**
 * API client configuration
 */
export interface ApiClientConfig {
  clientType: ApiClientType;
  modelName: string;
  initialized: boolean;
  provider?: string;
  apiKey?: string;
  client?: AbstractClient;
}

/**
 * Parsed model specification
 */
interface ParsedModel {
  provider: string;
  modelName: string;
}

/**
 * Parse model string from environment or CLI options
 *
 * Format: provider:model or just model (defaults to gemini)
 * Examples: "gemini:gemini-1.5-pro", "anthropic:claude-3-opus", "gemini-1.5-pro"
 *
 * @param cliOptions Optional CLI options
 * @returns Parsed provider and model name
 */
function parseModelString(cliOptions?: any): ParsedModel {
  // Use cached config (which has project config merged in) instead of env var directly
  const appConfig = getConfig();
  const modelEnv = cliOptions?.model || appConfig.selectedModel || '';
  logger.debug(`parseModelString: modelEnv=${modelEnv}`);

  let provider: string;
  let modelName: string;

  if (modelEnv.includes(':')) {
    [provider, modelName] = modelEnv.split(':', 2);
  } else {
    provider = 'gemini';
    modelName = modelEnv;
  }

  logger.debug(`parseModelString: provider=${provider}, modelName=${modelName}`);
  return { provider, modelName };
}

/**
 * Log fallback mode information
 *
 * @param envProvider Original provider from environment
 * @param modelEnv Original model string
 */
function logFallbackMode(envProvider: string, modelEnv: string): void {
  logger.info('================================================================================');
  logger.info(`FALLBACK MODE: Using OpenRouter to access ${envProvider} models`);
  logger.info(`Original model: ${modelEnv}`);
  logger.info(
    `Reason: ${envProvider.toUpperCase()} API key not configured, but OpenRouter API key is available`,
  );
  logger.info(
    'OpenRouter supports models from multiple providers including Google, Anthropic, and OpenAI',
  );
  logger.info('================================================================================');
}

/**
 * Validate that a model name is specified
 *
 * @param modelName Model name to validate
 * @param provider Provider name for error messages
 * @throws Exits process if no model name specified
 */
function validateModelName(modelName: string, provider: string): void {
  if (!modelName) {
    logger.error(`No ${provider} model specified in environment variables.`);
    logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');

    if (provider === 'OpenRouter') {
      logger.error('Examples:');
      logger.error('  AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-opus');
      logger.error(
        '  AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro (will use OpenRouter as fallback)',
      );
      logger.error(
        '  AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus (will use OpenRouter as fallback)',
      );
    } else {
      logger.error(`Example: AI_CODE_REVIEW_MODEL=${provider.toLowerCase()}:model-name`);
    }

    process.exit(1);
  }
}

/**
 * Log error message for missing API keys
 */
function logNoApiKeysError(): void {
  logger.error('================================================================================');
  logger.error('ERROR: No API keys configured');
  logger.error('================================================================================');
  logger.error('');
  logger.error('You must configure at least one API key to use this tool.');
  logger.error('');
  logger.error('Supported API providers and their environment variables:');
  logger.error('  • Google Gemini:  AI_CODE_REVIEW_GOOGLE_API_KEY');
  logger.error(
    '  • OpenRouter:     AI_CODE_REVIEW_OPENROUTER_API_KEY (recommended - supports multiple models)',
  );
  logger.error('  • Anthropic:      AI_CODE_REVIEW_ANTHROPIC_API_KEY');
  logger.error('  • OpenAI:         AI_CODE_REVIEW_OPENAI_API_KEY');
  logger.error('');
  logger.error('OpenRouter is recommended as it supports models from multiple providers.');
  logger.error('Learn more at: https://openrouter.ai/');
  logger.error('');
  logger.error('Add your API key to your .env.local file:');
  logger.error('  echo "AI_CODE_REVIEW_OPENROUTER_API_KEY=your-api-key-here" >> .env.local');
  logger.error('');
  logger.error('================================================================================');
}

/**
 * Configure OpenRouter client
 *
 * @param parsedModel Parsed model specification
 * @param modelEnv Original model environment string
 * @returns API client configuration
 */
async function configureOpenRouterClient(
  parsedModel: ParsedModel,
  modelEnv: string,
): Promise<ApiClientConfig> {
  logger.debug('configureOpenRouterClient: Using OpenRouter client');

  const isFallback = parsedModel.provider !== 'openrouter';
  if (isFallback) {
    logFallbackMode(parsedModel.provider, modelEnv);
  }

  validateModelName(parsedModel.modelName, 'OpenRouter');

  // Build OpenRouter model identifier
  const openrouterModel =
    parsedModel.provider === 'openrouter'
      ? parsedModel.modelName
      : `${parsedModel.provider}/${parsedModel.modelName}`;

  if (isFallback) {
    logger.info(`Translating model for OpenRouter: ${modelEnv} → ${openrouterModel}`);
  } else {
    logger.info(`Using OpenRouter model: ${openrouterModel}`);
  }

  await initializeAnyOpenRouterModel();

  return {
    clientType: 'OpenRouter',
    modelName: `openrouter:${openrouterModel}`,
    provider: 'openrouter',
    apiKey: process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY || '',
    initialized: true,
  };
}

/**
 * Configure Google Gemini client
 *
 * @param parsedModel Parsed model specification
 * @returns API client configuration
 */
function configureGoogleClient(parsedModel: ParsedModel): ApiClientConfig {
  validateModelName(parsedModel.modelName, 'Gemini');

  if (!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY) {
    logger.error('Internal error: Google API type selected but no API key found.');
    logger.error('This should not happen. Please report this issue.');
    process.exit(1);
  }

  logger.info(`Using Gemini API with model: ${parsedModel.modelName}`);

  return {
    clientType: 'Google',
    modelName: `gemini:${parsedModel.modelName}`,
    provider: 'gemini',
    apiKey: process.env.AI_CODE_REVIEW_GOOGLE_API_KEY,
    initialized: true,
  };
}

/**
 * Configure Anthropic Claude client
 *
 * @param parsedModel Parsed model specification
 * @returns API client configuration
 */
function configureAnthropicClient(parsedModel: ParsedModel): ApiClientConfig {
  validateModelName(parsedModel.modelName, 'Anthropic');

  if (!process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY) {
    logger.error('No Anthropic API key found.');
    logger.error('Please set AI_CODE_REVIEW_ANTHROPIC_API_KEY in your .env.local file.');
    process.exit(1);
  }

  logger.info(`Using Anthropic API with model: ${parsedModel.modelName}`);

  return {
    clientType: 'Anthropic',
    modelName: `anthropic:${parsedModel.modelName}`,
    provider: 'anthropic',
    apiKey: process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY,
    initialized: true,
  };
}

/**
 * Configure OpenAI client
 *
 * @param parsedModel Parsed model specification
 * @returns API client configuration
 */
function configureOpenAIClient(parsedModel: ParsedModel): ApiClientConfig {
  validateModelName(parsedModel.modelName, 'OpenAI');

  logger.info(`Using OpenAI API with model: ${parsedModel.modelName}`);

  return {
    clientType: 'OpenAI',
    modelName: `openai:${parsedModel.modelName}`,
    provider: 'openai',
    apiKey: process.env.AI_CODE_REVIEW_OPENAI_API_KEY || '',
    initialized: true,
  };
}

/**
 * Create default unconfigured client configuration
 *
 * @returns Empty API client configuration
 */
function createDefaultConfig(): ApiClientConfig {
  return {
    clientType: 'None',
    modelName: '',
    initialized: false,
    provider: 'none',
    apiKey: '',
  };
}

/**
 * Select and initialize the appropriate API client based on available API keys
 *
 * This function implements intelligent fallback logic to maximize compatibility:
 * 1. First tries to use the native API client for the specified model
 * 2. Falls back to OpenRouter if the native API key is not available
 * 3. OpenRouter can proxy requests to multiple providers (Google, Anthropic, OpenAI)
 *
 * WHY: Users often have models configured (like gemini:gemini-1.5-pro) but may only
 * have an OpenRouter API key. This fallback ensures the tool still works by routing
 * the request through OpenRouter, which supports multiple model families.
 *
 * DESIGN DECISION: We prioritize native API clients when available for better
 * performance and direct provider features. OpenRouter is used as a universal
 * fallback to maximize compatibility.
 *
 * @param cliOptions Optional CLI options (reserved for future use)
 * @returns Promise resolving to the API client configuration
 *
 * @example
 * // User has gemini:gemini-1.5-pro configured but only OpenRouter API key
 * const config = await selectApiClient();
 * // Returns: { clientType: 'OpenRouter', modelName: 'gemini/gemini-1.5-pro', ... }
 */
export async function selectApiClient(cliOptions?: any): Promise<ApiClientConfig> {
  logger.debug('selectApiClient called');

  const apiKeyType = getApiKeyType();
  logger.debug(`selectApiClient: apiKeyType=${apiKeyType}`);

  const parsedModel = parseModelString(cliOptions);
  // Use cached config (which has project config merged in) instead of env var directly
  const appConfig = getConfig();
  const modelEnv = cliOptions?.model || appConfig.selectedModel || '';

  let config: ApiClientConfig;

  switch (apiKeyType) {
    case 'OpenRouter':
      config = await configureOpenRouterClient(parsedModel, modelEnv);
      break;

    case 'Google':
      config = configureGoogleClient(parsedModel);
      break;

    case 'Anthropic':
      config = configureAnthropicClient(parsedModel);
      break;

    case 'OpenAI':
      config = configureOpenAIClient(parsedModel);
      break;

    default:
      logNoApiKeysError();
      config = createDefaultConfig();
      break;
  }

  logger.debug(`selectApiClient: final config=${JSON.stringify(config)}`);
  return config;
}
