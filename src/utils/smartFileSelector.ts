/**
 * @fileoverview Smart file selection module based on project configuration files.
 *
 * This module provides enhanced file selection functionality by respecting
 * project configuration files like tsconfig.json and .eslintignore in addition
 * to .gitignore patterns.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadGitignorePatterns, shouldExcludeFile } from './fileFilters';
import logger from './logger';

/**
 * Interface for TypeScript configuration file
 */
interface TsConfig {
  include?: string[];
  exclude?: string[];
  files?: string[];
  compilerOptions?: Record<string, unknown>;
}

/**
 * Load ESLint ignore patterns from a project directory
 * @param projectDir Project directory path
 * @returns Array of ESLint ignore patterns
 */
export async function loadEslintIgnorePatterns(projectDir: string): Promise<string[]> {
  try {
    const eslintIgnorePath = path.join(projectDir, '.eslintignore');

    // Check if .eslintignore exists
    try {
      await fs.promises.access(eslintIgnorePath);
    } catch (_error) {
      // File doesn't exist
      logger.debug(`No .eslintignore file found at ${eslintIgnorePath}`);
      return [];
    }

    // Read and parse .eslintignore
    const content = await fs.promises.readFile(eslintIgnorePath, 'utf-8');
    if (!content) {
      return [];
    }
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  } catch (error) {
    // Only log as error if it's not just a file not found issue
    if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.error(`Error reading .eslintignore: ${error}`);
    } else {
      const eslintIgnorePath = path.join(projectDir, '.eslintignore');
      logger.debug(`No .eslintignore file found at ${eslintIgnorePath}`);
    }
    return [];
  }
}

/**
 * Load TypeScript configuration from a project directory
 * @param projectDir Project directory path
 * @returns TypeScript configuration or null if not found
 */
export async function loadTsConfig(projectDir: string): Promise<TsConfig | null> {
  try {
    const tsConfigPath = path.join(projectDir, 'tsconfig.json');

    // Check if tsconfig.json exists
    try {
      await fs.promises.access(tsConfigPath);
    } catch (_error) {
      // File doesn't exist
      logger.debug(`No tsconfig.json file found at ${tsConfigPath}`);
      return null;
    }

    // Read and parse tsconfig.json
    const content = await fs.promises.readFile(tsConfigPath, 'utf-8');
    if (!content) {
      return null;
    }
    try {
      return JSON.parse(content) as TsConfig;
    } catch (parseError) {
      logger.error(`Error parsing tsconfig.json: ${parseError}`);
      return null;
    }
  } catch (error) {
    // Only log as error if it's not just a file not found issue
    if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.error(`Error reading tsconfig.json: ${error}`);
    } else {
      const tsConfigPath = path.join(projectDir, 'tsconfig.json');
      logger.debug(`No tsconfig.json file found at ${tsConfigPath}`);
    }
    return null;
  }
}

/**
 * Convert TypeScript glob patterns to regex patterns
 * @param pattern TypeScript glob pattern
 * @returns Regular expression pattern
 */
function convertTsGlobToRegex(pattern: string): RegExp {
  // Escape special regex characters first, but preserve glob patterns
  let regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\?/g, '[^/]');

  // Handle ** patterns (match zero or more directories)
  // **/ at the beginning means match any number of directories
  // /** at the end means match any number of directories
  // /**/  in the middle means match any number of directories
  regexPattern = regexPattern
    .replace(/\*\*\//g, '(?:.*/)?') // **/ matches zero or more directories
    .replace(/\/\*\*/g, '(?:/.*)?') // /** matches zero or more directories
    .replace(/\*\*/g, '.*'); // ** by itself matches anything

  // Handle single * patterns (match anything except directory separators)
  regexPattern = regexPattern.replace(/\*/g, '[^/]*');

  // Create regex that matches both full paths and relative paths
  // The pattern should match if:
  // 1. The full path matches the pattern
  // 2. The relative path matches the pattern
  // 3. The pattern matches from any directory level
  return new RegExp(`(^|/)${regexPattern}$`, 'i');
}

/**
 * Check if a file matches TypeScript configuration
 * @param filePath File path
 * @param tsConfig TypeScript configuration
 * @param projectDir Project directory path
 * @returns True if the file should be included based on TypeScript configuration
 */
export function matchesTsConfig(filePath: string, tsConfig: TsConfig, projectDir: string): boolean {
  // If tsconfig.json doesn't exist, include all files
  if (!tsConfig) {
    return true;
  }

  // Convert Windows paths to Unix-style for consistent pattern matching
  const normalizedPath = filePath.replace(/\\/g, '/');
  const relativePath = path.relative(projectDir, filePath).replace(/\\/g, '/');

  // If files array is provided, only include files explicitly listed
  if (tsConfig.files && tsConfig.files.length > 0) {
    return tsConfig.files.some((file) => {
      const normalizedFile = file.replace(/\\/g, '/');
      return relativePath === normalizedFile;
    });
  }

  // Check exclude patterns first
  if (tsConfig.exclude && tsConfig.exclude.length > 0) {
    for (const pattern of tsConfig.exclude) {
      const regex = convertTsGlobToRegex(pattern);
      if (regex.test(normalizedPath) || regex.test(relativePath)) {
        // File matches an exclude pattern, so exclude it
        logger.debug(`File ${filePath} excluded by tsconfig.json pattern: ${pattern}`);
        return false;
      }
    }
  }

  // Then check include patterns
  if (tsConfig.include && tsConfig.include.length > 0) {
    // Find if file matches any include pattern
    for (const pattern of tsConfig.include) {
      const regex = convertTsGlobToRegex(pattern);

      // Test the pattern against different path representations
      const testPaths = [
        normalizedPath,
        relativePath,
        path.basename(filePath),
        // Also test with leading slash removed for relative paths
        relativePath.startsWith('/') ? relativePath.slice(1) : relativePath,
      ];

      for (const testPath of testPaths) {
        if (regex.test(testPath)) {
          logger.debug(
            `File ${filePath} matched by tsconfig.json pattern: ${pattern} (tested path: ${testPath})`,
          );
          return true;
        }
      }
    }

    logger.debug(
      `File ${filePath} not included by any tsconfig.json include pattern (patterns: ${tsConfig.include.join(', ')})`,
    );
    return false;
  }

  // If no include patterns are provided, include all files that weren't excluded
  return true;
}

/**
 * Apply smart filtering to a list of file paths
 * @param filePaths Array of file paths
 * @param projectDir Project directory path
 * @returns Array of filtered file paths
 */
export async function applySmartFiltering(
  filePaths: string[],
  projectDir: string,
): Promise<string[]> {
  // Load ignore patterns
  const gitignorePatterns = await loadGitignorePatterns(projectDir);
  const eslintIgnorePatterns = await loadEslintIgnorePatterns(projectDir);
  const tsConfig = await loadTsConfig(projectDir);

  // Log patterns loaded
  logger.debug(`Loaded ${gitignorePatterns.length} .gitignore patterns`);
  logger.debug(`Loaded ${eslintIgnorePatterns.length} .eslintignore patterns`);
  logger.debug(`TypeScript config loaded: ${tsConfig ? 'Yes' : 'No'}`);

  // Apply filtering
  return filePaths.filter((filePath) => {
    // Apply .gitignore patterns
    if (shouldExcludeFile(filePath, gitignorePatterns)) {
      logger.debug(`File excluded by .gitignore: ${filePath}`);
      return false;
    }

    // Apply .eslintignore patterns
    if (shouldExcludeFile(filePath, eslintIgnorePatterns)) {
      logger.debug(`File excluded by .eslintignore: ${filePath}`);
      return false;
    }

    // Apply TypeScript configuration
    if (tsConfig && !matchesTsConfig(filePath, tsConfig, projectDir)) {
      logger.debug(`File excluded by tsconfig.json: ${filePath}`);
      return false;
    }

    // Include the file if it passed all filters
    return true;
  });
}

export default {
  loadEslintIgnorePatterns,
  loadTsConfig,
  matchesTsConfig,
  applySmartFiltering,
};
