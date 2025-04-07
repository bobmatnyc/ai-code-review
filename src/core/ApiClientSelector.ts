/**
 * @fileoverview API client selector module.
 *
 * This module is responsible for selecting the appropriate API client based on
 * available API keys and user preferences. It centralizes the logic for determining
 * which AI provider to use for code reviews.
 */

import logger from '../utils/logger';
import { getApiKeyType } from '../utils/apiUtils';
import { initializeAnyOpenRouterModel } from '../clients/openRouterClient';
import { initializeAnthropicClient } from '../clients/anthropicClient';
import { initializeAnyOpenAIModel } from '../clients/openaiClient';

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
}

/**
 * Select and initialize the appropriate API client based on available API keys
 * @returns Promise resolving to the API client configuration
 */
export async function selectApiClient(): Promise<ApiClientConfig> {
  // Check which API key is available based on the model specified in environment variables
  const apiKeyType = getApiKeyType();
  const modelEnv = process.env.AI_CODE_REVIEW_MODEL || '';
  const modelName = modelEnv.includes(':') ? modelEnv.split(':')[1] : '';

  // Default configuration with no API client
  const config: ApiClientConfig = {
    clientType: 'None',
    modelName: '',
    initialized: false
  };

  // Use the appropriate API client based on the available API key
  if (apiKeyType === 'OpenRouter') {
    // Check if we have a valid model name
    if (!modelName) {
      logger.error('No OpenRouter model specified in environment variables.');
      logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
      logger.error('Example: AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-opus');
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

    logger.info(`Using Anthropic API with model: ${modelName}`);

    // Initialize Anthropic model if needed
    await initializeAnthropicClient();

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

    // Initialize OpenAI model if needed
    await initializeAnyOpenAIModel();

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
