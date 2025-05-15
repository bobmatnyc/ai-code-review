/**
 * @fileoverview Tests for integration of template system with bundledPrompts.
 *
 * This module tests the integration between the new Handlebars template system
 * and the existing bundledPrompts system.
 */

import fs from 'fs';
import path from 'path';
import { ReviewType } from '../../types/review';
import { getBundledPrompt } from '../../prompts/bundledPrompts';
import { getPromptTemplate, checkTemplatesAvailability } from '../../utils/templates/promptTemplateManager';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../utils/templates/promptTemplateManager');
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('bundledPrompts with template integration', () => {
  // Sample bundled prompt content
  const sampleBundledPrompt = '# TypeScript Best Practices\n\nThis is a bundled prompt for TypeScript best practices.';
  
  // Sample template content
  const sampleTemplatePrompt = '# TypeScript Best Practices (Template)\n\nThis is a template prompt for TypeScript best practices.';
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock checkTemplatesAvailability by default to return true
    (checkTemplatesAvailability as jest.Mock).mockReturnValue(true);
    
    // Mock getPromptTemplate to return sample template content
    (getPromptTemplate as jest.Mock).mockImplementation((reviewType: ReviewType, language?: string, framework?: string) => {
      if (reviewType === ReviewType.BEST_PRACTICES && language === 'typescript') {
        return sampleTemplatePrompt;
      }
      return undefined;
    });
  });
  
  describe('Updated bundledPrompts.ts', () => {
    it('should use the bundled prompt when template system is not available', () => {
      // Create a new implementation that favors templates but falls back to bundled prompts
      (checkTemplatesAvailability as jest.Mock).mockReturnValue(false);
      
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
      const result = getNewBundledPrompt(ReviewType.BEST_PRACTICES, 'typescript');
      
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
      const result = getNewBundledPrompt(ReviewType.BEST_PRACTICES, 'typescript');
      
      // Should use template prompt since template system is available
      expect(result).toBe(sampleTemplatePrompt);
      expect(getPromptTemplate).toHaveBeenCalledWith(ReviewType.BEST_PRACTICES, 'typescript', undefined);
    });
    
    it('should fall back to bundled prompt when template is not found', () => {
      // Make getPromptTemplate return undefined for this test
      (getPromptTemplate as jest.Mock).mockReturnValue(undefined);
      
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
      const result = getNewBundledPrompt(ReviewType.BEST_PRACTICES, 'typescript');
      
      // Should fall back to bundled prompt
      expect(result).not.toBe(sampleTemplatePrompt);
      expect(getPromptTemplate).toHaveBeenCalledWith(ReviewType.BEST_PRACTICES, 'typescript', undefined);
    });
  });
  
  describe('Migration Strategy', () => {
    it('should allow gradual migration from bundled prompts to templates', () => {
      // This test demonstrates how you could implement a gradual migration strategy
      
      // Mock checkTemplatesAvailability to simulate partial migration
      (checkTemplatesAvailability as jest.Mock).mockReturnValue(true);
      
      // Mock getPromptTemplate to return templates for some review types but not others
      (getPromptTemplate as jest.Mock).mockImplementation((reviewType: ReviewType, language?: string, framework?: string) => {
        // Only return templates for certain review types to simulate partial migration
        if (reviewType === ReviewType.BEST_PRACTICES) {
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
      const bestPracticesResult = getNewBundledPrompt(ReviewType.BEST_PRACTICES, 'typescript');
      expect(bestPracticesResult).toBe(sampleTemplatePrompt);
      
      // Test with a review type that hasn't been migrated yet
      const securityResult = getNewBundledPrompt(ReviewType.SECURITY, 'typescript');
      expect(securityResult).not.toBe(sampleTemplatePrompt);
    });
  });
});