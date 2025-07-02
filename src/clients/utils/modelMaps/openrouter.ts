/**
 * @fileoverview OpenRouter model configurations
 */

import { type EnhancedModelMapping, ModelCategory } from './types';

export const OPENROUTER_MODELS: Record<string, EnhancedModelMapping> = {
  'openrouter:anthropic/claude-4-opus': {
    apiIdentifier: 'anthropic/claude-4-opus',
    displayName: 'Claude 4 Opus (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 200000,
    description: 'Access Claude 4 Opus through OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    capabilities: ['advanced-reasoning', 'code-generation', 'code-review'],
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },

  'openrouter:anthropic/claude-4-sonnet': {
    apiIdentifier: 'anthropic/claude-4-sonnet',
    displayName: 'Claude 4 Sonnet (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 200000,
    description: 'Access Claude 4 Sonnet through OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.CODING, ModelCategory.COST_OPTIMIZED],
    capabilities: ['good-reasoning', 'code-generation', 'code-review'],
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },

  'openrouter:openai/gpt-4o': {
    apiIdentifier: 'openai/gpt-4o',
    displayName: 'GPT-4o (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 128000,
    description: 'Access GPT-4o through OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.MULTIMODAL],
    capabilities: ['advanced-reasoning', 'multimodal', 'code-generation'],
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10.0,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },

  'openrouter:google/gemini-2.5-pro': {
    apiIdentifier: 'google/gemini-pro-1.5',
    displayName: 'Gemini 2.5 Pro (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 1000000,
    description: 'Access Gemini 2.5 Pro through OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.LONG_CONTEXT],
    capabilities: ['advanced-reasoning', 'long-context'],
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.0,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },

  'openrouter:meta-llama/llama-3.3-70b': {
    apiIdentifier: 'meta-llama/llama-3.3-70b',
    displayName: 'Llama 3.3 70B (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 131072,
    description: 'Open source alternative with good performance',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.COST_OPTIMIZED, ModelCategory.CODING],
    capabilities: ['good-reasoning', 'code-generation'],
    inputPricePerMillion: 0.59,
    outputPricePerMillion: 0.79,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },

  'openrouter:anthropic/claude-3-haiku': {
    apiIdentifier: 'anthropic/claude-3-haiku',
    displayName: 'Claude 3 Haiku (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 200000,
    description: 'Fast, affordable model through OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.COST_OPTIMIZED],
    capabilities: ['fast-inference', 'basic-reasoning'],
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },
};
