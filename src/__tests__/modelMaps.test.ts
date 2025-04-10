/**
 * @fileoverview Tests for the modelMaps module.
 *
 * These tests verify that the model maps and related functions
 * work correctly and that the model data is not altered.
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

      // Check a sample model to ensure the structure is correct
      const sampleModel = MODEL_MAP['gemini:gemini-2.5-pro'];
      expect(sampleModel).toBeDefined();
      expect(sampleModel.apiName).toBe('gemini-2.5-pro-preview-03-25');
      expect(sampleModel.displayName).toBe('Gemini 2.5 Pro');
      expect(sampleModel.provider).toBe('gemini');
      expect(sampleModel.contextWindow).toBe(1000000);
      expect(sampleModel.apiKeyEnvVar).toBe('AI_CODE_REVIEW_GOOGLE_API_KEY');
    });

    it('should have the correct number of models', () => {
      // Count the total number of models
      const totalModels = Object.keys(MODEL_MAP).length;
      const expectedModelCount = 14; // Update this number if models are intentionally added or removed

      // This will throw an error if the count doesn't match
      if (totalModels !== expectedModelCount) {
        throw new Error(
          `MODEL_MAP contains ${totalModels} models, but expected ${expectedModelCount}. ` +
          'This error is intentional to prevent accidental removal of models. ' +
          'If you intentionally added or removed models, please update the expectedModelCount in this test.'
        );
      }

      // This should be updated if models are added or removed
      expect(totalModels).toBe(expectedModelCount);
    });
  });

  describe('Gemini models', () => {
    it('should have the correct Gemini models', () => {
      const geminiModels = Object.keys(MODEL_MAP).filter(key =>
        MODEL_MAP[key].provider === 'gemini'
      );

      // Verify we have the expected number of Gemini models
      expect(geminiModels.length).toBe(3);

      // Verify specific model keys exist
      expect(geminiModels).toContain('gemini:gemini-2.5-pro');
      expect(geminiModels).toContain('gemini:gemini-2.0-flash');
      expect(geminiModels).toContain('gemini:gemini-2.0-flash-lite');

      // Verify properties of a specific model
      const gemini25Pro = MODEL_MAP['gemini:gemini-2.5-pro'];
      expect(gemini25Pro.apiName).toBe('gemini-2.5-pro-preview-03-25');
      expect(gemini25Pro.displayName).toBe('Gemini 2.5 Pro');
      expect(gemini25Pro.useV1Beta).toBe(true);
      expect(gemini25Pro.contextWindow).toBe(1000000);
    });
  });

  describe('Anthropic models', () => {
    it('should have the correct Anthropic models', () => {
      const anthropicModels = Object.keys(MODEL_MAP).filter(key =>
        MODEL_MAP[key].provider === 'anthropic'
      );

      // Verify we have the expected number of Anthropic models
      expect(anthropicModels.length).toBe(3);

      // Verify specific model keys exist
      expect(anthropicModels).toContain('anthropic:claude-3-opus');
      expect(anthropicModels).toContain('anthropic:claude-3-sonnet');
      expect(anthropicModels).toContain('anthropic:claude-3-haiku');

      // Verify properties of a specific model
      const claude3Opus = MODEL_MAP['anthropic:claude-3-opus'];
      expect(claude3Opus.apiName).toBe('claude-3-opus-20240229');
      expect(claude3Opus.displayName).toBe('Claude 3 Opus');
      expect(claude3Opus.contextWindow).toBe(200000);
      expect(claude3Opus.apiKeyEnvVar).toBe('AI_CODE_REVIEW_ANTHROPIC_API_KEY');
    });
  });

  describe('OpenAI models', () => {
    it('should have the correct OpenAI models', () => {
      const openaiModels = Object.keys(MODEL_MAP).filter(key =>
        MODEL_MAP[key].provider === 'openai'
      );

      // Verify we have the expected number of OpenAI models
      expect(openaiModels.length).toBe(3);

      // Verify specific model keys exist
      expect(openaiModels).toContain('openai:gpt-4o');
      expect(openaiModels).toContain('openai:gpt-4-turbo');
      expect(openaiModels).toContain('openai:gpt-3.5-turbo');

      // Verify properties of a specific model
      const gpt4o = MODEL_MAP['openai:gpt-4o'];
      expect(gpt4o.apiName).toBe('gpt-4o');
      expect(gpt4o.displayName).toBe('GPT-4o');
      expect(gpt4o.contextWindow).toBe(128000);
      expect(gpt4o.apiKeyEnvVar).toBe('AI_CODE_REVIEW_OPENAI_API_KEY');
    });
  });

  describe('OpenRouter models', () => {
    it('should have the correct OpenRouter models', () => {
      const openrouterModels = Object.keys(MODEL_MAP).filter(key =>
        MODEL_MAP[key].provider === 'openrouter'
      );

      // Verify we have the expected number of OpenRouter models
      expect(openrouterModels.length).toBe(5);

      // Verify specific model keys exist
      expect(openrouterModels).toContain('openrouter:anthropic/claude-3-opus');
      expect(openrouterModels).toContain('openrouter:anthropic/claude-3-sonnet');
      expect(openrouterModels).toContain('openrouter:anthropic/claude-3-haiku');
      expect(openrouterModels).toContain('openrouter:openai/gpt-4o');
      expect(openrouterModels).toContain('openrouter:openai/gpt-4-turbo');

      // Verify properties of a specific model
      const openrouterClaude = MODEL_MAP['openrouter:anthropic/claude-3-opus'];
      expect(openrouterClaude.apiName).toBe('anthropic/claude-3-opus-20240229');
      expect(openrouterClaude.displayName).toBe('Claude 3 Opus (via OpenRouter)');
      expect(openrouterClaude.contextWindow).toBe(200000);
      expect(openrouterClaude.apiKeyEnvVar).toBe('AI_CODE_REVIEW_OPENROUTER_API_KEY');
    });
  });

  describe('MODELS array', () => {
    it('should have the correct models for each provider', () => {
      // Check Gemini models
      expect(MODELS.gemini.length).toBe(3);
      expect(MODELS.gemini).toContain('gemini:gemini-2.5-pro');
      expect(MODELS.gemini).toContain('gemini:gemini-2.0-flash');

      // Check Anthropic models
      expect(MODELS.anthropic.length).toBe(3);
      expect(MODELS.anthropic).toContain('anthropic:claude-3-opus');

      // Check OpenAI models
      expect(MODELS.openai.length).toBe(3);
      expect(MODELS.openai).toContain('openai:gpt-4o');

      // Check OpenRouter models
      expect(MODELS.openrouter.length).toBe(6);
      expect(MODELS.openrouter).toContain('openrouter:anthropic/claude-3-opus');
    });
  });

  describe('Utility functions', () => {
    describe('getApiNameFromKey', () => {
      it('should return the correct API name for a model key', () => {
        expect(getApiNameFromKey('gemini:gemini-2.5-pro')).toBe('gemini-2.5-pro-preview-03-25');
        expect(getApiNameFromKey('anthropic:claude-3-opus')).toBe('claude-3-opus-20240229');
        expect(getApiNameFromKey('openai:gpt-4o')).toBe('gpt-4o');
      });

      it('should handle unknown model keys gracefully', () => {
        expect(getApiNameFromKey('unknown:model')).toBe('model');
        expect(getApiNameFromKey('invalid-key')).toBe('invalid-key');
      });
    });

    describe('getModelMapping', () => {
      it('should return the correct model mapping for a model key', () => {
        const mapping = getModelMapping('gemini:gemini-2.5-pro');
        expect(mapping).toBeDefined();
        expect(mapping?.apiName).toBe('gemini-2.5-pro-preview-03-25');
        expect(mapping?.provider).toBe('gemini');
      });

      it('should return undefined for unknown model keys', () => {
        expect(getModelMapping('unknown:model')).toBeUndefined();
      });
    });

    describe('getModelsByProvider', () => {
      it('should return all models for a provider', () => {
        const geminiModels = getModelsByProvider('gemini');
        expect(geminiModels.length).toBe(8);
        expect(geminiModels).toContain('gemini:gemini-2.5-pro');

        const anthropicModels = getModelsByProvider('anthropic');
        expect(anthropicModels.length).toBe(3);
        expect(anthropicModels).toContain('anthropic:claude-3-opus');
      });
    });

    describe('getModels', () => {
      it('should return the default models for a provider', () => {
        const geminiModels = getModels('gemini');
        expect(geminiModels.length).toBe(8);
        expect(geminiModels).toContain('gemini:gemini-2.5-pro');

        const anthropicModels = getModels('anthropic');
        expect(anthropicModels.length).toBe(3);
        expect(anthropicModels).toContain('anthropic:claude-3-opus');
      });

      it('should return an empty array for unknown providers', () => {
        expect(getModels('unknown' as Provider)).toEqual([]);
      });
    });

    describe('parseModelString', () => {
      it('should parse a model string with provider', () => {
        const result = parseModelString('gemini:gemini-2.5-pro');
        expect(result.provider).toBe('gemini');
        expect(result.modelName).toBe('gemini-2.5-pro');
      });

      it('should default to gemini provider if not specified', () => {
        const result = parseModelString('gemini-2.5-pro');
        expect(result.provider).toBe('gemini');
        expect(result.modelName).toBe('gemini-2.5-pro');
      });

      it('should throw an error for empty model strings', () => {
        expect(() => parseModelString('')).toThrow();
      });
    });

    describe('getFullModelKey', () => {
      it('should return the full model key', () => {
        expect(getFullModelKey('gemini', 'gemini-2.5-pro')).toBe('gemini:gemini-2.5-pro');
        expect(getFullModelKey('anthropic', 'claude-3-opus')).toBe('anthropic:claude-3-opus');
      });
    });
  });
});
