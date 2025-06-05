/**
 * @fileoverview Tests for bundled prompts
 * 
 * This file contains tests to verify that bundled prompts are properly
 * loaded and used by the system.
 */

import { getBundledPrompt } from '../prompts/bundledPrompts';
import { PromptManager } from '../prompts/PromptManager';
import { ReviewType } from '../types/review';

describe('bundledPrompts', () => {
  describe('getBundledPrompt', () => {
    it('should return a prompt for each review type', () => {
      const reviewTypes: ReviewType[] = [
        'quick-fixes',
        'architectural',
        'security',
        'performance',
        'unused-code'
      ];

      // Check that each review type has a bundled prompt
      for (const reviewType of reviewTypes) {
        const prompt = getBundledPrompt(reviewType);
        expect(prompt).toBeDefined();
        expect(typeof prompt).toBe('string');
        expect(prompt!.length).toBeGreaterThan(100); // Ensure it's a substantial prompt
      }
    });

    it('should return language-specific prompts when available', () => {
      // Test TypeScript-specific architectural prompt
      const tsPrompt = getBundledPrompt('architectural', 'typescript');
      expect(tsPrompt).toBeDefined();
      expect(tsPrompt).toContain('TypeScript Architectural Review');

      // Test generic architectural prompt
      const genericPrompt = getBundledPrompt('architectural');
      expect(genericPrompt).toBeDefined();
      expect(genericPrompt).toContain('Architectural Code Review');
      
      // They should be different
      expect(tsPrompt).not.toBe(genericPrompt);
    });

    it('should have language-specific prompts when available', () => {
      // Test a language that has specific prompts
      const pythonPrompt = getBundledPrompt('quick-fixes', 'python');
      const genericPrompt = getBundledPrompt('quick-fixes');
      
      expect(pythonPrompt).toBeDefined();
      expect(genericPrompt).toBeDefined();
      // Python now has a specific prompt, so we expect them to be different
      expect(pythonPrompt).not.toBe(genericPrompt);
    });
  });

  describe('PromptManager integration', () => {
    it('should prioritize bundled prompts', async () => {
      const promptManager = PromptManager.getInstance();
      
      // Get a prompt template for a review type that has a bundled prompt
      const prompt = await promptManager.getPromptTemplate('quick-fixes');
      
      // Verify it's the bundled prompt
      expect(prompt).toBeDefined();
      expect(prompt).toContain('TypeScript Quick Fixes Review');
    });

    it('should include language-specific information in prompts', async () => {
      const promptManager = PromptManager.getInstance();
      
      // Get a prompt template with language option
      const prompt = await promptManager.getPromptTemplate('quick-fixes', {
        language: 'javascript',
        type: 'quick-fixes'
      });
      
      // Verify language-specific content is present
      expect(prompt).toBeDefined();
      // Check that it's the TypeScript template (since JavaScript uses TypeScript templates)
      expect(prompt).toContain('TypeScript Quick Fixes');
    });
  });
});
