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
 * @param provider Provider name (gemini, openrouter, anthropic, openai)
 * @returns True if an API key is available
 */
export function hasApiKey(provider: string): boolean {
  return !!getApiKeyForProvider(provider);
}

/**
 * Get the API key type based on available environment variables
 * @returns The type of API key available
 */
export function getApiKeyType(): 'google' | 'openrouter' | 'anthropic' | 'openai' | 'none' {
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
 * @param error Error object
 * @param provider Provider name
 * @returns Formatted error message
 */
export function formatApiError(error: any, provider: string): string {
  // Extract the error message
  const errorMessage = error.message || String(error);
  
  // Check for common API errors
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return `${provider} API key is invalid or expired. Please check your API key.`;
  } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return `${provider} API rate limit exceeded. Please try again later.`;
  } else if (errorMessage.includes('500') || errorMessage.includes('server error')) {
    return `${provider} API server error. Please try again later.`;
  } else {
    return `${provider} API error: ${errorMessage}`;
  }
}

/**
 * Log API request details (for debugging)
 * @param provider Provider name
 * @param endpoint Endpoint being called
 * @param params Request parameters (sensitive data redacted)
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
