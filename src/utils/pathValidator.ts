/**
 * @fileoverview Path validation utilities.
 *
 * This module provides utilities for validating file and directory paths,
 * ensuring they are safe to use and exist on the file system.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Check if a path is within the current directory or its subdirectories
 * @param targetPath Path to check
 * @returns True if the path is within the current directory, false otherwise
 */
export function isPathWithinCwd(targetPath: string): boolean {
  const resolvedPath = path.resolve(targetPath);
  const resolvedCwd = path.resolve(process.cwd());

  return resolvedPath.startsWith(resolvedCwd);
}

/**
 * Check if a path exists
 * @param targetPath Path to check
 * @returns True if the path exists, false otherwise
 */
export function pathExists(targetPath: string): boolean {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Check if a path is a directory
 * @param targetPath Path to check
 * @returns True if the path is a directory, false otherwise
 */
export function isDirectory(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch (_error) {
    return false;
  }
}

/**
 * Check if a path is a file
 * @param targetPath Path to check
 * @returns True if the path is a file, false otherwise
 */
export function isFile(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isFile();
  } catch (_error) {
    return false;
  }
}

/**
 * Validate a target path for security and existence
 * @param targetPath Path to validate
 * @returns Object with validation results
 */
export function validateTargetPath(targetPath: string): {
  isValid: boolean;
  isDir: boolean;
  error?: string;
} {
  // Check if the path is within the current directory
  if (!isPathWithinCwd(targetPath)) {
    return {
      isValid: false,
      isDir: false,
      error: `Path must be within the current directory: ${process.cwd()}`,
    };
  }

  // Check if the path exists
  if (!pathExists(targetPath)) {
    return {
      isValid: false,
      isDir: false,
      error: `Path does not exist: ${targetPath}`,
    };
  }

  // Check if the path is a directory or file
  const isDir = isDirectory(targetPath);

  return {
    isValid: true,
    isDir,
  };
}
