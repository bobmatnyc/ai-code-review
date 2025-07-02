/**
 * @fileoverview Gemini model configurations
 */

import { type EnhancedModelMapping, ModelCategory } from './types';

export const GEMINI_MODELS: Record<string, EnhancedModelMapping> = {
  'gemini:gemini-2.5-pro-preview': {
    apiIdentifier: 'gemini-2.5-pro-preview-05-06',
    displayName: 'Gemini 2.5 Pro Preview',
    provider: 'gemini',
    useV1Beta: true,
    contextWindow: 1000000,
    description: 'Most advanced reasoning and multimodal capabilities',
    apiKeyEnvVar: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
    supportsToolCalling: false,
    status: 'preview',
    categories: [ModelCategory.REASONING, ModelCategory.LONG_CONTEXT, ModelCategory.MULTIMODAL],
    capabilities: ['advanced-reasoning', 'multimodal', 'code-generation', 'long-context'],
    tieredPricing: [
      { tokenThreshold: 0, inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },
      { tokenThreshold: 200000, inputPricePerMillion: 2.5, outputPricePerMillion: 10.0 },
    ],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'partial',
    },
  },

  'gemini:gemini-2.5-pro': {
    apiIdentifier: 'gemini-2.5-pro-preview-05-06',
    displayName: 'Gemini 2.5 Pro',
    provider: 'gemini',
    useV1Beta: true,
    contextWindow: 1000000,
    description: 'Production-ready advanced reasoning model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.REASONING, ModelCategory.LONG_CONTEXT, ModelCategory.MULTIMODAL],
    capabilities: ['advanced-reasoning', 'multimodal', 'code-generation', 'long-context'],
    tieredPricing: [
      { tokenThreshold: 0, inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },
      { tokenThreshold: 200000, inputPricePerMillion: 2.5, outputPricePerMillion: 10.0 },
    ],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'partial',
    },
  },

  'gemini:gemini-2.0-flash-lite': {
    apiIdentifier: 'gemini-2.0-flash-lite',
    displayName: 'Gemini 2.0 Flash Lite',
    provider: 'gemini',
    useV1Beta: true,
    contextWindow: 1000000,
    description: 'Ultra-fast, cost-efficient model for simple tasks',
    apiKeyEnvVar: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.COST_OPTIMIZED],
    capabilities: ['fast-inference', 'basic-reasoning'],
    inputPricePerMillion: 0.05,
    outputPricePerMillion: 0.15,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'none',
    },
  },

  'gemini:gemini-2.0-flash': {
    apiIdentifier: 'gemini-2.0-flash-preview-05-07',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    useV1Beta: true,
    contextWindow: 1000000,
    description: 'Fast, efficient model with strong performance',
    apiKeyEnvVar: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
    supportsToolCalling: false,
    status: 'preview',
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.LONG_CONTEXT],
    capabilities: ['fast-inference', 'good-reasoning', 'long-context'],
    inputPricePerMillion: 0.3,
    outputPricePerMillion: 1.2,
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'partial',
    },
  },

  'gemini:gemini-1.5-pro': {
    apiIdentifier: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    provider: 'gemini',
    useV1Beta: false,
    contextWindow: 1000000,
    description: 'Previous generation large context model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.LONG_CONTEXT],
    capabilities: ['long-context', 'good-reasoning'],
    tieredPricing: [
      { tokenThreshold: 0, inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },
      { tokenThreshold: 128000, inputPricePerMillion: 2.5, outputPricePerMillion: 10.0 },
    ],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'partial',
    },
  },

  'gemini:gemini-1.5-flash': {
    apiIdentifier: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    provider: 'gemini',
    useV1Beta: false,
    contextWindow: 1000000,
    description: 'Previous generation fast model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
    supportsToolCalling: false,
    status: 'available',
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.LONG_CONTEXT],
    capabilities: ['fast-inference', 'long-context'],
    tieredPricing: [
      { tokenThreshold: 0, inputPricePerMillion: 0.075, outputPricePerMillion: 0.3 },
      { tokenThreshold: 128000, inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 },
    ],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatch: true,
      toolCallingSupport: 'partial',
    },
  },
};
