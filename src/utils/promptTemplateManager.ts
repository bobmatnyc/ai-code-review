/**
 * Prompt Template Manager
 *
 * This utility provides an interface between the bundledPrompts system
 * and the new Handlebars template system, enabling a smooth migration.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ReviewType } from '../types/review';
import logger from './logger';
import { listAvailableTemplates, loadPromptTemplate } from './templateLoader';

/**
 * Maps framework identifiers from the API to template directory names
 */
const frameworkMapping: Record<string, string> = {
  react: 'react',
  angular: 'angular',
  vue: 'vue',
  'next.js': 'nextjs',
  nextjs: 'nextjs',
  django: 'django',
  flask: 'flask',
  fastapi: 'fastapi',
  pyramid: 'pyramid',
  laravel: 'laravel',
};

/**
 * Maps language identifiers from the API to template directory names
 */
const languageMapping: Record<string, string> = {
  typescript: 'typescript',
  javascript: 'typescript', // Use TypeScript templates for JavaScript
  python: 'python',
  php: 'php',
  ruby: 'ruby',
};

/**
 * Maps ReviewType enum to template file names
 */
const reviewTypeMapping: Record<string, string> = {
  architectural: 'architectural-review',
  'best-practices': 'best-practices',
  'quick-fixes': 'quick-fixes-review',
  security: 'security-review',
  performance: 'performance-review',
  'unused-code': 'unused-code-review',
  'code-tracing-unused-code': 'code-tracing-unused-code-review',
  'focused-unused-code': 'focused-unused-code-review',
  'improved-unused-code': 'improved-unused-code-review',
  consolidated: 'consolidated-review',
  // Add mapping for improved quick fixes
  'improved-quick-fixes': 'improved-quick-fixes-review',
  evaluation: 'evaluation',
  'extract-patterns': 'extract-patterns-review',
  'coding-test': 'coding-test',
};

/**
 * Get prompt template for the specified review type, language, and framework
 *
 * @param reviewType The type of review to get a prompt for
 * @param language The programming language (optional)
 * @param framework The framework (optional)
 * @returns The prompt template string or undefined if not found
 */
export function getPromptTemplate(
  reviewType: ReviewType | string,
  language?: string,
  framework?: string,
): string | undefined {
  // Convert ReviewType enum to string if needed
  const reviewTypeStr =
    typeof reviewType === 'string' ? reviewType : String(reviewType).toLowerCase();

  // Map review type to template file name
  const templateName = reviewTypeMapping[reviewTypeStr];
  if (!templateName) {
    logger.error(`No template mapping found for review type: ${reviewTypeStr}`);
    return undefined;
  }

  // Map language and framework to template directory names
  const mappedLanguage = language ? languageMapping[language.toLowerCase()] : undefined;
  const mappedFramework = framework ? frameworkMapping[framework.toLowerCase()] : undefined;

  // Try to load the template
  const template = loadPromptTemplate(templateName, mappedLanguage, mappedFramework);

  return template || undefined;
}

/**
 * Check if templates directory exists and is properly structured
 *
 * @returns true if templates are available, false otherwise
 */
export function checkTemplatesAvailability(): boolean {
  const templatesDir = path.resolve(process.cwd(), 'promptText');

  if (!fs.existsSync(templatesDir)) {
    logger.warn('Templates directory not found. Using bundled prompts instead.');
    return false;
  }

  // Check for essential directories
  const requiredDirs = ['common', 'frameworks', 'languages'];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(templatesDir, dir))) {
      logger.warn(
        `Required templates subdirectory '${dir}' not found. Using bundled prompts instead.`,
      );
      return false;
    }
  }

  // Check for common variables
  const variablesDir = path.join(templatesDir, 'common', 'variables');
  if (
    !fs.existsSync(variablesDir) ||
    !fs.existsSync(path.join(variablesDir, 'framework-versions.json'))
  ) {
    logger.warn('Framework variables data not found. Using bundled prompts instead.');
    return false;
  }

  return true;
}

/**
 * Get a list of supported frameworks and languages
 *
 * @returns Object containing arrays of supported frameworks, languages, and review types
 */
export function getSupportedTemplates(): Record<string, string[]> {
  return listAvailableTemplates();
}

export default {
  getPromptTemplate,
  checkTemplatesAvailability,
  getSupportedTemplates,
};
