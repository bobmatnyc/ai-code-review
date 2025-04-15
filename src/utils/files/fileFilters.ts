/**
 * @fileoverview Utilities for filtering and selecting files for code review.
 *
 * This module provides functions for identifying, filtering, and selecting files
 * for code review based on various criteria. It handles file discovery, gitignore
 * pattern matching, file extension filtering, and test file identification.
 * Supported file types include TypeScript, JavaScript, JSON, and Markdown.
 */

import fs from 'fs/promises';
import path from 'path';
import { FileInfo } from '../../types/review';
import logger from '../logger';

/**
 * Supported file extensions for code review
 */
const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];

/**
 * Check if a file is a test file
 * @param filePath File path
 * @returns True if the file is a test file
 */
export function isTestFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return (
    fileName.includes('.test.') ||
    fileName.includes('.spec.') ||
    fileName.startsWith('test-') ||
    fileName.endsWith('.test.ts') ||
    fileName.endsWith('.test.js') ||
    fileName.endsWith('.spec.ts') ||
    fileName.endsWith('.spec.js') ||
    filePath.includes('/__tests__/') ||
    filePath.includes('/test/') ||
    filePath.includes('/tests/')
  );
}

/**
 * Check if a file should be excluded based on gitignore patterns
 * @param filePath File path
 * @param gitignorePatterns Array of gitignore patterns
 * @returns True if the file should be excluded
 */
export function shouldExcludeFile(
  filePath: string,
  gitignorePatterns: string[]
): boolean {
  // Convert Windows paths to Unix-style for consistent pattern matching
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const pattern of gitignorePatterns) {
    // Skip empty lines and comments
    if (!pattern || pattern.startsWith('#')) {
      continue;
    }

    // Handle negation patterns (those starting with !)
    const isNegation = pattern.startsWith('!');
    const actualPattern = isNegation ? pattern.slice(1) : pattern;

    // Convert glob pattern to regex
    let regexPattern = actualPattern
      // Escape special regex characters
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      // Convert glob ** to regex
      .replace(/\*\*/g, '.*')
      // Convert glob * to regex
      .replace(/\*/g, '[^/]*')
      // Convert glob ? to regex
      .replace(/\?/g, '[^/]');

    // Handle directory-specific patterns (those ending with /)
    if (regexPattern.endsWith('/')) {
      regexPattern = `${regexPattern}.*`;
    }

    // Create the regex
    const regex = new RegExp(
      `^${regexPattern}$|^${regexPattern}/|/${regexPattern}$|/${regexPattern}/`
    );

    // Check if the path matches the pattern
    const matches = regex.test(normalizedPath);

    if (matches) {
      // If it's a negation pattern and matches, don't exclude
      if (isNegation) {
        return false;
      }
      // If it's a regular pattern and matches, exclude
      return true;
    }
  }

  // If no patterns matched, don't exclude
  return false;
}

/**
 * Get the language for a file based on its extension
 * @param filePath File path
 * @returns Language identifier
 */
export function getLanguageForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
      return 'javascript';
    case '.json':
      return 'json';
    case '.md':
      return 'markdown';
    default:
      return 'unknown';
  }
}

/**
 * Check if a file is supported for code review
 * @param filePath File path
 * @returns True if the file is supported
 */
export function isSupportedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Discover files in a directory recursively
 * @param dirPath Directory path
 * @param options Options for file discovery
 * @returns Array of file paths
 */
export async function discoverFiles(
  dirPath: string,
  options: {
    excludePatterns?: string[];
    includeTests?: boolean;
    maxDepth?: number;
    currentDepth?: number;
  } = {}
): Promise<string[]> {
  const {
    excludePatterns = [],
    includeTests = false,
    maxDepth = 10,
    currentDepth = 0
  } = options;

  // Check max depth
  if (currentDepth > maxDepth) {
    return [];
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      // Skip excluded files
      if (shouldExcludeFile(entryPath, excludePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        // Recursively discover files in subdirectories
        const subFiles = await discoverFiles(entryPath, {
          excludePatterns,
          includeTests,
          maxDepth,
          currentDepth: currentDepth + 1
        });

        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Skip test files if not including tests
        if (!includeTests && isTestFile(entryPath)) {
          continue;
        }

        // Skip unsupported files
        if (!isSupportedFile(entryPath)) {
          continue;
        }

        files.push(entryPath);
      }
    }

    return files;
  } catch (error) {
    logger.error(`Error discovering files in ${dirPath}:`, error);
    return [];
  }
}

/**
 * Read file content and create a FileInfo object
 * @param filePath File path
 * @returns FileInfo object
 */
export async function readFileInfo(filePath: string): Promise<FileInfo> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const language = getLanguageForFile(filePath);

    return {
      path: filePath,
      relativePath: filePath,
      content
    };
  } catch (error) {
    logger.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Read multiple files and create FileInfo objects
 * @param filePaths Array of file paths
 * @returns Array of FileInfo objects
 */
export async function readMultipleFiles(
  filePaths: string[]
): Promise<FileInfo[]> {
  const filePromises = filePaths.map(filePath => readFileInfo(filePath));
  return Promise.all(filePromises);
}
