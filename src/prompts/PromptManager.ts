/**
 * @fileoverview Prompt manager for loading and managing prompt templates.
 *
 * This module provides a singleton manager for loading prompt templates from
 * various sources, including the file system and custom user-provided files.
 */

import path from 'path';
import fs from 'fs/promises';
import { ReviewType, ReviewOptions } from '../types/review';
import logger from '../utils/logger';
import { getSchemaInstructions } from '../types/reviewSchema';
import { PromptBuilder } from './PromptBuilder';
import { PromptCache } from './cache/PromptCache';
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
   * Get a template key based on review type and language
   * @param reviewType Type of review
   * @param language Programming language
   * @returns Template key
   */
  private getTemplateKey(reviewType: ReviewType, language?: string): string {
    return language ? `${reviewType}:${language.toLowerCase()}` : `${reviewType}`;
  }

  /**
   * Load prompt templates from a directory
   * @param templatesDir Directory containing templates
   */
  async loadTemplates(templatesDir: string): Promise<void> {
    try {
      // Check if the directory exists
      try {
        await fs.access(templatesDir);
      } catch (error) {
        logger.warn(`Templates directory not found: ${templatesDir}`);
        return;
      }

      // Read the directory
      const files = await fs.readdir(templatesDir, { withFileTypes: true });

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
              path: fullPath
            };

            // Register the template
            const key = this.getTemplateKey(metadata.reviewType, metadata.language);
            this.templates.set(key, template);
            logger.debug(`Loaded prompt template: ${fullPath}`);
          } catch (error) {
            logger.error(`Error loading prompt template ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      logger.info(`Loaded ${this.templates.size} prompt templates from ${templatesDir}`);
    } catch (error) {
      logger.error(`Error loading prompt templates: ${error instanceof Error ? error.message : String(error)}`);
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
      reviewType: this.getReviewTypeFromFileName(fileName)
    };

    // Try to extract metadata from the content
    const metadataMatch = content.match(/---\s*\n([\s\S]*?)\n---/);
    if (metadataMatch && metadataMatch[1]) {
      try {
        const metadataLines = metadataMatch[1].split('\n');
        const metadata: Record<string, string | string[]> = {};

        for (const line of metadataLines) {
          const match = line.match(/^([^:]+):\s*(.*)$/);
          if (match) {
            const [, key, value] = match;
            if (key.trim() === 'tags') {
              metadata[key.trim()] = value.split(',').map(tag => tag.trim());
            } else {
              metadata[key.trim()] = value.trim();
            }
          }
        }

        // Merge with default metadata
        return {
          ...defaultMetadata,
          ...metadata,
          reviewType: (metadata.reviewType as string || defaultMetadata.reviewType) as ReviewType
        };
      } catch (error) {
        logger.warn(`Error parsing metadata from ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
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
    } else if (baseName.includes('security')) {
      return 'security';
    } else if (baseName.includes('performance')) {
      return 'performance';
    } else if (baseName.includes('architectural')) {
      return 'architectural';
    } else if (baseName.includes('consolidated')) {
      return 'consolidated';
    } else {
      return 'quick-fixes'; // Default to quick-fixes
    }
  }

  /**
   * Get a prompt template
   * @param reviewType Type of review
   * @param options Review options
   * @returns Promise resolving to the prompt template content
   */
  async getPromptTemplate(reviewType: ReviewType, options?: ReviewOptions): Promise<string> {
    // Get the language from options or default to typescript
    let language = 'typescript';

    if (options?.language) {
      language = options.language.toLowerCase();
    }

    // Check if we should use a cached prompt
    if (options?.useCache !== false) {
      const cachedPrompt = this.promptCache.getBestPrompt(reviewType);
      if (cachedPrompt) {
        logger.info(`Using cached prompt for ${reviewType} review type (rating: ${cachedPrompt.rating})`);
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
        logger.error(`Error loading custom prompt template: ${error instanceof Error ? error.message : String(error)}`);
        logger.warn('Falling back to default prompt template');
      }
    }

    // Check if we have a custom template registered
    const customKey = this.getTemplateKey(reviewType, language);
    const customTemplate = this.customTemplates.get(customKey);
    if (customTemplate) {
      logger.info(`Using custom prompt template: ${customTemplate.metadata.name}`);
      return await this.processPromptTemplate(customTemplate.content, options);
    }

    // Check if we have a template for this review type and language
    const key = this.getTemplateKey(reviewType, language);
    const template = this.templates.get(key);
    if (template) {
      logger.debug(`Using prompt template: ${template.path}`);
      return await this.processPromptTemplate(template.content, options);
    }

    // Try to find a template for this review type without language
    const genericKey = this.getTemplateKey(reviewType);
    const genericTemplate = this.templates.get(genericKey);
    if (genericTemplate) {
      logger.debug(`Using generic prompt template: ${genericTemplate.path}`);
      return await this.processPromptTemplate(genericTemplate.content, options);
    }

    // If we still don't have a template, try to load it from the file system
    return this.loadPromptTemplateFromFileSystem(reviewType, options);
  }

  /**
   * Load a prompt template from the file system
   * @param reviewType Type of review
   * @param options Review options
   * @returns Promise resolving to the prompt template content
   */
  private async loadPromptTemplateFromFileSystem(reviewType: ReviewType, options?: ReviewOptions): Promise<string> {
    // Get the language from options or default to typescript
    let language = 'typescript';

    if (options?.language) {
      language = options.language.toLowerCase();
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
    return await this.processPromptTemplate(promptTemplate, options);
  }

  /**
   * Process a prompt template by replacing placeholders
   * @param promptTemplate The raw prompt template
   * @param options Review options
   * @returns The processed prompt template
   */
  private async processPromptTemplate(
    promptTemplate: string,
    options?: ReviewOptions
  ): Promise<string> {
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

    // Apply model-specific optimizations if a prompt strategy is specified
    if (options?.promptStrategy) {
      // Get the appropriate prompt strategy
      const strategy = PromptStrategyFactory.createStrategy(
        options.promptStrategy,
        this,
        this.promptCache
      );

      // Format the prompt using the strategy
      promptTemplate = strategy.formatPrompt(promptTemplate, options);

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
        priority: 10
      });

      // Add each fragment
      for (const fragment of options.promptFragments) {
        this.promptBuilder.addFragment(
          fragment.content,
          fragment.position,
          fragment.priority
        );
      }

      // Build the final prompt
      const finalPrompt = await this.promptBuilder.buildPrompt(
        options.type || 'quick-fixes',
        options,
        null,
        promptTemplate
      );

      logger.debug(`Added ${options.promptFragments.length} prompt fragments`);

      return finalPrompt;
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
    comments?: string,
    positiveAspects?: string[],
    negativeAspects?: string[]
  ): Promise<void> {
    try {
      // Cache the prompt with the feedback
      await this.promptCache.cachePrompt(reviewType, promptContent, rating);

      logger.info(`Cached prompt for ${reviewType} review type with rating ${rating}`);
    } catch (error) {
      logger.error(`Error caching prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
