/**
 * @fileoverview API utilities for interacting with AI services.
 *
 * This module provides utilities for interacting with AI services,
 * including API key management, request formatting, and response processing.
 */

import { getApiKeyForProvider, getConfig } from '../config';
import logger from '../logger';

/**
 * Check if an API key is available for a specific provider
 *
 * This function checks if an API key is available for the specified provider
 * by calling the getApiKeyForProvider function from the config module.
 *
 * @param provider Provider name (gemini, openrouter, anthropic, openai)
 * @returns True if an API key is available and non-empty, false otherwise
 * @example
 * hasApiKey('gemini') // Returns true if AI_CODE_REVIEW_GOOGLE_API_KEY is set
 * hasApiKey('anthropic') // Returns true if AI_CODE_REVIEW_ANTHROPIC_API_KEY is set
 */
export function hasApiKey(provider: string): boolean {
  return !!getApiKeyForProvider(provider);
}

/**
 * Get the available API key type based on the model specified in environment variables
 *
 * This function determines which AI provider to use based on:
 * 1. The model adapter specified in the AI_CODE_REVIEW_MODEL environment variable
 * 2. The availability of API keys for different providers
 * 3. Intelligent fallback to OpenRouter when model-specific API key is missing
 *
 * The function first checks if a specific adapter is specified in the model name
 * (e.g., 'gemini:gemini-1.5-pro' or 'anthropic:claude-3-opus'). If so, it checks
 * if the corresponding API key is available. If not available, it falls back to
 * OpenRouter if that API key is available (since OpenRouter supports multiple model families).
 *
 * @returns The type of API key available ('OpenRouter', 'Google', 'Anthropic', 'OpenAI', or null if none)
 * @example
 * // If AI_CODE_REVIEW_MODEL='gemini:gemini-1.5-pro' and Google API key is available
 * getApiKeyType() // Returns 'Google'
 *
 * // If AI_CODE_REVIEW_MODEL='gemini:gemini-1.5-pro' but only OpenRouter API key is available
 * getApiKeyType() // Returns 'OpenRouter' (with fallback)
 *
 * // If no model is specified but Anthropic API key is available
 * getApiKeyType() // Returns 'Anthropic'
 */
export function getApiKeyType(): 'OpenRouter' | 'Google' | 'Anthropic' | 'OpenAI' | null {
  // Get configuration from the centralized config module
  const config = getConfig();

  // Get the model adapter from the configuration
  const selectedModel = config.selectedModel;
  // Default to 'gemini' if no adapter is specified
  const adapter = selectedModel?.includes(':')
    ? selectedModel
        .split(':')[0]
        .toLowerCase() // Normalize to lowercase
    : 'gemini';

  // Add debug logging to track model selection
  logger.debug(`getApiKeyType: selectedModel=${selectedModel}, adapter=${adapter}`);

  // First check if we have a specific adapter specified in the model
  // and if we have the corresponding API key available.
  //
  // WHY: Users often configure models like 'gemini:gemini-1.5-pro' but may only have
  // an OpenRouter API key. Since OpenRouter supports models from multiple providers,
  // we want to automatically fall back to OpenRouter when the model-specific API key
  // is not available. This provides a better user experience and leverages OpenRouter's
  // multi-provider capability.
  //
  // DESIGN DECISION: We check for the native API key first to respect user preferences
  // when they have multiple API keys configured. Only when the native key is missing
  // do we fall back to OpenRouter.
  switch (adapter) {
    case 'gemini':
      if (config.googleApiKey) {
        logger.debug(
          'getApiKeyType: Using Google API - model adapter matched and API key available',
        );
        return 'Google';
      }
      // Fall through to check for OpenRouter fallback
      logger.info(
        'getApiKeyType: Google API key not available for gemini model, checking for fallback options',
      );
      break;

    case 'openrouter':
      if (config.openRouterApiKey) {
        logger.debug(
          'getApiKeyType: Using OpenRouter API - model adapter matched and API key available',
        );
        return 'OpenRouter';
      }
      logger.warn('getApiKeyType: OpenRouter API key not available for openrouter model');
      break;

    case 'anthropic':
      if (config.anthropicApiKey) {
        logger.debug(
          'getApiKeyType: Using Anthropic API - model adapter matched and API key available',
        );
        return 'Anthropic';
      }
      // Fall through to check for OpenRouter fallback
      logger.info(
        'getApiKeyType: Anthropic API key not available for anthropic model, checking for fallback options',
      );
      break;

    case 'openai':
      if (config.openAIApiKey) {
        logger.debug(
          'getApiKeyType: Using OpenAI API - model adapter matched and API key available',
        );
        return 'OpenAI';
      }
      // Fall through to check for OpenRouter fallback
      logger.info(
        'getApiKeyType: OpenAI API key not available for openai model, checking for fallback options',
      );
      break;
  }

  // Check if OpenRouter is available as a universal fallback
  // OpenRouter supports models from multiple providers, making it a good fallback option
  if (config.openRouterApiKey) {
    logger.info(
      `getApiKeyType: Using OpenRouter as fallback for ${adapter} model (original API key not available)`,
    );
    logger.info(
      'getApiKeyType: OpenRouter supports multiple model families including Gemini, Claude, and GPT models',
    );
    return 'OpenRouter';
  }

  // If no specific adapter is specified or the adapter wasn't recognized,
  // check if any API keys are available
  logger.debug(
    'getApiKeyType: No recognized adapter with available API key, checking all available API keys',
  );

  // Check for any available API keys in order of preference
  if (config.googleApiKey) {
    logger.debug('getApiKeyType: Found Google API key');
    return 'Google';
  }
  if (config.openRouterApiKey) {
    logger.debug('getApiKeyType: Found OpenRouter API key');
    return 'OpenRouter';
  }
  if (config.anthropicApiKey) {
    logger.debug('getApiKeyType: Found Anthropic API key');
    return 'Anthropic';
  }
  if (config.openAIApiKey) {
    logger.debug('getApiKeyType: Found OpenAI API key');
    return 'OpenAI';
  }

  // No API keys available at all
  logger.error('getApiKeyType: No API keys available. Please configure at least one API key.');
  logger.error(
    'getApiKeyType: Supported API keys: AI_CODE_REVIEW_GOOGLE_API_KEY, AI_CODE_REVIEW_OPENROUTER_API_KEY, AI_CODE_REVIEW_ANTHROPIC_API_KEY, AI_CODE_REVIEW_OPENAI_API_KEY',
  );
  return null;
}

/**
 * Get the API key type based on available environment variables (lowercase version)
 *
 * This is an alternative version of getApiKeyType that returns lowercase strings
 * and 'none' instead of null. This function uses the same smart fallback logic
 * as getApiKeyType() to ensure consistency.
 *
 * @returns The type of API key available ('google', 'openrouter', 'anthropic', 'openai', or 'none')
 * @internal
 */
export function getApiKeyTypeLowerCase():
  | 'google'
  | 'openrouter'
  | 'anthropic'
  | 'openai'
  | 'none' {
  // Use the main getApiKeyType function to ensure consistent logic
  const apiKeyType = getApiKeyType();

  // Convert the result to lowercase
  switch (apiKeyType) {
    case 'Google':
      return 'google';
    case 'OpenRouter':
      return 'openrouter';
    case 'Anthropic':
      return 'anthropic';
    case 'OpenAI':
      return 'openai';
    default:
      return 'none';
  }
}

/**
 * Format an error message for API errors
 *
 * This function takes an error object and a provider name and returns a formatted
 * error message that is more user-friendly and provides context about the error.
 * It detects common error patterns like authentication issues, rate limits, and
 * server errors, and formats them appropriately.
 *
 * @param error Error object or any value that can be converted to a string
 * @param provider Provider name (e.g., 'Google', 'OpenRouter', 'Anthropic')
 * @returns Formatted error message with provider context
 * @example
 * // For an authentication error
 * formatApiError(new Error('401 Unauthorized'), 'Google')
 * // Returns 'Google API key is invalid or expired. Please check your API key.'
 *
 * // For a generic error
 * formatApiError(new Error('Something went wrong'), 'Anthropic')
 * // Returns 'Anthropic API error: Something went wrong'
 */
export function formatApiError(error: any, provider: string): string {
  // Extract the error message
  const errorMessage = error.message || String(error);

  // Check for common API errors
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return `${provider} API key is invalid or expired. Please check your API key.`;
  }
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return `${provider} API rate limit exceeded. Please try again later.`;
  }
  if (errorMessage.includes('500') || errorMessage.includes('server error')) {
    return `${provider} API server error. Please try again later.`;
  }
  return `${provider} API error: ${errorMessage}`;
}

/**
 * Log API request details for debugging purposes
 *
 * This function logs the details of an API request, including the provider,
 * endpoint, and request parameters. It automatically redacts sensitive data
 * like API keys to prevent them from appearing in logs.
 *
 * The function only logs when debug logging is enabled, so it's safe to call
 * in production code without generating excessive log output.
 *
 * @param provider Provider name (e.g., 'Google', 'OpenRouter', 'Anthropic')
 * @param endpoint Endpoint being called (e.g., '/v1/chat/completions')
 * @param params Request parameters object containing the request data
 * @example
 * logApiRequest('OpenAI', '/v1/chat/completions', {
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   apiKey: 'sk-1234' // This will be redacted in the logs
 * });
 */
export function logApiRequest(provider: string, endpoint: string, params: any): void {
  // Clone the params to avoid modifying the original
  const redactedParams = { ...params };

  // Redact sensitive data
  if (redactedParams.apiKey) {
    redactedParams.apiKey = '***REDACTED***';
  }

  // Log the request
  logger.debug(`API Request to ${provider}/${endpoint}:`, redactedParams);
}
