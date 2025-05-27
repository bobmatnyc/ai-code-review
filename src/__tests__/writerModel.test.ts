/**
 * @fileoverview Tests for the writer model functionality.
 * 
 * This test file verifies that the --writer-model option and AI_CODE_REVIEW_WRITER_MODEL
 * environment variable work correctly for specifying a separate model for consolidation.
 */

import { getConfig, resetConfig } from '../utils/config';
import { CliOptions } from '../cli/argumentParser';

describe('Writer Model Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.AI_CODE_REVIEW_WRITER_MODEL;
    // Reset config singleton
    resetConfig();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
  });

  describe('Environment Variable', () => {
    it('should load writer model from AI_CODE_REVIEW_WRITER_MODEL env var', () => {
      process.env.AI_CODE_REVIEW_WRITER_MODEL = 'openai:gpt-4o-mini';
      
      const config = getConfig();
      
      expect(config.writerModel).toBe('openai:gpt-4o-mini');
    });

    it('should return undefined when AI_CODE_REVIEW_WRITER_MODEL is not set', () => {
      const config = getConfig();
      
      expect(config.writerModel).toBeUndefined();
    });
  });

  describe('CLI Options', () => {
    it('should override environment variable with CLI option', () => {
      process.env.AI_CODE_REVIEW_WRITER_MODEL = 'openai:gpt-4o-mini';
      
      const cliOptions: CliOptions = {
        target: '.',
        type: 'quick-fixes',
        output: 'markdown',
        writerModel: 'anthropic:claude-3-haiku'
      };
      
      const config = getConfig(cliOptions);
      
      expect(config.writerModel).toBe('anthropic:claude-3-haiku');
    });

    it('should use CLI option when env var is not set', () => {
      const cliOptions: CliOptions = {
        target: '.',
        type: 'quick-fixes',
        output: 'markdown',
        writerModel: 'gemini:gemini-1.5-flash'
      };
      
      const config = getConfig(cliOptions);
      
      expect(config.writerModel).toBe('gemini:gemini-1.5-flash');
    });
  });

  describe('Consolidation Model Selection', () => {
    it('should use writer model for consolidation when specified', () => {
      const config = getConfig({
        target: '.',
        type: 'quick-fixes',
        output: 'markdown',
        model: 'anthropic:claude-3-opus',
        writerModel: 'anthropic:claude-3-haiku'
      });
      
      // In the actual consolidateReview function, this logic is used:
      const consolidationModel = config.writerModel || config.selectedModel;
      
      expect(consolidationModel).toBe('anthropic:claude-3-haiku');
    });

    it('should fall back to main model when writer model is not specified', () => {
      const config = getConfig({
        target: '.',
        type: 'quick-fixes',
        output: 'markdown',
        model: 'anthropic:claude-3-opus'
      });
      
      // In the actual consolidateReview function, this logic is used:
      const consolidationModel = config.writerModel || config.selectedModel;
      
      expect(consolidationModel).toBe('anthropic:claude-3-opus');
    });
  });
});