/**
 * @fileoverview Core functions for model map operations
 */

import logger from '../../../utils/logger';
import { ENHANCED_MODEL_MAP } from './modelData';
import {
  type EnhancedModelMapping,
  ModelCategory,
  type ModelMapping,
  type Provider,
  type ProviderFeatures,
} from './types';

/**
 * Default context windows for providers when model not in registry.
 */
const DEFAULT_CONTEXT_WINDOWS: Record<string, number> = {
  gemini: 1_048_576,
  anthropic: 200_000,
  openai: 128_000,
  openrouter: 128_000,
};

/**
 * Default output limits for providers.
 */
const DEFAULT_OUTPUT_LIMITS: Record<string, number> = {
  gemini: 8192,
  anthropic: 8192,
  openai: 16384,
  openrouter: 8192,
};

/**
 * Get the API name from a model key.
 * Falls back to model name from key for unknown models.
 */
export function getApiNameFromKey(modelKey: string): string {
  const mapping = ENHANCED_MODEL_MAP[modelKey];
  if (mapping) return mapping.apiIdentifier;

  // For unknown models, return the model name part
  const { modelName } = parseModelString(modelKey);
  return modelName;
}

/**
 * Get the model mapping for a given key.
 * Falls back to provider defaults for unknown models.
 */
export function getModelMapping(modelKey: string): ModelMapping | undefined {
  const enhanced = getEnhancedModelMapping(modelKey);
  if (!enhanced) return undefined;

  // Convert to legacy format
  const legacy: ModelMapping = {
    apiIdentifier: enhanced.apiIdentifier,
    displayName: enhanced.displayName,
    provider: enhanced.provider,
    useV1Beta: enhanced.useV1Beta,
    contextWindow: enhanced.contextWindow,
    description: enhanced.description,
    apiKeyEnvVar: enhanced.apiKeyEnvVar,
    supportsToolCalling: enhanced.supportsToolCalling,
  };

  // Add deprecation notice if needed
  if (enhanced.deprecated) {
    legacy.displayName = `${legacy.displayName} (DEPRECATED)`;
    legacy.description = `DEPRECATED: Please migrate to an alternative model`;
  }

  return legacy;
}

/**
 * Get all model keys for a provider.
 */
export function getModelsByProvider(provider: Provider): string[] {
  return Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_, mapping]) => mapping.provider === provider)
    .map(([key, _]) => key);
}

/**
 * Get the default models for a provider (excludes deprecated).
 */
export function getModels(provider: Provider): string[] {
  return Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_, mapping]) => mapping.provider === provider && mapping.status !== 'deprecated')
    .map(([key, _]) => key);
}

/**
 * Parse a model string into provider and model name.
 */
export function parseModelString(modelString: string): {
  provider: Provider;
  modelName: string;
} {
  if (!modelString || modelString.trim() === '') {
    throw new Error('Model string cannot be empty');
  }

  const parts = modelString.split(':');
  if (parts.length === 2) {
    return {
      provider: parts[0] as Provider,
      modelName: parts[1],
    };
  }

  // Default to gemini if no provider specified
  return {
    provider: 'gemini',
    modelName: modelString,
  };
}

/**
 * Get the full model key from provider and model name.
 */
export function getFullModelKey(provider: Provider, modelName: string): string {
  return `${provider}:${modelName}`;
}

/**
 * Check if a model supports tool calling.
 */
export function supportsToolCalling(modelKey: string): boolean {
  const mapping = ENHANCED_MODEL_MAP[modelKey];
  return mapping?.supportsToolCalling || false;
}

/**
 * Get enhanced model mapping with all metadata.
 * Falls back to provider defaults for unknown models.
 */
export function getEnhancedModelMapping(modelKey: string): EnhancedModelMapping | undefined {
  // First try exact match
  const exactMatch = ENHANCED_MODEL_MAP[modelKey];
  if (exactMatch) return exactMatch;

  // Parse provider and model name
  const { provider, modelName } = parseModelString(modelKey);

  // If still not found, create fallback configuration
  if (!modelName) return undefined;

  logger.warn(`Model "${modelKey}" not in registry, using ${provider} defaults`);

  // Get provider-specific API key env var
  const apiKeyEnvVarMap: Record<string, string> = {
    gemini: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
    anthropic: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    openai: 'AI_CODE_REVIEW_OPENAI_API_KEY',
    openrouter: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
  };

  return {
    apiIdentifier: modelName,
    contextWindow: DEFAULT_CONTEXT_WINDOWS[provider] || 100_000,
    outputLimit: DEFAULT_OUTPUT_LIMITS[provider] || 8192,
    inputPricePerMillion: 0,
    outputPricePerMillion: 0,
    displayName: modelName,
    description: `Unknown model: ${modelKey}`,
    provider: provider,
    apiKeyEnvVar: apiKeyEnvVarMap[provider] || 'AI_CODE_REVIEW_GOOGLE_API_KEY',
    supportsToolCalling: false, // Conservative default
    status: 'available',
    providerFeatures: {
      supportsStreaming: true,
      toolCallingSupport: 'none',
    },
  };
}

/**
 * Validate a model key and check for deprecation.
 */
export function validateModelKey(modelKey: string): {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestion?: string;
} {
  const enhanced = ENHANCED_MODEL_MAP[modelKey];

  if (!enhanced) {
    // Model not in registry - will use fallback defaults
    const { provider } = parseModelString(modelKey);
    return {
      isValid: true,
      warning: `Model '${modelKey}' not in registry. Using ${provider} defaults.`,
    };
  }

  if (enhanced.deprecated) {
    return {
      isValid: false,
      error: `Model '${modelKey}' is deprecated`,
      warning: 'Please migrate to an alternative model',
    };
  }

  if (enhanced.status === 'retiring') {
    return {
      isValid: true,
      warning: `Model '${modelKey}' is being retired. Consider migrating soon.`,
    };
  }

  return { isValid: true };
}

/**
 * Calculate cost for a tiered pricing tier.
 */
function calculateTierCost(
  remainingTokens: number,
  tier: { tokenThreshold: number; pricePerMillion: number },
): { cost: number; remainingTokens: number } {
  if (remainingTokens <= tier.tokenThreshold) {
    return { cost: 0, remainingTokens };
  }

  const tokensInTier = remainingTokens - tier.tokenThreshold;
  const cost = (tokensInTier / 1_000_000) * tier.pricePerMillion;
  return { cost, remainingTokens: tier.tokenThreshold };
}

/**
 * Calculate cost using tiered pricing model.
 */
function calculateTieredCost(
  tieredPricing: Array<{
    tokenThreshold: number;
    inputPricePerMillion: number;
    outputPricePerMillion: number;
  }>,
  inputTokens: number,
  outputTokens: number,
): number {
  let inputCost = 0;
  let outputCost = 0;
  let remainingInput = inputTokens;
  let remainingOutput = outputTokens;

  // Sort tiers by threshold descending to apply highest tiers first
  const sortedTiers = [...tieredPricing].sort((a, b) => b.tokenThreshold - a.tokenThreshold);

  for (const tier of sortedTiers) {
    const inputResult = calculateTierCost(remainingInput, {
      tokenThreshold: tier.tokenThreshold,
      pricePerMillion: tier.inputPricePerMillion,
    });
    inputCost += inputResult.cost;
    remainingInput = inputResult.remainingTokens;

    const outputResult = calculateTierCost(remainingOutput, {
      tokenThreshold: tier.tokenThreshold,
      pricePerMillion: tier.outputPricePerMillion,
    });
    outputCost += outputResult.cost;
    remainingOutput = outputResult.remainingTokens;
  }

  return inputCost + outputCost;
}

/**
 * Calculate cost using simple pricing model.
 */
function calculateSimpleCost(
  inputPricePerMillion: number,
  outputPricePerMillion: number,
  inputTokens: number,
  outputTokens: number,
): number {
  const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion;
  return inputCost + outputCost;
}

/**
 * Calculate cost for a model usage.
 */
export function calculateCost(
  modelKey: string,
  inputTokens: number,
  outputTokens: number,
): number | undefined {
  const enhanced = ENHANCED_MODEL_MAP[modelKey];
  if (!enhanced) return undefined;

  // Handle tiered pricing
  if (enhanced.tieredPricing && enhanced.tieredPricing.length > 0) {
    return calculateTieredCost(enhanced.tieredPricing, inputTokens, outputTokens);
  }

  // Simple pricing
  if (enhanced.inputPricePerMillion !== undefined && enhanced.outputPricePerMillion !== undefined) {
    return calculateSimpleCost(
      enhanced.inputPricePerMillion,
      enhanced.outputPricePerMillion,
      inputTokens,
      outputTokens,
    );
  }

  return undefined;
}

/**
 * Get models by category.
 */
export function getModelsByCategory(category: ModelCategory, excludeDeprecated = true): string[] {
  return Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_, mapping]) => {
      if (excludeDeprecated && mapping.deprecated) return false;
      return mapping.categories?.includes(category);
    })
    .map(([key, _]) => key);
}

/**
 * Calculate total cost estimate for a model mapping.
 */
function calculateModelCostEstimate(mapping: EnhancedModelMapping): number {
  return (mapping.inputPricePerMillion || 0) + (mapping.outputPricePerMillion || 0);
}

/**
 * Compare two model entries by cost.
 */
function compareModelsByCost(
  a: [string, EnhancedModelMapping],
  b: [string, EnhancedModelMapping],
): number {
  return calculateModelCostEstimate(a[1]) - calculateModelCostEstimate(b[1]);
}

/**
 * Find cost-optimized coding models sorted by price.
 */
function findCostOptimizedCodingModels(): Array<[string, EnhancedModelMapping]> {
  const models = Object.entries(ENHANCED_MODEL_MAP).filter(
    ([_, m]) =>
      m.categories?.includes(ModelCategory.COST_OPTIMIZED) &&
      m.categories?.includes(ModelCategory.CODING) &&
      !m.deprecated,
  );

  return models.sort(compareModelsByCost);
}

/**
 * Find the explicitly recommended model for code review.
 */
function findRecommendedModel(): string | undefined {
  const recommended = Object.entries(ENHANCED_MODEL_MAP).find(([_, m]) =>
    m.notes?.includes('Recommended model for code review'),
  );
  return recommended ? recommended[0] : undefined;
}

/**
 * Get recommended model for code review tasks.
 */
export function getRecommendedModelForCodeReview(preferCostOptimized = false): string {
  if (preferCostOptimized) {
    const costOptimized = findCostOptimizedCodingModels();
    if (costOptimized.length > 0) {
      return costOptimized[0][0];
    }
  }

  // Default to Claude 4 Sonnet as it's marked as recommended
  return findRecommendedModel() || 'anthropic:claude-4-sonnet';
}

/**
 * Get provider feature information.
 */
export function getProviderFeatures(modelKey: string): ProviderFeatures | undefined {
  return ENHANCED_MODEL_MAP[modelKey]?.providerFeatures;
}

/**
 * Format cost as currency string.
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)} USD`;
  }
  if (cost < 1) {
    return `$${cost.toFixed(4)} USD`;
  }
  return `$${cost.toFixed(2)} USD`;
}
