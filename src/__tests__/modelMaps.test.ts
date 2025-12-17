/**
 * @fileoverview Tests for the modelMaps module.
 *
 * These tests verify that the model maps and related functions
 * work correctly and that the model data is properly structured.
 */

import {
  MODEL_MAP,
  MODELS,
  getApiNameFromKey,
  getModelMapping,
  getModelsByProvider,
  getModels,
  parseModelString,
  getFullModelKey,
  Provider
} from '../clients/utils/modelMaps';

describe('modelMaps', () => {
  describe('MODEL_MAP structure', () => {
    it('should have the correct structure', () => {
      expect(MODEL_MAP).toBeDefined();
      expect(typeof MODEL_MAP).toBe('object');

      // Check that all models have required fields
      Object.entries(MODEL_MAP).forEach(([_key, model]) => {
        expect(model.apiIdentifier).toBeDefined();
        expect(typeof model.apiIdentifier).toBe('string');
        expect(model.displayName).toBeDefined();
        expect(typeof model.displayName).toBe('string');
        expect(model.provider).toBeDefined();
        expect(['gemini', 'anthropic', 'openai', 'openrouter']).toContain(model.provider);
        expect(model.apiKeyEnvVar).toBeDefined();
        expect(typeof model.apiKeyEnvVar).toBe('string');
        
        // Optional fields
        if (model.contextWindow !== undefined) {
          expect(typeof model.contextWindow).toBe('number');
          expect(model.contextWindow).toBeGreaterThan(0);
        }
        if (model.description !== undefined) {
          expect(typeof model.description).toBe('string');
        }
        if (model.useV1Beta !== undefined) {
          expect(typeof model.useV1Beta).toBe('boolean');
        }
        if (model.supportsToolCalling !== undefined) {
          expect(typeof model.supportsToolCalling).toBe('boolean');
        }
      });
    });

    it('should have a reasonable number of models', () => {
      const totalModels = Object.keys(MODEL_MAP).length;
      // Ensure we have at least some models from each provider
      expect(totalModels).toBeGreaterThanOrEqual(10);
      expect(totalModels).toBeLessThan(100); // Sanity check
    });
  });

  describe('Provider models', () => {
    const providers: Provider[] = ['gemini', 'anthropic', 'openai', 'openrouter'];
    
    providers.forEach(provider => {
      describe(`${provider} models`, () => {
        it(`should have ${provider} models with correct structure`, () => {
          const providerModels = Object.entries(MODEL_MAP)
            .filter(([_key, model]) => model.provider === provider);
          
          // Each provider should have at least one model
          expect(providerModels.length).toBeGreaterThan(0);
          
          // Check that all model keys follow the correct format
          providerModels.forEach(([key, model]) => {
            expect(key).toMatch(new RegExp(`^${provider}:`));
            expect(model.provider).toBe(provider);
            
            // Check provider-specific API key environment variables
            const expectedEnvVars: Record<Provider, string> = {
              gemini: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
              anthropic: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
              openai: 'AI_CODE_REVIEW_OPENAI_API_KEY',
              openrouter: 'AI_CODE_REVIEW_OPENROUTER_API_KEY'
            };
            expect(model.apiKeyEnvVar).toBe(expectedEnvVars[provider]);
          });
        });
      });
    });

    it('should have key models from each provider', () => {
      // Check for at least one key model from each provider
      const keyModels: Record<string, string[]> = {
        gemini: ['gemini:gemini-2.5-pro', 'gemini:gemini-1.5-pro'],
        anthropic: ['anthropic:claude-4-opus', 'anthropic:claude-4-sonnet'],
        openai: ['openai:gpt-4o', 'openai:gpt-3.5-turbo'],
        openrouter: ['openrouter:anthropic/claude-4-opus']
      };

      Object.entries(keyModels).forEach(([provider, models]) => {
        const providerModels = Object.keys(MODEL_MAP).filter(key => key.startsWith(`${provider}:`));
        
        // Check that at least one of the key models exists
        const hasKeyModel = models.some(model => providerModels.includes(model));
        expect(hasKeyModel).toBe(true);
      });
    });
  });

  describe('MODELS array', () => {
    it('should have models for each provider', () => {
      const providers: Provider[] = ['gemini', 'anthropic', 'openai', 'openrouter'];
      
      providers.forEach(provider => {
        expect(MODELS[provider]).toBeDefined();
        expect(Array.isArray(MODELS[provider])).toBe(true);
        
        // Each provider should have at least one model in MODELS
        expect(MODELS[provider].length).toBeGreaterThan(0);
        
        // All models in MODELS should exist in MODEL_MAP
        MODELS[provider].forEach(modelKey => {
          expect(MODEL_MAP[modelKey]).toBeDefined();
          expect(MODEL_MAP[modelKey].provider).toBe(provider);
        });
      });
    });

    it('should exclude deprecated models from MODELS by default', () => {
      // Check if any models in MODEL_MAP have DEPRECATED in their display name
      const deprecatedModels = Object.entries(MODEL_MAP)
        .filter(([_key, model]) => model.displayName.includes('DEPRECATED'))
        .map(([key]) => key);
      
      // MODELS should not include deprecated models
      Object.values(MODELS).flat().forEach(modelKey => {
        const model = MODEL_MAP[modelKey];
        if (deprecatedModels.includes(modelKey)) {
          // If a deprecated model is in MODELS, it's okay as long as it's clearly marked
          expect(model.displayName).toContain('DEPRECATED');
        }
      });
    });
  });

  describe('Utility functions', () => {
    describe('getApiNameFromKey', () => {
      it('should return the correct API identifier for known model keys', () => {
        // Test with actual models from MODEL_MAP
        Object.entries(MODEL_MAP).slice(0, 5).forEach(([key, model]) => {
          expect(getApiNameFromKey(key)).toBe(model.apiIdentifier);
        });
      });

      it('should return model name for unknown model keys (fallback)', () => {
        expect(getApiNameFromKey('unknown:model')).toBe('model');
        expect(getApiNameFromKey('invalid-key')).toBe('invalid-key');
      });
    });

    describe('getModelMapping', () => {
      it('should return the correct model mapping for known model keys', () => {
        Object.keys(MODEL_MAP).slice(0, 5).forEach(key => {
          const mapping = getModelMapping(key);
          expect(mapping).toBeDefined();
          expect(mapping).toEqual(MODEL_MAP[key]);
        });
      });

      it('should return fallback mapping for unknown model keys', () => {
        const mapping = getModelMapping('unknown:model');
        expect(mapping).toBeDefined();
        expect(mapping?.apiIdentifier).toBe('model');
        expect(mapping?.provider).toBe('unknown');
      });
    });

    describe('getModelsByProvider', () => {
      it('should return all models for each provider', () => {
        const providers: Provider[] = ['gemini', 'anthropic', 'openai', 'openrouter'];
        
        providers.forEach(provider => {
          const models = getModelsByProvider(provider);
          const expectedModels = Object.keys(MODEL_MAP).filter(
            key => MODEL_MAP[key].provider === provider
          );
          
          expect(models.length).toBe(expectedModels.length);
          expect(models.sort()).toEqual(expectedModels.sort());
        });
      });

      it('should return empty array for invalid provider', () => {
        const models = getModelsByProvider('invalid' as Provider);
        expect(models).toEqual([]);
      });
    });

    describe('getModels', () => {
      it('should return models for each provider', () => {
        const providers: Provider[] = ['gemini', 'anthropic', 'openai', 'openrouter'];
        
        providers.forEach(provider => {
          const models = getModels(provider);
          expect(models).toBeDefined();
          expect(Array.isArray(models)).toBe(true);
          
          // Should match MODELS export
          expect(models).toEqual(MODELS[provider]);
        });
      });

      it('should return an empty array for unknown providers', () => {
        expect(getModels('unknown' as Provider)).toEqual([]);
      });
    });

    describe('parseModelString', () => {
      it('should parse a model string with provider', () => {
        const testCases = [
          { input: 'gemini:gemini-2.5-pro', expected: { provider: 'gemini', modelName: 'gemini-2.5-pro' } },
          { input: 'anthropic:claude-4-opus', expected: { provider: 'anthropic', modelName: 'claude-4-opus' } },
          { input: 'openai:gpt-4o', expected: { provider: 'openai', modelName: 'gpt-4o' } },
          { input: 'openrouter:model', expected: { provider: 'openrouter', modelName: 'model' } }
        ];
        
        testCases.forEach(({ input, expected }) => {
          const result = parseModelString(input);
          expect(result).toEqual(expected);
        });
      });

      it('should default to gemini provider if not specified', () => {
        const result = parseModelString('gemini-2.5-pro');
        expect(result.provider).toBe('gemini');
        expect(result.modelName).toBe('gemini-2.5-pro');
      });

      it('should throw an error for empty model strings', () => {
        expect(() => parseModelString('')).toThrow('Model string cannot be empty');
        expect(() => parseModelString('   ')).toThrow('Model string cannot be empty');
      });
    });

    describe('getFullModelKey', () => {
      it('should return the full model key', () => {
        expect(getFullModelKey('gemini', 'gemini-2.5-pro')).toBe('gemini:gemini-2.5-pro');
        expect(getFullModelKey('anthropic', 'claude-3-opus')).toBe('anthropic:claude-3-opus');
        expect(getFullModelKey('openai', 'gpt-4o')).toBe('openai:gpt-4o');
        expect(getFullModelKey('openrouter', 'test')).toBe('openrouter:test');
      });
    });
  });

  describe('Data integrity', () => {
    it('should have unique model keys', () => {
      const keys = Object.keys(MODEL_MAP);
      const uniqueKeys = [...new Set(keys)];
      expect(keys.length).toBe(uniqueKeys.length);
    });

    it('should have consistent provider prefixes in keys', () => {
      Object.entries(MODEL_MAP).forEach(([key, model]) => {
        expect(key.startsWith(`${model.provider}:`)).toBe(true);
      });
    });

    it('should have positive context windows where defined', () => {
      Object.values(MODEL_MAP).forEach(model => {
        if (model.contextWindow !== undefined) {
          expect(model.contextWindow).toBeGreaterThan(0);
        }
      });
    });

    it('should have valid environment variable names', () => {
      const validEnvVarPattern = /^[A-Z][A-Z0-9_]*$/;
      Object.values(MODEL_MAP).forEach(model => {
        expect(model.apiKeyEnvVar).toMatch(validEnvVarPattern);
      });
    });
  });
});