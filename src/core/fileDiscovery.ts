/**
 * @fileoverview File discovery and filtering module.
 *
 * This module is responsible for finding, filtering, and reading files for review.
 * It handles gitignore patterns, test exclusions, and file system operations.
 */

import path from 'path';
import fs from 'fs/promises';
import { pathExists, isDirectory, isPathWithinCwd } from '../utils/fileSystem';
import { getFilesToReview as getFilteredFiles } from '../utils/fileFilters';
import logger from '../utils/logger';

/**
 * File information structure
 */
export interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
}

/**
 * Discover files for review based on the target path and options
 * @param target The target file or directory path
 * @param projectPath The project root path
 * @param includeTests Whether to include test files
 * @returns Array of file paths to review
 */
export async function discoverFiles(
  target: string,
  projectPath: string,
  includeTests: boolean = false
): Promise<string[]> {
  try {
    // Validate the target path
    const resolvedTarget = path.resolve(projectPath, target);

    // Check if the path is within the project directory
    if (!isPathWithinCwd(resolvedTarget)) {
      throw new Error(`Target must be within the project directory: ${projectPath}`);
    }

    const targetPath = resolvedTarget;

    // Check if the target exists
    const isFileTarget = await pathExists(targetPath) && !(await isDirectory(targetPath));
    const isDirectoryTarget = await isDirectory(targetPath);

    if (!isFileTarget && !isDirectoryTarget) {
      throw new Error(`Target not found: ${target}`);
    }

    // Get files to review using the existing filter utility
    const filesToReview = await getFilteredFiles(
      targetPath,
      isFileTarget,
      includeTests
    );

    if (filesToReview.length === 0) {
      logger.info('No files found to review.');
    } else {
      logger.info(`Found ${filesToReview.length} files to review.`);
    }

    return filesToReview;
  } catch (error) {
    logger.error(`Error discovering files: ${error instanceof Error ? error.message : String(error)}`);
    throw error; // Re-throw to allow the caller to handle it
  }
}

/**
 * Read file contents and prepare file information for review
 * @param filePaths Array of file paths to read
 * @param projectPath The project root path
 * @returns Array of FileInfo objects with file contents
 */
export async function readFilesContent(
  filePaths: string[],
  projectPath: string
): Promise<FileInfo[]> {
  const fileInfos: FileInfo[] = [];

  for (const filePath of filePaths) {
    try {
      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Get relative path from project root
      const relativePath = path.relative(projectPath, filePath);

      // Add to file infos
      fileInfos.push({
        path: filePath,
        relativePath,
        content: fileContent
      });
    } catch (error) {
      logger.error(`Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      // Continue with other files instead of failing completely
    }
  }

  return fileInfos;
}
