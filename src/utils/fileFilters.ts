import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { fileExists, readFile } from './fileSystem';

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
function shouldIgnoreFile(filePath: string, patterns: string[], projectRoot: string): boolean {
  const relativePath = path.relative(projectRoot, filePath);

  // Check if file matches any gitignore pattern
  for (const pattern of patterns) {
    // Simple pattern matching (could be enhanced with proper gitignore parsing)
    if (pattern.endsWith('/') && relativePath.startsWith(pattern)) {
      return true;
    }

    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');

      if (new RegExp(`^${regexPattern}$`).test(relativePath)) {
        return true;
      }
    }

    if (relativePath === pattern || relativePath.startsWith(`${pattern}/`)) {
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
  if (isFile) {
    return [targetPath];
  }

  const projectRoot = path.resolve(targetPath, '..');
  const gitignorePatterns = await getGitignorePatterns(projectRoot);

  // Use glob to find all files - only include .js, .ts, .tsx, and .json files
  const allFiles = await glob('**/*.{ts,tsx,js,jsx,json}', {
    cwd: targetPath,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });

  return allFiles.filter(filePath => {
    // Skip files in gitignore
    if (shouldIgnoreFile(filePath, gitignorePatterns, projectRoot)) {
      return false;
    }

    // Skip test files if not including tests
    if (!includeTests && isTestFile(filePath)) {
      return false;
    }

    return true;
  });
}
