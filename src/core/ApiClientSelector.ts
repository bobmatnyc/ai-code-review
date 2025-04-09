/**
 * @fileoverview API client selector module.
 *
 * This module is responsible for selecting the appropriate API client based on
 * available API keys and user preferences. It centralizes the logic for determining
 * which AI provider to use for code reviews.
 */

import logger from '../utils/logger';
import { getApiKeyType } from '../utils/apiUtils';
// Import the client wrappers directly
import { initializeAnyOpenRouterModel } from '../clients/openRouterClientWrapper';

/**
 * API client types supported by the application
 */
export type ApiClientType =
  | 'OpenRouter'
  | 'Google'
  | 'Anthropic'
  | 'OpenAI'
  | 'None';

/**
 * API client configuration
 */
export interface ApiClientConfig {
  clientType: ApiClientType;
  modelName: string;
  initialized: boolean;
}

/**
 * Select and initialize the appropriate API client based on available API keys
 * @returns Promise resolving to the API client configuration
 */
export async function selectApiClient(): Promise<ApiClientConfig> {
  console.log('[DEBUG] selectApiClient called');

  // Check which API key is available based on the model specified in environment variables
  const apiKeyType = getApiKeyType();
  console.log(`[DEBUG] selectApiClient: apiKeyType=${apiKeyType}`);

  const modelEnv = process.env.AI_CODE_REVIEW_MODEL || '';
  console.log(`[DEBUG] selectApiClient: modelEnv=${modelEnv}`);

  const modelName = modelEnv.includes(':') ? modelEnv.split(':')[1] : '';
  console.log(`[DEBUG] selectApiClient: modelName=${modelName}`);

  // Default configuration with no API client
  const config: ApiClientConfig = {
    clientType: 'None',
    modelName: '',
    initialized: false
  };
  console.log(
    `[DEBUG] selectApiClient: initial config=${JSON.stringify(config)}`
  );

  // Use the appropriate API client based on the available API key
  if (apiKeyType === 'OpenRouter') {
    console.log('[DEBUG] selectApiClient: Using OpenRouter client');
    // Check if we have a valid model name
    if (!modelName) {
      logger.error('No OpenRouter model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error(
        'Example: AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-opus'
      );
      process.exit(1);
    }

    logger.info(`Using OpenRouter model: ${modelName}`);

    // Initialize OpenRouter model if needed
    await initializeAnyOpenRouterModel();

    config.clientType = 'OpenRouter';
    config.modelName = modelName;
    config.initialized = true;
  } else if (apiKeyType === 'Google') {
    // Check if we have a valid model name
    if (!modelName) {
      logger.error('No Gemini model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error('Example: AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro');
      process.exit(1);
    }

    // Check if we have a valid API key
    if (!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY) {
      logger.error('No Google API key found.');
      logger.error(
        'Please set AI_CODE_REVIEW_GOOGLE_API_KEY in your .env.local file.'
      );
      process.exit(1);
    }

    logger.info(`Using Gemini API with model: ${modelName}`);

    config.clientType = 'Google';
    config.modelName = modelName;
    config.initialized = true;
  } else if (apiKeyType === 'Anthropic') {
    // Check if we have a valid model name
    if (!modelName) {
      logger.error('No Anthropic model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error('Example: AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus');
      process.exit(1);
    }

    // Check if we have a valid API key
    if (!process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY) {
      logger.error('No Anthropic API key found.');
      logger.error(
        'Please set AI_CODE_REVIEW_ANTHROPIC_API_KEY in your .env.local file.'
      );
      process.exit(1);
    }

    logger.info(`Using Anthropic API with model: ${modelName}`);

    // Set the client type and model name without initializing yet
    // The actual initialization will happen when the client is used
    config.clientType = 'Anthropic';
    config.modelName = modelName;
    config.initialized = true;
  } else if (apiKeyType === 'OpenAI') {
    // Check if we have a valid model name
    if (!modelName) {
      logger.error('No OpenAI model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error('Example: AI_CODE_REVIEW_MODEL=openai:gpt-4o');
      process.exit(1);
    }

    logger.info(`Using OpenAI API with model: ${modelName}`);

    // Set the client type and model name without initializing yet
    // The actual initialization will happen when the client is used
    config.clientType = 'OpenAI';
    config.modelName = modelName;
    config.initialized = true;
  } else {
    // No API keys available
    logger.warn('No API keys available. Using mock responses.');
    config.clientType = 'None';
    config.modelName = '';
    config.initialized = false;
  }

  return config;
}
