/**
 * @fileoverview Strategy for unused code review.
 *
 * This module implements the strategy for unused code review, which identifies
 * and suggests removal of unused or dead code.
 */

import { BaseReviewStrategy } from './ReviewStrategy';
import { FileInfo, ReviewOptions, ReviewResult } from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';
import { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import logger from '../utils/logger';
import { PromptStrategyFactory } from '../prompts/strategies/PromptStrategyFactory';
import { PromptManager } from '../prompts/PromptManager';
import { PromptCache } from '../prompts/cache/PromptCache';
import { getUnusedCodeReviewFormatInstructions } from '../prompts/schemas/unused-code-schema';
import { getImprovedUnusedCodeReviewFormatInstructions } from '../prompts/schemas/improved-unused-code-schema';
import {
  formatUnusedCodeReviewAsMarkdown,
  generateRemovalScript
} from '../formatters/unusedCodeFormatter';

/**
 * Strategy for unused code review
 */
export class UnusedCodeReviewStrategy extends BaseReviewStrategy {
  /**
   * Create a new unused code review strategy
   */
  constructor() {
    super('unused-code');
  }

  /**
   * Execute the unused code review strategy
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
    apiClientConfig: ApiClientConfig
  ): Promise<ReviewResult> {
    logger.info(
      `Executing unused code review strategy for ${files.length} files...`
    );

    // Enhance options with LangChain-specific settings
    const enhancedOptions: ReviewOptions = {
      ...options,
      type: this.reviewType,
      // Use improved schema instructions if available, fall back to standard
      schemaInstructions: getImprovedUnusedCodeReviewFormatInstructions(),
      // Try to use the improved prompt template
      promptFile:
        options.language === 'typescript'
          ? `${process.cwd()}/prompts/typescript/improved-unused-code-review.md`
          : `${process.cwd()}/prompts/improved-unused-code-review.md`
    };

    // Use LangChain prompt strategy if available
    if (!enhancedOptions.promptStrategy) {
      enhancedOptions.promptStrategy = 'langchain';

      // Get LangChain prompt strategy
      const promptManager = PromptManager.getInstance();
      const promptCache = PromptCache.getInstance();
      const strategy = PromptStrategyFactory.createStrategy(
        'langchain',
        promptManager,
        promptCache
      );

      logger.info('Using LangChain prompt strategy for unused code review');
    }

    // Generate the review
    const reviewResult = await generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      enhancedOptions,
      apiClientConfig
    );

    // If we have a response and it's in JSON format, try to reformat it
    if (reviewResult.response && reviewResult.outputFormat === 'json') {
      try {
        // Parse the JSON response
        const parsedResult = JSON.parse(reviewResult.response);

        // If it's a valid result with the expected structure, format it
        if (
          parsedResult.highImpactIssues &&
          parsedResult.mediumImpactIssues &&
          parsedResult.lowImpactIssues
        ) {
          // Format the response using our specialized formatter
          const formattedMarkdown =
            formatUnusedCodeReviewAsMarkdown(parsedResult);

          // Also generate a removal script
          const removalScript = generateRemovalScript(parsedResult);

          // Update the response with our formatted version
          reviewResult.response = formattedMarkdown;
          reviewResult.outputFormat = 'markdown';

          // Store the removal script in the metadata
          if (!reviewResult.metadata) {
            reviewResult.metadata = {};
          }
          reviewResult.metadata.removalScript = removalScript;

          logger.info('Reformatted unused code review for improved usability');
        }
      } catch (error) {
        logger.warn('Failed to reformat unused code review response:', error);
        // Continue with the original response
      }
    }

    return reviewResult;
  }
}
