/**
 * @fileoverview Model configuration registry for centralizing model-specific parameters and behaviors.
 *
 * This module provides a centralized location for all model-specific configurations,
 * including API parameter mappings, constraints, and pricing information.
 */

import type { Provider } from './modelMaps';

/**
 * Model-specific API parameter configuration
 */
export interface ModelApiConfig {
  /** The parameter name for max tokens (e.g., 'max_tokens' or 'max_completion_tokens') */
  maxTokensParam?: 'max_tokens' | 'max_completion_tokens' | 'maxOutputTokens';

  /** Whether the model supports temperature parameter */
  supportsTemperature?: boolean;

  /** Default temperature value if supported */
  defaultTemperature?: number;

  /** Whether the model supports top_p parameter */
  supportsTopP?: boolean;

  /** Whether the model supports frequency_penalty parameter */
  supportsFrequencyPenalty?: boolean;

  /** Whether the model supports presence_penalty parameter */
  supportsPresencePenalty?: boolean;

  /** Custom parameter mappings */
  customParams?: Record<string, any>;
}

/**
 * Model pricing configuration
 */
export interface ModelPricingConfig {
  /** Price per 1K input tokens in USD */
  inputPricePer1K: number;

  /** Price per 1K output tokens in USD */
  outputPricePer1K: number;

  /** Tiered pricing if applicable */
  tiers?: Array<{
    threshold: number;
    inputPricePer1K: number;
    outputPricePer1K: number;
  }>;
}

/**
 * Complete model configuration
 */
export interface ModelConfig {
  /** Model identifier */
  modelId: string;

  /** Provider */
  provider: Provider;

  /** API-specific configuration */
  apiConfig: ModelApiConfig;

  /** Pricing configuration */
  pricing?: ModelPricingConfig;

  /** Additional constraints or requirements */
  constraints?: {
    /** Maximum tokens per request */
    maxTokensPerRequest?: number;

    /** Maximum requests per minute */
    maxRequestsPerMinute?: number;

    /** Whether the model requires specific headers */
    requiredHeaders?: Record<string, string>;
  };
}

/**
 * Model configuration registry
 */
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // OpenAI GPT models
  'openai:gpt-4o': {
    modelId: 'gpt-4o',
    provider: 'openai',
    apiConfig: {
      maxTokensParam: 'max_tokens',
      supportsTemperature: true,
      defaultTemperature: 0.2,
      supportsTopP: true,
      supportsFrequencyPenalty: true,
      supportsPresencePenalty: true,
    },
    pricing: {
      inputPricePer1K: 0.0025,
      outputPricePer1K: 0.01,
    },
    constraints: {
      maxTokensPerRequest: 4000,
    },
  },

  'openai:gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    provider: 'openai',
    apiConfig: {
      maxTokensParam: 'max_tokens',
      supportsTemperature: true,
      defaultTemperature: 0.2,
      supportsTopP: true,
      supportsFrequencyPenalty: true,
      supportsPresencePenalty: true,
    },
    pricing: {
      inputPricePer1K: 0.00015,
      outputPricePer1K: 0.0006,
    },
    constraints: {
      maxTokensPerRequest: 4000,
    },
  },

  'openai:o3': {
    modelId: 'o3',
    provider: 'openai',
    apiConfig: {
      maxTokensParam: 'max_completion_tokens',
      supportsTemperature: false,
      supportsTopP: false,
      supportsFrequencyPenalty: false,
      supportsPresencePenalty: false,
    },
    pricing: {
      inputPricePer1K: 0.015,
      outputPricePer1K: 0.06,
    },
    constraints: {
      maxTokensPerRequest: 100000,
    },
  },

  'openai:o3-mini': {
    modelId: 'o3-mini',
    provider: 'openai',
    apiConfig: {
      maxTokensParam: 'max_completion_tokens',
      supportsTemperature: false,
      supportsTopP: false,
      supportsFrequencyPenalty: false,
      supportsPresencePenalty: false,
    },
    pricing: {
      inputPricePer1K: 0.003,
      outputPricePer1K: 0.012,
    },
    constraints: {
      maxTokensPerRequest: 65000,
    },
  },

  // Anthropic models
  'anthropic:claude-3-opus': {
    modelId: 'claude-3-opus-20240229',
    provider: 'anthropic',
    apiConfig: {
      maxTokensParam: 'max_tokens',
      supportsTemperature: true,
      defaultTemperature: 0.2,
      supportsTopP: true,
    },
    pricing: {
      inputPricePer1K: 0.015,
      outputPricePer1K: 0.075,
    },
    constraints: {
      maxTokensPerRequest: 4000,
    },
  },

  'anthropic:claude-3.7-sonnet': {
    modelId: 'claude-3-7-sonnet-20250219',
    provider: 'anthropic',
    apiConfig: {
      maxTokensParam: 'max_tokens',
      supportsTemperature: true,
      defaultTemperature: 0.2,
      supportsTopP: true,
    },
    pricing: {
      inputPricePer1K: 0.003,
      outputPricePer1K: 0.015,
    },
    constraints: {
      maxTokensPerRequest: 4000,
    },
  },

  'anthropic:claude-3.5-sonnet': {
    modelId: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    apiConfig: {
      maxTokensParam: 'max_tokens',
      supportsTemperature: true,
      defaultTemperature: 0.2,
      supportsTopP: true,
    },
    pricing: {
      inputPricePer1K: 0.003,
      outputPricePer1K: 0.015,
    },
    constraints: {
      maxTokensPerRequest: 4000,
    },
  },

  'anthropic:claude-3-haiku': {
    modelId: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    apiConfig: {
      maxTokensParam: 'max_tokens',
      supportsTemperature: true,
      defaultTemperature: 0.2,
      supportsTopP: true,
    },
    pricing: {
      inputPricePer1K: 0.00025,
      outputPricePer1K: 0.00125,
    },
    constraints: {
      maxTokensPerRequest: 4000,
    },
  },

  // Gemini models
  'gemini:gemini-2.5-pro-preview': {
    modelId: 'gemini-2.5-pro-preview-05-06',
    provider: 'gemini',
    apiConfig: {
      maxTokensParam: 'maxOutputTokens',
      supportsTemperature: true,
      defaultTemperature: 0.2,
      supportsTopP: true,
      customParams: {
        generationConfig: true, // Gemini uses generationConfig wrapper
      },
    },
    pricing: {
      inputPricePer1K: 0.001,
      outputPricePer1K: 0.004,
      tiers: [{ threshold: 128000, inputPricePer1K: 0.002, outputPricePer1K: 0.008 }],
    },
    constraints: {
      maxTokensPerRequest: 8192,
    },
  },

  'gemini:gemini-2.0-flash': {
    modelId: 'gemini-2.0-flash',
    provider: 'gemini',
    apiConfig: {
      maxTokensParam: 'maxOutputTokens',
      supportsTemperature: true,
      defaultTemperature: 0.2,
      supportsTopP: true,
      customParams: {
        generationConfig: true,
      },
    },
    pricing: {
      inputPricePer1K: 0.0001,
      outputPricePer1K: 0.0004,
      tiers: [{ threshold: 128000, inputPricePer1K: 0.0002, outputPricePer1K: 0.0008 }],
    },
    constraints: {
      maxTokensPerRequest: 8192,
    },
  },
};

/**
 * Get model configuration by full model name
 * @param fullModelName The full model name (e.g., 'openai:gpt-4o')
 * @returns The model configuration or undefined if not found
 */
export function getModelConfig(fullModelName: string): ModelConfig | undefined {
  return MODEL_CONFIGS[fullModelName];
}

/**
 * Get API configuration for a model
 * @param fullModelName The full model name
 * @returns The API configuration or default configuration
 */
export function getModelApiConfig(fullModelName: string): ModelApiConfig {
  const config = getModelConfig(fullModelName);
  if (config?.apiConfig) {
    return config.apiConfig;
  }

  // Return default configuration
  return {
    maxTokensParam: 'max_tokens',
    supportsTemperature: true,
    defaultTemperature: 0.2,
    supportsTopP: true,
    supportsFrequencyPenalty: true,
    supportsPresencePenalty: true,
  };
}

/**
 * Get pricing configuration for a model
 * @param fullModelName The full model name
 * @returns The pricing configuration or undefined
 */
export function getModelPricing(fullModelName: string): ModelPricingConfig | undefined {
  const config = getModelConfig(fullModelName);
  return config?.pricing;
}

/**
 * Build API request parameters based on model configuration
 * @param fullModelName The full model name
 * @param baseParams Base parameters to augment
 * @param maxTokens Maximum tokens to generate
 * @returns The augmented parameters
 */
export function buildModelRequestParams(
  fullModelName: string,
  baseParams: Record<string, any>,
  maxTokens = 4000,
): Record<string, any> {
  const apiConfig = getModelApiConfig(fullModelName);
  const params = { ...baseParams };

  // Set max tokens parameter
  if (apiConfig.maxTokensParam) {
    params[apiConfig.maxTokensParam] = maxTokens;
  }

  // Handle temperature
  if (apiConfig.supportsTemperature && !Object.hasOwn(params, 'temperature')) {
    params.temperature = apiConfig.defaultTemperature || 0.2;
  } else if (!apiConfig.supportsTemperature && Object.hasOwn(params, 'temperature')) {
    delete params.temperature;
  }

  // Remove unsupported parameters
  if (!apiConfig.supportsTopP) delete params.top_p;
  if (!apiConfig.supportsFrequencyPenalty) delete params.frequency_penalty;
  if (!apiConfig.supportsPresencePenalty) delete params.presence_penalty;

  // Apply custom parameters
  if (apiConfig.customParams) {
    Object.assign(params, apiConfig.customParams);
  }

  return params;
}
