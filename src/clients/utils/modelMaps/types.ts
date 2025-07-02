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
 * Model deprecation information for managing model lifecycle.
 */
export interface DeprecationInfo {
  deprecated: boolean;
  deprecationDate?: string;
  removalDate?: string;
  migrationGuide?: string;
  alternativeModel?: string;
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
  tieredPricing?: TieredPricing[];
  deprecation?: DeprecationInfo;
  categories?: ModelCategory[];
  capabilities?: string[];
  providerFeatures?: ProviderFeatures;
  status?: 'available' | 'preview' | 'deprecated' | 'retiring';
  variants?: Record<string, string>;
  notes?: string;
}
