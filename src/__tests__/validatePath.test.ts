/**
 * @fileoverview Tests for the validatePath function.
 *
 * This module provides Jest tests to verify that the validatePath function
 * properly prevents path traversal attacks and ensures paths are within
 * the specified base directory.
 */

import { validatePath } from '../utils/fileSystem';
import path from 'path';

describe('validatePath', () => {
  const basePath = '/test/base/path';

  test('accepts valid paths within the base directory', () => {
    // Test with a simple path
    expect(() => validatePath('file.txt', basePath)).not.toThrow();

    // Test with a nested path
    expect(() => validatePath('dir/file.txt', basePath)).not.toThrow();

    // Test with a path that includes multiple directories
    expect(() => validatePath('dir1/dir2/dir3/file.txt', basePath)).not.toThrow();
  });

  test('rejects paths with ".." that attempt to traverse outside the base directory', () => {
    // Test with a simple path traversal
    expect(() => validatePath('../file.txt', basePath)).toThrow();

    // Test with a nested path traversal
    expect(() => validatePath('dir/../../../file.txt', basePath)).toThrow();

    // Test with a path that starts with ".."
    expect(() => validatePath('../../file.txt', basePath)).toThrow();

    // Test with a path that includes ".." in the middle - this should not throw in our implementation
    // because we normalize the path first and it stays within the base directory
    const normalizedPath = path.normalize('dir1/../dir2/file.txt');
    expect(normalizedPath).toBe('dir2/file.txt'); // Verify our understanding of normalization
    expect(() => validatePath(normalizedPath, basePath)).not.toThrow();
  });

  test('rejects absolute paths that are outside the base directory', () => {
    // Test with an absolute path
    expect(() => validatePath('/etc/passwd', basePath)).toThrow();

    // Test with an absolute path that looks like it's within the base directory
    expect(() => validatePath('/test/base/path/../../../etc/passwd', basePath)).toThrow();
  });

  test('normalizes paths correctly', () => {
    // The function should normalize paths before validating them
    const validPath = 'dir1/./dir2//file.txt';
    const normalizedPath = path.normalize(validPath);

    // This should not throw because the normalized path is valid
    expect(() => validatePath(validPath, basePath)).not.toThrow();

    // The result should be the absolute path
    const result = validatePath(validPath, basePath);
    expect(result).toBe(path.resolve(basePath, normalizedPath));
  });
});
