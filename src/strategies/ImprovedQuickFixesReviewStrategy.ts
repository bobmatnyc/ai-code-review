/**
 * @fileoverview Strategy for improved quick fixes review using LangChain.
 *
 * This module implements the strategy for quick fixes review with LangChain
 * integration for enhanced prompt management and structured output.
 */

import path from 'node:path';
import type { ApiClientConfig } from '../core/ApiClientSelector';
import { PromptCache } from '../prompts/cache/PromptCache';
import { PromptManager } from '../prompts/PromptManager';
import { getQuickFixesReviewFormatInstructions } from '../prompts/schemas/quick-fixes-schema';
import { PromptStrategyFactory } from '../prompts/strategies/PromptStrategyFactory';
import type { FileInfo, ReviewOptions, ReviewResult } from '../types/review';
import { collectCIData } from '../utils/ciDataCollector';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import { ConsolidatedReviewStrategy } from './ConsolidatedReviewStrategy';

/**
 * Strategy for improved quick fixes review using LangChain
 */
export class ImprovedQuickFixesReviewStrategy extends ConsolidatedReviewStrategy {
  /**
   * Create a new improved quick fixes review strategy
   */
  constructor() {
    super('quick-fixes');
  }

  /**
   * Execute the improved quick fixes review strategy
   * @param files Files to review
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to review result
   */
  async execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult> {
    logger.info(`Executing improved quick fixes review strategy for ${files.length} files...`);

    // Collect CI data if reviewing TypeScript files
    let ciData;
    if (
      options.language === 'typescript' ||
      files.some((f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
    ) {
      logger.info('Collecting CI data for TypeScript project...');
      ciData = await collectCIData(process.cwd());
    }

    // Determine appropriate prompt file based on language
    let promptFile: string;
    if (options.language) {
      // Try language-specific improved prompt first
      promptFile = path.resolve(
        process.cwd(),
        'prompts',
        options.language.toLowerCase(),
        'improved-quick-fixes-review.md',
      );

      // Fallback to general improved prompt
      const fallbackPromptFile = path.resolve(
        process.cwd(),
        'prompts',
        'improved-quick-fixes-review.md',
      );

      // Set final promptFile value
      promptFile = promptFile || fallbackPromptFile;
    } else {
      // Default to general improved prompt
      promptFile = path.resolve(process.cwd(), 'prompts', 'improved-quick-fixes-review.md');
    }

    // Enhance options with LangChain-specific settings
    const enhancedOptions: ReviewOptions = {
      ...options,
      type: this.reviewType,
      schemaInstructions: getQuickFixesReviewFormatInstructions(),
      promptFile: promptFile,
      ciData: ciData,
    };

    // Use LangChain prompt strategy if available
    if (!enhancedOptions.promptStrategy) {
      enhancedOptions.promptStrategy = 'langchain';

      // Get LangChain prompt strategy
      const promptManager = PromptManager.getInstance();
      const promptCache = PromptCache.getInstance();
      PromptStrategyFactory.createStrategy('langchain', promptManager, promptCache);

      logger.info('Using LangChain prompt strategy for improved quick fixes review');
    }

    // Generate the review
    return super.execute(files, projectName, projectDocs, enhancedOptions, apiClientConfig);
  }
}
