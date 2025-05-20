/**
 * @fileoverview Tests for the command-line argument option setup.
 * 
 * These tests verify that all command-line options are correctly configured 
 * with the right names, descriptions, default values, etc.
 */

import { validateArguments } from '../../cli/argumentParser';
import { VALID_REVIEW_TYPES, VALID_OUTPUT_FORMATS } from '../../types/common';

// Mock the logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

describe('CLI Argument Validation Tests', () => {
  // Mock the exit function to prevent tests from exiting
  let mockExit;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockExit = jest.spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });
  
  afterEach(() => {
    mockExit.mockRestore();
  });

  test('should handle review type aliases correctly', () => {
    const options = {
      type: 'arch',
      includeTests: false,
      output: 'markdown',
    };
    
    const validated = validateArguments(options as any);
    
    expect(validated.type).toBe('architectural');
  });
  
  test('should map UI language option correctly', () => {
    const options = {
      type: 'quick-fixes',
      includeTests: false,
      output: 'markdown',
      'ui-language': 'en'
    };
    
    const validated = validateArguments(options as any);
    
    expect(validated.uiLanguage).toBe('en');
    expect(validated['ui-language']).toBeUndefined();
  });
  
  test('should map confirm option to noConfirm with inverse logic', () => {
    const options = {
      type: 'quick-fixes',
      includeTests: false,
      output: 'markdown',
      confirm: false
    };
    
    const validated = validateArguments(options as any);
    
    expect(validated.noConfirm).toBe(true);
    expect(validated.confirm).toBeUndefined();
  });
});