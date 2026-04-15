/**
 * This file previously contained bundled prompt templates as TypeScript string literals.
 *
 * Phase 2: Bundled string literals removed. All prompts served from HBS templates via UnifiedPromptManager.
 *
 * The getBundledPrompt() function now delegates exclusively to the HBS template system
 * (getPromptTemplate) when USE_TEMPLATE_SYSTEM is true and templates are available.
 * It returns undefined if the template system cannot serve the request rather than
 * falling back to hardcoded strings.
 *
 * The bundledPrompts map is retained as an empty structure to avoid breaking any
 * code that imports it, but it no longer contains string literal content.
 */

import type { ReviewType } from '../types/review';
import logger from '../utils/logger';
import { checkTemplatesAvailability, getPromptTemplate } from '../utils/promptTemplateManager';

// Flag to control whether to use the template system (can be configured at runtime)
export const USE_TEMPLATE_SYSTEM = true;

// Phase 2: Bundled string literals removed. All prompts served from HBS templates via UnifiedPromptManager.
// The structure is retained to avoid import errors in code that references bundledPrompts directly.
export const bundledPrompts: Record<string, Record<string, string>> = {};

/**
 * Get a bundled prompt template with template system integration.
 *
 * Phase 2: This function delegates to the HBS template system exclusively when
 * USE_TEMPLATE_SYSTEM is true and templates are available. The hardcoded string
 * literal fallback has been removed.
 *
 * @param reviewType Type of review
 * @param language Programming language
 * @param framework Framework (optional)
 * @returns The prompt template or undefined if not found
 */
export function getBundledPrompt(
  reviewType: ReviewType,
  language?: string,
  framework?: string,
): string | undefined {
  // Use the template system when available
  if (USE_TEMPLATE_SYSTEM && checkTemplatesAvailability()) {
    const template = getPromptTemplate(reviewType, language, framework);
    if (template) {
      logger.debug(
        `Using template for reviewType=${reviewType}, language=${language}, framework=${framework}`,
      );
      return template;
    }
    // Log a warning if template not found but system is available
    logger.warn(
      `Template not found in template system for reviewType=${reviewType}, language=${language}, framework=${framework}. No bundled fallback available (Phase 2).`,
    );
  }

  // Phase 2: No hardcoded string literal fallback. Return undefined.
  return undefined;
}
