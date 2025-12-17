/**
 * @fileoverview Type definitions for the enhanced model mapping system
 * @version 4.0.0
 */

/**
 * Supported AI providers with their ecosystem characteristics.
 */
export type Provider = 'gemini' | 'anthropic' | 'openai' | 'openrouter';

/**
 * Model performance and use-case categories.
 */
export enum ModelCategory {
  REASONING = 'reasoning',
  FAST_INFERENCE = 'fast-inference',
  COST_OPTIMIZED = 'cost-optimized',
  LONG_CONTEXT = 'long-context',
  MULTIMODAL = 'multimodal',
  CODING = 'coding',
}

/**
 * Tiered pricing structure for models with variable pricing.
 */
export interface TieredPricing {
  tokenThreshold: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

/**
 * Provider-specific feature capabilities.
 */
export interface ProviderFeatures {
  supportsStreaming?: boolean;
  supportsBatch?: boolean;
  supportsPromptCaching?: boolean;
  rateLimit?: number;
  customHeaders?: Record<string, string>;
  toolCallingSupport?: 'full' | 'partial' | 'none';
}

/**
 * Legacy interface for backwards compatibility.
 */
export interface ModelMapping {
  apiIdentifier: string;
  displayName: string;
  provider: Provider;
  useV1Beta?: boolean;
  contextWindow?: number;
  description?: string;
  apiKeyEnvVar: string;
  supportsToolCalling?: boolean;
}

/**
 * Enhanced model mapping with comprehensive metadata.
 */
export interface EnhancedModelMapping extends ModelMapping {
  inputPricePerMillion?: number;
  outputPricePerMillion?: number;
  outputLimit?: number;
  tieredPricing?: TieredPricing[];
  deprecated?: boolean;
  categories?: ModelCategory[];
  capabilities?: string[];
  providerFeatures?: ProviderFeatures;
  status?: 'available' | 'preview' | 'deprecated' | 'retiring';
  variants?: Record<string, string>;
  notes?: string;
}

/**
 * Default context windows for providers when model not in registry.
 */
export const DEFAULT_CONTEXT_WINDOWS: Record<string, number> = {
  gemini: 1_048_576,
  anthropic: 200_000,
  openai: 128_000,
  openrouter: 128_000,
};
