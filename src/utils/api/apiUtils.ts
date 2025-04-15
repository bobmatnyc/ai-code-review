/**
 * @fileoverview API utilities for interacting with AI services.
 *
 * This module provides utilities for interacting with AI services,
 * including API key management, request formatting, and response processing.
 */

import { getApiKeyForProvider } from '../config';
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
 * Get the API key type based on available environment variables
 *
 * This function checks which API keys are available in the environment variables
 * and returns the type of the first available API key in the following order:
 * 1. Google (Gemini)
 * 2. OpenRouter
 * 3. Anthropic
 * 4. OpenAI
 *
 * If no API keys are available, it returns 'none'.
 *
 * @returns The type of API key available ('google', 'openrouter', 'anthropic', 'openai', or 'none')
 * @example
 * // If AI_CODE_REVIEW_GOOGLE_API_KEY is set
 * getApiKeyType() // Returns 'google'
 *
 * // If no API keys are set
 * getApiKeyType() // Returns 'none'
 */
export function getApiKeyType():
  | 'google'
  | 'openrouter'
  | 'anthropic'
  | 'openai'
  | 'none' {
  if (hasApiKey('gemini')) {
    return 'google';
  } else if (hasApiKey('openrouter')) {
    return 'openrouter';
  } else if (hasApiKey('anthropic')) {
    return 'anthropic';
  } else if (hasApiKey('openai')) {
    return 'openai';
  } else {
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
  } else if (
    errorMessage.includes('429') ||
    errorMessage.includes('rate limit')
  ) {
    return `${provider} API rate limit exceeded. Please try again later.`;
  } else if (
    errorMessage.includes('500') ||
    errorMessage.includes('server error')
  ) {
    return `${provider} API server error. Please try again later.`;
  } else {
    return `${provider} API error: ${errorMessage}`;
  }
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
export function logApiRequest(
  provider: string,
  endpoint: string,
  params: any
): void {
  // Clone the params to avoid modifying the original
  const redactedParams = { ...params };

  // Redact sensitive data
  if (redactedParams.apiKey) {
    redactedParams.apiKey = '***REDACTED***';
  }

  // Log the request
  logger.debug(`API Request to ${provider}/${endpoint}:`, redactedParams);
}
