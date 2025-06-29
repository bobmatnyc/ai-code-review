/**
 * @fileoverview Tests for the prompt template manager.
 *
 * This module provides Vitest tests for the prompt template manager,
 * which serves as an interface between the bundled prompts system
 * and the new Handlebars template system.
 */

import fs from 'fs';
import path from 'path';
import { ReviewType } from '../../types/review';
import {
  getPromptTemplate,
  checkTemplatesAvailability,
  getSupportedTemplates
} from '../../utils/promptTemplateManager';
import { loadPromptTemplate, listAvailableTemplates } from '../../utils/templateLoader';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('fs');
vi.mock('path');
vi.mock('../../utils/templateLoader');
vi.mock('../../utils/logger', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return {
    default: mockLogger,
    debug: mockLogger.debug,
    info: mockLogger.info,
    warn: mockLogger.warn,
    error: mockLogger.error,
  };
});

describe('promptTemplateManager', () => {
  const mockTemplatesDir = '/mock/templates';
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock path.resolve
    (path.resolve as any).mockImplementation((_dir: string, ..._segments: string[]) => {
      return mockTemplatesDir;
    });
    
    // Mock path.join
    (path.join as any).mockImplementation((...segments: string[]) => {
      if (segments.includes('common')) {
        return `${mockTemplatesDir}/common`;
      }
      if (segments.includes('frameworks')) {
        return `${mockTemplatesDir}/frameworks`;
      }
      if (segments.includes('languages')) {
        return `${mockTemplatesDir}/languages`;
      }
      if (segments.includes('variables')) {
        return `${mockTemplatesDir}/common/variables`;
      }
      if (segments.includes('framework-versions.json')) {
        return `${mockTemplatesDir}/common/variables/framework-versions.json`;
      }
      return segments.join('/');
    });
    
    // Mock loadPromptTemplate
    (loadPromptTemplate as any).mockImplementation((reviewType: string, language?: string, framework?: string) => {
      if (reviewType === 'best-practices' && language === 'typescript' && framework === 'react') {
        return 'React TypeScript Best Practices Template';
      }
      if (reviewType === 'best-practices' && language === 'typescript') {
        return 'TypeScript Best Practices Template';
      }
      if (reviewType === 'security-review' && language === 'typescript') {
        return 'TypeScript Security Review Template';
      }
      if (reviewType === 'nonexistent-review') {
        return null;
      }
      return `${reviewType} Template for ${language || 'generic'} ${framework ? `(${framework})` : ''}`;
    });
    
    // Mock listAvailableTemplates
    (listAvailableTemplates as any).mockResolvedValue({
      frameworks: ['react', 'angular', 'vue'],
      languages: ['typescript', 'python', 'ruby'],
      reviewTypes: ['best-practices', 'security-review', 'performance-review']
    });
    
    // Mock fs.existsSync
    (fs.existsSync as any).mockImplementation((_filePath: string) => {
      // By default, all directories and files exist
      return true;
    });
  });
  
  describe('getPromptTemplate', () => {
    it('should return a template for a valid review type, language, and framework', () => {
      const template = getPromptTemplate('best-practices', 'typescript', 'react');
      expect(template).toBe('React TypeScript Best Practices Template');
      expect(loadPromptTemplate).toHaveBeenCalledWith('best-practices', 'typescript', 'react');
    });
    
    it('should handle language mapping correctly', () => {
      getPromptTemplate('best-practices', 'javascript', 'react');
      // JavaScript should map to TypeScript templates
      expect(loadPromptTemplate).toHaveBeenCalledWith('best-practices', 'typescript', 'react');
    });
    
    it('should handle framework mapping correctly', () => {
      getPromptTemplate('best-practices', 'typescript', 'next.js');
      // next.js should map to nextjs directory
      expect(loadPromptTemplate).toHaveBeenCalledWith('best-practices', 'typescript', 'nextjs');
    });
    
    it('should return undefined for invalid review types', () => {
      const template = getPromptTemplate('INVALID_TYPE' as ReviewType);
      expect(template).toBeUndefined();
    });
    
    it('should return undefined when template loading fails', () => {
      (loadPromptTemplate as any).mockReturnValue(null);
      const template = getPromptTemplate('best-practices', 'typescript', 'react');
      expect(template).toBeUndefined();
    });
  });
  
  describe('checkTemplatesAvailability', () => {
    it('should return true when templates directory exists and is properly structured', () => {
      const result = checkTemplatesAvailability();
      expect(result).toBe(true);
    });
    
    it('should return false when templates directory does not exist', () => {
      (fs.existsSync as any).mockImplementation((_filePath: string) => {
        return !_filePath.includes(mockTemplatesDir);
      });
      
      const result = checkTemplatesAvailability();
      expect(result).toBe(false);
    });
    
    it('should return false when required subdirectories are missing', () => {
      (fs.existsSync as any).mockImplementation((_filePath: string) => {
        return !_filePath.includes('frameworks') && _filePath !== `${mockTemplatesDir}/frameworks`;
      });
      
      const result = checkTemplatesAvailability();
      expect(result).toBe(false);
    });
    
    it('should return false when framework variables are missing', () => {
      (fs.existsSync as any).mockImplementation((_filePath: string) => {
        return !_filePath.includes('framework-versions.json');
      });
      
      const result = checkTemplatesAvailability();
      expect(result).toBe(false);
    });
  });
  
  describe('getSupportedTemplates', () => {
    it('should return lists of supported templates', () => {
      // Mock listAvailableTemplates to return expected data
      (listAvailableTemplates as any).mockReturnValue({
        frameworks: ['react', 'angular', 'vue'],
        languages: ['typescript', 'python', 'ruby'],
        reviewTypes: ['best-practices', 'security-review', 'performance-review']
      });
      
      const result = getSupportedTemplates();
      
      expect(result).toHaveProperty('frameworks');
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('reviewTypes');
      
      expect(result.frameworks).toEqual(['react', 'angular', 'vue']);
      expect(result.languages).toEqual(['typescript', 'python', 'ruby']);
      expect(result.reviewTypes).toEqual(['best-practices', 'security-review', 'performance-review']);
      
      expect(listAvailableTemplates).toHaveBeenCalled();
    });
  });
});