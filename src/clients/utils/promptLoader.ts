/**
 * @fileoverview Utilities for loading prompt templates.
 *
 * This module provides functions for loading prompt templates from the file system,
 * supporting language-specific templates and fallbacks to default templates.
 *
 * This is a compatibility layer that uses the new PromptManager internally.
 */

import { ReviewType, ReviewOptions } from '../../types/review';
import { PromptManager } from '../../prompts/PromptManager';

/**
 * Load a prompt template from the prompts directory
 * @param reviewType Type of review to perform
 * @param options Review options including language
 * @returns Promise resolving to the prompt template
 */
export async function loadPromptTemplate(
  reviewType: ReviewType,
  languageOrOptions?: string | ReviewOptions
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
      output: 'markdown'
    };
  } else {
    options = languageOrOptions;
  }

  // Use the prompt manager to get the template
  return promptManager.getPromptTemplate(reviewType, options);
}
