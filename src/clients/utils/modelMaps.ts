/**
 * @fileoverview Centralized model mapping for all AI providers.
 *
 * This module provides a single source of truth for model names, mappings,
 * and default models across all supported AI providers.
 */

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
}

/**
 * Model mapping for all supported models
 */
export const MODEL_MAP: Record<string, ModelMapping> = {
  // Gemini models
  'gemini:gemini-2.5-pro': {
    apiName: 'gemini-2.5-pro-preview-03-25',
    displayName: 'Gemini 2.5 Pro',
    provider: 'gemini',
    useV1Beta: true,
    contextWindow: 1000000,
    description: 'Latest model with improved capabilities',
    apiKeyEnvVar: 'AI_CODE_REVIEW_GOOGLE_API_KEY'
  },
  'gemini:gemini-2.0-flash': {
    apiName: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    useV1Beta: false,
    contextWindow: 1000000,
    description: 'Balanced performance and quality',
    apiKeyEnvVar: 'AI_CODE_REVIEW_GOOGLE_API_KEY'
  },
  'gemini:gemini-2.0-flash-lite': {
    apiName: 'gemini-2.0-flash-lite',
    displayName: 'Gemini 2.0 Flash Lite',
    provider: 'gemini',
    useV1Beta: false,
    contextWindow: 1000000,
    description: 'Lighter version of 2.0 Flash',
    apiKeyEnvVar: 'AI_CODE_REVIEW_GOOGLE_API_KEY'
  },
  // Anthropic models
  'anthropic:claude-3-opus': {
    apiName: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    description: "Anthropic's most powerful model",
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY'
  },
  'anthropic:claude-3-sonnet': {
    apiName: 'claude-3-sonnet-20240229',
    displayName: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Balanced performance and quality',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY'
  },
  'anthropic:claude-3-haiku': {
    apiName: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Fastest Claude 3 model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY'
  },

  // OpenAI models
  'openai:gpt-4o': {
    apiName: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    description: "OpenAI's most capable model",
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY'
  },
  'openai:gpt-4-turbo': {
    apiName: 'gpt-4-turbo-preview',
    displayName: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Powerful model with good performance',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY'
  },
  'openai:gpt-3.5-turbo': {
    apiName: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16000,
    description: 'Fast and cost-effective model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY'
  },

  // OpenRouter models
  'openrouter:anthropic/claude-3-opus': {
    apiName: 'anthropic/claude-3-opus-20240229',
    displayName: 'Claude 3 Opus (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 200000,
    description: "Anthropic's most powerful model via OpenRouter",
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY'
  },
  'openrouter:anthropic/claude-3-sonnet': {
    apiName: 'anthropic/claude-3-sonnet-20240229',
    displayName: 'Claude 3 Sonnet (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 200000,
    description: 'Balanced performance and quality via OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY'
  },
  'openrouter:anthropic/claude-3-haiku': {
    apiName: 'anthropic/claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 200000,
    description: 'Fast and efficient model via OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY'
  },
  'openrouter:openai/gpt-4o': {
    apiName: 'openai/gpt-4o',
    displayName: 'GPT-4o (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 128000,
    description: "OpenAI's most capable model via OpenRouter",
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY'
  },
  'openrouter:openai/gpt-4-turbo': {
    apiName: 'openai/gpt-4-turbo',
    displayName: 'GPT-4 Turbo (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 128000,
    description: 'Strong performance on complex code via OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY'
  }
};

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
