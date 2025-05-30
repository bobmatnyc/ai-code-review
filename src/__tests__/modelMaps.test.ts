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
      expect(sampleModel.apiIdentifier).toBe('gemini-2.5-pro-preview-05-06');
      expect(sampleModel.displayName).toBe('Gemini 2.5 Pro (DEPRECATED - Use gemini-2.5-pro-preview)');
      expect(sampleModel.provider).toBe('gemini');
      expect(sampleModel.contextWindow).toBe(1000000);
      expect(sampleModel.apiKeyEnvVar).toBe('AI_CODE_REVIEW_GOOGLE_API_KEY');
    });

    it('should have the correct number of models', () => {
      // Note: This test is fragile and requires updating the count each time models are added or removed
      // Consider a better approach for this test, such as tracking only the minimum number of models expected

      // Count the total number of models
      const totalModels = Object.keys(MODEL_MAP).length;
      // For this test, let's check that we have at least this many models
      // instead of exactly matching which makes the test more fragile
      const minimumExpectedModels = 15; // Minimum number of models expected

      // Check that we have at least the minimum number of expected models
      expect(totalModels).toBeGreaterThanOrEqual(minimumExpectedModels);
    });
  });

  describe('Gemini models', () => {
    it('should have the correct Gemini models', () => {
      const geminiModels = Object.keys(MODEL_MAP).filter(
        key => MODEL_MAP[key].provider === 'gemini'
      );

      // Verify we have the expected number of Gemini models
      expect(geminiModels.length).toBe(4);

      // Verify specific model keys exist
      expect(geminiModels).toContain('gemini:gemini-2.5-pro');
      expect(geminiModels).toContain('gemini:gemini-2.5-pro-preview');
      expect(geminiModels).toContain('gemini:gemini-2.0-flash');
      expect(geminiModels).toContain('gemini:gemini-2.0-flash-lite');

      // Verify properties of a specific model
      const gemini25Pro = MODEL_MAP['gemini:gemini-2.5-pro'];
      expect(gemini25Pro.apiIdentifier).toBe('gemini-2.5-pro-preview-05-06');
      expect(gemini25Pro.displayName).toBe('Gemini 2.5 Pro (DEPRECATED - Use gemini-2.5-pro-preview)');
      expect(gemini25Pro.useV1Beta).toBe(true);
      expect(gemini25Pro.contextWindow).toBe(1000000);
    });
  });

  describe('Anthropic models', () => {
    it('should have the correct Anthropic models', () => {
      const anthropicModels = Object.keys(MODEL_MAP).filter(
        key => MODEL_MAP[key].provider === 'anthropic'
      );

      // Verify we have the expected number of Anthropic models
      expect(anthropicModels.length).toBe(7);

      // Verify specific model keys exist
      expect(anthropicModels).toContain('anthropic:claude-3-opus');
      expect(anthropicModels).toContain('anthropic:claude-3.7-sonnet');
      expect(anthropicModels).toContain('anthropic:claude-3.5-sonnet');
      expect(anthropicModels).toContain('anthropic:claude-3-haiku');
      expect(anthropicModels).toContain('anthropic:claude-3.5-haiku');
      expect(anthropicModels).toContain('anthropic:claude-4-sonnet');
      expect(anthropicModels).toContain('anthropic:claude-4-opus');

      // Verify properties of specific models
      const claude3Opus = MODEL_MAP['anthropic:claude-3-opus'];
      expect(claude3Opus.apiIdentifier).toBe('claude-3-opus-20240229');
      expect(claude3Opus.displayName).toBe('Claude 3 Opus');
      expect(claude3Opus.contextWindow).toBe(200000);
      expect(claude3Opus.apiKeyEnvVar).toBe('AI_CODE_REVIEW_ANTHROPIC_API_KEY');

      const claude4Sonnet = MODEL_MAP['anthropic:claude-4-sonnet'];
      expect(claude4Sonnet.apiIdentifier).toBe('claude-sonnet-4-20250514');
      expect(claude4Sonnet.displayName).toBe('Claude 4 Sonnet');
      expect(claude4Sonnet.contextWindow).toBe(200000);

      const claude4Opus = MODEL_MAP['anthropic:claude-4-opus'];
      expect(claude4Opus.apiIdentifier).toBe('claude-opus-4-20250514');
      expect(claude4Opus.displayName).toBe('Claude 4 Opus');
      expect(claude4Opus.contextWindow).toBe(200000);
    });
  });

  describe('OpenAI models', () => {
    it('should have the correct OpenAI models', () => {
      const openaiModels = Object.keys(MODEL_MAP).filter(
        key => MODEL_MAP[key].provider === 'openai'
      );

      // Verify we have the expected number of OpenAI models
      expect(openaiModels.length).toBe(7);

      // Verify specific model keys exist
      expect(openaiModels).toContain('openai:gpt-4.1');
      expect(openaiModels).toContain('openai:gpt-4o');
      expect(openaiModels).toContain('openai:gpt-4-turbo');
      expect(openaiModels).toContain('openai:gpt-3.5-turbo');
      expect(openaiModels).toContain('openai:gpt-4.5');
      expect(openaiModels).toContain('openai:o3');
      expect(openaiModels).toContain('openai:o3-mini');

      // Verify properties of a specific model
      const gpt4o = MODEL_MAP['openai:gpt-4o'];
      expect(gpt4o.apiIdentifier).toBe('gpt-4o');
      expect(gpt4o.displayName).toBe('GPT-4o');
      expect(gpt4o.contextWindow).toBe(128000);
      expect(gpt4o.apiKeyEnvVar).toBe('AI_CODE_REVIEW_OPENAI_API_KEY');

      // Verify o3 model properties
      const o3 = MODEL_MAP['openai:o3'];
      expect(o3.apiIdentifier).toBe('o3');
      expect(o3.displayName).toBe('OpenAI o3');
      expect(o3.contextWindow).toBe(200000);
      expect(o3.apiKeyEnvVar).toBe('AI_CODE_REVIEW_OPENAI_API_KEY');
      expect(o3.supportsToolCalling).toBe(true);

      // Verify o3-mini model properties
      const o3Mini = MODEL_MAP['openai:o3-mini'];
      expect(o3Mini.apiIdentifier).toBe('o3-mini');
      expect(o3Mini.displayName).toBe('OpenAI o3-mini');
      expect(o3Mini.contextWindow).toBe(200000);
      expect(o3Mini.apiKeyEnvVar).toBe('AI_CODE_REVIEW_OPENAI_API_KEY');
      expect(o3Mini.supportsToolCalling).toBe(true);
    });
  });

  describe('OpenRouter models', () => {
    it('should have the correct OpenRouter models', () => {
      const openrouterModels = Object.keys(MODEL_MAP).filter(
        key => MODEL_MAP[key].provider === 'openrouter'
      );

      // Verify we have the expected number of OpenRouter models
      expect(openrouterModels.length).toBe(5);

      // Verify specific model keys exist
      expect(openrouterModels).toContain('openrouter:anthropic/claude-3-opus');
      expect(openrouterModels).toContain(
        'openrouter:anthropic/claude-3-sonnet'
      );
      expect(openrouterModels).toContain('openrouter:anthropic/claude-3-haiku');
      expect(openrouterModels).toContain('openrouter:openai/gpt-4o');
      expect(openrouterModels).toContain('openrouter:openai/gpt-4-turbo');

      // Verify properties of a specific model
      const openrouterClaude = MODEL_MAP['openrouter:anthropic/claude-3-opus'];
      expect(openrouterClaude.apiIdentifier).toBe('anthropic/claude-3-opus-20240229');
      expect(openrouterClaude.displayName).toBe(
        'Claude 3 Opus (via OpenRouter)'
      );
      expect(openrouterClaude.contextWindow).toBe(200000);
      expect(openrouterClaude.apiKeyEnvVar).toBe(
        'AI_CODE_REVIEW_OPENROUTER_API_KEY'
      );
    });
  });

  describe('MODELS array', () => {
    it('should have the correct models for each provider', () => {
      // Check Gemini models
      expect(MODELS.gemini.length).toBe(4);
      expect(MODELS.gemini).toContain('gemini:gemini-2.5-pro');
      expect(MODELS.gemini).toContain('gemini:gemini-2.5-pro-preview');
      expect(MODELS.gemini).toContain('gemini:gemini-2.0-flash');
      expect(MODELS.gemini).toContain('gemini:gemini-2.0-flash-lite');

      // Check Anthropic models
      expect(MODELS.anthropic.length).toBe(7);
      expect(MODELS.anthropic).toContain('anthropic:claude-3-opus');
      expect(MODELS.anthropic).toContain('anthropic:claude-3.7-sonnet');

      // Check OpenAI models
      expect(MODELS.openai.length).toBe(7);
      expect(MODELS.openai).toContain('openai:gpt-4o');
      expect(MODELS.openai).toContain('openai:o3');
      expect(MODELS.openai).toContain('openai:o3-mini');

      // Check OpenRouter models
      expect(MODELS.openrouter.length).toBe(5);
      expect(MODELS.openrouter).toContain('openrouter:anthropic/claude-3-opus');
    });
  });

  describe('Utility functions', () => {
    describe('getApiNameFromKey', () => {
      it('should return the correct API identifier for a model key', () => {
        expect(getApiNameFromKey('gemini:gemini-2.5-pro')).toBe(
          'gemini-2.5-pro-preview-05-06'
        );
        expect(getApiNameFromKey('anthropic:claude-3-opus')).toBe(
          'claude-3-opus-20240229'
        );
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
        expect(mapping?.apiIdentifier).toBe('gemini-2.5-pro-preview-05-06');
        expect(mapping?.provider).toBe('gemini');
      });

      it('should return undefined for unknown model keys', () => {
        expect(getModelMapping('unknown:model')).toBeUndefined();
      });
    });

    describe('getModelsByProvider', () => {
      it('should return all models for a provider', () => {
        const geminiModels = getModelsByProvider('gemini');
        expect(geminiModels.length).toBe(4);
        expect(geminiModels).toContain('gemini:gemini-2.5-pro');

        const anthropicModels = getModelsByProvider('anthropic');
        expect(anthropicModels.length).toBe(7);
        expect(anthropicModels).toContain('anthropic:claude-3-opus');
        expect(anthropicModels).toContain('anthropic:claude-3.7-sonnet');
      });
    });

    describe('getModels', () => {
      it('should return the default models for a provider', () => {
        const geminiModels = getModels('gemini');
        expect(geminiModels.length).toBe(4);
        expect(geminiModels).toContain('gemini:gemini-2.5-pro');

        const anthropicModels = getModels('anthropic');
        expect(anthropicModels.length).toBe(7);
        expect(anthropicModels).toContain('anthropic:claude-3-opus');
        expect(anthropicModels).toContain('anthropic:claude-3.7-sonnet');
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
        expect(getFullModelKey('gemini', 'gemini-2.5-pro')).toBe(
          'gemini:gemini-2.5-pro'
        );
        expect(getFullModelKey('anthropic', 'claude-3-opus')).toBe(
          'anthropic:claude-3-opus'
        );
      });
    });
  });
});
