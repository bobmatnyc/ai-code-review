/**
 * @fileoverview OpenAI model configurations
 * @updated 2025-08-14 - Context limits verified from official OpenAI docs
 */

import { type EnhancedModelMapping, ModelCategory } from './types';

export const OPENAI_MODELS: Record<string, EnhancedModelMapping> = {
  'openai:gpt-4o': {
    apiIdentifier: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Multimodal model with vision capabilities',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: true,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.MULTIMODAL, ModelCategory.CODING],
    capabilities: ['advanced-reasoning', 'multimodal', 'code-generation', 'vision'],
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10.0,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'full',
      rateLimit: 10000,
    },
  },

  'openai:gpt-4.1': {
    apiIdentifier: 'gpt-4-0125-preview',
    displayName: 'GPT-4.1 Preview',
    provider: 'openai',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Latest GPT-4 with improved reasoning',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: true,
    status: 'preview',
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    capabilities: ['advanced-reasoning', 'code-generation', 'analysis'],
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'full',
      rateLimit: 10000,
    },
  },

  'openai:gpt-4.5': {
    apiIdentifier: 'gpt-4-turbo-2024-04-09',
    displayName: 'GPT-4.5 Turbo',
    provider: 'openai',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Experimental model being phased out',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: true,
    status: 'deprecated',
    categories: [ModelCategory.REASONING],
    capabilities: ['advanced-reasoning', 'code-generation'],
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    deprecation: {
      deprecated: true,
      deprecationDate: '2024-04-09',
      removalDate: '2025-07-14',
      migrationGuide:
        'This experimental model is being removed. Please migrate to GPT-4.1 for similar capabilities.',
      alternativeModel: 'openai:gpt-4.1',
    },
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'full',
      rateLimit: 10000,
    },
  },

  'openai:gpt-4-turbo': {
    apiIdentifier: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Fast GPT-4 variant with good performance',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: true,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    capabilities: ['good-reasoning', 'code-generation'],
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'full',
      rateLimit: 10000,
    },
  },

  'openai:gpt-3.5-turbo': {
    apiIdentifier: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16384, // Verified: 16K tokens (as of 2025-08)
    description: 'Fast, cost-effective model for simple tasks',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: true,
    status: 'available',
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.COST_OPTIMIZED],
    capabilities: ['fast-inference', 'basic-reasoning', 'code-generation'],
    inputPricePerMillion: 0.5,
    outputPricePerMillion: 1.5,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'full',
      rateLimit: 10000,
    },
  },

  'openai:o3': {
    apiIdentifier: 'o3',
    displayName: 'O3 Reasoning Model',
    provider: 'openai',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Advanced reasoning model for complex problems',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: false,
    status: 'preview',
    categories: [ModelCategory.REASONING],
    capabilities: ['advanced-reasoning', 'problem-solving'],
    inputPricePerMillion: 40.0,
    outputPricePerMillion: 120.0,
    providerFeatures: {
      supportsStreaming: false,
      supportsBatch: false,
      toolCallingSupport: 'none',
      rateLimit: 1000,
    },
    notes: 'Specialized for complex reasoning tasks, not optimized for code review',
  },

  'openai:o3-mini': {
    apiIdentifier: 'o3-mini',
    displayName: 'O3 Mini Reasoning Model',
    provider: 'openai',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Efficient reasoning model for moderate complexity',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: false,
    status: 'preview',
    categories: [ModelCategory.REASONING, ModelCategory.COST_OPTIMIZED],
    capabilities: ['good-reasoning', 'problem-solving'],
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    providerFeatures: {
      supportsStreaming: false,
      supportsBatch: false,
      toolCallingSupport: 'none',
      rateLimit: 2000,
    },
  },

  // Additional OpenAI models
  'openai:gpt-4o-mini': {
    apiIdentifier: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Cost-efficient multimodal model with vision capabilities',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: true,
    status: 'available',
    categories: [ModelCategory.COST_OPTIMIZED, ModelCategory.MULTIMODAL],
    capabilities: ['good-reasoning', 'multimodal', 'code-generation', 'vision'],
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'full',
      rateLimit: 30000,
    },
    notes: 'Recommended for cost-sensitive code review tasks with good performance',
  },

  'openai:o1': {
    apiIdentifier: 'o1-preview',
    displayName: 'O1 Reasoning Model',
    provider: 'openai',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Advanced reasoning model for complex problems',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: false,
    status: 'preview',
    categories: [ModelCategory.REASONING],
    capabilities: ['advanced-reasoning', 'problem-solving', 'code-analysis'],
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 60.0,
    providerFeatures: {
      supportsStreaming: false,
      supportsBatch: false,
      toolCallingSupport: 'none',
      rateLimit: 500,
    },
    notes: 'Specialized for complex reasoning and code analysis tasks',
  },

  'openai:o1-mini': {
    apiIdentifier: 'o1-mini',
    displayName: 'O1 Mini',
    provider: 'openai',
    contextWindow: 128000, // Verified: 128K tokens (as of 2025-08)
    description: 'Efficient reasoning model for moderate complexity',
    apiKeyEnvVar: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.COST_OPTIMIZED],
    capabilities: ['good-reasoning', 'problem-solving'],
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 12.0,
    providerFeatures: {
      supportsStreaming: false,
      supportsBatch: false,
      toolCallingSupport: 'none',
      rateLimit: 1000,
    },
  },
};
