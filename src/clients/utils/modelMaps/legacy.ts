/**
 * @fileoverview Legacy exports for backwards compatibility
 */

import { ENHANCED_MODEL_MAP } from './modelData';
import type { ModelMapping, Provider } from './types';

/**
 * Auto-generated legacy MODEL_MAP for backwards compatibility.
 * This is generated from ENHANCED_MODEL_MAP to ensure existing code
 * continues to work without modification.
 */
export const MODEL_MAP: Record<string, ModelMapping> = Object.entries(ENHANCED_MODEL_MAP).reduce(
  (acc, [key, enhanced]) => {
    // Extract only the legacy fields
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

    // Add deprecation notice to display name if deprecated
    if (enhanced.deprecation?.deprecated) {
      legacy.displayName = `${legacy.displayName} (DEPRECATED)`;
      legacy.description = `DEPRECATED: ${enhanced.deprecation.migrationGuide || 'Please migrate to an alternative model'}`;
    }

    acc[key] = legacy;
    return acc;
  },
  {} as Record<string, ModelMapping>,
);

/**
 * Provider model lists for backwards compatibility.
 * Auto-generated from ENHANCED_MODEL_MAP, excluding deprecated models
 * by default to encourage migration.
 */
export const MODELS: Record<Provider, string[]> = {
  gemini: Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_, mapping]) => mapping.provider === 'gemini' && mapping.status !== 'deprecated')
    .map(([key, _]) => key),

  anthropic: Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_, mapping]) => mapping.provider === 'anthropic' && mapping.status !== 'deprecated')
    .map(([key, _]) => key),

  openai: Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_, mapping]) => mapping.provider === 'openai' && mapping.status !== 'deprecated')
    .map(([key, _]) => key),

  openrouter: Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_, mapping]) => mapping.provider === 'openrouter' && mapping.status !== 'deprecated')
    .map(([key, _]) => key),
};
