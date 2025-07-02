/**
 * @fileoverview Utilities for loading prompt templates.
 *
 * IMPORTANT: This module provides functions for loading prompt templates from BUNDLED PROMPTS ONLY.
 * The system prioritizes bundled prompts and only falls back to file system prompts if a bundled prompt is not found.
 *
 * All core prompts are defined in the bundledPrompts.ts file and accessed through the PromptManager.
 * This ensures that the system always has access to the prompts it needs, regardless of
 * where it's installed or how it's packaged.
 *
 * This module is a compatibility layer that uses the PromptManager internally.
 */

import { PromptManager } from '../../prompts/PromptManager';
import type { ReviewOptions, ReviewType } from '../../types/review';

/**
 * Load a prompt template
 * @param reviewType Type of review to perform
 * @param options Review options including language
 * @returns Promise resolving to the prompt template
 *
 * IMPORTANT: This function prioritizes bundled prompts.
 * The system will first try to use bundled prompts defined in bundledPrompts.ts.
 * Only if a bundled prompt is not found will it fall back to custom templates.
 *
 * This ensures that the system always has access to the prompts it needs,
 * regardless of where it's installed or how it's packaged.
 */
export async function loadPromptTemplate(
  reviewType: ReviewType,
  languageOrOptions?: string | ReviewOptions,
): Promise<string> {
  // Get the prompt manager instance
  const promptManager = PromptManager.getInstance();

  // Convert string language to options object if needed
  let options: ReviewOptions | undefined;

  if (typeof languageOrOptions === 'string') {
    options = {
      language: languageOrOptions as any,
      type: 'quick-fixes',
      includeTests: false,
      output: 'markdown',
    };
  } else {
    options = languageOrOptions;
  }

  // Use the prompt manager to get the template
  return promptManager.getPromptTemplate(reviewType, options);
}
