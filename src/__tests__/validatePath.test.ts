/**
 * @fileoverview Tests for the validateTargetPath function.
 *
 * This module provides Jest tests to verify that the validateTargetPath function
 * properly prevents path traversal attacks and ensures paths are within
 * the specified base directory.
 */

import { validateTargetPath } from '../utils/PathValidator';
import path from 'path';
import fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  accessSync: jest.fn(),
  statSync: jest.fn()
}));
const mockedFs = fs as jest.Mocked<typeof fs>;

// Save original process.cwd
const originalCwd = process.cwd;

describe('validateTargetPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock process.cwd to return a fixed path
    jest.spyOn(process, 'cwd').mockImplementation(() => '/test/base/path');

    // Mock pathExists to return true for all paths
    mockedFs.accessSync.mockImplementation(() => undefined);

    // Mock isDirectory to return false by default
    mockedFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    } as any);
  });

  afterEach(() => {
    // Restore original process.cwd
    jest.spyOn(process, 'cwd').mockRestore();
  });

  test('accepts valid paths within the base directory', () => {
    // Test with a simple path
    const result1 = validateTargetPath('/test/base/path/file.txt');
    expect(result1.isValid).toBe(true);
    expect(result1.error).toBeUndefined();

    // Test with a nested path
    const result2 = validateTargetPath('/test/base/path/dir/file.txt');
    expect(result2.isValid).toBe(true);
    expect(result2.error).toBeUndefined();

    // Test with a path that includes multiple directories
    const result3 = validateTargetPath(
      '/test/base/path/dir1/dir2/dir3/file.txt'
    );
    expect(result3.isValid).toBe(true);
    expect(result3.error).toBeUndefined();
  });

  test('rejects paths that are outside the base directory', () => {
    // Test with a path outside the base directory
    const result1 = validateTargetPath('/etc/passwd');
    expect(result1.isValid).toBe(false);
    expect(result1.error).toContain(
      'Path must be within the current directory'
    );

    // Test with a path that traverses outside the base directory
    const result2 = validateTargetPath('/test/base/path/../../../etc/passwd');
    expect(result2.isValid).toBe(false);
    expect(result2.error).toContain(
      'Path must be within the current directory'
    );
  });

  test('rejects paths that do not exist', () => {
    // Mock pathExists to return false
    mockedFs.accessSync.mockImplementation(() => {
      throw new Error('Path does not exist');
    });

    const result = validateTargetPath('/test/base/path/nonexistent.txt');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Path does not exist');
  });

  test('correctly identifies directories', () => {
    // Mock isDirectory to return true
    mockedFs.statSync.mockReturnValue({
      isDirectory: () => true,
      isFile: () => false
    } as any);

    const result = validateTargetPath('/test/base/path/dir');
    expect(result.isValid).toBe(true);
    expect(result.isDir).toBe(true);
  });

  test('correctly identifies files', () => {
    // Mock isDirectory to return false
    mockedFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    } as any);

    const result = validateTargetPath('/test/base/path/file.txt');
    expect(result.isValid).toBe(true);
    expect(result.isDir).toBe(false);
  });
});
