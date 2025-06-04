/**
 * @fileoverview Tests for the testBuild command module.
 *
 * These tests verify that the build testing command works correctly.
 */

import { testBuildCommand } from '../../commands/testBuild';

import { vi } from 'vitest';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock the test functions
vi.mock('../../clients/utils/modelTester', () => ({
  testGeminiModel: vi.fn().mockResolvedValue({
    success: true,
    message: 'Success',
    response: 'Hello!'
  }),
  testAnthropicModel: vi.fn().mockResolvedValue({
    success: true,
    message: 'Success',
    response: 'Hello!'
  }),
  testOpenAIModel: vi.fn().mockResolvedValue({
    success: true,
    message: 'Success',
    response: 'Hello!'
  }),
  testOpenRouterModel: vi.fn().mockResolvedValue({
    success: true,
    message: 'Success',
    response: 'Hello!'
  }),
  findAvailableModelForProvider: vi.fn().mockResolvedValue('test-model')
}));

// Mock the model maps
vi.mock('../../clients/utils/modelMaps', () => ({
  getModelsByProvider: vi
    .fn()
    .mockReturnValue(['test:model1', 'test:model2']),
  MODEL_MAP: {
    'test:model1': {
      apiIdentifier: 'model1-api',
      displayName: 'Test Model 1',
      provider: 'test'
    },
    'test:model2': {
      apiIdentifier: 'model2-api',
      displayName: 'Test Model 2',
      provider: 'test'
    },
    'gemini:gemini-1.5-pro': {
      apiIdentifier: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      provider: 'gemini'
    }
  },
  Provider: {
    GEMINI: 'gemini',
    ANTHROPIC: 'anthropic',
    OPENAI: 'openai',
    OPENROUTER: 'openrouter'
  }
}));

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    cyan: vi.fn(text => text),
    gray: vi.fn(text => text),
    green: vi.fn(text => text),
    red: vi.fn(text => text),
    bold: vi.fn(text => text)
  }
}));

describe('testBuildCommand', () => {
  // Mock console.log to capture JSON output
  const originalConsoleLog = console.log;
  let consoleOutput: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    console.log = vi.fn(text => {
      consoleOutput.push(
        typeof text === 'string' ? text : JSON.stringify(text)
      );
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it('should be defined', () => {
    expect(testBuildCommand).toBeDefined();
    expect(testBuildCommand.name()).toBe('test-build');
  });

  it('should have the correct description', () => {
    expect(testBuildCommand.description()).toContain('Test all AI models');
    expect(testBuildCommand.description()).toContain('build');
  });

  it('should have a provider option', () => {
    const providerOption = testBuildCommand.options.find(
      opt => opt.flags.includes('--provider') || opt.flags.includes('-p')
    );

    expect(providerOption).toBeDefined();
    expect(providerOption?.description).toContain(
      'Test only models for a specific provider'
    );
  });

  it('should have a fail-on-error option', () => {
    const failOption = testBuildCommand.options.find(opt =>
      opt.flags.includes('--fail-on-error')
    );

    expect(failOption).toBeDefined();
    expect(failOption?.description).toContain('Exit with error code');
  });

  it('should have a json option', () => {
    const jsonOption = testBuildCommand.options.find(opt =>
      opt.flags.includes('--json')
    );

    expect(jsonOption).toBeDefined();
    expect(jsonOption?.description).toContain('JSON format');
  });
});
