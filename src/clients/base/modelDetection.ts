/**
 * @fileoverview Model detection and initialization utilities for AI clients.
 *
 * This module provides common functionality for detecting model providers,
 * parsing model names, validating API keys, and initializing client instances.
 */

import { getApiKeyForProvider, getConfig } from '../../utils/config';
import logger from '../../utils/logger';

/**
 * Result of model detection
 */
export interface ModelDetectionResult {
  /** Whether this is the correct client for the model */
  isCorrect: boolean;
  /** The provider/adapter name (e.g., "openai", "anthropic", "gemini") */
  adapter: string;
  /** The specific model name without provider prefix */
  modelName: string;
}

/**
 * Parse a model name string into provider and model components
 * @param modelNameString The model name string (possibly with provider prefix)
 * @param defaultProvider The default provider to use if none is specified
 * @returns Object with adapter and modelName properties
 */
export function parseModelName(
  modelNameString: string,
  defaultProvider: string,
): { adapter: string; modelName: string } {
  if (!modelNameString) {
    return { adapter: defaultProvider, modelName: '' };
  }

  // Parse the model name
  return modelNameString.includes(':')
    ? {
        adapter: modelNameString.split(':')[0],
        modelName: modelNameString.split(':')[1],
      }
    : {
        adapter: defaultProvider,
        modelName: modelNameString,
      };
}

/**
 * Detect if a model name is for a specific provider
 * @param providerName The provider to check for
 * @param modelNameString The model name to check (with or without provider prefix)
 * @returns ModelDetectionResult with detection information
 */
export function detectModelProvider(
  providerName: string,
  modelNameString?: string,
): ModelDetectionResult {
  // Get the model from configuration if not provided
  const config = getConfig();
  const selectedModel = modelNameString || config.selectedModel || '';

  // Parse the model name
  const { adapter, modelName } = parseModelName(selectedModel, providerName);

  return {
    isCorrect: adapter === providerName,
    adapter,
    modelName,
  };
}

/**
 * Validate API key for a provider
 * @param providerName The provider to validate the API key for
 * @param apiKeyName Environment variable name for the API key (optional)
 * @returns Whether the API key is valid
 */
export function validateApiKey(providerName: string, apiKeyName?: string): boolean {
  // Try to get the API key from the config
  const apiKey = getApiKeyForProvider(providerName);

  // Check if we have an API key
  if (!apiKey) {
    const envVarName = apiKeyName || `AI_CODE_REVIEW_${providerName.toUpperCase()}_API_KEY`;
    logger.error(`No ${providerName} API key found in configuration.`);
    logger.error('Please add the following to your .env.local file:');
    logger.error(`- ${envVarName}=your_${providerName}_api_key_here`);
    return false;
  }

  // Log API key status
  const config = getConfig();
  if (config.debug) {
    logger.info(`Using real ${providerName} API responses.`);
  } else {
    logger.info(`API key found for ${providerName}. Using real API responses.`);
  }

  return true;
}
