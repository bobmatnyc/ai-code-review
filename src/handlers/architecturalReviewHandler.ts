/**
 * @fileoverview Handler for architectural code reviews.
 *
 * This module implements the architectural review functionality, which analyzes the entire
 * codebase structure to provide insights about architecture, patterns, and organization.
 * It coordinates with the appropriate AI client based on available API keys and user preferences.
 */

import fs from 'fs/promises';
import path from 'path';
import {
  generateArchitecturalAnthropicReview,
  initializeAnthropicClient,
} from '../clients/anthropicClientWrapper';
// Import all clients statically to avoid dynamic import issues in bundled builds
import { generateArchitecturalReview } from '../clients/geminiClient';
import {
  generateOpenAIArchitecturalReview,
  initializeAnyOpenAIModel,
} from '../clients/openaiClientWrapper';
import {
  generateOpenRouterConsolidatedReview,
  initializeAnyOpenRouterModel,
} from '../clients/openRouterClient';
import { addFileTreeToReview } from '../core/OutputManager';
import { formatReviewOutput } from '../formatters/outputFormatter';
import type { FileInfo, ReviewOptions, ReviewType } from '../types/review';
// Import the getApiKeyType function from a shared utilities file
import { getApiKeyType } from '../utils/api/apiUtils';
import { logError } from '../utils/errorLogger';
import { generateVersionedOutputPath } from '../utils/fileSystem';
import logger from '../utils/logger';
import { readProjectDocs } from '../utils/projectDocs';
import { displayReviewResults } from '../utils/reviewActionHandler';

// Package security analyzer is dynamically imported

/**
 * Handle architectural review for the entire codebase
 * @param project - The project name
 * @param projectPath - The absolute path to the project
 * @param filesToReview - An array of file paths to review
 * @param outputBaseDir - The base directory for output
 * @param options - Review options including output format and interactive mode
 * @param originalTarget - The original target path specified by the user
 * @returns Promise that resolves when the review is complete
 */
export async function handleArchitecturalReview(
  project: string,
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions,
  originalTarget = '',
): Promise<void> {
  logger.info('Performing architectural review of the entire codebase...');
  logger.info('****** DEPENDENCY ANALYSIS WILL BE PERFORMED AUTOMATICALLY ******');
  logger.info(
    `Dependency analysis is ${options.includeDependencyAnalysis !== false ? 'ENABLED' : 'DISABLED'}`,
  );
  logger.info('*****************************************************************');

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
        content: fileContent,
      });
    } catch (error) {
      logger.error(
        `Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Read project documentation if enabled
  let projectDocs = null;
  if (options.includeProjectDocs) {
    logger.info('Reading project documentation...');
    projectDocs = await readProjectDocs(projectPath);
  }

  try {
    // Generate architectural review
    let review;

    // Check which API key is available based on the model specified in environment variables
    const apiKeyType = getApiKeyType();
    const modelFromOptions = options.model || process.env.AI_CODE_REVIEW_MODEL || '';
    const modelName = modelFromOptions.split(':')[1] || '';

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
        'architectural' as ReviewType,
        projectDocs,
        options,
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

      review = await generateArchitecturalReview(fileInfos, project, projectDocs, options);
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

      review = await generateArchitecturalAnthropicReview(fileInfos, project, projectDocs, options);
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

      review = await generateOpenAIArchitecturalReview(fileInfos, project, projectDocs, options);
    } else {
      // No API keys available, use mock responses
      logger.warn('No API keys available. Using mock responses.');
      review = await generateArchitecturalReview(fileInfos, project, projectDocs, options);
    }

    // Generate a versioned output path
    const extension = options.output === 'json' ? '.json' : '.md';

    // Get the target name (last part of the path)
    const targetName = path.basename(originalTarget || 'unknown');

    const outputPath = await generateVersionedOutputPath(
      outputBaseDir,
      'architectural-review',
      extension,
      modelName,
      targetName,
    );

    // Format with the standard formatter
    let formattedOutput = formatReviewOutput(review, options.output || 'markdown');

    // For architectural reviews, dependency analysis is now handled by the OutputManager
    // This ensures consistent behavior across different review types
    // The OutputManager will run the dependency analysis after file tree is added
    // and before the review is written to disk

    // We keep this flag here for backward compatibility and logging purposes
    const includeDependencyAnalysis = options.includeDependencyAnalysis !== false;
    console.log(
      `=========== DEPENDENCY ANALYSIS ${includeDependencyAnalysis ? 'ENABLED' : 'DISABLED'} ===========`,
    );
    logger.info(
      `=========== DEPENDENCY ANALYSIS ${includeDependencyAnalysis ? 'ENABLED' : 'DISABLED'} ===========`,
    );

    // Check project path for logging purposes
    if (includeDependencyAnalysis) {
      if (!projectPath) {
        logger.error('Project path is undefined or empty for dependency analysis');
      } else {
        try {
          // Check if the directory exists - just for logging/debugging
          const exists = await fs
            .access(projectPath)
            .then(() => true)
            .catch(() => false);
          logger.info(`Project directory exists: ${exists}, path: ${projectPath}`);

          // Check for package.json as a sanity check
          const testPath = path.join(projectPath, 'package.json');
          const packageJsonExists = await fs
            .access(testPath)
            .then(() => true)
            .catch(() => false);
          logger.info(`package.json exists: ${packageJsonExists}, path: ${testPath}`);

          logger.info('Dependency analysis will be performed by OutputManager');
        } catch (fsError) {
          logger.error(`File system error checking project path: ${fsError}`);
        }
      }
    } else {
      logger.info('Dependency analysis is disabled in options');
    }

    // Now add file tree using the new helper function in OutputManager
    try {
      // Log file info debug info
      logger.debug(`File info count: ${fileInfos.length}`);
      fileInfos.forEach((file, i) => {
        logger.debug(`File ${i + 1}: ${file.path} (${file.relativePath || 'no relative path'})`);
      });

      // Instead of using a specific formatter, use our generic implementation
      // that works for all review types
      formattedOutput = addFileTreeToReview(
        formattedOutput,
        fileInfos,
        options.output || 'markdown',
      );
      logger.info('Added file tree to architectural review');
    } catch (error) {
      // Fall back to standard formatter if file tree addition fails
      logger.warn(
        `Could not add file tree to review: ${error instanceof Error ? error.message : String(error)}`,
      );
      logger.warn(
        `Error stack: ${error instanceof Error && error.stack ? error.stack : 'No stack available'}`,
      );
    }

    try {
      await fs.writeFile(outputPath, formattedOutput);
      logger.info(`Architectural review saved to: ${outputPath}`);

      // If interactive mode is enabled, display the review results without prompting
      if (options.interactive) {
        logger.info('\nDisplaying review results in interactive mode...');

        // Read the review content
        const reviewContent = await fs.readFile(outputPath, 'utf-8');

        // Get the priority filter from the command line arguments or options
        const priorityFilter = getPriorityFilterFromArgs(options);

        // Display the review results without prompting
        const results = await displayReviewResults(reviewContent, projectPath, priorityFilter);

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
          reviewType: 'architectural',
        });

        logger.error(`Error saving architectural review to ${outputPath}:`);
        logger.error(`  Message: ${error.message}`);
        logger.error(`  Error details logged to: ${errorLogPath}`);
      } else {
        logger.error(`Unknown error saving architectural review: ${String(error)}`);
      }
    }
  } catch (apiError: unknown) {
    if (apiError instanceof Error) {
      // Log the error
      const errorLogPath = await logError(apiError, {
        project,
        reviewType: 'architectural',
        operation: 'generateArchitecturalReview',
        fileCount: fileInfos.length,
      });

      // Check if it's a rate limit error
      if (apiError.message && apiError.message.includes('Rate limit exceeded')) {
        logger.error('Rate limit exceeded. The review will continue with a fallback model.');
        logger.error(`Error details logged to: ${errorLogPath}`);
        logger.error('You can try again later or reduce the number of files being reviewed.');
      } else {
        logger.error(`Error generating architectural review:`);
        logger.error(`  Message: ${apiError.message}`);
        logger.error(`  Error details logged to: ${errorLogPath}`);
      }
    } else {
      logger.error(`Unknown error generating architectural review: ${String(apiError)}`);
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
  if (
    options &&
    typeof options.interactive === 'string' &&
    ['h', 'm', 'l', 'a'].includes(options.interactive)
  ) {
    return options.interactive as 'h' | 'm' | 'l' | 'a';
  }

  // Otherwise check if there's a priority filter argument after --interactive
  const args = process.argv;
  const interactiveIndex = args.findIndex((arg) => arg === '--interactive' || arg === '-i');

  if (interactiveIndex !== -1 && interactiveIndex < args.length - 1) {
    const nextArg = args[interactiveIndex + 1];
    // Check if the next argument is a priority filter and not another option
    if (['h', 'm', 'l', 'a'].includes(nextArg) && !nextArg.startsWith('-')) {
      return nextArg as 'h' | 'm' | 'l' | 'a';
    }
  }

  return undefined;
}
