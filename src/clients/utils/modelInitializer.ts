/**
 * @fileoverview Utilities for initializing AI models.
 *
 * This module provides functions for initializing AI models from different providers,
 * including handling model selection, fallback, and initialization.
 */

import { getModelMapping, getModelsByProvider, type Provider } from './modelMaps';

/**
 * Get the API model name for a given model key
 * @param provider The provider (e.g., 'anthropic', 'gemini', 'openrouter')
 * @param modelName The model name
 * @returns The API model name
 */
export function getApiModelName(provider: Provider, modelName: string): string {
  // Get the full model key
  const fullModelKey = `${provider}:${modelName}`;

  // Get the model mapping
  const modelMapping = getModelMapping(fullModelKey);

  // Return the API identifier if available, otherwise return the original model name
  return modelMapping?.apiIdentifier || modelName;
}

/**
 * Get the default models for a provider
 * @param provider The provider (e.g., 'anthropic', 'gemini', 'openrouter')
 * @param preferredModel Optional preferred model to try first
 * @returns Array of model names to try in order
 */
export function getDefaultModels(provider: Provider, preferredModel?: string): string[] {
  // Get all models for the provider
  const models = getModelsByProvider(provider).map((key) => {
    const parts = key.split(':');
    return parts.length > 1 ? parts[1] : key;
  });

  // If a preferred model is specified, add it to the beginning of the array
  if (preferredModel) {
    // Remove the preferred model from the array if it exists
    const filteredModels = models.filter((model) => model !== preferredModel);
    // Add the preferred model to the beginning
    return [preferredModel, ...filteredModels];
  }

  return models;
}

/**
 * Format a model name for display
 * @param provider The provider (e.g., 'anthropic', 'gemini', 'openrouter')
 * @param modelName The model name
 * @returns The formatted model name for display
 */
export function formatModelName(provider: Provider, modelName: string): string {
  return `${provider}:${modelName}`;
}
