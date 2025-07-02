/**
 * @fileoverview Strategy for focused unused code review.
 *
 * This module implements a strategy specifically for detecting unused code
 * elements like unused files, functions, classes, and variables.
 */

import path from 'path';
import type { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import {
  formatFocusedUnusedCodeReviewAsMarkdown,
  generateFocusedRemovalScript,
} from '../formatters/focusedUnusedCodeFormatter';
import { getFocusedUnusedCodeReviewFormatInstructions } from '../prompts/schemas/focused-unused-code-schema';
import type { FileInfo, ReviewOptions, ReviewResult } from '../types/review';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import { BaseReviewStrategy } from './ReviewStrategy';

/**
 * Strategy for focused unused code review
 */
export class FocusedUnusedCodeReviewStrategy extends BaseReviewStrategy {
  /**
   * Create a new focused unused code review strategy
   */
  constructor() {
    super('unused-code');
  }

  /**
   * Execute the focused unused code review strategy
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
    logger.info(`Executing focused unused code review strategy for ${files.length} files...`);

    // Select the prompt file based on language
    let promptFile: string;
    if (options.language) {
      promptFile = path.resolve(
        process.cwd(),
        'prompts',
        options.language.toLowerCase(),
        'focused-unused-code-review.md',
      );
    } else {
      promptFile = path.resolve(process.cwd(), 'prompts', 'focused-unused-code-review.md');
    }

    // Enhance options with LangChain-specific settings
    const enhancedOptions: ReviewOptions = {
      ...options,
      type: this.reviewType,
      promptFile: promptFile,
      schemaInstructions: getFocusedUnusedCodeReviewFormatInstructions(),
      promptStrategy: 'langchain',
    };

    // Generate the review
    const reviewResult = await generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      enhancedOptions,
      apiClientConfig,
    );

    // If we have a response and it's in JSON format, try to reformat it
    if (reviewResult.response && reviewResult.outputFormat === 'json') {
      try {
        // Parse the JSON response
        const parsedResult =
          typeof reviewResult.response === 'string'
            ? JSON.parse(reviewResult.response)
            : reviewResult.response;

        // Check if it's a valid result with the expected structure
        if (
          parsedResult.unusedFiles &&
          parsedResult.unusedFunctions &&
          parsedResult.unusedClasses &&
          parsedResult.summary
        ) {
          // Format the response using our specialized formatter
          const formattedMarkdown = formatFocusedUnusedCodeReviewAsMarkdown(parsedResult);

          // Generate a removal script
          const removalScript = generateFocusedRemovalScript(parsedResult);

          // Update the response with our formatted version
          reviewResult.content = formattedMarkdown;
          reviewResult.outputFormat = 'markdown';

          // Store the removal script in the metadata
          if (!reviewResult.metadata) {
            reviewResult.metadata = {};
          }
          reviewResult.metadata.removalScript = removalScript;

          logger.info('Reformatted focused unused code review for improved usability');
        }
      } catch (error) {
        logger.warn('Failed to reformat focused unused code review response:', error);
        // Continue with the original response
      }
    }

    return reviewResult;
  }
}
