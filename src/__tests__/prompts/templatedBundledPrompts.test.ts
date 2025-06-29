/**
 * @fileoverview Tests for integration of template system with bundledPrompts.
 *
 * This module tests the integration between the new Handlebars template system
 * and the existing bundledPrompts system.
 */

// import fs from 'fs'; // Not used in this file
// import path from 'path'; // Not used in this file
import { ReviewType } from '../../types/review';
import { getBundledPrompt } from '../../prompts/bundledPrompts';
import { getPromptTemplate, checkTemplatesAvailability } from '../../utils/promptTemplateManager';

import { vi } from 'vitest';

// Mock dependencies
vi.mock('fs');
vi.mock('path');
vi.mock('../../utils/promptTemplateManager');
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

describe('bundledPrompts with template integration', () => {
  // Sample bundled prompt content
  // const sampleBundledPrompt = '# TypeScript Best Practices\n\nThis is a bundled prompt for TypeScript best practices.'; // Not used
  
  // Sample template content
  const sampleTemplatePrompt = '# TypeScript Best Practices (Template)\n\nThis is a template prompt for TypeScript best practices.';
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock checkTemplatesAvailability by default to return true
    (checkTemplatesAvailability as any).mockReturnValue(true);
    
    // Mock getPromptTemplate to return sample template content
    (getPromptTemplate as any).mockImplementation((reviewType: ReviewType, language?: string, _framework?: string) => {
      if (reviewType === 'best-practices' && language === 'typescript') {
        return sampleTemplatePrompt;
      }
      return undefined; // No template found for other combinations
    });
  });
  
  describe('Updated bundledPrompts.ts', () => {
    it('should use the bundled prompt when template system is not available', () => {
      // Create a new implementation that favors templates but falls back to bundled prompts
      (checkTemplatesAvailability as any).mockReturnValue(false);
      
      // Example of the updated implementation (testing the concept, not actual implementation)
      function getNewBundledPrompt(
        reviewType: ReviewType, 
        language?: string, 
        framework?: string
      ): string | undefined {
        // Try using the template system first if available
        if (checkTemplatesAvailability()) {
          const template = getPromptTemplate(reviewType, language, framework);
          if (template) {
            return template;
          }
        }
        
        // Fall back to the original bundled prompts implementation
        return getBundledPrompt(reviewType, language, framework);
      }
      
      // Test the implementation
      const result = getNewBundledPrompt('best-practices', 'typescript');
      
      // Should use bundled prompt since template system is not available
      expect(result).not.toBe(sampleTemplatePrompt);
      expect(getPromptTemplate).not.toHaveBeenCalled();
    });
    
    it('should use the template prompt when template system is available', () => {
      // Create a new implementation that favors templates but falls back to bundled prompts
      function getNewBundledPrompt(
        reviewType: ReviewType, 
        language?: string, 
        framework?: string
      ): string | undefined {
        // Try using the template system first if available
        if (checkTemplatesAvailability()) {
          const template = getPromptTemplate(reviewType, language, framework);
          if (template) {
            return template;
          }
        }
        
        // Fall back to the original bundled prompts implementation
        return getBundledPrompt(reviewType, language, framework);
      }
      
      // Test the implementation
      const result = getNewBundledPrompt('best-practices', 'typescript');
      
      // Should use template prompt since template system is available
      expect(result).toBe(sampleTemplatePrompt);
      expect(getPromptTemplate).toHaveBeenCalledWith('best-practices', 'typescript', undefined);
    });
    
    it('should fall back to bundled prompt when template is not found', () => {
      // Make getPromptTemplate return undefined for this test
      (getPromptTemplate as any).mockReturnValue(undefined);
      
      // Create a new implementation that favors templates but falls back to bundled prompts
      function getNewBundledPrompt(
        reviewType: ReviewType, 
        language?: string, 
        framework?: string
      ): string | undefined {
        // Try using the template system first if available
        if (checkTemplatesAvailability()) {
          const template = getPromptTemplate(reviewType, language, framework);
          if (template) {
            return template;
          }
        }
        
        // Fall back to the original bundled prompts implementation
        return getBundledPrompt(reviewType, language, framework);
      }
      
      // Test the implementation
      const result = getNewBundledPrompt('best-practices', 'typescript');
      
      // Should fall back to bundled prompt
      expect(result).not.toBe(sampleTemplatePrompt);
      expect(getPromptTemplate).toHaveBeenCalledWith('best-practices', 'typescript', undefined);
    });
  });
  
  describe('Migration Strategy', () => {
    it('should allow gradual migration from bundled prompts to templates', () => {
      // This test demonstrates how you could implement a gradual migration strategy
      
      // Mock checkTemplatesAvailability to simulate partial migration
      (checkTemplatesAvailability as any).mockReturnValue(true);
      
      // Mock getPromptTemplate to return templates for some review types but not others
      (getPromptTemplate as any).mockImplementation((reviewType: ReviewType, _language?: string, _framework?: string) => {
        // Only return templates for certain review types to simulate partial migration
        if (reviewType === 'best-practices') {
          return sampleTemplatePrompt;
        }
        return undefined; // No template for other review types yet
      });
      
      // Create a new implementation that favors templates but falls back to bundled prompts
      function getNewBundledPrompt(
        reviewType: ReviewType, 
        language?: string, 
        framework?: string
      ): string | undefined {
        // Try using the template system first if available
        if (checkTemplatesAvailability()) {
          const template = getPromptTemplate(reviewType, language, framework);
          if (template) {
            return template;
          }
        }
        
        // Fall back to the original bundled prompts implementation
        return getBundledPrompt(reviewType, language, framework);
      }
      
      // Test with a review type that has been migrated to templates
      const bestPracticesResult = getNewBundledPrompt('best-practices', 'typescript');
      expect(bestPracticesResult).toBe(sampleTemplatePrompt);
      
      // Test with a review type that hasn't been migrated yet
      const securityResult = getNewBundledPrompt('security', 'typescript');
      expect(securityResult).not.toBe(sampleTemplatePrompt);
    });
  });
});