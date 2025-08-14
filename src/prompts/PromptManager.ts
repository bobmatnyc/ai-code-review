/**
 * @fileoverview Prompt manager for loading and managing prompt templates.
 *
 * IMPORTANT: This module provides a singleton manager for prompt templates.
 * All core prompts are bundled with the package in bundledPrompts.ts.
 * The system prioritizes bundled prompts and only falls back to file system
 * prompts if a bundled prompt is not found.
 *
 * Custom prompts can still be provided via the promptFile option or by
 * registering custom templates programmatically.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { getSystemPrompt } from '../clients/utils/systemPrompts';
import type { ReviewOptions, ReviewType } from '../types/review';
import { getSchemaInstructions } from '../types/reviewSchema';
import { enhancePromptForDiagrams } from '../utils/diagramGenerator';
import logger from '../utils/logger';
import { getBundledPrompt } from './bundledPrompts';
import { PromptCache } from './cache/PromptCache';
import { PromptBuilder } from './PromptBuilder';
import { getConsolidatedSchemaInstructions } from './schemas/consolidated-review-schema';
import { getEvaluationSchemaInstructions } from './schemas/evaluation-schema';
import { getExtractPatternsSchemaInstructions } from './schemas/extract-patterns-schema';
import { PromptStrategyFactory } from './strategies/PromptStrategyFactory';

/**
 * Interface for prompt template metadata
 */
export interface PromptTemplateMetadata {
  /**
   * Name of the template
   */
  name: string;

  /**
   * Description of the template
   */
  description: string;

  /**
   * Version of the template
   */
  version: string;

  /**
   * Author of the template
   */
  author: string;

  /**
   * Language the template is designed for
   */
  language?: string;

  /**
   * Framework the template is designed for
   */
  framework?: string;

  /**
   * Review type the template is designed for
   */
  reviewType: ReviewType;

  /**
   * Tags associated with the template
   */
  tags?: string[];
}

/**
 * Interface for a prompt template
 */
export interface PromptTemplate {
  /**
   * Content of the template
   */
  content: string;

  /**
   * Metadata for the template
   */
  metadata: PromptTemplateMetadata;

  /**
   * Path to the template file
   */
  path: string;
}

/**
 * Singleton manager for prompt templates
 */
export class PromptManager {
  private static instance: PromptManager;
  private templates: Map<string, PromptTemplate> = new Map();
  private customTemplates: Map<string, PromptTemplate> = new Map();
  private promptCache: PromptCache;
  private promptBuilder: PromptBuilder;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize the prompt cache
    this.promptCache = PromptCache.getInstance();

    // Initialize the prompt builder
    this.promptBuilder = new PromptBuilder(this, this.promptCache);
  }

  /**
   * Get the singleton instance
   * @returns The prompt manager instance
   */
  static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  /**
   * Register a custom prompt template
   * @param template Prompt template to register
   */
  registerCustomTemplate(template: PromptTemplate): void {
    const key = this.getTemplateKey(template.metadata.reviewType, template.metadata.language);
    this.customTemplates.set(key, template);
    logger.info(`Registered custom prompt template: ${template.metadata.name}`);
  }

  /**
   * Get a template key based on review type, language, and framework
   * @param reviewType Type of review
   * @param language Programming language
   * @param framework Framework (optional)
   * @returns Template key
   */
  private getTemplateKey(reviewType: ReviewType, language?: string, framework?: string): string {
    if (language && framework) {
      return `${reviewType}:${language.toLowerCase()}:${framework.toLowerCase()}`;
    }
    if (language) {
      return `${reviewType}:${language.toLowerCase()}`;
    }
    return `${reviewType}`;
  }

  /**
   * Load custom prompt templates from a directory
   * @param templatesDir Directory containing templates
   *
   * IMPORTANT: This method is only for loading CUSTOM templates.
   * Core prompts are bundled with the package in bundledPrompts.ts.
   * This method should only be used for loading user-provided templates
   * that extend or override the bundled ones.
   */
  async loadTemplates(templatesDir: string): Promise<void> {
    try {
      // Check if the directory exists
      try {
        await fs.access(templatesDir);
      } catch (_error) {
        // Silently ignore missing templates directory - this is expected in most cases
        logger.debug(`Custom templates directory not found: ${templatesDir}`);
        return;
      }

      // Read the directory
      const files = await fs.readdir(templatesDir, { withFileTypes: true });

      // Track how many custom templates we load
      let customTemplatesLoaded = 0;

      // Process each file or directory
      for (const file of files) {
        const fullPath = path.join(templatesDir, file.name);

        if (file.isDirectory()) {
          // If it's a directory, recursively load templates from it
          await this.loadTemplates(fullPath);
        } else if (file.name.endsWith('.md')) {
          try {
            // Read the file content
            const content = await fs.readFile(fullPath, 'utf-8');

            // Extract metadata from the file content
            const metadata = this.extractMetadata(content, file.name);

            // Create a template object
            const template: PromptTemplate = {
              content,
              metadata,
              path: fullPath,
            };

            // Register the template
            const key = this.getTemplateKey(metadata.reviewType, metadata.language);
            this.templates.set(key, template);
            customTemplatesLoaded++;
            logger.debug(`Loaded custom prompt template: ${fullPath}`);
          } catch (error) {
            logger.error(
              `Error loading custom prompt template ${fullPath}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      if (customTemplatesLoaded > 0) {
        logger.info(`Loaded ${customTemplatesLoaded} custom prompt templates from ${templatesDir}`);
      }
    } catch (error) {
      logger.error(
        `Error loading custom prompt templates: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract metadata from a prompt template
   * @param content Template content
   * @param fileName Name of the template file
   * @returns Prompt template metadata
   */
  private extractMetadata(content: string, fileName: string): PromptTemplateMetadata {
    // Default metadata
    const defaultMetadata: PromptTemplateMetadata = {
      name: path.basename(fileName, '.md'),
      description: 'Prompt template for code review',
      version: '1.0.0',
      author: 'AI Code Review Tool',
      reviewType: this.getReviewTypeFromFileName(fileName),
    };

    // Try to extract metadata from the content
    const metadataMatch = content.match(/---\s*\n([\s\S]*?)\n---/);
    if (metadataMatch?.[1]) {
      try {
        const metadataLines = metadataMatch[1].split('\n');
        const metadata: Record<string, string | string[]> = {};

        for (const line of metadataLines) {
          const match = line.match(/^([^:]+):\s*(.*)$/);
          if (match) {
            const [, key, value] = match;
            if (key.trim() === 'tags') {
              metadata[key.trim()] = value.split(',').map((tag) => tag.trim());
            } else {
              metadata[key.trim()] = value.trim();
            }
          }
        }

        // Merge with default metadata
        return {
          ...defaultMetadata,
          ...metadata,
          reviewType: ((metadata.reviewType as string) || defaultMetadata.reviewType) as ReviewType,
        };
      } catch (error) {
        logger.warn(
          `Error parsing metadata from ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return defaultMetadata;
  }

  /**
   * Get review type from a file name
   * @param fileName Name of the template file
   * @returns Review type
   */
  private getReviewTypeFromFileName(fileName: string): ReviewType {
    const baseName = path.basename(fileName, '.md');

    if (baseName.includes('quick-fixes')) {
      return 'quick-fixes';
    }
    if (baseName.includes('security')) {
      return 'security';
    }
    if (baseName.includes('performance')) {
      return 'performance';
    }
    if (baseName.includes('architectural')) {
      return 'architectural';
    }
    if (baseName.includes('consolidated')) {
      return 'consolidated';
    }
    if (baseName.includes('best-practices')) {
      return 'best-practices';
    }
    if (baseName.includes('unused-code')) {
      return 'unused-code';
    }
    if (baseName.includes('code-tracing-unused-code')) {
      return 'code-tracing-unused-code';
    }
    return 'quick-fixes'; // Default to quick-fixes
  }

  /**
   * Get a prompt template with integrated system prompts
   * @param reviewType Type of review
   * @param options Review options
   * @returns Promise resolving to the prompt template content with system prompts
   *
   * IMPORTANT: This method prioritizes prompts in the following order:
   * 1. Custom prompt file specified in options
   * 2. Custom templates registered programmatically
   * 3. Bundled prompts (PRIMARY SOURCE)
   * 4. Custom templates loaded from the file system (FALLBACK ONLY)
   *
   * Core functionality should ALWAYS use bundled prompts to ensure
   * the system works correctly regardless of installation environment.
   */
  async getPromptTemplate(reviewType: ReviewType, options?: ReviewOptions): Promise<string> {
    // Get the language from options or default to typescript
    let language = 'typescript';
    const framework = options?.framework || 'generic';

    if (options?.language) {
      language = options.language.toLowerCase();
    }

    // Check if we should use a cached prompt
    if (options?.useCache !== false) {
      const cachedPrompt = this.promptCache.getBestPrompt(reviewType);
      if (cachedPrompt) {
        logger.info(
          `Using cached prompt for ${reviewType} review type (rating: ${cachedPrompt.rating})`,
        );
        return await this.processPromptTemplate(cachedPrompt.content, options);
      }
    }

    // If a custom prompt file is specified, try to load it first
    if (options?.promptFile) {
      try {
        const customPromptPath = path.resolve(options.promptFile);
        const promptTemplate = await fs.readFile(customPromptPath, 'utf-8');
        logger.info(`Loaded custom prompt template from ${customPromptPath}`);
        return await this.processPromptTemplate(promptTemplate, options);
      } catch (error) {
        logger.error(
          `Error loading custom prompt template: ${error instanceof Error ? error.message : String(error)}`,
        );
        logger.warn('Falling back to bundled prompt template');
      }
    }

    // Check if we have a custom template registered programmatically
    // First try with framework if detected
    if (framework && framework !== 'none') {
      const frameworkCustomKey = this.getTemplateKey(reviewType, language, framework);
      const frameworkCustomTemplate = this.customTemplates.get(frameworkCustomKey);
      if (frameworkCustomTemplate) {
        logger.info(
          `Using framework-specific custom prompt template: ${frameworkCustomTemplate.metadata.name}`,
        );
        return await this.processPromptTemplate(frameworkCustomTemplate.content, options);
      }
    }

    // Fall back to language-only template
    const customKey = this.getTemplateKey(reviewType, language);
    const customTemplate = this.customTemplates.get(customKey);
    if (customTemplate) {
      logger.info(`Using custom prompt template: ${customTemplate.metadata.name}`);
      return await this.processPromptTemplate(customTemplate.content, options);
    }

    // Use bundled prompts as the primary source
    // First try with framework if detected
    if (framework && framework !== 'none') {
      const frameworkBundledPrompt = getBundledPrompt(reviewType, language, framework);
      if (frameworkBundledPrompt) {
        logger.info(
          `Using bundled framework-specific prompt template for ${reviewType} (language: ${language}, framework: ${framework})`,
        );
        return await this.processPromptTemplate(frameworkBundledPrompt, options);
      }
    }

    // Fall back to language-only bundled template
    const bundledPrompt = getBundledPrompt(reviewType, language);
    if (bundledPrompt) {
      logger.debug(`Using bundled prompt template for ${reviewType} (language: ${language})`);
      return await this.processPromptTemplate(bundledPrompt, options);
    }

    // Try a generic bundled prompt without language specification
    const genericBundledPrompt = getBundledPrompt(reviewType);
    if (genericBundledPrompt) {
      logger.debug(`Using generic bundled prompt template for ${reviewType}`);
      return await this.processPromptTemplate(genericBundledPrompt, options);
    }

    // FALLBACK ONLY: If no bundled prompt is found, check custom templates from file system
    // This should rarely happen as all core prompts should be bundled
    logger.warn(`No bundled prompt found for ${reviewType}. Falling back to custom templates.`);

    // First try with framework if detected
    if (framework && framework !== 'none') {
      const frameworkKey = this.getTemplateKey(reviewType, language, framework);
      const frameworkTemplate = this.templates.get(frameworkKey);
      if (frameworkTemplate) {
        logger.warn(
          `Using framework-specific custom prompt template from file system: ${frameworkTemplate.path}`,
        );
        return await this.processPromptTemplate(frameworkTemplate.content, options);
      }
    }

    // Check if we have a custom template for this review type and language
    const key = this.getTemplateKey(reviewType, language);
    const template = this.templates.get(key);
    if (template) {
      logger.warn(`Using custom prompt template from file system: ${template.path}`);
      return await this.processPromptTemplate(template.content, options);
    }

    // Try to find a custom template for this review type without language
    const genericKey = this.getTemplateKey(reviewType);
    const genericTemplate = this.templates.get(genericKey);
    if (genericTemplate) {
      logger.warn(`Using generic custom prompt template from file system: ${genericTemplate.path}`);
      return await this.processPromptTemplate(genericTemplate.content, options);
    }

    // If we still don't have a template, throw an error
    logger.error(`No prompt template found for ${reviewType} (language: ${language})`);
    throw new Error(
      `No prompt template found for ${reviewType} (language: ${language}). Please ensure bundled prompts are properly included in the package.`,
    );
  }

  /**
   * Get a complete prompt with system instructions integrated
   * @param reviewType Type of review
   * @param options Review options
   * @returns Promise resolving to the complete prompt with system instructions
   */
  async getCompletePrompt(reviewType: ReviewType, options?: ReviewOptions): Promise<string> {
    // Get the processed prompt template
    const promptTemplate = await this.getPromptTemplate(reviewType, options);

    // Get the appropriate system prompt
    const systemPrompt = getSystemPrompt(reviewType, false, options);

    // Combine system prompt with user prompt
    // The system prompt should come first to set the context
    return `${systemPrompt}\n\n${promptTemplate}`;
  }

  /**
   * IMPORTANT: The loadPromptTemplateFromFileSystem method has been removed.
   * We now use bundled prompts as the PRIMARY AND ONLY SOURCE for prompts.
   *
   * All prompts are defined in the bundledPrompts.ts file and accessed through
   * the getBundledPrompt function. The system does NOT load prompts from the
   * file system anymore.
   *
   * If you need to add or modify prompts, you must update the bundledPrompts.ts file.
   */
  private async loadPromptTemplateFromFileSystem(
    _reviewType: ReviewType,
    _options?: ReviewOptions,
  ): Promise<string> {
    throw new Error(
      `The loadPromptTemplateFromFileSystem method has been removed. We now use bundled prompts as the PRIMARY AND ONLY SOURCE for prompts. All prompts are defined in the bundledPrompts.ts file and accessed through the getBundledPrompt function.`,
    );
  }

  /**
   * Calculate risk level based on confidence score
   * @param confidenceScore Confidence score from 0.0 to 1.0
   * @returns Risk level
   */
  private calculateRiskLevel(confidenceScore: number): string {
    if (confidenceScore >= 0.9) return 'CRITICAL';
    if (confidenceScore >= 0.8) return 'HIGH';
    if (confidenceScore >= 0.6) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Process a prompt template by replacing placeholders and integrating system prompts
   * @param promptTemplate The raw prompt template
   * @param options Review options
   * @returns The processed prompt template with system prompts integrated
   */
  private async processPromptTemplate(
    promptTemplate: string,
    options?: ReviewOptions,
  ): Promise<string> {
    // Check if this is a Handlebars template (from the new template system)
    const isHandlebarsTemplate =
      promptTemplate.includes('{{#if') ||
      promptTemplate.includes('{{/if') ||
      promptTemplate.includes('{{languageInstructions}}') ||
      promptTemplate.includes('{{schemaInstructions}}');

    // Prepare variables for templates
    const templateVars: Record<string, any> = {};

    // Add coding test configuration if available
    if (options?.codingTestConfig) {
      templateVars.assignment = options.codingTestConfig.assignment;
      templateVars.criteria = options.codingTestConfig.criteria;
      templateVars.scoring = options.codingTestConfig.scoring;
      templateVars.feedback = options.codingTestConfig.feedback;
      templateVars.constraints = options.codingTestConfig.constraints;

      // Add AI detection data from metadata if available and enabled
      if (options.codingTestConfig.aiDetection?.includeInReport && options.metadata?.aiDetection) {
        const aiDetectionMeta = options.metadata.aiDetection;
        templateVars.aiDetection = {
          isAIGenerated: aiDetectionMeta.isAIGenerated,
          confidenceScore: aiDetectionMeta.confidenceScore.toFixed(3),
          riskLevel: this.calculateRiskLevel(aiDetectionMeta.confidenceScore),
          patternsDetected: aiDetectionMeta.patternsDetected,
          highConfidencePatterns: aiDetectionMeta.highConfidencePatterns,
          analysisTime: aiDetectionMeta.analysisTime,
          analyzersUsed: aiDetectionMeta.analyzersUsed || [],
        };
      }
    }

    // If in interactive mode, include the schema instructions
    if (options?.interactive) {
      // Use specific schema based on review type
      let schemaInstructions: string;
      if (options?.type === 'consolidated') {
        schemaInstructions = getConsolidatedSchemaInstructions();
      } else if (options?.type === 'evaluation') {
        schemaInstructions = getEvaluationSchemaInstructions();
      } else if (options?.type === 'extract-patterns') {
        schemaInstructions = getExtractPatternsSchemaInstructions();
      } else {
        schemaInstructions = getSchemaInstructions();
      }

      if (isHandlebarsTemplate) {
        // For Handlebars templates, add as a variable
        templateVars.schemaInstructions = schemaInstructions;
        templateVars.SCHEMA_INSTRUCTIONS = schemaInstructions; // For backward compatibility
      } else {
        // For legacy templates, use string replacement
        promptTemplate = promptTemplate.replace('{{SCHEMA_INSTRUCTIONS}}', schemaInstructions);
      }
    } else {
      // Otherwise, remove the schema instructions placeholder for legacy templates
      if (!isHandlebarsTemplate) {
        promptTemplate = promptTemplate.replace('{{SCHEMA_INSTRUCTIONS}}', '');
      }
    }

    // Add language and framework-specific instructions if available
    if (options?.language) {
      let languageInstructions = `This code is written in ${options.language.toUpperCase()}.`;

      if (options?.framework && options.framework !== 'none') {
        languageInstructions += ` It uses the ${options.framework.toUpperCase()} framework. Please provide framework-specific advice.`;
      } else {
        languageInstructions += ` Please provide language-specific advice.`;
      }

      if (isHandlebarsTemplate) {
        // For Handlebars templates, add as a variable
        templateVars.languageInstructions = languageInstructions;
        templateVars.LANGUAGE_INSTRUCTIONS = languageInstructions; // For backward compatibility
      } else {
        // For legacy templates, use string replacement
        promptTemplate = promptTemplate.replace('{{LANGUAGE_INSTRUCTIONS}}', languageInstructions);
      }
    } else {
      // Remove placeholder from legacy templates
      if (!isHandlebarsTemplate) {
        promptTemplate = promptTemplate.replace('{{LANGUAGE_INSTRUCTIONS}}', '');
      }
    }

    // If this is a Handlebars template and we have variables, render it
    if (isHandlebarsTemplate && Object.keys(templateVars).length > 0) {
      try {
        const Handlebars = await import('handlebars');
        const template = Handlebars.default.compile(promptTemplate);
        promptTemplate = template(templateVars);
      } catch (error) {
        logger.error(`Error rendering Handlebars template: ${error}`);
        // Continue with unprocessed template if there's an error
      }
    }

    // Apply model-specific optimizations if a prompt strategy is specified
    if (options?.promptStrategy) {
      // Get the appropriate prompt strategy
      const strategy = PromptStrategyFactory.createStrategy(
        options.promptStrategy,
        this,
        this.promptCache,
      );

      // Format the prompt using the strategy
      promptTemplate = await Promise.resolve(strategy.formatPrompt(promptTemplate, options));

      logger.debug(`Applied ${options.promptStrategy} prompt strategy`);
    }

    // Add any prompt fragments if provided
    if (options?.promptFragments && options.promptFragments.length > 0) {
      // Clear the prompt builder
      this.promptBuilder.clear();

      // Add the base prompt as a component
      this.promptBuilder.addComponent({
        content: promptTemplate,
        position: 'middle',
        priority: 10,
      });

      // Add each fragment
      for (const fragment of options.promptFragments) {
        this.promptBuilder.addFragment(fragment.content, fragment.position, fragment.priority);
      }

      // Build the final prompt
      const finalPrompt = await this.promptBuilder.buildPrompt(
        options.type || 'quick-fixes',
        options,
        null,
        promptTemplate,
      );

      logger.debug(`Added ${options.promptFragments.length} prompt fragments`);

      promptTemplate = finalPrompt;
    }

    // Enhance prompt for diagram generation if requested
    if (options?.diagram && options.type === 'architectural') {
      const projectName = options.projectName || 'Project';
      const framework = options.framework || undefined;
      promptTemplate = enhancePromptForDiagrams(promptTemplate, options, projectName, framework);
      logger.debug('Enhanced prompt with diagram generation instructions');
    }

    return promptTemplate;
  }

  /**
   * List all available prompt templates
   * @returns Array of prompt template metadata
   */
  listTemplates(): PromptTemplateMetadata[] {
    const allTemplates: PromptTemplateMetadata[] = [];

    // Add built-in templates
    for (const template of this.templates.values()) {
      allTemplates.push(template.metadata);
    }

    // Add custom templates
    for (const template of this.customTemplates.values()) {
      allTemplates.push(template.metadata);
    }

    return allTemplates;
  }

  /**
   * Provide feedback on a prompt
   * @param reviewType Type of review
   * @param promptContent Content of the prompt
   * @param rating Rating of the prompt (1-5)
   * @param comments Comments on the prompt quality
   * @param positiveAspects Positive aspects of the prompt
   * @param negativeAspects Negative aspects of the prompt
   */
  async provideFeedback(
    reviewType: ReviewType,
    promptContent: string,
    rating: number,
    _comments?: string,
    _positiveAspects?: string[],
    _negativeAspects?: string[],
  ): Promise<void> {
    try {
      // Cache the prompt with the feedback
      await this.promptCache.cachePrompt(reviewType, promptContent, rating);

      logger.info(`Cached prompt for ${reviewType} review type with rating ${rating}`);
    } catch (error) {
      logger.error(
        `Error caching prompt: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
