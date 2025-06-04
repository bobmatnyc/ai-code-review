/**
 * @fileoverview Tests for the testModel command module.
 *
 * These tests verify that the model testing command works correctly.
 */

import { testModelCommand } from '../../commands/testModel';
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

describe('testModelCommand', () => {
  // Mock process.stdout.write to capture output
  const originalWrite = process.stdout.write;
  let writeOutput: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    writeOutput = [];
    process.stdout.write = vi.fn(text => {
      writeOutput.push(text.toString());
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
  });

  it('should be defined', () => {
    expect(testModelCommand).toBeDefined();
    expect(testModelCommand.name()).toBe('model-test');
  });

  it('should have the correct description', () => {
    expect(testModelCommand.description()).toContain('Test AI models');
  });

  it('should have a provider option', () => {
    const providerOption = testModelCommand.options.find(
      opt => opt.flags.includes('--provider') || opt.flags.includes('-p')
    );

    expect(providerOption).toBeDefined();
    expect(providerOption?.description).toContain(
      'Test all models for a specific provider'
    );
  });

  it('should have an all option', () => {
    const allOption = testModelCommand.options.find(opt =>
      opt.flags.includes('--all')
    );

    expect(allOption).toBeDefined();
    expect(allOption?.description).toContain('Test all available models');
  });
});
