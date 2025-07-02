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
 * @param cliOptions Optional CLI options (reserved for future use)
 * @returns Promise resolving to the API client configuration
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
    // Check if we have a valid model name
    if (!envModelName) {
      logger.error('No OpenRouter model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error('Example: AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-opus');
      process.exit(1);
    }
    // Build OpenRouter model identifier: if envProvider is openrouter, use raw name; else prefix
    const openrouterModel =
      envProvider === 'openrouter' ? envModelName : `${envProvider}/${envModelName}`;
    logger.info(`Using OpenRouter model: ${openrouterModel}`);
    // Initialize OpenRouter model if needed
    await initializeAnyOpenRouterModel();
    config.clientType = 'OpenRouter';
    config.modelName = openrouterModel;
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

    // Check if we have a valid API key
    if (!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY) {
      logger.error('No Google API key found.');
      logger.error('Please set AI_CODE_REVIEW_GOOGLE_API_KEY in your .env.local file.');
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
    logger.warn('No API keys available. Using mock responses.');
    config.clientType = 'None';
    config.modelName = '';
    config.provider = 'none';
    config.apiKey = '';
    config.initialized = false;
  }

  return config;
}
