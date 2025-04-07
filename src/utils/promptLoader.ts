/**
 * @fileoverview Utilities for loading prompt templates.
 *
 * This module provides functions for loading prompt templates from the file system,
 * supporting language-specific templates and fallbacks to default templates.
 */

import path from 'path';
import fs from 'fs/promises';
import { ReviewType, ReviewOptions } from '../types/review';
import logger from './logger';
import { getSchemaInstructions } from '../types/reviewSchema';

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
  // Get the language from options or default to typescript
  let language = 'typescript';

  if (typeof languageOrOptions === 'string') {
    language = languageOrOptions.toLowerCase();
  } else if (languageOrOptions?.language) {
    language = languageOrOptions.language.toLowerCase();
  }

  // Try multiple paths to find the prompt template
  const possiblePaths = [
    // First try the language-specific directory (for local development)
    path.resolve('prompts', language, `${reviewType}-review.md`),
    // Then try the language-specific directory relative to the current file (for npm package)
    path.resolve(
      __dirname,
      '..',
      '..',
      'prompts',
      language,
      `${reviewType}-review.md`
    ),
    // Then try the language-specific directory relative to the package root (for global installation)
    path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'prompts',
      language,
      `${reviewType}-review.md`
    ),
    // Fallback to the root prompts directory (for local development)
    path.resolve('prompts', `${reviewType}-review.md`),
    // Fallback to the root prompts directory relative to the current file (for npm package)
    path.resolve(__dirname, '..', '..', 'prompts', `${reviewType}-review.md`),
    // Fallback to the root prompts directory relative to the package root (for global installation)
    path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'prompts',
      `${reviewType}-review.md`
    )
  ];

  let lastError: any;
  let promptTemplate = '';

  // Try each path in order
  for (const promptPath of possiblePaths) {
    try {
      promptTemplate = await fs.readFile(promptPath, 'utf-8');
      logger.debug(`Loaded prompt template from ${promptPath}`);
      break; // Exit the loop if we successfully read the file
    } catch (error) {
      lastError = error;
      // Continue to the next path
    }
  }

  // If we couldn't read any file, throw an error
  if (!promptTemplate) {
    logger.error(
      `Error loading prompt template for ${reviewType} (language: ${language}):`,
      lastError
    );
    logger.error('Tried the following paths:');
    possiblePaths.forEach(p => logger.error(`- ${p}`));
    throw new Error(
      `Failed to load prompt template for ${reviewType} (language: ${language})`
    );
  }

  // Process the template
  promptTemplate = processPromptTemplate(
    promptTemplate,
    typeof languageOrOptions === 'object' ? languageOrOptions : undefined
  );

  return promptTemplate;
}

/**
 * Process a prompt template by replacing placeholders
 * @param promptTemplate The raw prompt template
 * @param options Review options
 * @returns The processed prompt template
 */
export function processPromptTemplate(
  promptTemplate: string,
  options?: ReviewOptions
): string {
  // If in interactive mode, include the schema instructions
  if (options?.interactive) {
    promptTemplate = promptTemplate.replace(
      '{{SCHEMA_INSTRUCTIONS}}',
      getSchemaInstructions()
    );
  } else {
    // Otherwise, remove the schema instructions placeholder
    promptTemplate = promptTemplate.replace('{{SCHEMA_INSTRUCTIONS}}', '');
  }

  // Add language-specific instructions if available
  if (options?.language) {
    promptTemplate = promptTemplate.replace(
      '{{LANGUAGE_INSTRUCTIONS}}',
      `This code is written in ${options.language.toUpperCase()}. Please provide language-specific advice.`
    );
  } else {
    promptTemplate = promptTemplate.replace('{{LANGUAGE_INSTRUCTIONS}}', '');
  }

  return promptTemplate;
}
