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

// Mock the exit function to prevent tests from exiting
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  return undefined as never;
});

describe('CLI Argument Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    mockExit.mockRestore();
  });

  describe('Review Type Validation', () => {
    it('should handle review type aliases correctly', () => {
      const options = {
        type: 'arch',
        includeTests: false,
        output: 'markdown',
      };
      
      const validated = validateArguments(options as any);
      
      expect(validated.type).toBe('architectural');
    });
    
    it('should reject invalid review types', () => {
      const options = {
        type: 'invalid-type',
        includeTests: false,
        output: 'markdown'
      };
      
      validateArguments(options as any);
      
      expect(mockExit).toHaveBeenCalledWith(1);
    });
    
    it('should accept all valid review types', () => {
      // Test each valid review type except 'consolidated'
      const validTypes = VALID_REVIEW_TYPES.filter(type => type !== 'consolidated');
      
      for (const type of validTypes) {
        const options = {
          type,
          includeTests: false,
          output: 'markdown'
        };
        
        const validated = validateArguments(options as any);
        
        expect(validated.type).toBe(type);
        expect(mockExit).not.toHaveBeenCalled();
      }
    });
  });
  
  describe('Output Format Validation', () => {
    it('should accept valid output formats', () => {
      for (const format of VALID_OUTPUT_FORMATS) {
        const options = {
          type: 'quick-fixes',
          includeTests: false,
          output: format
        };
        
        const validated = validateArguments(options as any);
        
        expect(validated.output).toBe(format);
        expect(mockExit).not.toHaveBeenCalled();
      }
    });
    
    it('should reject invalid output formats', () => {
      const options = {
        type: 'quick-fixes',
        includeTests: false,
        output: 'invalid-format'
      };
      
      validateArguments(options as any);
      
      expect(mockExit).toHaveBeenCalledWith(1);
    });
    
    it('should switch to markdown output when interactive mode is enabled with JSON output', () => {
      const options = {
        type: 'quick-fixes',
        includeTests: false,
        output: 'json',
        interactive: true
      };
      
      const validated = validateArguments(options as any);
      
      expect(validated.output).toBe('markdown');
    });
  });
  
  describe('Option Mapping', () => {
    it('should map UI language option correctly', () => {
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
    
    it('should map confirm option to noConfirm with inverse logic', () => {
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
    
    it('should not set noConfirm when confirm is true', () => {
      const options = {
        type: 'quick-fixes',
        includeTests: false,
        output: 'markdown',
        confirm: true
      };
      
      const validated = validateArguments(options as any);
      
      expect(validated.noConfirm).toBe(false);
      expect(validated.confirm).toBeUndefined();
    });
  });
});