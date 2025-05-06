/**
 * @fileoverview Utilities for filtering and selecting files for code review.
 *
 * This module provides functions for identifying, filtering, and selecting files
 * for code review based on various criteria. It handles file discovery, gitignore
 * pattern matching, file extension filtering, and test file identification.
 * Supported file types include TypeScript, JavaScript, JSON, and Markdown.
 *
 * Key responsibilities:
 * - Discovering files in directories recursively
 * - Parsing and applying .gitignore patterns
 * - Filtering files based on extension and content type
 * - Excluding test files when requested
 * - Converting file paths to relative paths for consistent processing
 * - Reading file content and preparing it for review
 *
 * The module ensures that only relevant files are included in code reviews,
 * improving efficiency and relevance of the review process.
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { fileExists, readFile } from './fileSystem';
import logger from './logger';

/**
 * Get .gitignore patterns from a project
 * @param projectPath Path to the project root
 * @returns Array of gitignore patterns
 */
async function getGitignorePatterns(projectPath: string): Promise<string[]> {
  const gitignorePath = path.join(projectPath, '.gitignore');

  if (await fileExists(gitignorePath)) {
    const content = await readFile(gitignorePath);
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  }

  return [];
}

/**
 * Check if a file should be ignored based on gitignore patterns
 * @param filePath Path to the file
 * @param patterns Array of gitignore patterns
 * @param projectRoot Project root path
 * @returns Boolean indicating if file should be ignored
 */
function shouldIgnoreFile(
  filePath: string,
  patterns: string[],
  projectRoot: string
): boolean {
  const relativePath = path.relative(projectRoot, filePath);
  // console.log('DEBUG: Checking if file should be ignored:', { filePath, relativePath, projectRoot });

  // Check if file matches any gitignore pattern
  for (const pattern of patterns) {
    // Simple pattern matching (could be enhanced with proper gitignore parsing)
    if (pattern.endsWith('/') && relativePath.startsWith(pattern)) {
      // console.log('DEBUG: File matches directory pattern:', { relativePath, pattern });
      return true;
    }

    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');

      if (new RegExp(`^${regexPattern}$`).test(relativePath)) {
        // console.log('DEBUG: File matches wildcard pattern:', { relativePath, pattern, regexPattern });
        return true;
      }
    }

    if (relativePath === pattern || relativePath.startsWith(`${pattern}/`)) {
      // console.log('DEBUG: File matches exact pattern:', { relativePath, pattern });
      return true;
    }
  }

  return false;
}

/**
 * Check if a file is a test file
 * @param filePath Path to the file
 * @returns Boolean indicating if file is a test file
 */
function isTestFile(filePath: string): boolean {
  const filename = path.basename(filePath);
  return (
    filename.includes('.test.') ||
    filename.includes('.spec.') ||
    filename.includes('-test.') ||
    filename.includes('-spec.') ||
    filename.includes('_test.') ||
    filename.includes('_spec.') ||
    /\/__tests__\//.test(filePath) ||
    /\/__mocks__\//.test(filePath)
  );
}

/**
 * Get all files to review from a target path
 * @param targetPath Path to the target file or directory
 * @param isFile Boolean indicating if target is a file
 * @param includeTests Boolean indicating if test files should be included
 * @returns Array of file paths to review
 */
export async function getFilesToReview(
  targetPath: string,
  isFile: boolean,
  includeTests: boolean
): Promise<string[]> {
  logger.debug('getFilesToReview called with:', { targetPath, isFile, includeTests });

  if (isFile) {
    logger.debug('Target is a file, returning:', [targetPath]);
    return [targetPath];
  }

  const projectRoot = path.resolve(targetPath, '..');
  logger.debug('Project root:', projectRoot);

  const gitignorePatterns = await getGitignorePatterns(projectRoot);
  logger.debug('Gitignore patterns:', gitignorePatterns);

  // Use glob to find all files - include code and documentation files
  logger.debug('Running glob in directory:', targetPath);
  
  // Comprehensive glob pattern to ensure all relevant executable code files are included
  // Exclude non-executable files like .md, .txt, .log, .tgz, .json, and .svg
  const allFiles = await glob('**/*.{ts,tsx,js,jsx,py,pyc,pyi,pyx,pyd,php,java,rb,rake,gemspec,ru,erb,go,rs,c,cpp,h,hpp,cs,swift,kt}', {
    cwd: targetPath,
    absolute: true,
    ignore: [
      '**/node_modules/**', 
      '**/dist/**', 
      '**/build/**', 
      '**/.venv/**', 
      '**/env/**', 
      '**/__pycache__/**', 
      '**/vendor/**', 
      '**/tmp/**',
      '**/*.md',
      '**/*.txt',
      '**/*.log',
      '**/*.tgz',
      '**/*.json',
      '**/*.svg',
      '**/*.xml',
      '**/*.yaml',
      '**/*.yml',
      '**/*.lock'
    ]
  });
  
  // Log stats about found files by extension
  const fileExtensionCounts = countFilesByExtension(allFiles);
  logger.debug('Files found by extension:', fileExtensionCounts);

  const filteredFiles = allFiles.filter(filePath => {
    // Skip files in gitignore
    if (shouldIgnoreFile(filePath, gitignorePatterns, projectRoot)) {
      logger.debug('Ignoring file due to gitignore:', filePath);
      return false;
    }

    // Skip test files if not including tests
    if (!includeTests && isTestFile(filePath)) {
      logger.debug('Ignoring test file:', filePath);
      return false;
    }

    return true;
  });

  // Log stats about filtered files by extension
  const filteredExtensionCounts = countFilesByExtension(filteredFiles);
  logger.debug('Filtered files by extension:', filteredExtensionCounts);
  
  logger.info(`Found ${allFiles.length} files, ${filteredFiles.length} after filtering`);
  return filteredFiles;
}

/**
 * Count files by extension to help debug file collection issues
 * @param files Array of file paths
 * @returns Object with counts by extension
 */
function countFilesByExtension(files: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!counts[ext]) {
      counts[ext] = 0;
    }
    counts[ext]++;
  }
  
  return counts;
}
