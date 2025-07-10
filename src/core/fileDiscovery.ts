/**
 * @fileoverview File discovery and filtering module.
 *
 * This module is responsible for finding, filtering, and reading files for review.
 * It handles gitignore patterns, test exclusions, and file system operations.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { getFilesToReview as getFilteredFiles, loadGitignorePatterns } from '../utils/fileFilters';
import { isDirectory, isPathWithinCwd, pathExists } from '../utils/fileSystem';
import logger from '../utils/logger';
import { applySmartFiltering } from '../utils/smartFileSelector';

/**
 * File information structure
 */
export interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
}

/**
 * Validate target parameter and provide helpful error messages for common mistakes
 * @param target The target parameter to validate
 * @throws Error with helpful message if the target looks like a misformatted parameter
 */
function validateTargetParameter(target: string): void {
  // Check for common parameter format mistakes
  if (target.includes('=')) {
    const [key, ...valueParts] = target.split('=');
    const value = valueParts.join('='); // Rejoin in case value contains =
    const commonOptions = [
      'type',
      'output',
      'model',
      'language',
      'debug',
      'interactive',
      'estimate',
    ];

    // Only flag as parameter if the key part matches a known option
    // This avoids false positives for file paths like "src/file=name.ts"
    if (commonOptions.includes(key)) {
      throw new Error(`Invalid parameter format: '${target}'
    
It looks like you're trying to set the '${key}' option.
Did you mean: --${key} ${value}

Example usage:
  ai-code-review --${key} ${value}
  ai-code-review src --${key} ${value}
  ai-code-review . --${key} ${value}

Run 'ai-code-review --help' for more options.`);
    }
    if (!key.includes('/') && !key.includes('\\') && !key.includes('.')) {
      // If the key doesn't look like a path (no slashes or dots), it's probably a parameter mistake
      throw new Error(`Invalid parameter format: '${target}'
    
Parameters should use '--' prefix, not '=' format.
Example: --type performance

Common usage patterns:
  ai-code-review                    # Review current directory
  ai-code-review src                 # Review src directory
  ai-code-review src/index.ts        # Review specific file
  ai-code-review --type security     # Security review of current directory
  ai-code-review src --type performance  # Performance review of src

Run 'ai-code-review --help' for all options.`);
    }
    // If key looks like a path (contains / or \ or .), don't flag it as an error
  }

  // Check if the target looks like an option without proper prefix
  const commonOptions = [
    'type',
    'output',
    'model',
    'language',
    'debug',
    'interactive',
    'estimate',
    'help',
    'version',
    'listmodels',
    'models',
  ];
  if (commonOptions.includes(target)) {
    throw new Error(`'${target}' looks like an option but is missing '--' prefix.
    
Did you mean: --${target}

Example usage:
  ai-code-review --${target}
  ai-code-review src --${target}

For options that require values:
  ai-code-review --type performance
  ai-code-review --output json
  ai-code-review --model openai:gpt-4

Run 'ai-code-review --help' for more information.`);
  }

  // Check for other common mistakes
  if (target.startsWith('-') && !target.startsWith('--')) {
    throw new Error(`Invalid option format: '${target}'
    
Options should use double dashes (--), not single dash (-).
Did you mean: -${target}?

Example usage:
  ai-code-review --type security
  ai-code-review --debug
  ai-code-review --help

Run 'ai-code-review --help' for all available options.`);
  }
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
  includeTests = false,
): Promise<string[]> {
  try {
    // First validate the target parameter for common mistakes
    validateTargetParameter(target);

    // Validate the target path
    const resolvedTarget = path.resolve(projectPath, target);

    // Check if the path is within the project directory
    if (!isPathWithinCwd(resolvedTarget)) {
      throw new Error(`Target must be within the project directory: ${projectPath}`);
    }

    const targetPath = resolvedTarget;

    // Check if the target exists
    const isFileTarget = (await pathExists(targetPath)) && !(await isDirectory(targetPath));
    const isDirectoryTarget = await isDirectory(targetPath);

    if (!isFileTarget && !isDirectoryTarget) {
      throw new Error(`Target not found: ${target}`);
    }

    // Load gitignore patterns from target path, not project path
    const gitignorePatterns = await loadGitignorePatterns(targetPath);
    logger.debug(`Loaded ${gitignorePatterns.length} patterns from .gitignore in ${targetPath}`);

    // Get files to review using the existing filter utility
    let filesToReview = await getFilteredFiles(
      targetPath,
      isFileTarget,
      includeTests,
      gitignorePatterns,
    );

    // Apply smart filtering (tsconfig.json and .eslintignore)
    if (filesToReview.length > 0) {
      logger.info('Applying smart filtering based on project configuration files...');
      // Use the target directory for finding tsconfig.json, not the project root
      const configDir = isFileTarget ? path.dirname(targetPath) : targetPath;
      filesToReview = await applySmartFiltering(filesToReview, configDir);
    }

    if (filesToReview.length === 0) {
      logger.info('No files found to review.');
    } else {
      logger.info(`Found ${filesToReview.length} files to review.`);
    }

    return filesToReview;
  } catch (error) {
    logger.error(
      `Error discovering files: ${error instanceof Error ? error.message : String(error)}`,
    );
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
  projectPath: string,
): Promise<{ fileInfos: FileInfo[]; errors: Array<{ path: string; error: string }> }> {
  const fileInfos: FileInfo[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  for (const filePath of filePaths) {
    try {
      // Check if file exists and is readable
      if (!(await pathExists(filePath))) {
        errors.push({ path: filePath, error: 'File does not exist' });
        continue;
      }

      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Get relative path from project root
      const relativePath = path.relative(projectPath, filePath);

      // Add to file infos
      fileInfos.push({
        path: filePath,
        relativePath,
        content: fileContent,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error reading file ${filePath}: ${errorMessage}`);
      errors.push({ path: filePath, error: errorMessage });
    }
  }

  if (errors.length > 0) {
    logger.warn(`Failed to read ${errors.length} file(s)`);
  }

  return { fileInfos, errors };
}
