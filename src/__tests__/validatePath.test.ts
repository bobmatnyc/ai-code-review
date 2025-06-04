/**
 * @fileoverview Tests for the validateTargetPath function.
 *
 * This module provides Vitest tests to verify that the validateTargetPath function
 * properly prevents path traversal attacks and ensures paths are within
 * the specified base directory.
 */

import { vi } from 'vitest';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    accessSync: vi.fn(),
    statSync: vi.fn()
  }
}));

import { validateTargetPath } from '../utils/pathValidator';
import fs from 'fs';

const mockedFs = vi.mocked(fs);

// Save original process.cwd
// const originalCwd = process.cwd; // Not used

describe('validateTargetPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock process.cwd to return a fixed path
    vi.spyOn(process, 'cwd').mockImplementation(() => '/test/base/path');

    // Mock fs.accessSync to not throw (pathExists returns true)
    mockedFs.accessSync.mockImplementation(() => undefined);

    // Mock fs.statSync to return file stats
    mockedFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    } as any);
  });

  afterEach(() => {
    // Restore original process.cwd
    vi.spyOn(process, 'cwd').mockRestore();
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
    // Mock fs.accessSync to throw error (pathExists returns false)
    mockedFs.accessSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    const result = validateTargetPath('/test/base/path/nonexistent.txt');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Path does not exist');
  });

  test('correctly identifies directories', () => {
    // Mock fs.statSync to return directory stats
    mockedFs.statSync.mockReturnValue({
      isDirectory: () => true,
      isFile: () => false
    } as any);

    const result = validateTargetPath('/test/base/path/dir');
    expect(result.isValid).toBe(true);
    expect(result.isDir).toBe(true);
  });

  test('correctly identifies files', () => {
    // Mock fs.statSync to return file stats (already set in beforeEach)
    mockedFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    } as any);

    const result = validateTargetPath('/test/base/path/file.txt');
    expect(result.isValid).toBe(true);
    expect(result.isDir).toBe(false);
  });
});
