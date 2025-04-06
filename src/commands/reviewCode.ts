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
import { fileExists, directoryExists, createDirectory, generateVersionedOutputPath } from '../utils/fileSystem';
import { getFilesToReview } from '../utils/fileFilters';
import { generateReview, generateArchitecturalReview, generateConsolidatedReview } from '../clients/geminiClient';
import { generateOpenRouterReview, generateOpenRouterConsolidatedReview, initializeAnyOpenRouterModel } from '../clients/openRouterClient';
import { formatReviewOutput } from '../formatters/outputFormatter';
import { logError } from '../utils/errorLogger';
import { readProjectDocs } from '../utils/projectDocs';
import { ReviewOptions, ReviewType, FileInfo } from '../types/review';
import { processReviewResults } from '../utils/reviewActionHandler';

export async function reviewCode(
  project: string,
  target: string,
  options: ReviewOptions
): Promise<void> {
  if (options.individual) {
    console.log(`Starting individual ${options.type} reviews for ${project}/${target}...`);
  } else if (options.type === 'architectural') {
    console.log(`Starting architectural review for ${project}/${target}...`);
  } else {
    console.log(`Starting consolidated ${options.type} review for ${project}/${target}...`);
  }

  // Resolve paths
  let projectPath;

  // Check if the project is the current directory
  let actualProjectName = project;
  if (project === 'self' || project === '.' || project === 'this') {
    projectPath = process.cwd();
    // Extract the actual project name from the current directory
    actualProjectName = path.basename(projectPath);
    console.log(`Reviewing the current project: ${projectPath}`);
  } else {
    // Look for a sibling project
    projectPath = path.resolve('..', project);
  }

  // Validate and normalize the target path
  const normalizedTarget = path.normalize(target);

  // Check for path traversal attempts
  if (normalizedTarget.includes('..')) {
    throw new Error(`Invalid target path: ${target}. Path traversal is not allowed.`);
  }

  // Resolve the target path
  const targetPath = path.resolve(projectPath, normalizedTarget);

  // Ensure the target path is within the project directory
  const relativeTargetPath = path.relative(projectPath, targetPath);
  if (relativeTargetPath.startsWith('..') || path.isAbsolute(relativeTargetPath)) {
    throw new Error(`Target path is outside the project directory: ${target}`);
  }

  // Validate paths
  if (!(await directoryExists(projectPath))) {
    throw new Error(`Project directory not found: ${projectPath}`);
  }

  const isFile = await fileExists(targetPath);
  const isDirectory = await directoryExists(targetPath);

  if (!isFile && !isDirectory) {
    throw new Error(`Target not found: ${targetPath}`);
  }

  // Get files to review
  const filesToReview = await getFilesToReview(
    targetPath,
    isFile,
    options.includeTests
  );

  if (filesToReview.length === 0) {
    console.log('No files found to review.');
    return;
  }

  // Check if interactive mode is appropriate for individual reviews
  if (options.interactive && options.individual && filesToReview.length > 1) {
    console.warn('Interactive mode with individual reviews is only supported for single file reviews.');
    console.warn('Switching to consolidated review mode for interactive review of multiple files.');
    options.individual = false;
  }

  console.log(`Found ${filesToReview.length} files to review.`);

  // Create output directory with project name
  console.log(`Creating output directory for project: ${actualProjectName}`);
  const outputBaseDir = path.resolve('reviews', actualProjectName);
  await createDirectory(outputBaseDir);

  // Handle architectural and consolidated reviews differently
  if (options.type === 'architectural') {
    await handleArchitecturalReview(project, projectPath, filesToReview, outputBaseDir, options);
  } else if (options.individual) {
    // Process each file individually if --individual flag is set
    await handleIndividualFileReviews(project, projectPath, filesToReview, outputBaseDir, options);
  } else {
    // Generate a consolidated review by default
    await handleConsolidatedReview(project, projectPath, filesToReview, outputBaseDir, options);
  }

  console.log('Review completed!');
}

/**
 * Handle architectural review by analyzing all files together
 * @param project Project name
 * @param projectPath Absolute path to the project
 * @param filesToReview Array of file paths to review
 * @param outputBaseDir Base directory for output
 * @param options Review options
 */
/**
 * Handle consolidated review for multiple files
 * @param project Project name
 * @param projectPath Absolute path to the project
 * @param filesToReview Array of file paths to review
 * @param outputBaseDir Base directory for output
 * @param options Review options
 */
async function handleConsolidatedReview(
  project: string,
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions
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

    // Check if we should use OpenRouter based on environment variables
    const hasOpenRouterKey = !!process.env.CODE_REVIEW_OPENROUTER_API_KEY || !!process.env.OPENROUTER_API_KEY;
    const hasGoogleKey = !!process.env.CODE_REVIEW_GOOGLE_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_KEY;

    // Prefer OpenRouter if it has an API key, otherwise use Gemini
    if (hasOpenRouterKey) {
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
    } else if (hasGoogleKey) {
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
    const outputPath = await generateVersionedOutputPath(outputBaseDir, options.type + '-review', extension);

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
    } catch (error: any) {
      const errorLogPath = await logError(error, {
        operation: 'writeFile',
        outputPath,
        reviewType: options.type
      });

      console.error(`Error saving review to ${outputPath}:`);
      console.error(`  Message: ${error.message}`);
      console.error(`  Error details logged to: ${errorLogPath}`);
      throw new Error(`Failed to save review to ${outputPath}. See error log for details.`);
    }
  } catch (apiError: any) {
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

async function handleArchitecturalReview(
  project: string,
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions
): Promise<void> {
  console.log('Performing architectural review of the entire codebase...');

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

    // Check if we should use OpenRouter based on environment variables
    const hasOpenRouterKey = !!process.env.CODE_REVIEW_OPENROUTER_API_KEY || !!process.env.OPENROUTER_API_KEY;
    const hasGoogleKey = !!process.env.CODE_REVIEW_GOOGLE_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_KEY;

    // Prefer OpenRouter if it has an API key, otherwise use Gemini
    if (hasOpenRouterKey) {
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
    } else if (hasGoogleKey) {
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
    const outputPath = await generateVersionedOutputPath(outputBaseDir, 'architectural-review', extension);

    // Format and save the review
    const formattedOutput = formatReviewOutput(review, options.output);

    try {
      await fs.writeFile(outputPath, formattedOutput);
      console.log(`Architectural review saved to: ${outputPath}`);
    } catch (error: any) {
      const errorLogPath = await logError(error, {
        operation: 'writeFile',
        outputPath,
        reviewType: 'architectural'
      });

      console.error(`Error saving architectural review to ${outputPath}:`);
      console.error(`  Message: ${error.message}`);
      console.error(`  Error details logged to: ${errorLogPath}`);
      throw new Error(`Failed to save architectural review to ${outputPath}. See error log for details.`);
    }
  } catch (error) {
    console.error('Error generating architectural review:', error);
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

        // Check if we should use OpenRouter based on environment variables
        const hasOpenRouterKey = !!process.env.CODE_REVIEW_OPENROUTER_API_KEY || !!process.env.OPENROUTER_API_KEY;
        const hasGoogleKey = !!process.env.CODE_REVIEW_GOOGLE_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_KEY;

        // Prefer OpenRouter if it has an API key, otherwise use Gemini
        if (hasOpenRouterKey) {
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
        } else if (hasGoogleKey) {
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
        const outputPath = await generateVersionedOutputPath(
          fileOutputDir,
          `${options.type}-review-${baseName}`,
          extension
        );

        // Ensure output directory exists
        await createDirectory(path.dirname(outputPath));

        // Format and save the review
        const formattedOutput = formatReviewOutput(review, options.output);

        try {
          await fs.writeFile(outputPath, formattedOutput);
          console.log(`Review saved to: ${outputPath}`);
        } catch (error: any) {
          const errorLogPath = await logError(error, {
            operation: 'writeFile',
            outputPath,
            filePath,
            reviewType: options.type
          });

          console.error(`Error saving review to ${outputPath}:`);
          console.error(`  Message: ${error.message}`);
          console.error(`  Error details logged to: ${errorLogPath}`);
          throw new Error(`Failed to save review to ${outputPath}. See error log for details.`);
        }
      } catch (apiError: any) {
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
        throw new Error(`Failed to generate review for ${relativePath}. See error log for details.`);
      }
    } catch (error) {
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
        throw new Error(`Failed to read file ${filePath}. See error log for details.`);
      }
    }
  }
}
