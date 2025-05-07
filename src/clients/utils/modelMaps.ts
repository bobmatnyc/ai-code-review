/**
 * @fileoverview Centralized model mapping for all AI providers.
 *
 * This module provides a single source of truth for model names, mappings,
 * and default models across all supported AI providers.
 * 
 * IMPORTANT: The canonical source of model data is in modelMaps.json.
 * This file just provides TypeScript interfaces and helper functions.
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';

/**
 * Supported AI providers
 */
export type Provider = 'gemini' | 'anthropic' | 'openai' | 'openrouter';

/**
 * Interface for model mapping information
 */
export interface ModelMapping {
  apiName: string;
  displayName: string;
  provider: Provider;
  useV1Beta?: boolean;
  contextWindow?: number;
  description?: string;
  apiKeyEnvVar: string;
  supportsToolCalling?: boolean;
}

// Load model mappings from JSON file
function loadModelMappings(): Record<string, ModelMapping> {
  try {
    // Attempt to read from the JSON file
    const jsonPath = path.resolve(__dirname, 'modelMaps.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const modelMap = JSON.parse(jsonContent);
    
    if (Object.keys(modelMap).length === 0) {
      throw new Error('Empty model map loaded from JSON');
    }
    
    return modelMap;
  } catch (error) {
    logger.error(`Failed to load model mappings from JSON: ${error}`);
    // Provide an empty fallback so the application doesn't crash
    return {};
  }
}

// Load model mappings from the JSON file
export const MODEL_MAP: Record<string, ModelMapping> = loadModelMappings();

/**
 * Default models by provider, derived from MODEL_MAP
 */
export const MODELS: Record<Provider, string[]> = {
  gemini: Object.keys(MODEL_MAP).filter(
    key => MODEL_MAP[key].provider === 'gemini'
  ),
  anthropic: Object.keys(MODEL_MAP).filter(
    key => MODEL_MAP[key].provider === 'anthropic'
  ),
  openai: Object.keys(MODEL_MAP).filter(
    key => MODEL_MAP[key].provider === 'openai'
  ),
  openrouter: Object.keys(MODEL_MAP).filter(
    key => MODEL_MAP[key].provider === 'openrouter'
  )
};

/**
 * Get the API name for a given model
 * @param modelKey The full model key (e.g., 'gemini:gemini-1.5-pro')
 * @returns The API name for the model, or the original model name if not found
 */
export function getApiNameFromKey(modelKey: string): string {
  return MODEL_MAP[modelKey]?.apiName || modelKey.split(':')[1] || modelKey;
}

/**
 * Get the model mapping for a given model key
 * @param modelKey The full model key (e.g., 'gemini:gemini-1.5-pro')
 * @returns The model mapping, or undefined if not found
 */
export function getModelMapping(modelKey: string): ModelMapping | undefined {
  return MODEL_MAP[modelKey];
}

/**
 * Get all models for a given provider
 * @param provider The provider (gemini, anthropic, openai, openrouter)
 * @returns Array of model keys for the provider
 */
export function getModelsByProvider(provider: Provider): string[] {
  return MODELS[provider] || [];
}

/**
 * Get the models for a given provider
 * @param provider The provider (gemini, anthropic, openai, openrouter)
 * @returns Array of model keys for the provider
 * @deprecated Use getModelsByProvider instead
 */
export function getModels(provider: Provider): string[] {
  return getModelsByProvider(provider);
}

/**
 * Parse a model string in the format "provider:model"
 * @param modelString The model string to parse
 * @returns An object with provider and modelName
 * @throws Error if modelString is empty or undefined
 */
export function parseModelString(modelString: string): {
  provider: Provider;
  modelName: string;
} {
  if (!modelString) {
    throw new Error(
      'Model string is required. Please specify a model using the AI_CODE_REVIEW_MODEL environment variable.'
    );
  }

  const [provider, modelName] = modelString.includes(':')
    ? modelString.split(':')
    : ['gemini', modelString]; // Default to gemini if no provider specified

  return {
    provider: provider as Provider,
    modelName
  };
}

/**
 * Get the full model key from provider and model name
 * @param provider The provider (gemini, anthropic, openai, openrouter)
 * @param modelName The model name
 * @returns The full model key
 */
export function getFullModelKey(provider: Provider, modelName: string): string {
  return `${provider}:${modelName}`;
}

/**
 * Check if a model supports tool calling
 * @param modelKey The full model key (e.g., 'openai:gpt-4o')
 * @returns True if the model supports tool calling, false otherwise
 */
export function supportsToolCalling(modelKey: string): boolean {
  const mapping = getModelMapping(modelKey);
  return mapping?.supportsToolCalling || false;
}
