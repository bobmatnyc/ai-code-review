/**
 * @fileoverview Tests for the testBuild command module.
 *
 * These tests verify that the build testing command works correctly.
 */

import { testBuildCommand } from '../../commands/testBuild';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock the test functions
jest.mock('../../clients/utils/modelTester', () => ({
  testGeminiModel: jest.fn().mockResolvedValue({ success: true, message: 'Success', response: 'Hello!' }),
  testAnthropicModel: jest.fn().mockResolvedValue({ success: true, message: 'Success', response: 'Hello!' }),
  testOpenAIModel: jest.fn().mockResolvedValue({ success: true, message: 'Success', response: 'Hello!' }),
  testOpenRouterModel: jest.fn().mockResolvedValue({ success: true, message: 'Success', response: 'Hello!' }),
  findAvailableModelForProvider: jest.fn().mockResolvedValue('test-model')
}));

// Mock the model maps
jest.mock('../../clients/utils/modelMaps', () => ({
  getModelsByProvider: jest.fn().mockReturnValue(['test:model1', 'test:model2']),
  MODEL_MAP: {
    'test:model1': {
      apiName: 'model1-api',
      displayName: 'Test Model 1',
      provider: 'test'
    },
    'test:model2': {
      apiName: 'model2-api',
      displayName: 'Test Model 2',
      provider: 'test'
    },
    'gemini:gemini-1.5-pro': {
      apiName: 'gemini-1.5-pro',
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
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    cyan: jest.fn((text) => text),
    gray: jest.fn((text) => text),
    green: jest.fn((text) => text),
    red: jest.fn((text) => text),
    bold: jest.fn((text) => text)
  }
}));

describe('testBuildCommand', () => {
  // Mock console.log to capture JSON output
  const originalConsoleLog = console.log;
  let consoleOutput: string[] = [];
  
  beforeEach(() => {
    jest.clearAllMocks();
    consoleOutput = [];
    console.log = jest.fn((text) => {
      consoleOutput.push(typeof text === 'string' ? text : JSON.stringify(text));
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
    const providerOption = testBuildCommand.options.find(opt => 
      opt.flags.includes('--provider') || opt.flags.includes('-p'));
    
    expect(providerOption).toBeDefined();
    expect(providerOption?.description).toContain('Test only models for a specific provider');
  });
  
  it('should have a fail-on-error option', () => {
    const failOption = testBuildCommand.options.find(opt => 
      opt.flags.includes('--fail-on-error'));
    
    expect(failOption).toBeDefined();
    expect(failOption?.description).toContain('Exit with error code');
  });
  
  it('should have a json option', () => {
    const jsonOption = testBuildCommand.options.find(opt => 
      opt.flags.includes('--json'));
    
    expect(jsonOption).toBeDefined();
    expect(jsonOption?.description).toContain('JSON format');
  });
});
