/**
 * @fileoverview Command handler for the code review functionality.
 *
 * This module implements the core code review command handler that processes user input,
 * identifies files to review, coordinates the review process, and manages output generation.
 * It supports multiple review types and modes, including individual file reviews, consolidated
 * reviews, and architectural reviews.
 *
 * Key responsibilities:
 * - Parsing and validating command-line arguments
 * - Identifying and filtering files for review based on user input
 * - Coordinating with the Gemini API client to generate reviews
 * - Managing output file generation and organization
 * - Supporting interactive streaming mode for real-time feedback
 * - Handling errors and providing user feedback
 *
 * The module is designed to be flexible and extensible to support different review types
 * and output formats while maintaining a consistent user experience.
 */

import path from 'path';
import fs from 'fs/promises';
import { fileExists, directoryExists, createDirectory, generateVersionedOutputPath, validatePath } from '../utils/fileSystem';
import { getFilesToReview } from '../utils/fileFilters';
import { generateReview, generateArchitecturalReview, generateConsolidatedReview } from '../clients/geminiClient';
import { generateOpenRouterReview, generateOpenRouterConsolidatedReview, initializeAnyOpenRouterModel } from '../clients/openRouterClient';
import { formatReviewOutput } from '../formatters/outputFormatter';
import { logError } from '../utils/errorLogger';
import { readProjectDocs } from '../utils/projectDocs';
import { ReviewOptions, ReviewType, FileInfo } from '../types/review';
import { runApiConnectionTests } from '../tests/apiConnectionTest';
import { processReviewResults } from '../utils/reviewActionHandler';

// Get the preferred model from environment variables
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || process.env.CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';
const [adapter, modelName] = selectedModel.includes(':') ? selectedModel.split(':') : ['gemini', selectedModel];
const preferredOpenRouterModel = adapter === 'openrouter' ? modelName : 'anthropic/claude-3-opus';
const preferredGeminiModel = adapter === 'gemini' ? modelName : 'gemini-1.5-pro';

/**
 * Get the available API key type
 * @returns The type of API key available ('OpenRouter', 'Google', or null if none)
 */
function getApiKeyType() {
  if (process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY || process.env.CODE_REVIEW_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY) {
    return 'OpenRouter';
  }
  if (process.env.AI_CODE_REVIEW_GOOGLE_API_KEY || process.env.CODE_REVIEW_GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY) {
    return 'Google';
  }
  return null;
}

/**
 * Log a message with the appropriate level
 * @param level - The log level (info, warn, error)
 * @param message - The message to log
 */
function logMessage(level: 'info' | 'warn' | 'error', message: string) {
  switch (level) {
    case 'info':
      console.log(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    case 'error':
      console.error(message);
      break;
  }
}

export async function reviewCode(
  target: string,
  options: ReviewOptions
): Promise<void> {
  // Test API connections if requested
  if (options.testApi) {
    logMessage('info', 'Testing API connections before starting review...');
    await runApiConnectionTests();
    logMessage('info', 'API connection tests completed. Proceeding with review...');
  }

  if (options.individual) {
    logMessage('info', `Starting individual ${options.type} reviews for ${target}...`);
  } else if (options.type === 'architectural') {
    logMessage('info', `Starting architectural review for ${target}...`);
  } else {
    logMessage('info', `Starting consolidated ${options.type} review for ${target}...`);
  }

  // Resolve paths - always use the current directory as the project path
  const projectPath = process.cwd();

  // Extract the actual project name from the current directory
  const actualProjectName = path.basename(projectPath);
  logMessage('info', `Reviewing project: ${projectPath}`);

  // Validate the target path using our secure validatePath function
  let targetPath;
  try {
    targetPath = validatePath(target, projectPath);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid target path: ${target}. ${error.message}`);
    }
    throw error;
  }

  // Validate paths
  if (!(await directoryExists(projectPath))) {
    throw new Error(`Current directory is not valid for review: ${projectPath}\nPlease run this command from the root of your project.`);
  }

  const isFile = await fileExists(targetPath);
  const isDirectory = await directoryExists(targetPath);

  if (!isFile && !isDirectory) {
    throw new Error(`Target file or directory not found: ${targetPath}\nPlease check that the path is correct and exists within the project.\nThe path should be relative to the project root.`);
  }

  // Get files to review
  const filesToReview = await getFilesToReview(
    targetPath,
    isFile,
    options.includeTests
  );

  if (filesToReview.length === 0) {
    logMessage('info', 'No files found to review.');
    return;
  }

  // Check if interactive mode is appropriate for individual reviews
  if (options.interactive && options.individual && filesToReview.length > 1) {
    logMessage('warn', 'Interactive mode with individual reviews is only supported for single file reviews.');
    logMessage('warn', 'Switching to consolidated review mode for interactive review of multiple files.');
    options.individual = false;
  }

  logMessage('info', `Found ${filesToReview.length} files to review.`);

  // Create output directory for reviews
  logMessage('info', `Creating output directory for reviews`);
  const outputBaseDir = path.resolve('ai-code-review-docs');
  await createDirectory(outputBaseDir);

  // Handle architectural and consolidated reviews differently
  if (options.type === 'architectural') {
    await handleArchitecturalReview(actualProjectName, projectPath, filesToReview, outputBaseDir, options, target);
  } else if (options.individual) {
    // Process each file individually if --individual flag is set
    await handleIndividualFileReviews(actualProjectName, projectPath, filesToReview, outputBaseDir, options);
  } else {
    // Generate a consolidated review by default
    await handleConsolidatedReview(actualProjectName, projectPath, filesToReview, outputBaseDir, options, target);
  }

  logMessage('info', 'Review completed!');
}

/**
 * Handle consolidated review for multiple files
 * @param project - The project name
 * @param projectPath - The absolute path to the project
 * @param filesToReview - An array of file paths to review
 * @param outputBaseDir - The base directory for output
 * @param options - Review options including type, output format, and interactive mode
 * @returns Promise that resolves when the review is complete
 */
async function handleConsolidatedReview(
  project: string,
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions,
  originalTarget: string = ''
): Promise<void> {
  console.log(`Generating consolidated review for ${filesToReview.length} files...`);
  // Read project documentation if enabled
  let projectDocs = null;
  if (options.includeProjectDocs) {
    console.log('Reading project documentation...');
    projectDocs = await readProjectDocs(projectPath);
  }

  // Read all files
  const fileInfos: FileInfo[] = [];
  for (const filePath of filesToReview) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(projectPath, filePath);
      fileInfos.push({
        path: filePath,
        relativePath,
        content: fileContent
      });
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }

  try {
    // Generate consolidated review
    let review;

    // Check which API key is available
    const apiKeyType = getApiKeyType();

    // Prefer OpenRouter if it has an API key, otherwise use Gemini
    if (apiKeyType === 'OpenRouter') {
      const openRouterModel = process.env.CODE_REVIEW_OPENROUTER_MODEL || 'anthropic/claude-3-opus';
      console.log(`Using OpenRouter model: ${openRouterModel}`);

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
      // Use Gemini API
      const geminiModel = process.env.CODE_REVIEW_GEMINI_MODEL || 'gemini-1.5-pro';
      console.log(`Using Gemini model: ${geminiModel}`);

      review = await generateConsolidatedReview(
        fileInfos,
        project,
        options.type as ReviewType,
        projectDocs,
        options
      );
    } else {
      // No API keys available, use mock responses
      console.warn('No API keys available. Using mock responses.');
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

    // Determine the AI model being used
    let modelName = 'unknown';
    if (apiKeyType === 'OpenRouter') {
      modelName = preferredOpenRouterModel || 'openrouter';
    } else if (apiKeyType === 'Google') {
      modelName = preferredGeminiModel || 'gemini';
    }

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
      console.log(`Consolidated review saved to: ${outputPath}`);

      // If interactive mode is enabled, process the review results
      if (options.interactive) {
        console.log('\nProcessing review results in interactive mode...');

        // Read the review content
        const reviewContent = await fs.readFile(outputPath, 'utf-8');

        // Process the review results
        const results = await processReviewResults(
          reviewContent,
          projectPath,
          options.autoFix !== false, // Auto-implement high priority fixes unless explicitly disabled
          !options.promptAll // Prompt for medium and low priority fixes, but not high priority if promptAll is false
        );

        // Print summary
        console.log('\n--- Review Action Summary ---');
        console.log(`High priority fixes implemented: ${results.highPriorityFixed}`);
        console.log(`Medium priority fixes implemented: ${results.mediumPriorityFixed}`);
        console.log(`Low priority fixes implemented: ${results.lowPriorityFixed}`);
        console.log(`Total suggestions: ${results.totalSuggestions}`);
        console.log('---------------------------');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorLogPath = await logError(error, {
          operation: 'writeFile',
          outputPath,
          reviewType: options.type
        });

        console.error(`Error saving review to ${outputPath}:`);
        console.error(`  Message: ${error.message}`);
        console.error(`  Error details logged to: ${errorLogPath}`);
        throw new Error(`Failed to save review to ${outputPath}. Original error: ${error.message}`);
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
        console.error('Rate limit exceeded. The review will continue with a fallback model.');
        console.error(`Error details logged to: ${errorLogPath}`);
        console.error('You can try again later or reduce the number of files being reviewed.');
      } else {
        console.error(`Error generating consolidated review:`);
        console.error(`  Message: ${apiError.message}`);
        console.error(`  Error details logged to: ${errorLogPath}`);
        console.error(`  Try again later or check your API key and quota.`);
      }
    }
  }
}

/**
 * Handle architectural review by analyzing all files together
 * @param project - The project name
 * @param projectPath - The absolute path to the project
 * @param filesToReview - An array of file paths to review
 * @param outputBaseDir - The base directory for output
 * @param options - Review options including output format and interactive mode
 * @returns Promise that resolves when the review is complete
 */
async function handleArchitecturalReview(
  project: string,
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions,
  originalTarget: string = ''
): Promise<void> {
  logMessage('info', 'Performing architectural review of the entire codebase...');

  // Collect file information
  const fileInfos: FileInfo[] = [];

  for (const filePath of filesToReview) {
    try {
      // Get relative path from project root
      const relativePath = path.relative(projectPath, filePath);

      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');

      fileInfos.push({
        path: filePath,
        relativePath,
        content: fileContent
      });
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }

  // Read project documentation if enabled
  let projectDocs = null;
  if (options.includeProjectDocs) {
    console.log('Reading project documentation...');
    projectDocs = await readProjectDocs(projectPath);
  }

  try {
    // Generate architectural review
    let review;

    // Check which API key is available
    const apiKeyType = getApiKeyType();

    // Prefer OpenRouter if it has an API key, otherwise use Gemini
    if (apiKeyType === 'OpenRouter') {
      const openRouterModel = process.env.CODE_REVIEW_OPENROUTER_MODEL || 'anthropic/claude-3-opus';
      console.log(`Using OpenRouter model: ${openRouterModel}`);

      // Initialize OpenRouter model if needed
      await initializeAnyOpenRouterModel();

      review = await generateOpenRouterConsolidatedReview(
        fileInfos,
        project,
        'architectural' as ReviewType,
        projectDocs,
        options
      );
    } else if (apiKeyType === 'Google') {
      // Use Gemini API
      const geminiModel = process.env.CODE_REVIEW_GEMINI_MODEL || 'gemini-1.5-pro';
      console.log(`Using Gemini model: ${geminiModel}`);

      review = await generateArchitecturalReview(fileInfos, project, projectDocs, options);
    } else {
      // No API keys available, use mock responses
      console.warn('No API keys available. Using mock responses.');
      review = await generateArchitecturalReview(fileInfos, project, projectDocs, options);
    }

    // Generate a versioned output path
    const extension = options.output === 'json' ? '.json' : '.md';

    // Determine the AI model being used
    let modelName = 'unknown';
    if (apiKeyType === 'OpenRouter') {
      modelName = preferredOpenRouterModel || 'openrouter';
    } else if (apiKeyType === 'Google') {
      modelName = preferredGeminiModel || 'gemini';
    }

    // Get the target name (last part of the path)
    const targetName = path.basename(originalTarget || 'unknown');

    const outputPath = await generateVersionedOutputPath(
      outputBaseDir,
      'architectural-review',
      extension,
      modelName,
      targetName
    );

    // Format and save the review
    const formattedOutput = formatReviewOutput(review, options.output);

    try {
      await fs.writeFile(outputPath, formattedOutput);
      console.log(`Architectural review saved to: ${outputPath}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorLogPath = await logError(error, {
          operation: 'writeFile',
          outputPath,
          reviewType: 'architectural'
        });

        console.error(`Error saving architectural review to ${outputPath}:`);
        console.error(`  Message: ${error.message}`);
        console.error(`  Error details logged to: ${errorLogPath}`);
        throw new Error(`Failed to save architectural review to ${outputPath}. Original error: ${error.message}`);
      }
    }
  } catch (apiError: unknown) {
    if (apiError instanceof Error) {
      console.error('Error generating architectural review:', apiError.message);
    }
  }
}

/**
 * Handle individual file reviews
 * @param project Project name
 * @param projectPath Absolute path to the project
 * @param filesToReview Array of file paths to review
 * @param outputBaseDir Base directory for output
 * @param options Review options
 */
async function handleIndividualFileReviews(
  _project: string, // Unused but kept for consistency
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions
): Promise<void> {
  // Read project documentation if enabled
  let projectDocs = null;
  if (options.includeProjectDocs) {
    console.log('Reading project documentation...');
    projectDocs = await readProjectDocs(projectPath);
  }

  // Process each file
  for (const filePath of filesToReview) {
    try {
      // Get relative path from project root
      const relativePath = path.relative(projectPath, filePath);
      console.log(`Reviewing: ${relativePath}`);

      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');

      try {
        // Generate review
        let review;

        // Check which API key is available
        const apiKeyType = getApiKeyType();

        // Prefer OpenRouter if it has an API key, otherwise use Gemini
        if (apiKeyType === 'OpenRouter') {
          const openRouterModel = process.env.CODE_REVIEW_OPENROUTER_MODEL || 'anthropic/claude-3-opus';
          console.log(`Using OpenRouter model: ${openRouterModel}`);

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
          // Use Gemini API
          const geminiModel = process.env.CODE_REVIEW_GEMINI_MODEL || 'gemini-1.5-pro';
          console.log(`Using Gemini model: ${geminiModel}`);

          review = await generateReview(
            fileContent,
            filePath,
            options.type as ReviewType,
            projectDocs,
            options
          );
        } else {
          // No API keys available, use mock responses
          console.warn('No API keys available. Using mock responses.');
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

        // Determine the AI model being used
        let modelName = 'unknown';
        if (apiKeyType === 'OpenRouter') {
          modelName = preferredOpenRouterModel || 'openrouter';
        } else if (apiKeyType === 'Google') {
          modelName = preferredGeminiModel || 'gemini';
        }

        const outputPath = await generateVersionedOutputPath(
          fileOutputDir,
          `${options.type}-review`,
          extension,
          modelName,
          baseName
        );

        // Ensure output directory exists
        await createDirectory(path.dirname(outputPath));

        // Format and save the review
        const formattedOutput = formatReviewOutput(review, options.output);

        try {
          await fs.writeFile(outputPath, formattedOutput);
          console.log(`Review saved to: ${outputPath}`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            const errorLogPath = await logError(error, {
              operation: 'writeFile',
              outputPath,
              filePath,
              reviewType: options.type
            });

            console.error(`Error saving review to ${outputPath}:`);
            console.error(`  Message: ${error.message}`);
            console.error(`  Error details logged to: ${errorLogPath}`);
            throw new Error(`Failed to save review to ${outputPath}. Original error: ${error.message}`);
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

          console.error(`Error generating review for ${relativePath}:`);
          console.error(`  Message: ${apiError.message}`);
          console.error(`  Error details logged to: ${errorLogPath}`);
          console.error(`  Try again later or check your API key and quota.`);

          // Rethrow to stop processing
          throw new Error(`Failed to generate review for ${relativePath}. Original error: ${apiError.message}`);
        }
      }
    } catch (error: unknown) {
      // Log file reading errors
      if (error instanceof Error && error.message.includes('Failed to generate review')) {
        // This is a rethrown error from the API call, already logged
        throw error;
      } else {
        // This is a file reading error
        const errorLogPath = await logError(error, {
          filePath,
          operation: 'readFile'
        });

        console.error(`Error reading file ${filePath}:`);
        console.error(`  Error details logged to: ${errorLogPath}`);
        throw new Error(`Failed to read file ${filePath}. Original error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}
