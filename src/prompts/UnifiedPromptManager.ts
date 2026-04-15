/**
 * @fileoverview UnifiedPromptManager - single source of truth for prompt retrieval.
 *
 * Phase 2: All prompts are served from HBS templates via the template system.
 * The bundled string literal fallback has been removed. This manager throws a
 * descriptive error if a template is not found rather than silently falling back.
 */

import type { ReviewType } from '../types/review';
import logger from '../utils/logger';
import { getPromptTemplate, getSupportedTemplates } from '../utils/promptTemplateManager';

/**
 * Maps ReviewType values to their template file names.
 * Kept in sync with the mapping in promptTemplateManager.ts.
 */
const REVIEW_TYPE_NAMES: Record<string, string> = {
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
  'improved-quick-fixes': 'improved-quick-fixes-review',
  evaluation: 'evaluation',
  'extract-patterns': 'extract-patterns-review',
  'coding-test': 'coding-test',
  'ai-integration': 'ai-integration-review',
  'cloud-native': 'cloud-native-review',
  'developer-experience': 'developer-experience-review',
  comprehensive: 'comprehensive-review',
};

/**
 * UnifiedPromptManager is the single source of truth for prompt retrieval.
 *
 * It delegates to the HBS template system exclusively.
 * If a template is not found, it throws a descriptive error rather than
 * falling back to hardcoded string literals.
 *
 * Usage:
 * ```typescript
 * const manager = UnifiedPromptManager.getInstance();
 * const prompt = await manager.getPrompt('security', 'typescript');
 * ```
 */
export class UnifiedPromptManager {
  private static instance: UnifiedPromptManager;

  private constructor() {}

  /**
   * Get the singleton instance of UnifiedPromptManager.
   */
  static getInstance(): UnifiedPromptManager {
    if (!UnifiedPromptManager.instance) {
      UnifiedPromptManager.instance = new UnifiedPromptManager();
    }
    return UnifiedPromptManager.instance;
  }

  /**
   * Retrieve the prompt template for the given review type, language, and optional framework.
   *
   * Delegates to the HBS template system via getPromptTemplate().
   * Throws if no matching template is found.
   *
   * @param reviewType The type of review (e.g., 'security', 'architectural')
   * @param language The programming language (e.g., 'typescript', 'python')
   * @param framework Optional framework (e.g., 'react', 'django')
   * @returns The rendered prompt string
   * @throws Error if no template is found for the given combination
   */
  async getPrompt(reviewType: string, language: string, framework?: string): Promise<string> {
    logger.debug(
      `UnifiedPromptManager.getPrompt: reviewType=${reviewType}, language=${language}, framework=${framework ?? 'none'}`,
    );

    const prompt = getPromptTemplate(reviewType as ReviewType, language, framework);

    if (!prompt) {
      const templateName = REVIEW_TYPE_NAMES[reviewType] ?? reviewType;
      throw new Error(
        `No HBS template found for reviewType="${reviewType}" (template="${templateName}"), ` +
          `language="${language}", framework="${framework ?? 'none'}". ` +
          `Ensure a corresponding .hbs file exists in promptText/languages/${language}/ or promptText/languages/generic/. ` +
          `Available review types: ${this.listAvailableTypes().join(', ')}`,
      );
    }

    return prompt;
  }

  /**
   * Check whether a prompt template exists for the given combination without throwing.
   *
   * @param reviewType The type of review
   * @param language The programming language
   * @param framework Optional framework
   * @returns true if a template exists, false otherwise
   */
  async hasPrompt(reviewType: string, language: string, framework?: string): Promise<boolean> {
    try {
      const prompt = getPromptTemplate(reviewType as ReviewType, language, framework);
      return prompt !== undefined && prompt !== null && prompt.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * List all review types that have a known template mapping.
   *
   * @returns Array of review type strings (e.g., ['architectural', 'security', ...])
   */
  listAvailableTypes(): string[] {
    return Object.keys(REVIEW_TYPE_NAMES);
  }

  /**
   * List all available templates grouped by category (languages, frameworks, reviewTypes).
   * Delegates to the template loader's directory scan.
   *
   * @returns Record of available templates by category
   */
  listAllTemplates(): Record<string, string[]> {
    return getSupportedTemplates();
  }
}

export default UnifiedPromptManager;
