/**
 * @fileoverview Tests for the template loading utility.
 *
 * This module provides Jest tests for the Handlebars template loading
 * and rendering functionality used by the prompt system.
 */

import fs from 'fs';
import path from 'path';
import { renderTemplate, loadPromptTemplate, listAvailableTemplates } from '../../utils/templates/templateLoader';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('templateLoader', () => {
  // Mock data setup
  const mockTemplatesDir = '/mock/templates';
  const mockTemplatePath = 'languages/typescript/best-practices.hbs';
  const mockTemplateContent = 'Hello {{name}}!';
  const mockVariables = { name: 'World' };
  
  // Set up mocks before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock path.resolve
    (path.resolve as jest.Mock).mockImplementation((dir: string, ...segments: string[]) => {
      return mockTemplatesDir;
    });
    
    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...segments: string[]) => {
      // Just return the last segment or a combination for specific cases
      if (segments.includes('variables') && segments.includes('framework-versions.json')) {
        return `${mockTemplatesDir}/common/variables/framework-versions.json`;
      }
      if (segments.includes('variables') && segments.includes('css-frameworks.json')) {
        return `${mockTemplatesDir}/common/variables/css-frameworks.json`;
      }
      if (segments.includes(mockTemplateContent)) {
        return `${mockTemplatesDir}/${mockTemplatePath}`;
      }
      if (segments.includes('languages/typescript/best-practices.hbs')) {
        return `${mockTemplatesDir}/languages/typescript/best-practices.hbs`;
      }
      if (segments.includes('frameworks/react/best-practices.hbs')) {
        return `${mockTemplatesDir}/frameworks/react/best-practices.hbs`;
      }
      if (segments.includes('languages/generic/best-practices.hbs')) {
        return `${mockTemplatesDir}/languages/generic/best-practices.hbs`;
      }
      
      // Handle directory checks for listAvailableTemplates
      if (segments.includes('frameworks')) {
        return `${mockTemplatesDir}/frameworks`;
      }
      if (segments.includes('languages')) {
        return `${mockTemplatesDir}/languages`;
      }
      if (segments.includes('frameworks/react')) {
        return `${mockTemplatesDir}/frameworks/react`;
      }
      
      return segments.join('/');
    });
    
    // Mock fs.existsSync
    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
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
      ].includes(filePath);
    });
    
    // Mock fs.readFileSync
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string, encoding: string) => {
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
    (fs.readdirSync as jest.Mock).mockImplementation((dirPath: string, options: any) => {
      if (dirPath.includes('frameworks')) {
        return ['react', 'angular', 'vue'].map(name => ({ name, isDirectory: () => true }));
      }
      if (dirPath.includes('languages')) {
        return ['typescript', 'python', 'ruby'].map(name => ({ name, isDirectory: () => true }));
      }
      if (dirPath.includes('frameworks/react')) {
        return ['best-practices.hbs', 'security-review.hbs'].map(name => ({ name, isDirectory: () => false }));
      }
      return [];
    });
    
    // Mock fs.statSync
    (fs.statSync as jest.Mock).mockImplementation((filePath: string) => {
      return {
        isDirectory: () => ['react', 'angular', 'vue', 'typescript', 'python', 'ruby'].some(dir => filePath.includes(dir))
      };
    });
  });
  
  describe('renderTemplate', () => {
    it('should render a template with variables', () => {
      const result = renderTemplate(mockTemplatePath, { name: 'World' });
      expect(result).toBe('Hello World!');
    });
    
    it('should return null if template does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
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
      expect(result).toBe('Hello World!');
    });
    
    it('should fall back to language-specific template if framework template is not available', () => {
      // Make framework template not exist
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
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
      expect(result).toBe('Hello World!');
    });
    
    it('should fall back to generic template if language template is not available', () => {
      // Make framework and language templates not exist
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
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
      expect(result).toBe('Hello World!');
    });
    
    it('should return null if no template is found', () => {
      // Make all templates not exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
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
    });
    
    it('should handle missing directories', () => {
      // Make frameworks directory not exist
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return !filePath.includes('frameworks') && [
          `${mockTemplatesDir}`,
          `${mockTemplatesDir}/common/variables/framework-versions.json`,
          `${mockTemplatesDir}/common/variables/css-frameworks.json`,
          `${mockTemplatesDir}/languages`,
        ].includes(filePath);
      });
      
      const result = listAvailableTemplates();
      
      expect(result.frameworks).toEqual([]);
      expect(result.languages).toContain('typescript');
    });
  });
});