/**
 * @fileoverview Anthropic model configurations
 * @updated 2025-08-14 - Context limits verified from official Anthropic documentation
 * @source https://docs.anthropic.com/en/docs/about-claude/models
 */

import { type EnhancedModelMapping, ModelCategory } from './types';

export const ANTHROPIC_MODELS: Record<string, EnhancedModelMapping> = {
  'anthropic:claude-4-opus': {
    apiIdentifier: 'claude-4-opus-20241022',
    displayName: 'Claude 4 Opus',
    provider: 'anthropic',
    contextWindow: 200000, // Verified: 200K tokens context window (as of 2025-08)
    description: 'Most capable Claude model with superior reasoning',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    supportsToolCalling: true,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    capabilities: ['advanced-reasoning', 'code-generation', 'code-review', 'analysis'],
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      supportsPromptCaching: true,
      toolCallingSupport: 'full',
    },
  },

  'anthropic:claude-4-sonnet': {
    apiIdentifier: 'claude-4-sonnet-20241022',
    displayName: 'Claude 4 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000, // Verified: 200K tokens context window (as of 2025-08)
    description: 'Balanced performance and cost for code review',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    supportsToolCalling: true,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.CODING, ModelCategory.COST_OPTIMIZED],
    capabilities: ['good-reasoning', 'code-generation', 'code-review'],
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      supportsPromptCaching: true,
      toolCallingSupport: 'full',
    },
    notes: 'Recommended model for code review tasks',
  },

  'anthropic:claude-3.5-sonnet': {
    apiIdentifier: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000, // Verified: 200K tokens context window (as of 2025-08)
    description: 'Enhanced Claude 3 with improved capabilities',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    supportsToolCalling: true,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    capabilities: ['good-reasoning', 'code-generation', 'code-review'],
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      supportsPromptCaching: true,
      toolCallingSupport: 'full',
    },
  },

  'anthropic:claude-3-opus': {
    apiIdentifier: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000, // Verified: 200K tokens context window (as of 2025-08)
    description: 'Previous generation powerful model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    supportsToolCalling: true,
    status: 'deprecated',
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    capabilities: ['advanced-reasoning', 'code-generation'],
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    deprecated: true,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: false,
      supportsPromptCaching: false,
      toolCallingSupport: 'full',
    },
  },

  'anthropic:claude-3-sonnet': {
    apiIdentifier: 'claude-3-sonnet-20240229',
    displayName: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000, // Verified: 200K tokens context window (as of 2025-08)
    description: 'Previous generation balanced model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    supportsToolCalling: true,
    status: 'available',
    categories: [ModelCategory.CODING],
    capabilities: ['good-reasoning', 'code-generation'],
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: false,
      supportsPromptCaching: false,
      toolCallingSupport: 'full',
    },
  },

  'anthropic:claude-3.5-haiku': {
    apiIdentifier: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000, // Verified: 200K tokens context window (as of 2025-08)
    description: 'Fast, cost-effective model for simple tasks',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    supportsToolCalling: true,
    status: 'available',
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.COST_OPTIMIZED],
    capabilities: ['fast-inference', 'basic-reasoning'],
    inputPricePerMillion: 1.0,
    outputPricePerMillion: 5.0,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      supportsPromptCaching: true,
      toolCallingSupport: 'full',
    },
  },

  'anthropic:claude-3-haiku': {
    apiIdentifier: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000, // Verified: 200K tokens context window (as of 2025-08)
    description: 'Previous generation fast model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    supportsToolCalling: true,
    status: 'deprecated',
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.COST_OPTIMIZED],
    capabilities: ['fast-inference', 'basic-reasoning'],
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    deprecated: true,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: false,
      supportsPromptCaching: false,
      toolCallingSupport: 'full',
    },
  },
};
