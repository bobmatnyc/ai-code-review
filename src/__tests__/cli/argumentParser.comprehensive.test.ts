/**
 * @fileoverview Comprehensive tests for all CLI argument parsing functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseArguments, mapArgsToReviewOptions, validateArguments } from '../../cli/argumentParser';

// Mock config functions to return default values
vi.mock('../../utils/config', () => ({
  getConfig: vi.fn(() => ({
    selectedModel: 'gemini:gemini-2.5-pro'
  })),
  loadConfigSafe: vi.fn(() => ({
    success: true,
    config: {
      selectedModel: 'gemini:gemini-2.5-pro'
    }
  })),
  displayConfigError: vi.fn()
}));

// Mock logger to prevent console output during tests
vi.mock('../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLogLevel: vi.fn()
  }
}));

describe('Comprehensive CLI Argument Parser Tests', () => {
  let originalArgv: string[];
  let originalExit: typeof process.exit;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;
    // Mock process.exit to prevent tests from actually exiting
    process.exit = vi.fn() as unknown as typeof process.exit;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
  });

  describe('Basic Command Options', () => {
    it('should parse target path', () => {
      process.argv = ['node', 'test', './src'];
      const argv = parseArguments();
      expect(argv.target).toBe('./src');
    });

    it('should default target to current directory', () => {
      process.argv = ['node', 'test'];
      const argv = parseArguments();
      expect(argv.target).toBe('.');
    });

    it('should parse review type', () => {
      process.argv = ['node', 'test', '--type', 'security'];
      const argv = parseArguments();
      expect(argv.type).toBe('security');
    });

    it('should default review type to quick-fixes', () => {
      process.argv = ['node', 'test'];
      const argv = parseArguments();
      const options = mapArgsToReviewOptions(argv);
      expect(options.type).toBe('quick-fixes');
    });
  });

  describe('API Key Options', () => {
    it('should parse Google API key', () => {
      process.argv = ['node', 'test', '--google-api-key', 'test-google-key'];
      const argv = parseArguments();
      const options = mapArgsToReviewOptions(argv);
      expect(options.apiKeys?.google).toBe('test-google-key');
    });

    it('should parse OpenRouter API key', () => {
      process.argv = ['node', 'test', '--openrouter-api-key', 'test-openrouter-key'];
      const argv = parseArguments();
      const options = mapArgsToReviewOptions(argv);
      expect(options.apiKeys?.openrouter).toBe('test-openrouter-key');
    });

    it('should parse Anthropic API key', () => {
      process.argv = ['node', 'test', '--anthropic-api-key', 'test-anthropic-key'];
      const argv = parseArguments();
      const options = mapArgsToReviewOptions(argv);
      expect(options.apiKeys?.anthropic).toBe('test-anthropic-key');
    });

    it('should parse OpenAI API key', () => {
      process.argv = ['node', 'test', '--openai-api-key', 'test-openai-key'];
      const argv = parseArguments();
      const options = mapArgsToReviewOptions(argv);
      expect(options.apiKeys?.openai).toBe('test-openai-key');
    });

    it('should parse multiple API keys', () => {
      process.argv = [
        'node', 'test',
        '--google-api-key', 'google-key',
        '--openai-api-key', 'openai-key',
        '--anthropic-api-key', 'anthropic-key',
        '--openrouter-api-key', 'openrouter-key'
      ];
      const argv = parseArguments();
      const options = mapArgsToReviewOptions(argv);
      expect(options.apiKeys).toEqual({
        google: 'google-key',
        openai: 'openai-key',
        anthropic: 'anthropic-key',
        openrouter: 'openrouter-key'
      });
    });

    it('should not include apiKeys if no API keys provided', () => {
      process.argv = ['node', 'test'];
      const argv = parseArguments();
      const options = mapArgsToReviewOptions(argv);
      expect(options.apiKeys).toBeUndefined();
    });
  });

  describe('Model Options', () => {
    it('should parse model with short alias', () => {
      process.argv = ['node', 'test', '-m', 'openai:gpt-4'];
      const argv = parseArguments();
      expect(argv.model).toBe('openai:gpt-4');
    });

    it('should parse model with long option', () => {
      process.argv = ['node', 'test', '--model', 'anthropic:claude-3-opus'];
      const argv = parseArguments();
      expect(argv.model).toBe('anthropic:claude-3-opus');
    });

    it('should default to configured model', () => {
      process.argv = ['node', 'test'];
      const argv = parseArguments();
      expect(argv.model).toBe('gemini:gemini-2.5-pro');
    });
  });

  describe('Output Options', () => {
    it('should parse output format', () => {
      process.argv = ['node', 'test', '--output', 'json'];
      const argv = parseArguments();
      expect(argv.output).toBe('json');
    });

    it('should parse output directory', () => {
      process.argv = ['node', 'test', '--output-dir', './reviews'];
      const argv = parseArguments();
      expect(argv.outputDir).toBe('./reviews');
    });

    it('should parse interactive flag with short alias', () => {
      process.argv = ['node', 'test', '-i'];
      const argv = parseArguments();
      expect(argv.interactive).toBe(true);
    });
  });

  describe('Feature Flags', () => {
    it('should parse include-tests flag', () => {
      process.argv = ['node', 'test', '--include-tests'];
      const argv = parseArguments();
      expect(argv.includeTests).toBe(true);
    });

    it('should parse include-project-docs flag', () => {
      process.argv = ['node', 'test', '--include-project-docs'];
      const argv = parseArguments();
      expect(argv.includeProjectDocs).toBe(true);
    });

    it('should parse include-dependency-analysis flag', () => {
      process.argv = ['node', 'test', '--include-dependency-analysis'];
      const argv = parseArguments();
      expect(argv.includeDependencyAnalysis).toBe(true);
    });

    it('should parse enable-semantic-chunking flag', () => {
      process.argv = ['node', 'test', '--enable-semantic-chunking'];
      const argv = parseArguments();
      expect(argv.enableSemanticChunking).toBe(true);
    });

    it('should respect AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING env var', () => {
      process.env.AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING = 'false';
      process.argv = ['node', 'test'];
      const argv = parseArguments();
      expect(argv.enableSemanticChunking).toBe(false);
      delete process.env.AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING;
    });
  });

  describe('Interactive and Testing Options', () => {
    it('should parse interactive flag', () => {
      process.argv = ['node', 'test', '--interactive'];
      const argv = parseArguments();
      expect(argv.interactive).toBe(true);
    });

    it('should parse test-api flag', () => {
      process.argv = ['node', 'test', '--test-api'];
      const argv = parseArguments();
      expect(argv.testApi).toBe(true);
    });

    it('should parse estimate flag', () => {
      process.argv = ['node', 'test', '--estimate'];
      const argv = parseArguments();
      expect(argv.estimate).toBe(true);
    });
  });

  describe('Multi-pass Review Options', () => {
    it('should parse multi-pass flag', () => {
      process.argv = ['node', 'test', '--multi-pass'];
      const argv = parseArguments();
      expect(argv.multiPass).toBe(true);
    });

    it('should parse force-single-pass flag', () => {
      process.argv = ['node', 'test', '--force-single-pass'];
      const argv = parseArguments();
      expect(argv.forceSinglePass).toBe(true);
    });

    it('should parse context-maintenance-factor', () => {
      process.argv = ['node', 'test', '--context-maintenance-factor', '0.25'];
      const argv = parseArguments();
      expect(argv.contextMaintenanceFactor).toBe(0.25);
    });
  });

  describe('Language and Framework Options', () => {
    it('should parse language option', () => {
      process.argv = ['node', 'test', '--language', 'typescript'];
      const argv = parseArguments();
      expect(argv.language).toBe('typescript');
    });

    it('should parse framework option', () => {
      process.argv = ['node', 'test', '--framework', 'react'];
      const argv = parseArguments();
      expect(argv.framework).toBe('react');
    });
  });

  describe('Utility Options', () => {
    it.skip('should parse no-confirm flag', () => {
      // Skipped: yargs has a known issue with --no-* flags in strict mode
      process.argv = ['node', 'test', '--no-confirm'];
      const argv = parseArguments();
      expect(argv['no-confirm']).toBe(true);
      const options = mapArgsToReviewOptions(argv);
      expect(options.noConfirm).toBe(true);
    });

    it('should parse debug flag', () => {
      process.argv = ['node', 'test', '--debug'];
      const argv = parseArguments();
      expect(argv.debug).toBe(true);
    });

    it('should parse listmodels flag', () => {
      process.argv = ['node', 'test', '--listmodels'];
      const argv = parseArguments();
      expect(argv.listmodels).toBe(true);
    });

    it('should parse models flag', () => {
      process.argv = ['node', 'test', '--models'];
      const argv = parseArguments();
      expect(argv.models).toBe(true);
    });
  });

  describe('Command-specific Options', () => {
    it('should parse test-model command with model option', () => {
      process.argv = ['node', 'test', 'test-model', '--model', 'gemini:gemini-1.5-pro'];
      const argv = parseArguments();
      expect(argv._[0]).toBe('test-model');
      expect(argv.model).toBe('gemini:gemini-1.5-pro');
    });

    it('should parse test-model command with API key', () => {
      process.argv = ['node', 'test', 'test-model', '--google-api-key', 'test-key'];
      const argv = parseArguments();
      expect(argv._[0]).toBe('test-model');
      const options = mapArgsToReviewOptions(argv);
      expect(options.apiKeys?.google).toBe('test-key');
    });

    it('should parse test-build command', () => {
      process.argv = ['node', 'test', 'test-build', '--debug'];
      const argv = parseArguments();
      expect(argv._[0]).toBe('test-build');
      expect(argv.debug).toBe(true);
    });

    it('should parse sync-github-projects command', () => {
      process.argv = ['node', 'test', 'sync-github-projects', '--token', 'gh-token', '--org', 'my-org'];
      const argv = parseArguments();
      expect(argv._[0]).toBe('sync-github-projects');
      expect(argv.token).toBe('gh-token');
      expect(argv.org).toBe('my-org');
    });
  });

  describe('Validation and Edge Cases', () => {
    it('should handle invalid review type gracefully', () => {
      process.argv = ['node', 'test', '--type', 'invalid-type'];
      expect(() => parseArguments()).toThrow();
    });

    it('should handle invalid output format gracefully', () => {
      process.argv = ['node', 'test', '--output', 'invalid-format'];
      expect(() => parseArguments()).toThrow();
    });

    it('should parse multiple options together', () => {
      process.argv = [
        'node', 'test', './src',
        '--type', 'security',
        '--model', 'openai:gpt-4',
        '--output', 'json',
        '--output-dir', './reports',
        '--include-tests',
        '--multi-pass',
        '--debug',
        '--google-api-key', 'test-key'
      ];
      const argv = parseArguments();
      const options = mapArgsToReviewOptions(argv);
      
      expect(options).toMatchObject({
        target: './src',
        type: 'security',
        model: 'openai:gpt-4',
        output: 'json',
        outputDir: './reports',
        includeTests: true,
        multiPass: true,
        debug: true,
        apiKeys: { google: 'test-key' }
      });
    });
  });

  describe('Argument Validation Function', () => {
    it('should transform arch to architectural', () => {
      const validated = validateArguments({ type: 'arch' });
      expect(validated.type).toBe('architectural');
    });

    it('should map ui-language to uiLanguage', () => {
      const validated = validateArguments({ 'ui-language': 'es' });
      expect(validated.uiLanguage).toBe('es');
      expect(validated['ui-language']).toBeUndefined();
    });

    it('should map confirm to noConfirm with inverse logic', () => {
      const validated = validateArguments({ confirm: true });
      expect(validated.noConfirm).toBe(false);
      expect(validated.confirm).toBeUndefined();
    });
  });
});