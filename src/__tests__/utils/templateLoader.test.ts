/**
 * @fileoverview Tests for the template loading utility.
 *
 * This module provides Vitest tests for the Handlebars template loading
 * and rendering functionality used by the prompt system.
 */

import fs from 'fs';
import path from 'path';
import { renderTemplate, loadPromptTemplate, listAvailableTemplates } from '../../utils/templateLoader';
import { vi } from 'vitest';

// Mock fs and path modules
vi.mock('fs');
vi.mock('path');

// Mock logger
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

describe('templateLoader', () => {
  // Mock data setup
  const mockTemplatesDir = '/mock/templates';
  const mockTemplatePath = 'languages/typescript/best-practices.hbs';
  const mockTemplateContent = 'Hello {{name}}!';
  // const mockVariables = { name: 'World' }; // Not used
  
  // Set up mocks before each test
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock path.resolve
    (path.resolve as any).mockImplementation((_dir: string, ..._segments: string[]) => {
      return mockTemplatesDir;
    });
    
    // Mock path.join
    (path.join as any).mockImplementation((...segments: string[]) => {
      // Join path segments
      const joined = segments.join('/');
      
      // Return proper paths for directories and files
      if (joined.includes('variables/framework-versions.json')) {
        return `${mockTemplatesDir}/common/variables/framework-versions.json`;
      }
      if (joined.includes('variables/css-frameworks.json')) {
        return `${mockTemplatesDir}/common/variables/css-frameworks.json`;
      }
      if (joined.includes('languages/typescript/best-practices.hbs')) {
        return `${mockTemplatesDir}/languages/typescript/best-practices.hbs`;
      }
      if (joined.includes('frameworks/react/best-practices.hbs')) {
        return `${mockTemplatesDir}/frameworks/react/best-practices.hbs`;
      }
      if (joined.includes('languages/generic/best-practices.hbs')) {
        return `${mockTemplatesDir}/languages/generic/best-practices.hbs`;
      }
      
      // Handle directory checks for listAvailableTemplates
      if (joined.endsWith('/frameworks') || joined.includes('promptText/frameworks')) {
        return `${mockTemplatesDir}/frameworks`;
      }
      if (joined.endsWith('/languages') || joined.includes('promptText/languages')) {
        return `${mockTemplatesDir}/languages`;
      }
      if (joined.includes('languages/generic')) {
        return `${mockTemplatesDir}/languages/generic`;
      }
      if (joined.includes('frameworks/react')) {
        return `${mockTemplatesDir}/frameworks/react`;
      }
      if (joined.includes('frameworks/angular')) {
        return `${mockTemplatesDir}/frameworks/angular`;
      }
      if (joined.includes('frameworks/vue')) {
        return `${mockTemplatesDir}/frameworks/vue`;
      }
      if (joined.includes('languages/typescript')) {
        return `${mockTemplatesDir}/languages/typescript`;
      }
      if (joined.includes('languages/python')) {
        return `${mockTemplatesDir}/languages/python`;
      }
      if (joined.includes('languages/ruby')) {
        return `${mockTemplatesDir}/languages/ruby`;
      }
      
      return joined;
    });
    
    // Mock fs.existsSync
    (fs.existsSync as any).mockImplementation((filePath: string) => {
      // Return true for expected paths
      return [
        `${mockTemplatesDir}`,
        `${mockTemplatesDir}/common/variables/framework-versions.json`,
        `${mockTemplatesDir}/common/variables/css-frameworks.json`,
        `${mockTemplatesDir}/languages/typescript/best-practices.hbs`,
        `${mockTemplatesDir}/frameworks/react/best-practices.hbs`,
        `${mockTemplatesDir}/languages/generic/best-practices.hbs`,
        `${mockTemplatesDir}/frameworks`,
        `${mockTemplatesDir}/languages`,
        `${mockTemplatesDir}/languages/generic`,
        `${mockTemplatesDir}/frameworks/react`,
      ].includes(filePath);
    });
    
    // Mock fs.readFileSync
    (fs.readFileSync as any).mockImplementation((filePath: string, _encoding: string) => {
      if (filePath.includes('framework-versions.json')) {
        return JSON.stringify({
          frameworks: {
            react: {
              latest: { version: '18.2.0', releaseDate: '2022-06-14', supportedUntil: '2025-06-14', features: ['Automatic Batching', 'Suspense'] },
              previous: { version: '17.0.2', releaseDate: '2021-03-22', supportedUntil: '2024-03-22', features: ['Concurrent Mode', 'Suspense'] }
            }
          }
        });
      }
      if (filePath.includes('css-frameworks.json')) {
        return JSON.stringify({
          cssFrameworks: {
            tailwind: {
              name: 'Tailwind CSS',
              version: '3.3.2',
              releaseDate: '2023-03-28',
              features: ['JIT Compiler', 'Dark Mode', 'Custom Variants'],
              integrations: { react: 'Easy to integrate with React components' }
            }
          }
        });
      }
      if (filePath.includes('best-practices.hbs')) {
        return mockTemplateContent;
      }
      return '';
    });
    
    // Mock fs.readdirSync
    (fs.readdirSync as any).mockImplementation((dirPath: string, options?: any) => {
      // Check for withFileTypes option which is used in listAvailableTemplates
      const withFileTypes = options && options.withFileTypes;
      
      if (dirPath.includes('frameworks')) {
        if (dirPath.includes('frameworks/react')) {
          return withFileTypes 
            ? ['best-practices.hbs', 'security-review.hbs'].map(name => ({ name, isDirectory: () => false }))
            : ['best-practices.hbs', 'security-review.hbs'];
        }
        // Main frameworks directory
        return withFileTypes 
          ? ['react', 'angular', 'vue'].map(name => ({ name, isDirectory: () => true }))
          : ['react', 'angular', 'vue'];
      }
      
      if (dirPath.includes('languages')) {
        if (dirPath.includes('languages/generic')) {
          return withFileTypes
            ? ['best-practices.hbs', 'security-review.hbs'].map(name => ({ name, isDirectory: () => false }))
            : ['best-practices.hbs', 'security-review.hbs'];
        }
        // Main languages directory
        return withFileTypes
          ? ['typescript', 'python', 'ruby', 'generic'].map(name => ({ name, isDirectory: () => true }))
          : ['typescript', 'python', 'ruby', 'generic'];
      }
      
      return withFileTypes ? [] : [];
    });
    
    // Mock fs.statSync
    (fs.statSync as any).mockImplementation((filePath: string) => {
      return {
        isDirectory: () => ['react', 'angular', 'vue', 'typescript', 'python', 'ruby', 'generic'].some(dir => filePath.includes(dir))
      };
    });
  });
  
  describe('renderTemplate', () => {
    it('should render a template with variables', () => {
      const result = renderTemplate(mockTemplatePath, { name: 'World' });
      expect(result).toBe('Hello World!');
    });
    
    it('should return null if template does not exist', () => {
      (fs.existsSync as any).mockReturnValue(false);
      const result = renderTemplate('nonexistent-template.hbs');
      expect(result).toBe(null);
    });
    
    it('should use default variables if no custom variables provided', () => {
      const result = renderTemplate(mockTemplatePath);
      // Since our mock template uses {{name}}, it should be empty or undefined without custom vars
      expect(result).toBe('Hello !');
    });
  });
  
  describe('loadPromptTemplate', () => {
    it('should load framework-specific template if available', () => {
      const result = loadPromptTemplate('best-practices', 'typescript', 'react');
      expect(result).toBe('Hello !');
    });
    
    it('should fall back to language-specific template if framework template is not available', () => {
      // Make framework template not exist
      (fs.existsSync as any).mockImplementation((filePath: string) => {
        return !filePath.includes('frameworks/react') && [
          `${mockTemplatesDir}`,
          `${mockTemplatesDir}/common/variables/framework-versions.json`,
          `${mockTemplatesDir}/common/variables/css-frameworks.json`,
          `${mockTemplatesDir}/languages/typescript/best-practices.hbs`,
          `${mockTemplatesDir}/languages/generic/best-practices.hbs`,
          `${mockTemplatesDir}/frameworks`,
          `${mockTemplatesDir}/languages`,
        ].includes(filePath);
      });
      
      const result = loadPromptTemplate('best-practices', 'typescript', 'react');
      expect(result).toBe('Hello !');
    });
    
    it('should fall back to generic template if language template is not available', () => {
      // Make framework and language templates not exist
      (fs.existsSync as any).mockImplementation((filePath: string) => {
        return !filePath.includes('frameworks/react') && 
               !filePath.includes('languages/typescript') && 
               [
                 `${mockTemplatesDir}`,
                 `${mockTemplatesDir}/common/variables/framework-versions.json`,
                 `${mockTemplatesDir}/common/variables/css-frameworks.json`,
                 `${mockTemplatesDir}/languages/generic/best-practices.hbs`,
                 `${mockTemplatesDir}/frameworks`,
                 `${mockTemplatesDir}/languages`,
               ].includes(filePath);
      });
      
      const result = loadPromptTemplate('best-practices', 'typescript', 'react');
      expect(result).toBe('Hello !');
    });
    
    it('should return null if no template is found', () => {
      // Make all templates not exist
      (fs.existsSync as any).mockReturnValue(false);
      
      const result = loadPromptTemplate('nonexistent-review-type', 'typescript', 'react');
      expect(result).toBe(null);
    });
  });
  
  describe('listAvailableTemplates', () => {
    it('should return a list of available templates', () => {
      const result = listAvailableTemplates();
      
      expect(result).toHaveProperty('frameworks');
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('reviewTypes');
      
      expect(result.frameworks).toContain('react');
      expect(result.languages).toContain('typescript');
      expect(result.reviewTypes).toContain('best-practices');
      expect(result.reviewTypes).toContain('security-review');
    });
    
    it('should handle missing directories', () => {
      // Make frameworks directory not exist
      (fs.existsSync as any).mockImplementation((filePath: string) => {
        return !filePath.includes('frameworks') && [
          `${mockTemplatesDir}`,
          `${mockTemplatesDir}/common/variables/framework-versions.json`,
          `${mockTemplatesDir}/common/variables/css-frameworks.json`,
          `${mockTemplatesDir}/languages`,
          `${mockTemplatesDir}/languages/generic`,
        ].includes(filePath);
      });
      
      const result = listAvailableTemplates();
      
      expect(result.frameworks).toEqual([]);
      expect(result.languages).toContain('typescript');
      expect(result.reviewTypes).toHaveLength(2);
      expect(result.reviewTypes).toContain('best-practices');
      expect(result.reviewTypes).toContain('security-review');
    });
    
    it('should get review types from generic directory when frameworks are not available', () => {
      // Make frameworks directory not exist but ensure generic directory exists
      (fs.existsSync as any).mockImplementation((filePath: string) => {
        return !filePath.includes('frameworks') && [
          `${mockTemplatesDir}`,
          `${mockTemplatesDir}/common/variables/framework-versions.json`,
          `${mockTemplatesDir}/common/variables/css-frameworks.json`,
          `${mockTemplatesDir}/languages`,
          `${mockTemplatesDir}/languages/generic`,
        ].includes(filePath);
      });
      
      const result = listAvailableTemplates();
      
      expect(result.frameworks).toEqual([]);
      expect(result.reviewTypes).toContain('best-practices');
      expect(result.reviewTypes).toContain('security-review');
    });
  });
});