/**
 * @fileoverview Handler for individual file code reviews.
 *
 * This module implements the individual file review functionality, which analyzes each file
 * separately to provide detailed feedback. It coordinates with the appropriate AI client
 * based on available API keys and user preferences.
 */

import path from 'path';
import fs from 'fs/promises';
import { ReviewOptions, ReviewType } from '../types/review';
import { generateReview } from '../clients/geminiClient';
import { generateOpenRouterReview, initializeAnyOpenRouterModel } from '../clients/openRouterClient';
import { generateAnthropicReview, initializeAnthropicClient } from '../clients/anthropicClient';
import { formatReviewOutput } from '../formatters/outputFormatter';
import { logError } from '../utils/errorLogger';
import { readProjectDocs } from '../utils/projectDocs';
import { createDirectory, generateVersionedOutputPath } from '../utils/fileSystem';
import { displayReviewResults } from '../utils/reviewActionHandler';
import logger from '../utils/logger';

// Import the getApiKeyType function from a shared utilities file
import { getApiKeyType } from '../utils/apiUtils';

/**
 * Handle individual file reviews
 * @param project Project name
 * @param projectPath Absolute path to the project
 * @param filesToReview Array of file paths to review
 * @param outputBaseDir Base directory for output
 * @param options Review options
 */
export async function handleIndividualFileReviews(
  _project: string, // Unused but kept for consistency
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions
): Promise<void> {
  // Read project documentation if enabled
  let projectDocs = null;
  if (options.includeProjectDocs) {
    logger.info('Reading project documentation...');
    projectDocs = await readProjectDocs(projectPath);
  }

  // Process each file
  for (const filePath of filesToReview) {
    try {
      // Get relative path from project root
      const relativePath = path.relative(projectPath, filePath);
      logger.info(`Reviewing: ${relativePath}`);

      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');

      try {
        // Generate review
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

          review = await generateOpenRouterReview(
            fileContent,
            filePath,
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

          review = await generateReview(
            fileContent,
            filePath,
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

          review = await generateAnthropicReview(
            fileContent,
            filePath,
            options.type as ReviewType,
            projectDocs,
            options
          );
        } else {
          // No API keys available, use mock responses
          logger.warn('No API keys available. Using mock responses.');
          review = await generateReview(
            fileContent,
            filePath,
            options.type as ReviewType,
            projectDocs,
            options
          );
        }

        // Create the output directory for this file
        const fileOutputDir = path.join(outputBaseDir, path.dirname(relativePath));
        await createDirectory(fileOutputDir);

        // Generate a versioned output path for this file
        const extension = options.output === 'json' ? '.json' : '.md';
        const baseName = path.basename(relativePath, path.extname(relativePath));

        const outputPath = await generateVersionedOutputPath(
          fileOutputDir,
          `${options.type}-review`,
          extension,
          modelName,
          baseName
        );

        // Format and save the review
        const formattedOutput = formatReviewOutput(review, options.output);

        try {
          await fs.writeFile(outputPath, formattedOutput);
          logger.info(`Review saved to: ${outputPath}`);

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

            logger.error(`Error saving review to ${outputPath}:`);
            logger.error(`  Message: ${error.message}`);
            logger.error(`  Error details logged to: ${errorLogPath}`);
          } else {
            logger.error(`Unknown error saving review: ${String(error)}`);
          }
        }
      } catch (apiError: unknown) {
        if (apiError instanceof Error) {
          // Log the error
          const errorLogPath = await logError(apiError, {
            filePath,
            reviewType: options.type,
            operation: 'generateReview'
          });

          // Check if it's a rate limit error
          if (apiError.message && apiError.message.includes('Rate limit exceeded')) {
            logger.error('Rate limit exceeded. The review will continue with a fallback model.');
            logger.error(`Error details logged to: ${errorLogPath}`);
            logger.error('You can try again later or reduce the number of files being reviewed.');
          } else {
            logger.error(`Error generating review for ${filePath}:`);
            logger.error(`  Message: ${apiError.message}`);
            logger.error(`  Error details logged to: ${errorLogPath}`);
          }
        } else {
          logger.error(`Unknown error generating review for ${filePath}: ${String(apiError)}`);
        }
      }
    } catch (fileError: unknown) {
      if (fileError instanceof Error) {
        logger.error(`Error processing file ${filePath}: ${fileError.message}`);
      } else {
        logger.error(`Unknown error processing file ${filePath}: ${String(fileError)}`);
      }
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
