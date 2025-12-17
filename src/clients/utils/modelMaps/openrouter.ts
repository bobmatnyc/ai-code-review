/**
 * @fileoverview OpenRouter model configurations
 * @updated 2025-08-14 - Context limits verified from official documentation
 * @source OpenRouter API docs, OpenAI docs, Anthropic docs, Google AI docs
 */

import { type EnhancedModelMapping, ModelCategory } from './types';

export const OPENROUTER_MODELS: Record<string, EnhancedModelMapping> = {
  'openrouter:anthropic/claude-4-opus': {
    apiIdentifier: 'anthropic/claude-4-opus',
    displayName: 'Claude 4 Opus (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 200000, // Verified: 200K tokens (as of 2025-08)
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
    contextWindow: 200000, // Verified: 200K tokens (as of 2025-08)
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
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
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

  // Add latest Claude 3.5 Sonnet via OpenRouter
  'openrouter:anthropic/claude-3.5-sonnet': {
    apiIdentifier: 'anthropic/claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 200000, // Verified: 200K tokens (as of 2025-08)
    description: 'Enhanced Claude 3 with improved capabilities through OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
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

  'openrouter:google/gemini-2.0-pro': {
    apiIdentifier: 'google/gemini-2.0-pro-latest',
    displayName: 'Gemini 2.0 Pro (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 1048576, // Verified: 1M tokens context window (as of 2025-08)
    description: 'Access Gemini 2.0 Pro through OpenRouter with 1M token context',
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
    contextWindow: 131072, // Verified: 128K tokens (as of 2025-08)
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

  // Additional popular models via OpenRouter
  'openrouter:openai/gpt-4-turbo': {
    apiIdentifier: 'openai/gpt-4-turbo',
    displayName: 'GPT-4 Turbo (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'GPT-4 Turbo through OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    capabilities: ['advanced-reasoning', 'code-generation'],
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },

  'openrouter:openai/gpt-4o-mini': {
    apiIdentifier: 'openai/gpt-4o-mini',
    displayName: 'GPT-4o Mini (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Cost-efficient GPT-4o variant through OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.COST_OPTIMIZED, ModelCategory.CODING],
    capabilities: ['good-reasoning', 'code-generation'],
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },

  'openrouter:google/gemini-1.5-flash': {
    apiIdentifier: 'google/gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 1048576, // Verified: 1M+ tokens (as of 2025-08)
    description: 'Fast Gemini model with massive context through OpenRouter',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.LONG_CONTEXT],
    capabilities: ['fast-inference', 'long-context'],
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.3,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },

  // Add DeepSeek models via OpenRouter
  'openrouter:deepseek/deepseek-v3': {
    apiIdentifier: 'deepseek/deepseek-v3',
    displayName: 'DeepSeek V3 (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 65536, // Verified: 64K tokens (as of 2025-08)
    description: 'Advanced Chinese LLM with strong reasoning capabilities',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.CODING, ModelCategory.COST_OPTIMIZED],
    capabilities: ['advanced-reasoning', 'code-generation', 'multilingual'],
    inputPricePerMillion: 0.14,
    outputPricePerMillion: 0.28,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },

  'openrouter:qwen/qwen-2.5-coder-32b': {
    apiIdentifier: 'qwen/qwen-2.5-coder-32b',
    displayName: 'Qwen 2.5 Coder 32B (via OpenRouter)',
    provider: 'openrouter',
    contextWindow: 32768, // Verified: 32K tokens (as of 2025-08)
    description: 'Specialized model for code generation and review',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.CODING, ModelCategory.COST_OPTIMIZED],
    capabilities: ['code-generation', 'code-review', 'debugging'],
    inputPricePerMillion: 0.18,
    outputPricePerMillion: 0.18,
    providerFeatures: {
      supportsStreaming: true,
      customHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'AI Code Review',
      },
    },
  },
};
