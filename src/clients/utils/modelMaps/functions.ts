/**
 * @fileoverview Core functions for model map operations
 */

import { ENHANCED_MODEL_MAP } from './modelData';
import { 
  Provider, 
  ModelMapping, 
  EnhancedModelMapping, 
  ModelCategory,
  ProviderFeatures 
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
    supportsToolCalling: enhanced.supportsToolCalling
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
      modelName: parts[1]
    };
  }
  
  // Default to gemini if no provider specified
  return {
    provider: 'gemini',
    modelName: modelString
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
      error: `Model '${modelKey}' not found in configuration`
    };
  }
  
  if (enhanced.deprecation?.deprecated) {
    return {
      isValid: false,
      error: `Model '${modelKey}' is deprecated`,
      warning: enhanced.deprecation.migrationGuide,
      suggestion: enhanced.deprecation.alternativeModel
    };
  }
  
  if (enhanced.status === 'retiring') {
    return {
      isValid: true,
      warning: `Model '${modelKey}' is being retired. Consider migrating soon.`,
      suggestion: enhanced.deprecation?.alternativeModel
    };
  }
  
  return { isValid: true };
}

/**
 * Calculate cost for a model usage.
 */
export function calculateCost(
  modelKey: string,
  inputTokens: number,
  outputTokens: number
): number | undefined {
  const enhanced = ENHANCED_MODEL_MAP[modelKey];
  if (!enhanced) return undefined;
  
  // Handle tiered pricing
  if (enhanced.tieredPricing && enhanced.tieredPricing.length > 0) {
    let inputCost = 0;
    let outputCost = 0;
    let remainingInput = inputTokens;
    let remainingOutput = outputTokens;
    
    // Sort tiers by threshold descending to apply highest tiers first
    const sortedTiers = [...enhanced.tieredPricing].sort((a, b) => b.tokenThreshold - a.tokenThreshold);
    
    for (const tier of sortedTiers) {
      if (remainingInput > tier.tokenThreshold) {
        const tokensInTier = remainingInput - tier.tokenThreshold;
        inputCost += (tokensInTier / 1_000_000) * tier.inputPricePerMillion;
        remainingInput = tier.tokenThreshold;
      }
      
      if (remainingOutput > tier.tokenThreshold) {
        const tokensInTier = remainingOutput - tier.tokenThreshold;
        outputCost += (tokensInTier / 1_000_000) * tier.outputPricePerMillion;
        remainingOutput = tier.tokenThreshold;
      }
    }
    
    return inputCost + outputCost;
  }
  
  // Simple pricing
  if (enhanced.inputPricePerMillion !== undefined && enhanced.outputPricePerMillion !== undefined) {
    const inputCost = (inputTokens / 1_000_000) * enhanced.inputPricePerMillion;
    const outputCost = (outputTokens / 1_000_000) * enhanced.outputPricePerMillion;
    return inputCost + outputCost;
  }
  
  return undefined;
}

/**
 * Get models by category.
 */
export function getModelsByCategory(
  category: ModelCategory,
  excludeDeprecated = true
): string[] {
  return Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_, mapping]) => {
      if (excludeDeprecated && mapping.deprecation?.deprecated) return false;
      return mapping.categories?.includes(category);
    })
    .map(([key, _]) => key);
}

/**
 * Get recommended model for code review tasks.
 */
export function getRecommendedModelForCodeReview(preferCostOptimized = false): string {
  if (preferCostOptimized) {
    // Find cost-optimized models with coding capability
    const costOptimized = Object.entries(ENHANCED_MODEL_MAP)
      .filter(([_, m]) => 
        m.categories?.includes(ModelCategory.COST_OPTIMIZED) &&
        m.categories?.includes(ModelCategory.CODING) &&
        !m.deprecation?.deprecated
      )
      .sort((a, b) => {
        // Sort by cost (estimate using simple pricing)
        const aCost = (a[1].inputPricePerMillion || 0) + (a[1].outputPricePerMillion || 0);
        const bCost = (b[1].inputPricePerMillion || 0) + (b[1].outputPricePerMillion || 0);
        return aCost - bCost;
      });
    
    if (costOptimized.length > 0) {
      return costOptimized[0][0];
    }
  }
  
  // Default to Claude 4 Sonnet as it's marked as recommended
  const recommended = Object.entries(ENHANCED_MODEL_MAP)
    .find(([_, m]) => m.notes?.includes('Recommended model for code review'));
  
  return recommended ? recommended[0] : 'anthropic:claude-4-sonnet';
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
  } else if (cost < 1) {
    return `$${cost.toFixed(4)} USD`;
  } else {
    return `$${cost.toFixed(2)} USD`;
  }
}