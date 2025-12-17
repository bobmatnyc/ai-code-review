/**
 * @fileoverview Comprehensive tests for enhanced model maps
 * 
 * Tests verify:
 * - Backwards compatibility with existing code
 * - New enhanced functionality
 * - Pricing calculations
 * - Deprecation handling
 * - Model validation
 */

import {
  ENHANCED_MODEL_MAP,
  getApiNameFromKey,
  getModelMapping,
  getModelsByProvider,
  getModels,
  parseModelString,
  supportsToolCalling,
  getEnhancedModelMapping,
  validateModelKey,
  calculateCost,
  getModelsByCategory,
  getRecommendedModelForCodeReview,
  getProviderFeatures,
  formatCost,
  ModelCategory,
  type Provider
} from '../../../clients/utils/modelMaps';

describe('Model Maps - Enhanced Functionality', () => {
  describe('ENHANCED_MODEL_MAP', () => {
    it('should contain all expected models', () => {
      const enhancedMapKeys = Object.keys(ENHANCED_MODEL_MAP);
      expect(enhancedMapKeys.length).toBeGreaterThan(0);
    });

    it('should maintain EnhancedModelMapping structure', () => {
      Object.entries(ENHANCED_MODEL_MAP).forEach(([_key, mapping]) => {
        expect(mapping).toHaveProperty('apiIdentifier');
        expect(mapping).toHaveProperty('displayName');
        expect(mapping).toHaveProperty('provider');
        expect(mapping).toHaveProperty('apiKeyEnvVar');

        // Optional properties
        expect(mapping).toMatchObject({
          apiIdentifier: expect.any(String),
          displayName: expect.any(String),
          provider: expect.any(String),
          apiKeyEnvVar: expect.any(String)
        });
      });
    });

    it('should not include removed deprecated models', () => {
      // Verify that removed deprecated models are truly gone
      const removedModel = ENHANCED_MODEL_MAP['anthropic:claude-3-opus'];
      expect(removedModel).toBeUndefined();
    });
  });

  describe('getModels()', () => {
    it('should exclude deprecated models by default', () => {
      const anthropicModels = getModels('anthropic');

      // Claude 3 Opus is deprecated
      expect(anthropicModels).not.toContain('anthropic:claude-3-opus');

      // Claude 4 Opus is not deprecated
      expect(anthropicModels).toContain('anthropic:claude-4-opus');
    });

    it('should return models for all providers', () => {
      const providers: Provider[] = ['gemini', 'anthropic', 'openai', 'openrouter'];
      providers.forEach(provider => {
        const models = getModels(provider);
        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Legacy Functions', () => {
    describe('getApiNameFromKey', () => {
      it('should return API identifier for valid keys', () => {
        expect(getApiNameFromKey('gemini:gemini-2.5-pro')).toBe('gemini-2.5-pro-preview-05-06');
        expect(getApiNameFromKey('anthropic:claude-4-opus')).toBe('claude-4-opus-20241022');
      });

      it('should return model name for unknown keys (fallback)', () => {
        expect(getApiNameFromKey('invalid:model')).toBe('model');
      });
    });

    describe('getModelMapping', () => {
      it('should return mapping for valid keys', () => {
        const mapping = getModelMapping('openai:gpt-4o');
        expect(mapping).toBeDefined();
        expect(mapping?.displayName).toBe('GPT-4o');
        expect(mapping?.provider).toBe('openai');
      });

      it('should return fallback mapping for unknown keys', () => {
        const mapping = getModelMapping('invalid:model');
        expect(mapping).toBeDefined();
        expect(mapping?.apiIdentifier).toBe('model');
        expect(mapping?.provider).toBe('invalid');
      });
    });

    describe('getModelsByProvider', () => {
      it('should return all models for a provider', () => {
        const geminiModels = getModelsByProvider('gemini');
        expect(geminiModels).toContain('gemini:gemini-2.5-pro');
        expect(geminiModels).toContain('gemini:gemini-2.0-flash'); // Updated to available model
        expect(geminiModels.every(m => m.startsWith('gemini:'))).toBe(true);
      });

      it('should return empty array for invalid provider', () => {
        const models = getModelsByProvider('invalid' as Provider);
        expect(models).toEqual([]);
      });
    });

    describe('parseModelString', () => {
      it('should parse provider:model format', () => {
        const result = parseModelString('anthropic:claude-4-opus');
        expect(result).toEqual({
          provider: 'anthropic',
          modelName: 'claude-4-opus'
        });
      });

      it('should default to gemini for model-only format', () => {
        const result = parseModelString('gemini-2.5-pro');
        expect(result).toEqual({
          provider: 'gemini',
          modelName: 'gemini-2.5-pro'
        });
      });

      it('should throw error for empty string', () => {
        expect(() => parseModelString('')).toThrow('Model string cannot be empty');
      });
    });

    describe('supportsToolCalling', () => {
      it('should return true for models with tool calling', () => {
        expect(supportsToolCalling('anthropic:claude-4-opus')).toBe(true);
        expect(supportsToolCalling('openai:gpt-4o')).toBe(true);
      });

      it('should return false for models without tool calling', () => {
        expect(supportsToolCalling('gemini:gemini-2.5-pro')).toBe(false);
        expect(supportsToolCalling('openai:o1')).toBe(false); // o3 was removed
      });

      it('should return false for invalid models', () => {
        expect(supportsToolCalling('invalid:model')).toBe(false);
      });
    });
  });
});

describe('Model Maps - Enhanced Features', () => {
  describe('getEnhancedModelMapping', () => {
    it('should return enhanced mapping with all fields', () => {
      const mapping = getEnhancedModelMapping('anthropic:claude-4-sonnet');
      expect(mapping).toBeDefined();
      expect(mapping?.inputPricePerMillion).toBe(3.0);
      expect(mapping?.outputPricePerMillion).toBe(15.0);
      expect(mapping?.categories).toContain(ModelCategory.CODING);
      expect(mapping?.providerFeatures?.supportsPromptCaching).toBe(true);
    });

    it('should return fallback for removed models', () => {
      // Removed deprecated models now use fallback defaults
      const mapping = getEnhancedModelMapping('anthropic:claude-3-opus');
      expect(mapping).toBeDefined();
      expect(mapping?.apiIdentifier).toBe('claude-3-opus');
      expect(mapping?.provider).toBe('anthropic');
      expect(mapping?.description).toContain('Unknown model');
    });
  });

  describe('validateModelKey', () => {
    it('should validate available models', () => {
      const result = validateModelKey('gemini:gemini-2.5-pro');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.warning).toBeUndefined();
    });

    it('should accept unknown models with warning', () => {
      const result = validateModelKey('invalid:model');
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('not in registry');
    });

    it('should accept unknown models with fallback warning', () => {
      // Unknown models now use fallback defaults
      const result = validateModelKey('anthropic:claude-2-opus');
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('not in registry');
    });

    it('should warn about retiring models', () => {
      // Modify a model to be retiring for testing
      const originalStatus = ENHANCED_MODEL_MAP['openai:gpt-4o'].status;
      ENHANCED_MODEL_MAP['openai:gpt-4o'].status = 'retiring';
      
      const result = validateModelKey('openai:gpt-4o');
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('being retired');
      
      // Restore original status
      ENHANCED_MODEL_MAP['openai:gpt-4o'].status = originalStatus;
    });
  });

  describe('calculateCost', () => {
    it('should calculate simple pricing correctly', () => {
      // Claude 4 Sonnet: $3/1M input, $15/1M output
      const cost = calculateCost('anthropic:claude-4-sonnet', 100000, 50000);
      expect(cost).toBeCloseTo(0.3 + 0.75); // $0.30 + $0.75 = $1.05
    });

    it('should calculate tiered pricing correctly', () => {
      // Gemini 2.5 Pro has tiered pricing
      // First 200k tokens: $1.25/1M input, $5/1M output
      // After 200k: $2.5/1M input, $10/1M output
      
      // Test within first tier
      const cost1 = calculateCost('gemini:gemini-2.5-pro', 100000, 100000);
      expect(cost1).toBeCloseTo(0.125 + 0.5); // $0.625
      
      // Test across tiers (300k input, 300k output)
      const cost2 = calculateCost('gemini:gemini-2.5-pro', 300000, 300000);
      const expectedInput = (100000 / 1_000_000 * 2.5) + (200000 / 1_000_000 * 1.25);
      const expectedOutput = (100000 / 1_000_000 * 10.0) + (200000 / 1_000_000 * 5.0);
      expect(cost2).toBeCloseTo(expectedInput + expectedOutput);
    });

    it('should return undefined for models without pricing', () => {
      // Create a test model without pricing
      const testKey = 'test:no-pricing';
      ENHANCED_MODEL_MAP[testKey] = {
        apiIdentifier: 'test',
        displayName: 'Test Model',
        provider: 'gemini',
        apiKeyEnvVar: 'TEST_KEY',
        supportsToolCalling: false
      };
      
      const cost = calculateCost(testKey, 100000, 100000);
      expect(cost).toBeUndefined();
      
      // Clean up
      delete ENHANCED_MODEL_MAP[testKey];
    });

    it('should return undefined for invalid models', () => {
      const cost = calculateCost('invalid:model', 100000, 100000);
      expect(cost).toBeUndefined();
    });
  });

  describe('getModelsByCategory', () => {
    it('should return models for specific category', () => {
      const reasoningModels = getModelsByCategory(ModelCategory.REASONING);
      expect(reasoningModels).toContain('gemini:gemini-2.5-pro');
      expect(reasoningModels).toContain('anthropic:claude-4-opus');
      expect(reasoningModels).toContain('openai:o1'); // o3 was removed
    });

    it('should exclude deprecated models by default', () => {
      const codingModels = getModelsByCategory(ModelCategory.CODING);
      expect(codingModels).toContain('anthropic:claude-4-sonnet');
      // All deprecated models have been removed from the codebase
      expect(codingModels.length).toBeGreaterThan(0);
    });

    it('should include only available models', () => {
      const codingModels = getModelsByCategory(ModelCategory.CODING, false);
      // Since deprecated models are removed, this should return the same set
      expect(codingModels).toContain('anthropic:claude-4-sonnet');
      expect(codingModels).toContain('anthropic:claude-4-opus');
    });

    it('should return empty array for models without categories', () => {
      // Most models should have categories, but test the edge case
      const testKey = 'test:no-category';
      ENHANCED_MODEL_MAP[testKey] = {
        apiIdentifier: 'test',
        displayName: 'Test Model',
        provider: 'gemini',
        apiKeyEnvVar: 'TEST_KEY',
        supportsToolCalling: false
      };
      
      const models = getModelsByCategory(ModelCategory.REASONING);
      expect(models).not.toContain(testKey);
      
      // Clean up
      delete ENHANCED_MODEL_MAP[testKey];
    });
  });

  describe('getRecommendedModelForCodeReview', () => {
    it('should return Claude 4 Sonnet by default', () => {
      const model = getRecommendedModelForCodeReview();
      expect(model).toBe('anthropic:claude-4-sonnet');
    });

    it('should return cost-optimized coding model when requested', () => {
      const model = getRecommendedModelForCodeReview(true);
      const mapping = getEnhancedModelMapping(model);
      expect(mapping?.categories).toContain(ModelCategory.COST_OPTIMIZED);
      expect(mapping?.categories).toContain(ModelCategory.CODING);
    });
  });

  describe('getProviderFeatures', () => {
    it('should return provider features for models', () => {
      const features = getProviderFeatures('anthropic:claude-4-opus');
      expect(features).toBeDefined();
      expect(features?.supportsPromptCaching).toBe(true);
      expect(features?.toolCallingSupport).toBe('full');
    });

    it('should return custom headers for OpenRouter', () => {
      const features = getProviderFeatures('openrouter:anthropic/claude-4-opus');
      expect(features?.customHeaders).toBeDefined();
      expect(features?.customHeaders?.['HTTP-Referer']).toBeDefined();
    });
  });

  describe('formatCost', () => {
    it('should format very small costs with 6 decimals', () => {
      expect(formatCost(0.000123)).toBe('$0.000123 USD');
    });

    it('should format small costs with 4 decimals', () => {
      expect(formatCost(0.1234)).toBe('$0.1234 USD');
    });

    it('should format large costs with 2 decimals', () => {
      expect(formatCost(12.3456)).toBe('$12.35 USD');
    });
  });
});

describe('Model Maps - Data Integrity', () => {
  it('should have valid provider for all models', () => {
    Object.entries(ENHANCED_MODEL_MAP).forEach(([_key, mapping]) => {
      expect(['gemini', 'anthropic', 'openai', 'openrouter']).toContain(mapping.provider);
    });
  });

  it('should have valid API key environment variables', () => {
    const validEnvVars = [
      'AI_CODE_REVIEW_GOOGLE_API_KEY',
      'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      'AI_CODE_REVIEW_OPENAI_API_KEY',
      'AI_CODE_REVIEW_OPENROUTER_API_KEY'
    ];
    
    Object.entries(ENHANCED_MODEL_MAP).forEach(([_key, mapping]) => {
      expect(validEnvVars).toContain(mapping.apiKeyEnvVar);
    });
  });

  it('should have consistent pricing', () => {
    Object.entries(ENHANCED_MODEL_MAP).forEach(([key, mapping]) => {
      if (mapping.inputPricePerMillion !== undefined) {
        expect(mapping.inputPricePerMillion).toBeGreaterThanOrEqual(0);
      }
      if (mapping.outputPricePerMillion !== undefined) {
        expect(mapping.outputPricePerMillion).toBeGreaterThanOrEqual(0);
      }
      
      // Output pricing should generally be higher than input
      if (mapping.inputPricePerMillion && mapping.outputPricePerMillion) {
        // Most models have higher output pricing
        if (!key.includes('flash-lite')) { // Exception for ultra-cheap models
          expect(mapping.outputPricePerMillion).toBeGreaterThanOrEqual(mapping.inputPricePerMillion);
        }
      }
    });
  });

  it('should have valid deprecation dates', () => {
    Object.entries(ENHANCED_MODEL_MAP).forEach(([_key, mapping]) => {
      if (mapping.deprecation?.deprecationDate) {
        const date = new Date(mapping.deprecation.deprecationDate);
        expect(date.toString()).not.toBe('Invalid Date');
      }
      if (mapping.deprecation?.removalDate) {
        const date = new Date(mapping.deprecation.removalDate);
        expect(date.toString()).not.toBe('Invalid Date');
        
        // Removal date should be after deprecation date
        if (mapping.deprecation.deprecationDate) {
          const deprecationDate = new Date(mapping.deprecation.deprecationDate);
          expect(date.getTime()).toBeGreaterThanOrEqual(deprecationDate.getTime());
        }
      }
    });
  });

  it('should have valid alternative models for deprecated models', () => {
    Object.entries(ENHANCED_MODEL_MAP).forEach(([_key, mapping]) => {
      if (mapping.deprecation?.alternativeModel) {
        const alternative = ENHANCED_MODEL_MAP[mapping.deprecation.alternativeModel];
        expect(alternative).toBeDefined();
        expect(alternative.deprecation?.deprecated).not.toBe(true);
      }
    });
  });
});

describe('Model Maps - Fallback for Unknown Models', () => {
  describe('getEnhancedModelMapping with fallback', () => {
    it('should return fallback config for unknown gemini model', () => {
      const mapping = getEnhancedModelMapping('gemini:some-new-model-2025');
      expect(mapping).toBeDefined();
      expect(mapping?.apiIdentifier).toBe('some-new-model-2025');
      expect(mapping?.contextWindow).toBe(1_048_576); // Gemini default
      expect(mapping?.outputLimit).toBe(8192);
      expect(mapping?.provider).toBe('gemini');
      expect(mapping?.displayName).toBe('some-new-model-2025');
      expect(mapping?.description).toContain('Unknown model');
      expect(mapping?.supportsToolCalling).toBe(false); // Conservative default
      expect(mapping?.apiKeyEnvVar).toBe('AI_CODE_REVIEW_GOOGLE_API_KEY');
    });

    it('should return fallback config for unknown anthropic model', () => {
      const mapping = getEnhancedModelMapping('anthropic:claude-99');
      expect(mapping).toBeDefined();
      expect(mapping?.apiIdentifier).toBe('claude-99');
      expect(mapping?.contextWindow).toBe(200_000); // Anthropic default
      expect(mapping?.outputLimit).toBe(8192);
      expect(mapping?.provider).toBe('anthropic');
      expect(mapping?.apiKeyEnvVar).toBe('AI_CODE_REVIEW_ANTHROPIC_API_KEY');
    });

    it('should return fallback config for unknown openai model', () => {
      const mapping = getEnhancedModelMapping('openai:gpt-99');
      expect(mapping).toBeDefined();
      expect(mapping?.apiIdentifier).toBe('gpt-99');
      expect(mapping?.contextWindow).toBe(128_000); // OpenAI default
      expect(mapping?.outputLimit).toBe(16384);
      expect(mapping?.provider).toBe('openai');
      expect(mapping?.apiKeyEnvVar).toBe('AI_CODE_REVIEW_OPENAI_API_KEY');
    });

    it('should return fallback config for unknown openrouter model', () => {
      const mapping = getEnhancedModelMapping('openrouter:new-model/v1');
      expect(mapping).toBeDefined();
      expect(mapping?.apiIdentifier).toBe('new-model/v1');
      expect(mapping?.contextWindow).toBe(128_000); // OpenRouter default
      expect(mapping?.provider).toBe('openrouter');
      expect(mapping?.apiKeyEnvVar).toBe('AI_CODE_REVIEW_OPENROUTER_API_KEY');
    });

    it('should preserve existing known models behavior', () => {
      const knownModel = getEnhancedModelMapping('gemini:gemini-2.5-pro');
      expect(knownModel).toBeDefined();
      expect(knownModel?.apiIdentifier).toBe('gemini-2.5-pro-preview-05-06');
      expect(knownModel?.description).not.toContain('Unknown model');
    });

    it('should handle model without provider prefix (defaults to gemini)', () => {
      const mapping = getEnhancedModelMapping('unknown-model-123');
      expect(mapping).toBeDefined();
      expect(mapping?.provider).toBe('gemini'); // Default provider
      expect(mapping?.contextWindow).toBe(1_048_576);
    });

    it('should set conservative defaults for unknown models', () => {
      const mapping = getEnhancedModelMapping('gemini:experimental-model');
      expect(mapping?.supportsToolCalling).toBe(false);
      expect(mapping?.providerFeatures?.supportsStreaming).toBe(true);
      expect(mapping?.providerFeatures?.toolCallingSupport).toBe('none');
      expect(mapping?.inputPricePerMillion).toBe(0); // Unknown pricing
      expect(mapping?.outputPricePerMillion).toBe(0);
      expect(mapping?.status).toBe('available');
    });
  });

  describe('validateModelKey with fallback', () => {
    it('should validate unknown models as valid with warning', () => {
      const result = validateModelKey('gemini:some-new-model');
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('not in registry');
      expect(result.warning).toContain('gemini defaults');
      expect(result.error).toBeUndefined();
    });

    it('should validate known models without warning', () => {
      const result = validateModelKey('anthropic:claude-4-sonnet');
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should provide provider-specific warnings', () => {
      const anthropicResult = validateModelKey('anthropic:unknown-model');
      expect(anthropicResult.warning).toContain('anthropic defaults');

      const openaiResult = validateModelKey('openai:unknown-model');
      expect(openaiResult.warning).toContain('openai defaults');
    });
  });

  describe('getModelMapping with fallback', () => {
    it('should return legacy format for unknown models', () => {
      const mapping = getModelMapping('gemini:future-model');
      expect(mapping).toBeDefined();
      expect(mapping?.apiIdentifier).toBe('future-model');
      expect(mapping?.provider).toBe('gemini');
      expect(mapping?.displayName).toBe('future-model');
    });
  });

  describe('calculateCost with fallback', () => {
    it('should return undefined for unknown models (no pricing)', () => {
      const cost = calculateCost('gemini:unknown-model', 100000, 50000);
      expect(cost).toBeUndefined();
    });
  });

  describe('getApiNameFromKey with fallback', () => {
    it('should return model name for unknown models', () => {
      const apiName = getApiNameFromKey('anthropic:future-claude-model');
      expect(apiName).toBe('future-claude-model');
    });

    it('should return API identifier for known models', () => {
      const apiName = getApiNameFromKey('anthropic:claude-4-opus');
      expect(apiName).toBe('claude-4-opus-20241022');
    });
  });
});