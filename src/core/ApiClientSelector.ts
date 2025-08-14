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

  // Check which API key is available based on the model specified in environment variables
  const apiKeyType = getApiKeyType();
  logger.debug(`selectApiClient: apiKeyType=${apiKeyType}`);

  // Parse the model string from options or env var (format: provider:model), default provider = gemini
  const modelEnv = cliOptions?.model || process.env.AI_CODE_REVIEW_MODEL || '';
  logger.debug(`selectApiClient: modelEnv=${modelEnv}`);
  let envProvider: string;
  let envModelName: string;
  if (modelEnv.includes(':')) {
    [envProvider, envModelName] = modelEnv.split(':', 2);
  } else {
    envProvider = 'gemini';
    envModelName = modelEnv;
  }
  logger.debug(`selectApiClient: envProvider=${envProvider}, envModelName=${envModelName}`);

  // Default configuration with no API client
  const config: ApiClientConfig = {
    clientType: 'None',
    modelName: '',
    initialized: false,
    provider: 'none',
    apiKey: '',
  };
  logger.debug(`selectApiClient: initial config=${JSON.stringify(config)}`);

  // Use the appropriate API client based on the available API key
  if (apiKeyType === 'OpenRouter') {
    logger.debug('selectApiClient: Using OpenRouter client');

    // Check if this is a fallback scenario
    const isFallback = envProvider !== 'openrouter';
    if (isFallback) {
      logger.info(
        '================================================================================',
      );
      logger.info(`FALLBACK MODE: Using OpenRouter to access ${envProvider} models`);
      logger.info(`Original model: ${modelEnv}`);
      logger.info(
        `Reason: ${envProvider.toUpperCase()} API key not configured, but OpenRouter API key is available`,
      );
      logger.info(
        'OpenRouter supports models from multiple providers including Google, Anthropic, and OpenAI',
      );
      logger.info(
        '================================================================================',
      );
    }

    // Check if we have a valid model name
    if (!envModelName) {
      logger.error('No model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error('Examples:');
      logger.error('  AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-opus');
      logger.error(
        '  AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro (will use OpenRouter as fallback)',
      );
      logger.error(
        '  AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus (will use OpenRouter as fallback)',
      );
      process.exit(1);
    }

    // Build OpenRouter model identifier: if envProvider is openrouter, use raw name; else prefix
    const openrouterModel =
      envProvider === 'openrouter' ? envModelName : `${envProvider}/${envModelName}`;

    if (isFallback) {
      logger.info(`Translating model for OpenRouter: ${modelEnv} → ${openrouterModel}`);
    } else {
      logger.info(`Using OpenRouter model: ${openrouterModel}`);
    }

    // Initialize OpenRouter model if needed
    await initializeAnyOpenRouterModel();
    config.clientType = 'OpenRouter';
    // Use consistent format for token analysis: "openrouter:model" for provider detection
    config.modelName = `openrouter:${openrouterModel}`;
    config.provider = 'openrouter';
    config.apiKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY || '';
    config.initialized = true;
  } else if (apiKeyType === 'Google') {
    // Check if we have a valid model name
    if (!envModelName) {
      logger.error('No Gemini model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error('Example: AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro');
      process.exit(1);
    }

    // Check if we have a valid API key (this should always be true if apiKeyType is 'Google')
    if (!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY) {
      logger.error('Internal error: Google API type selected but no API key found.');
      logger.error('This should not happen. Please report this issue.');
      process.exit(1);
    }

    logger.info(`Using Gemini API with model: ${envModelName}`);

    config.clientType = 'Google';
    config.modelName = `gemini:${envModelName}`;
    config.provider = 'gemini';
    config.apiKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY || '';
    config.initialized = true;
  } else if (apiKeyType === 'Anthropic') {
    // Check if we have a valid model name
    if (!envModelName) {
      logger.error('No Anthropic model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error('Example: AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus');
      process.exit(1);
    }

    // Check if we have a valid API key
    if (!process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY) {
      logger.error('No Anthropic API key found.');
      logger.error('Please set AI_CODE_REVIEW_ANTHROPIC_API_KEY in your .env.local file.');
      process.exit(1);
    }

    logger.info(`Using Anthropic API with model: ${envModelName}`);

    // Set the client type and model name without initializing yet
    // The actual initialization will happen when the client is used
    config.clientType = 'Anthropic';
    config.modelName = `anthropic:${envModelName}`;
    config.provider = 'anthropic';
    config.apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY || '';
    config.initialized = true;
  } else if (apiKeyType === 'OpenAI') {
    // Check if we have a valid model name
    if (!envModelName) {
      logger.error('No OpenAI model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error('Example: AI_CODE_REVIEW_MODEL=openai:gpt-4o');
      process.exit(1);
    }

    logger.info(`Using OpenAI API with model: ${envModelName}`);

    // Set the client type and model name without initializing yet
    // The actual initialization will happen when the client is used
    config.clientType = 'OpenAI';
    config.modelName = `openai:${envModelName}`;
    config.provider = 'openai';
    config.apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY || '';
    config.initialized = true;
  } else {
    // No API keys available
    logger.error(
      '================================================================================',
    );
    logger.error('ERROR: No API keys configured');
    logger.error(
      '================================================================================',
    );
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
    logger.error(
      '================================================================================',
    );

    // Still return a config but mark it as not initialized
    config.clientType = 'None';
    config.modelName = '';
    config.provider = 'none';
    config.apiKey = '';
    config.initialized = false;
  }

  return config;
}
