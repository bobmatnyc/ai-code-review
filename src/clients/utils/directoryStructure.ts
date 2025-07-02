/**
 * @fileoverview Utility for generating directory structure representations.
 *
 * This module provides functions for generating directory structure
 * representations from file paths, which is useful for providing context
 * in code reviews.
 */

import type { FileInfo } from '../../types/review';

/**
 * Generate a directory structure representation from file paths
 * @param files Array of file information objects
 * @returns String representation of directory structure
 */
export function generateDirectoryStructure(files: FileInfo[]): string {
  const structure: Record<string, any> = {};

  // Build tree structure
  for (const file of files) {
    // Skip files without relativePath
    if (!file.relativePath) continue;

    const parts = file.relativePath.split('/');
    let current = structure;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = null;
  }

  // Convert to string representation
  function stringifyStructure(obj: Record<string, any>, indent = 0): string {
    let result = '';
    for (const [key, value] of Object.entries(obj)) {
      result += '  '.repeat(indent) + (value === null ? '📄 ' : '📁 ') + key + '\n';
      if (value !== null) {
        result += stringifyStructure(value, indent + 1);
      }
    }
    return result;
  }

  return stringifyStructure(structure);
}
