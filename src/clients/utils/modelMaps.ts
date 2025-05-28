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
  apiIdentifier: string; // API-specific model identifier used when making API calls
  displayName: string;   // Human-readable model name for display
  provider: Provider;    // Provider identifier (gemini, anthropic, openai, openrouter)
  useV1Beta?: boolean;   // Whether to use v1beta API version
  contextWindow?: number; // Maximum context window size
  description?: string;   // Model description
  apiKeyEnvVar: string;   // Environment variable name for the API key
  supportsToolCalling?: boolean; // Whether model supports tool calling
}

// Hard-coded model mappings to avoid relying on external JSON files
export const MODEL_MAP: Record<string, ModelMapping> = {
  // Default model for the tool - this one is the most advanced
  "gemini:gemini-2.5-pro-preview": {
    "apiIdentifier": "gemini-2.5-pro-preview-05-06",
    "displayName": "Gemini 2.5 Pro Preview",
    "provider": "gemini",
    "useV1Beta": true,
    "contextWindow": 1000000,
    "description": "Most advanced reasoning and multimodal capabilities",
    "apiKeyEnvVar": "AI_CODE_REVIEW_GOOGLE_API_KEY",
    "supportsToolCalling": false
  },
  // Backward compatibility entry with warning
  "gemini:gemini-2.5-pro": {
    "apiIdentifier": "gemini-2.5-pro-preview-05-06",
    "displayName": "Gemini 2.5 Pro (DEPRECATED - Use gemini-2.5-pro-preview)",
    "provider": "gemini",
    "useV1Beta": true,
    "contextWindow": 1000000,
    "description": "DEPRECATED - Please use gemini:gemini-2.5-pro-preview instead",
    "apiKeyEnvVar": "AI_CODE_REVIEW_GOOGLE_API_KEY",
    "supportsToolCalling": false
  },
  "gemini:gemini-2.0-flash-lite": {
    "apiIdentifier": "gemini-2.0-flash-lite",
    "displayName": "Gemini 2.0 Flash Lite",
    "provider": "gemini",
    "contextWindow": 1000000,
    "description": "Lightweight, fast variant of Gemini flash model",
    "apiKeyEnvVar": "AI_CODE_REVIEW_GOOGLE_API_KEY",
    "supportsToolCalling": false
  },
  "gemini:gemini-2.0-flash": {
    "apiIdentifier": "gemini-2.0-flash",
    "displayName": "Gemini 2.0 Flash",
    "provider": "gemini",
    "contextWindow": 1000000,
    "description": "Balanced performance and quality",
    "apiKeyEnvVar": "AI_CODE_REVIEW_GOOGLE_API_KEY",
    "supportsToolCalling": false
  },
  "anthropic:claude-3-opus": {
    "apiIdentifier": "claude-3-opus-20240229",
    "displayName": "Claude 3 Opus",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Anthropic's most powerful model",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-3.7-sonnet": {
    "apiIdentifier": "claude-3-7-sonnet-20250219",
    "displayName": "Claude 3.7 Sonnet (hyphen format)",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Latest hybrid reasoning model with enhanced capabilities",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-3.5-sonnet": {
    "apiIdentifier": "claude-3-5-sonnet-20241022",
    "displayName": "Claude 3.5 Sonnet v2",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Improved version of Claude 3.5 Sonnet",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-3-haiku": {
    "apiIdentifier": "claude-3-haiku-20240307",
    "displayName": "Claude 3 Haiku",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Optimized for speed and efficiency",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-3.5-haiku": {
    "apiIdentifier": "claude-3-5-haiku-20241022",
    "displayName": "Claude 3.5 Haiku",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Fast and lightweight model",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-4-sonnet": {
    "apiIdentifier": "claude-sonnet-4-20250514",
    "displayName": "Claude 4 Sonnet",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Next-generation balanced model with enhanced reasoning",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-4-opus": {
    "apiIdentifier": "claude-opus-4-20250514",
    "displayName": "Claude 4 Opus",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Most powerful Claude model with advanced capabilities",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-4.1": {
    "apiIdentifier": "gpt-4.1",
    "displayName": "GPT-4.1",
    "provider": "openai",
    "contextWindow": 1000000,
    "description": "Latest coding-oriented GPT model",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-4o": {
    "apiIdentifier": "gpt-4o",
    "displayName": "GPT-4o",
    "provider": "openai",
    "contextWindow": 128000,
    "description": "Multimodal model with native image/audio/text support",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-4.5": {
    "apiIdentifier": "gpt-4.5",
    "displayName": "GPT-4.5",
    "provider": "openai",
    "contextWindow": 128000,
    "description": "Preview model with advanced reasoning and collaboration tools",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-4-turbo": {
    "apiIdentifier": "gpt-4-turbo",
    "displayName": "GPT-4 Turbo",
    "provider": "openai",
    "contextWindow": 1000000,
    "description": "Optimized version of GPT-4 with faster response times",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-3.5-turbo": {
    "apiIdentifier": "gpt-3.5-turbo",
    "displayName": "GPT-3.5 Turbo",
    "provider": "openai",
    "contextWindow": 4096,
    "description": "Cost-effective turbo model for GPT-3.5",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": false
  },
  "openai:o3": {
    "apiIdentifier": "o3",
    "displayName": "OpenAI o3",
    "provider": "openai",
    "contextWindow": 200000,
    "description": "OpenAI's latest advanced reasoning model",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openai:o3-mini": {
    "apiIdentifier": "o3-mini",
    "displayName": "OpenAI o3-mini",
    "provider": "openai",
    "contextWindow": 200000,
    "description": "Smaller, more efficient version of o3",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openrouter:anthropic/claude-3-opus": {
    "apiIdentifier": "anthropic/claude-3-opus-20240229",
    "displayName": "Claude 3 Opus (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 200000,
    "description": "Claude 3 Opus model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
  },
  "openrouter:anthropic/claude-3-sonnet": {
    "apiIdentifier": "anthropic/claude-3-sonnet",
    "displayName": "Claude 3 Sonnet (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 200000,
    "description": "Claude 3 Sonnet model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
  },
  "openrouter:anthropic/claude-3-haiku": {
    "apiIdentifier": "anthropic/claude-3-haiku",
    "displayName": "Claude 3 Haiku (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 200000,
    "description": "Claude 3 Haiku model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
  },
  "openrouter:openai/gpt-4o": {
    "apiIdentifier": "openai/gpt-4o",
    "displayName": "GPT-4o (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 128000,
    "description": "GPT-4o model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
  },
  "openrouter:openai/gpt-4-turbo": {
    "apiIdentifier": "openai/gpt-4-turbo",
    "displayName": "GPT-4 Turbo (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 1000000,
    "description": "GPT-4 Turbo model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
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
  return MODEL_MAP[modelKey]?.apiIdentifier || modelKey.split(':')[1] || modelKey;
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
