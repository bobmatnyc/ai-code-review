import path from 'path';
import fs from 'fs/promises';
import { fileExists, directoryExists, createDirectory } from '../utils/fileSystem';
import { getFilesToReview } from '../utils/fileFilters';
import { generateReview, generateArchitecturalReview } from '../clients/geminiClient';
import { formatReviewOutput } from '../formatters/outputFormatter';
import { logError } from '../utils/errorLogger';
import { ReviewOptions, ReviewType, FileInfo } from '../types/review';

export async function reviewCode(
  project: string,
  target: string,
  options: ReviewOptions
): Promise<void> {
  console.log(`Starting ${options.type} review for ${project}/${target}...`);

  // Resolve paths
  const projectPath = path.resolve('..', project);
  const targetPath = path.resolve(projectPath, target);

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

  console.log(`Found ${filesToReview.length} files to review.`);

  // Create output directory
  const outputBaseDir = path.resolve('review', project);
  await createDirectory(outputBaseDir);

  // Handle architectural reviews differently
  if (options.type === 'architectural') {
    await handleArchitecturalReview(project, projectPath, filesToReview, outputBaseDir, options);
  } else {
    // Process each file individually for other review types
    await handleIndividualFileReviews(project, projectPath, filesToReview, outputBaseDir, options);
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

  try {
    // Generate architectural review
    const review = await generateArchitecturalReview(fileInfos, project);

    // Format and save output
    const outputPath = path.join(
      outputBaseDir,
      `architectural-review${options.output === 'json' ? '.json' : '.md'}`
    );

    // Format and save the review
    const formattedOutput = formatReviewOutput(review, options.output);
    await fs.writeFile(outputPath, formattedOutput);

    console.log(`Architectural review saved to: ${outputPath}`);
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
  project: string,
  projectPath: string,
  filesToReview: string[],
  outputBaseDir: string,
  options: ReviewOptions
): Promise<void> {
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
          options.type as ReviewType
        );

        // Format and save output
        const outputPath = path.join(
          outputBaseDir,
          relativePath + (options.output === 'json' ? '.json' : '.md')
        );

        // Ensure output directory exists
        await createDirectory(path.dirname(outputPath));

        // Format and save the review
        const formattedOutput = formatReviewOutput(review, options.output);
        await fs.writeFile(outputPath, formattedOutput);

        console.log(`Review saved to: ${outputPath}`);
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
