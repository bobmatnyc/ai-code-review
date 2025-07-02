/**
 * @fileoverview File processing handler for code review
 *
 * This module handles file discovery, content reading, and error processing
 * for code review operations.
 */

import type { ReviewOptions } from '../../types/review';
import logger from '../../utils/logger';
import { discoverFiles, type FileInfo, readFilesContent } from '../fileDiscovery';

/**
 * Discover files for review based on target path and options
 *
 * @param target Path to file or directory to review
 * @param projectPath Current working directory
 * @param options Review options
 * @returns Array of file paths to review
 */
export async function discoverFilesForReview(
  target: string,
  projectPath: string,
  options: ReviewOptions,
): Promise<string[]> {
  // Ensure target is defined with a default of "." for current directory
  const effectiveTarget = target || '.';

  try {
    const filesToReview = await discoverFiles(effectiveTarget, projectPath, options.includeTests);

    // Log the number of files discovered
    logger.info(`Discovered ${filesToReview.length} files to review`);

    if (filesToReview.length === 0) {
      logger.warn(`No files found for review in ${effectiveTarget}`);
      logger.info('This could be due to:');
      logger.info('1. The path does not exist or is not accessible');
      logger.info('2. All files are excluded by .gitignore patterns');
      logger.info('3. There are no supported file types in the specified path');

      if (!options.includeTests) {
        logger.info('4. Test files are excluded by default. Use --include-tests to include them');
      }
    }

    // In debug mode, list the first few files discovered
    if (options.debug && filesToReview.length > 0) {
      const maxFilesToLog = 10;
      logger.debug(`First ${Math.min(filesToReview.length, maxFilesToLog)} files to review:`);
      for (let i = 0; i < Math.min(filesToReview.length, maxFilesToLog); i++) {
        logger.debug(`  - ${filesToReview[i]}`);
      }

      if (filesToReview.length > maxFilesToLog) {
        logger.debug(`  ... and ${filesToReview.length - maxFilesToLog} more files`);
      }
    }

    return filesToReview;
  } catch (error) {
    // Handle file discovery errors
    logger.error(
      `Failed to discover files for review: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    if (error instanceof Error && error.stack) {
      logger.debug(`Error stack trace: ${error.stack}`);
    }

    throw new Error(
      `Could not discover files to review in ${effectiveTarget}. Please verify the path exists and is accessible.`,
    );
  }
}

/**
 * Read content of discovered files
 *
 * @param filesToReview Array of file paths to read
 * @param projectPath Current working directory
 * @returns Object containing file infos and any errors encountered
 */
export async function readFilesForReview(
  filesToReview: string[],
  projectPath: string,
): Promise<{ fileInfos: FileInfo[]; errors: Array<{ path: string; error: string }> }> {
  try {
    logger.info('Reading file contents...');
    const result = await readFilesContent(filesToReview, projectPath);

    // Log statistics about the read operation
    logger.info(
      `Successfully read ${result.fileInfos.length} out of ${filesToReview.length} files`,
    );

    // If we have errors reading files, report them but continue
    if (result.errors.length > 0) {
      logger.warn(`Failed to read ${result.errors.length} file(s):`);

      // Log the first 10 errors
      const maxErrorsToLog = 10;
      result.errors.slice(0, maxErrorsToLog).forEach((error) => {
        logger.warn(`  ${error.path}: ${error.error}`);
      });

      // If there are more errors, just mention the count
      if (result.errors.length > maxErrorsToLog) {
        logger.warn(`  ... and ${result.errors.length - maxErrorsToLog} more errors`);
      }
    }

    // Ensure we have at least some files to review
    if (result.fileInfos.length === 0) {
      const errorMessage = 'No files could be read for review.';
      logger.error(errorMessage);

      // Provide more detailed guidance based on the errors
      if (result.errors.length > 0) {
        logger.error('Errors encountered while reading files:');
        const commonErrorPatterns = {
          permission: ['permission denied', 'EACCES'],
          notFound: ['no such file', 'ENOENT'],
          encoding: ['encoding', 'invalid byte', 'character'],
          size: ['too large', 'exceeds', 'size limit'],
        };

        // Categorize errors to provide better guidance
        const categorizedErrors = {
          permission: 0,
          notFound: 0,
          encoding: 0,
          size: 0,
          other: 0,
        };

        result.errors.forEach((error) => {
          const errorLowerCase = error.error.toLowerCase();
          let categorized = false;

          for (const [category, patterns] of Object.entries(commonErrorPatterns)) {
            if (patterns.some((pattern) => errorLowerCase.includes(pattern.toLowerCase()))) {
              categorizedErrors[category as keyof typeof categorizedErrors]++;
              categorized = true;
              break;
            }
          }

          if (!categorized) {
            categorizedErrors.other++;
          }
        });

        // Provide guidance based on error categories
        if (categorizedErrors.permission > 0) {
          logger.error(
            `  - ${categorizedErrors.permission} file(s) could not be read due to permission issues. Check file permissions.`,
          );
        }
        if (categorizedErrors.notFound > 0) {
          logger.error(
            `  - ${categorizedErrors.notFound} file(s) were not found. The file list may be out of date.`,
          );
        }
        if (categorizedErrors.encoding > 0) {
          logger.error(
            `  - ${categorizedErrors.encoding} file(s) had encoding issues. These might be binary files not suitable for review.`,
          );
        }
        if (categorizedErrors.size > 0) {
          logger.error(`  - ${categorizedErrors.size} file(s) were too large to process.`);
        }
        if (categorizedErrors.other > 0) {
          logger.error(`  - ${categorizedErrors.other} file(s) failed due to other issues.`);
        }
      }

      throw new Error(`${errorMessage} Please check file permissions and paths.`);
    }

    return result;
  } catch (error) {
    // Handle file reading errors not caught by readFilesContent
    if (error instanceof Error && error.message.includes('No files could be read')) {
      // This is an error we created above, so just rethrow it
      throw error;
    }
    // This is an unexpected error
    logger.error(
      `Unexpected error when reading file contents: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    if (error instanceof Error && error.stack) {
      logger.debug(`Error stack trace: ${error.stack}`);
    }

    throw new Error(
      `Failed to read files for review: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
