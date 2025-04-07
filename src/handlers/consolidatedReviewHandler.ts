/**
 * @fileoverview Handler for consolidated code reviews.
 *
 * This module implements the consolidated review functionality, which analyzes multiple files
 * together to provide a comprehensive review of the codebase. It coordinates with the
 * appropriate AI client based on available API keys and user preferences.
 */

import path from 'path';
import fs from 'fs/promises';
import { ReviewOptions, ReviewType, FileInfo } from '../types/review';
import { generateConsolidatedReview } from '../clients/geminiClient';
import { generateOpenRouterConsolidatedReview, initializeAnyOpenRouterModel } from '../clients/openRouterClient';
import { generateAnthropicConsolidatedReview, initializeAnthropicClient } from '../clients/anthropicClient';
import { generateOpenAIConsolidatedReview, initializeAnyOpenAIModel } from '../clients/openaiClient';
import { formatReviewOutput } from '../formatters/outputFormatter';
import { logError } from '../utils/errorLogger';
import { readProjectDocs } from '../utils/projectDocs';
import { generateVersionedOutputPath } from '../utils/fileSystem';
import { displayReviewResults } from '../utils/reviewActionHandler';
import logger from '../utils/logger';

// Import the getApiKeyType function from a shared utilities file
import { getApiKeyType } from '../utils/apiUtils';

/**
 * Handle consolidated review for multiple files
 * @param project - The project name
 * @param projectPath - The absolute path to the project
 * @param filesToReview - An array of file paths to review
 * @param outputBaseDir - The base directory for output
 * @param options - Review options including type, output format, and interactive mode
 * @param originalTarget - The original target path specified by the user
 * @returns Promise that resolves when the review is complete
 */
export async function handleConsolidatedReview(
  project: string,
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions,
  originalTarget: string = ''
): Promise<void> {
  logger.info(`Generating consolidated review for ${filesToReview.length} files...`);

  // Read project documentation if enabled
  let projectDocs = null;
  if (options.includeProjectDocs) {
    logger.info('Reading project documentation...');
    projectDocs = await readProjectDocs(projectPath);
  }

  // Collect file information
  const fileInfos: FileInfo[] = [];

  for (const filePath of filesToReview) {
    try {
      // Get relative path from project root
      const relativePath = path.relative(projectPath, filePath);

      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Add to file infos
      fileInfos.push({
        path: filePath,
        relativePath,
        content: fileContent
      });
    } catch (error) {
      logger.error(`Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    // Generate consolidated review
    let review;

    // Check which API key is available based on the model specified in environment variables
    const apiKeyType = getApiKeyType();
    const modelName = process.env.AI_CODE_REVIEW_MODEL?.split(':')[1] || '';

    // Use the appropriate API client based on the available API key
    if (apiKeyType === 'OpenRouter') {
      // Check if we have a valid model name
      if (!modelName) {
        logger.error('No OpenRouter model specified in environment variables.');
        logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
        logger.error('Example: AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-opus');
        process.exit(1);
      }

      logger.info(`Using OpenRouter model: ${modelName}`);

      // Initialize OpenRouter model if needed
      await initializeAnyOpenRouterModel();

      review = await generateOpenRouterConsolidatedReview(
        fileInfos,
        project,
        options.type as ReviewType,
        projectDocs,
        options
      );
    } else if (apiKeyType === 'Google') {
      // Check if we have a valid model name
      if (!modelName) {
        logger.error('No Gemini model specified in environment variables.');
        logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
        logger.error('Example: AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro');
        process.exit(1);
      }

      logger.info(`Using Gemini API with model: ${modelName}`);

      review = await generateConsolidatedReview(
        fileInfos,
        project,
        options.type as ReviewType,
        projectDocs,
        options
      );
    } else if (apiKeyType === 'Anthropic') {
      // Check if we have a valid model name
      if (!modelName) {
        logger.error('No Anthropic model specified in environment variables.');
        logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
        logger.error('Example: AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus');
        process.exit(1);
      }

      logger.info(`Using Anthropic API with model: ${modelName}`);

      // Initialize Anthropic model if needed
      await initializeAnthropicClient();

      review = await generateAnthropicConsolidatedReview(
        fileInfos,
        project,
        options.type as ReviewType,
        projectDocs,
        options
      );
    } else if (apiKeyType === 'OpenAI') {
      // Check if we have a valid model name
      if (!modelName) {
        logger.error('No OpenAI model specified in environment variables.');
        logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
        logger.error('Example: AI_CODE_REVIEW_MODEL=openai:gpt-4o');
        process.exit(1);
      }

      logger.info(`Using OpenAI API with model: ${modelName}`);

      // Initialize OpenAI model if needed
      await initializeAnyOpenAIModel();

      review = await generateOpenAIConsolidatedReview(
        fileInfos,
        project,
        options.type as ReviewType,
        projectDocs,
        options
      );
    } else {
      // No API keys available, use mock responses
      logger.warn('No API keys available. Using mock responses.');
      review = await generateConsolidatedReview(
        fileInfos,
        project,
        options.type as ReviewType,
        projectDocs,
        options
      );
    }

    // Generate a versioned output path
    const extension = options.output === 'json' ? '.json' : '.md';

    // Get the target name (last part of the path)
    const targetName = path.basename(originalTarget || 'unknown');

    const outputPath = await generateVersionedOutputPath(
      outputBaseDir,
      options.type + '-review',
      extension,
      modelName,
      targetName
    );

    // Format and save the review
    const formattedOutput = formatReviewOutput(review, options.output);

    try {
      await fs.writeFile(outputPath, formattedOutput);
      logger.info(`Consolidated review saved to: ${outputPath}`);

      // If interactive mode is enabled, display the review results without prompting
      if (options.interactive) {
        logger.info('\nDisplaying review results in interactive mode...');

        // Read the review content
        const reviewContent = await fs.readFile(outputPath, 'utf-8');

        // Get the priority filter from the command line arguments or options
        const priorityFilter = getPriorityFilterFromArgs(options);

        // Display the review results without prompting
        const results = await displayReviewResults(
          reviewContent,
          projectPath,
          priorityFilter
        );

        // Print summary
        logger.info('\n--- Review Summary ---');
        logger.info(`Total issues found: ${results.totalSuggestions}`);
        logger.info(`High priority issues: ${results.highPrioritySuggestions.length}`);
        logger.info(`Medium priority issues: ${results.mediumPrioritySuggestions.length}`);
        logger.info(`Low priority issues: ${results.lowPrioritySuggestions.length}`);
        logger.info('----------------------');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorLogPath = await logError(error, {
          operation: 'writeFile',
          outputPath,
          reviewType: options.type
        });

        logger.error(`Error saving consolidated review to ${outputPath}:`);
        logger.error(`  Message: ${error.message}`);
        logger.error(`  Error details logged to: ${errorLogPath}`);
      } else {
        logger.error(`Unknown error saving consolidated review: ${String(error)}`);
      }
    }
  } catch (apiError: unknown) {
    if (apiError instanceof Error) {
      // Log the error
      const errorLogPath = await logError(apiError, {
        project,
        reviewType: options.type,
        operation: 'generateConsolidatedReview',
        fileCount: fileInfos.length
      });

      // Check if it's a rate limit error
      if (apiError.message && apiError.message.includes('Rate limit exceeded')) {
        logger.error('Rate limit exceeded. The review will continue with a fallback model.');
        logger.error(`Error details logged to: ${errorLogPath}`);
        logger.error('You can try again later or reduce the number of files being reviewed.');
      } else {
        logger.error(`Error generating consolidated review:`);
        logger.error(`  Message: ${apiError.message}`);
        logger.error(`  Error details logged to: ${errorLogPath}`);
      }
    } else {
      logger.error(`Unknown error generating consolidated review: ${String(apiError)}`);
    }
  }
}

/**
 * Get the priority filter from command line arguments or options
 * @param options Review options that may contain the priority filter
 * @returns The priority filter (h, m, l, or a) or undefined if not specified
 */
function getPriorityFilterFromArgs(options?: ReviewOptions): 'h' | 'm' | 'l' | 'a' | undefined {
  // First check if the interactive option is a string (priority filter)
  if (options && typeof options.interactive === 'string' && ['h', 'm', 'l', 'a'].includes(options.interactive)) {
    return options.interactive as 'h' | 'm' | 'l' | 'a';
  }

  // Otherwise check if there's a priority filter argument after --interactive
  const args = process.argv;
  const interactiveIndex = args.findIndex(arg => arg === '--interactive' || arg === '-i');

  if (interactiveIndex !== -1 && interactiveIndex < args.length - 1) {
    const nextArg = args[interactiveIndex + 1];
    // Check if the next argument is a priority filter and not another option
    if (['h', 'm', 'l', 'a'].includes(nextArg) && !nextArg.startsWith('-')) {
      return nextArg as 'h' | 'm' | 'l' | 'a';
    }
  }

  return undefined;
}
