import path from 'path';
import fs from 'fs/promises';
import { fileExists, directoryExists, createDirectory, generateVersionedOutputPath } from '../utils/fileSystem';
import { getFilesToReview } from '../utils/fileFilters';
import { generateReview, generateArchitecturalReview, generateConsolidatedReview } from '../clients/geminiClient';
import { formatReviewOutput } from '../formatters/outputFormatter';
import { logError } from '../utils/errorLogger';
import { readProjectDocs } from '../utils/projectDocs';
import { ReviewOptions, ReviewType, FileInfo } from '../types/review';

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

  // Check if interactive mode is appropriate
  if (options.interactive && filesToReview.length > 1) {
    console.warn('Interactive mode is only supported for single file reviews.');
    console.warn('Disabling interactive mode for this review.');
    options.interactive = false;
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
    const review = await generateConsolidatedReview(
      fileInfos,
      project,
      options.type as ReviewType,
      projectDocs,
      options
    );

    // Generate a versioned output path
    const extension = options.output === 'json' ? '.json' : '.md';
    const outputPath = await generateVersionedOutputPath(outputBaseDir, options.type + '-review', extension);

    // Format and save the review
    const formattedOutput = formatReviewOutput(review, options.output);

    try {
      await fs.writeFile(outputPath, formattedOutput);
      console.log(`Consolidated review saved to: ${outputPath}`);
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
    const review = await generateArchitecturalReview(fileInfos, project, projectDocs, options);

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
        const review = await generateReview(
          fileContent,
          filePath,
          options.type as ReviewType,
          projectDocs,
          options
        );

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
