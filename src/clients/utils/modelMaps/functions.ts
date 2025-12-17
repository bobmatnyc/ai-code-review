/**
 * @fileoverview Core functions for model map operations
 */

import { ENHANCED_MODEL_MAP } from './modelData';
import {
  type EnhancedModelMapping,
  ModelCategory,
  type ModelMapping,
  type Provider,
  type ProviderFeatures,
} from './types';

/**
 * Get the API name from a model key.
 */
export function getApiNameFromKey(modelKey: string): string {
  const mapping = ENHANCED_MODEL_MAP[modelKey];
  return mapping ? mapping.apiIdentifier : modelKey;
}

/**
 * Get the model mapping for a given key.
 */
export function getModelMapping(modelKey: string): ModelMapping | undefined {
  const enhanced = ENHANCED_MODEL_MAP[modelKey];
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
  if (enhanced.deprecation?.deprecated) {
    legacy.displayName = `${legacy.displayName} (DEPRECATED)`;
    legacy.description = `DEPRECATED: ${enhanced.deprecation.migrationGuide || 'Please migrate to an alternative model'}`;
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
 */
export function getEnhancedModelMapping(modelKey: string): EnhancedModelMapping | undefined {
  return ENHANCED_MODEL_MAP[modelKey];
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
    return {
      isValid: false,
      error: `Model '${modelKey}' not found in configuration`,
    };
  }

  if (enhanced.deprecation?.deprecated) {
    return {
      isValid: false,
      error: `Model '${modelKey}' is deprecated`,
      warning: enhanced.deprecation.migrationGuide,
      suggestion: enhanced.deprecation.alternativeModel,
    };
  }

  if (enhanced.status === 'retiring') {
    return {
      isValid: true,
      warning: `Model '${modelKey}' is being retired. Consider migrating soon.`,
      suggestion: enhanced.deprecation?.alternativeModel,
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
      if (excludeDeprecated && mapping.deprecation?.deprecated) return false;
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
      !m.deprecation?.deprecated,
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
