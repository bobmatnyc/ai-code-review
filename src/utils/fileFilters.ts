/**
 * @fileoverview Utilities for filtering and selecting files for code review.
 *
 * This module provides functions for identifying, filtering, and selecting files
 * for code review based on various criteria. It handles file discovery, gitignore
 * pattern matching, file extension filtering, and test file identification.
 * Supported file types include TypeScript, JavaScript, JSON, and Markdown.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileInfo } from '../types/review';
import logger from './logger';

// import { promises as fsPromises } from 'fs'; // TODO: Remove if not needed

/**
 * Supported file extensions for code review - focus on executable code only
 * Exclude non-executable files like .md, .txt, .log, .tgz, .json, and .svg
 */
const SUPPORTED_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.pyc',
  '.pyi',
  '.pyx',
  '.pyd',
  '.php',
  '.java',
  '.rb',
  '.rake',
  '.gemspec',
  '.ru',
  '.erb',
  '.go',
  '.rs',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.swift',
  '.kt',
];

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
 * Load gitignore patterns from a project directory
 * @param projectDir Project directory path
 * @returns Array of gitignore patterns
 */
export async function loadGitignorePatterns(projectDir: string): Promise<string[]> {
  try {
    const gitignorePath = path.join(projectDir, '.gitignore');

    // Check if .gitignore exists
    try {
      await fs.access(gitignorePath);
    } catch (_error) {
      // File doesn't exist
      logger.debug(`No .gitignore file found at ${gitignorePath}`);
      return [];
    }

    // Read and parse .gitignore
    const content = await fs.readFile(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  } catch (error) {
    logger.error(`Error reading .gitignore: ${error}`);
    return [];
  }
}

/**
 * Check if a file should be excluded based on gitignore patterns
 * @param filePath File path
 * @param gitignorePatterns Array of gitignore patterns
 * @returns True if the file should be excluded
 */
export function shouldExcludeFile(filePath: string, gitignorePatterns: string[]): boolean {
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
      `^${regexPattern}$|^${regexPattern}/|/${regexPattern}$|/${regexPattern}/`,
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
    case '.py':
    case '.pyi':
    case '.pyx':
      return 'python';
    case '.php':
      return 'php';
    case '.rb':
    case '.rake':
    case '.gemspec':
    case '.ru':
    case '.erb':
      return 'ruby';
    case '.go':
      return 'go';
    case '.java':
      return 'java';
    case '.rs':
      return 'rust';
    case '.c':
    case '.h':
      return 'c';
    case '.cpp':
    case '.hpp':
      return 'cpp';
    case '.cs':
      return 'csharp';
    case '.swift':
      return 'swift';
    case '.kt':
      return 'kotlin';
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
  // Skip files that start with a dot (hidden files)
  const fileName = path.basename(filePath);
  if (fileName.startsWith('.')) {
    return false;
  }

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
  } = {},
): Promise<string[]> {
  const { excludePatterns = [], includeTests = false, maxDepth = 10, currentDepth = 0 } = options;

  // Check max depth
  if (currentDepth > maxDepth) {
    return [];
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      // Skip excluded files (from .gitignore)
      if (shouldExcludeFile(entryPath, excludePatterns)) {
        logger.debug(`Skipping path: ${entryPath} (matched by .gitignore pattern)`);
        continue;
      }

      if (entry.isDirectory()) {
        // Skip node_modules, .git directories, and directories starting with '.'
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
          logger.debug(`Skipping directory: ${entry.name} (hidden or excluded)`);
          continue;
        }

        // Recursively discover files in subdirectories
        const subFiles = await discoverFiles(entryPath, {
          excludePatterns,
          includeTests,
          maxDepth,
          currentDepth: currentDepth + 1,
        });

        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Skip dot files
        if (entry.name.startsWith('.')) {
          logger.debug(`Skipping file: ${entry.name} (hidden file)`);
          continue;
        }

        // Skip test files if not including tests
        if (!includeTests && isTestFile(entryPath)) {
          logger.debug(`Skipping file: ${entryPath} (test file)`);
          continue;
        }

        // Skip unsupported files
        if (!isSupportedFile(entryPath)) {
          logger.debug(`Skipping file: ${entryPath} (unsupported file type)`);
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
    // const language = getLanguageForFile(filePath); // TODO: Remove if not needed

    return {
      path: filePath,
      relativePath: filePath,
      content,
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
export async function readMultipleFiles(filePaths: string[]): Promise<FileInfo[]> {
  const filePromises = filePaths.map((filePath) => readFileInfo(filePath));
  return Promise.all(filePromises);
}

/**
 * Get files to review based on the target path
 * @param targetPath The target file or directory path
 * @param isFile Whether the target is a file
 * @param includeTests Whether to include test files
 * @returns Array of file paths to review
 */
export async function getFilesToReview(
  targetPath: string,
  isFile: boolean,
  includeTests = false,
  excludePatterns: string[] = [],
): Promise<string[]> {
  if (isFile) {
    // If the target is a file, just return it
    return [targetPath];
  }
  // If it's a directory, load .gitignore patterns if not already provided
  let patterns = excludePatterns;
  if (patterns.length === 0) {
    patterns = await loadGitignorePatterns(targetPath);
    logger.debug(`Loaded ${patterns.length} patterns from .gitignore`);
  }

  // If the target is a directory, discover files
  return discoverFiles(targetPath, {
    excludePatterns: patterns,
    includeTests,
    maxDepth: 10,
  });
}
