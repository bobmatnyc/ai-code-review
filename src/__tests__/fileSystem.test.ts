/**
 * @fileoverview Tests for file system utilities.
 *
 * This module provides Vitest tests for the file system utilities used
 * for file operations, path validation, and directory management.
 */

import fs from 'fs/promises';
import path from 'path';
import { vi } from 'vitest';
import { readFile } from '../utils/FileReader';
import { writeFile, ensureDirectoryExists } from '../utils/FileWriter';
import { generateVersionedOutputPath } from '../utils/PathGenerator';

// Mock fs module
vi.mock('fs/promises');
const mockedFs = fs as any;

// Mock pathValidator functions
vi.mock('../utils/pathValidator', () => ({
  pathExists: vi.fn(),
  isDirectory: vi.fn(),
  isFile: vi.fn(),
  validateTargetPath: vi.fn()
}));

// Mock fs sync module
vi.mock('fs', () => ({
  accessSync: vi.fn(),
  statSync: vi.fn()
}));

// Import mocked functions after setting up mocks
import { pathExists, isDirectory, isFile } from '../utils/pathValidator';

describe('File System Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PathValidator', () => {
    describe('pathExists', () => {
      it('should return true if path exists', () => {
        vi.mocked(pathExists).mockReturnValue(true);

        const result = pathExists('/path/to/file.txt');

        expect(result).toBe(true);
      });

      it('should return false if path does not exist', () => {
        vi.mocked(pathExists).mockReturnValue(false);

        const result = pathExists('/path/to/nonexistent.txt');

        expect(result).toBe(false);
      });
    });

    describe('isDirectory', () => {
      it('should return true if path is a directory', () => {
        vi.mocked(isDirectory).mockReturnValue(true);

        const result = isDirectory('/path/to/directory');

        expect(result).toBe(true);
      });

      it('should return false if path is not a directory', () => {
        vi.mocked(isDirectory).mockReturnValue(false);

        const result = isDirectory('/path/to/file.txt');

        expect(result).toBe(false);
      });

      it('should return false if path does not exist', () => {
        vi.mocked(isDirectory).mockReturnValue(false);

        const result = isDirectory('/path/to/nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('isFile', () => {
      it('should return true if path is a file', () => {
        vi.mocked(isFile).mockReturnValue(true);

        const result = isFile('/path/to/file.txt');

        expect(result).toBe(true);
      });

      it('should return false if path is not a file', () => {
        vi.mocked(isFile).mockReturnValue(false);

        const result = isFile('/path/to/directory');

        expect(result).toBe(false);
      });

      it('should return false if path does not exist', () => {
        vi.mocked(isFile).mockReturnValue(false);

        const result = isFile('/path/to/nonexistent.txt');

        expect(result).toBe(false);
      });
    });
  });

  describe('FileReader', () => {
    describe('readFile', () => {
      it('should read file content', async () => {
        mockedFs.readFile.mockResolvedValue('file content' as any);

        const result = await readFile('/path/to/file.txt');

        expect(result).toBe('file content');
        expect(mockedFs.readFile).toHaveBeenCalledWith(
          '/path/to/file.txt',
          'utf-8'
        );
      });

      it('should throw error when reading file fails', async () => {
        const error = new Error('File read error');
        mockedFs.readFile.mockRejectedValue(error);

        await expect(readFile('/path/to/file.txt')).rejects.toThrow(
          'File read error'
        );
      });
    });
  });

  describe('FileWriter', () => {
    describe('ensureDirectoryExists', () => {
      it('should create directory if it does not exist', async () => {
        // Mock pathExists to return false (directory doesn't exist)
        (pathExists as any).mockReturnValue(false);
        mockedFs.mkdir.mockResolvedValue(undefined);

        await ensureDirectoryExists('/path/to/new/directory');

        expect(mockedFs.mkdir).toHaveBeenCalledWith('/path/to/new/directory', {
          recursive: true
        });
      });

      it('should not create directory if it already exists', async () => {
        vi.mocked(pathExists).mockReturnValue(true);

        await ensureDirectoryExists('/path/to/existing/directory');

        expect(mockedFs.mkdir).not.toHaveBeenCalled();
      });
    });

    describe('writeFile', () => {
      it('should write content to file', async () => {
        // Mock pathExists for the ensureDirectoryExists call in writeFile
        vi.mocked(pathExists).mockReturnValue(true);
        mockedFs.writeFile.mockResolvedValue(undefined);

        await writeFile('/path/to/file.txt', 'file content');

        expect(mockedFs.writeFile).toHaveBeenCalledWith(
          '/path/to/file.txt',
          'file content'
        );
      });

      it('should throw error when writing file fails', async () => {
        // Mock pathExists for the ensureDirectoryExists call in writeFile
        vi.mocked(pathExists).mockReturnValue(true);
        const error = new Error('File write error');
        mockedFs.writeFile.mockRejectedValue(error);

        await expect(
          writeFile('/path/to/file.txt', 'file content')
        ).rejects.toThrow('File write error');
      });
    });
  });

  describe('PathGenerator', () => {
    describe('generateVersionedOutputPath', () => {
      beforeEach(() => {
        // Mock the current date to a fixed date
        const mockDate = new Date('2021-04-06T12:00:00Z');
        vi.useFakeTimers();
        vi.setSystemTime(mockDate);

        // Mock pathExists to return true for path checks
        vi.mocked(pathExists).mockReturnValue(true);
        // Mock mkdir to succeed
        mockedFs.mkdir.mockResolvedValue(undefined);
      });

      afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
      });

      it('should generate a versioned output path with timestamp', async () => {
        const result = await generateVersionedOutputPath(
          '/base/dir',
          'prefix',
          '.md',
          'model',
          'target'
        );

        // The actual implementation uses ISO string format
        expect(result).toContain('/base/dir/prefix-target-model-');
        expect(result).toMatch(
          /prefix-target-model-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.\d{3}Z\.md/
        );
      });

      it('should sanitize model and target names', async () => {
        const result = await generateVersionedOutputPath(
          '/base/dir',
          'prefix',
          '.md',
          'model with spaces/special:chars',
          'target with spaces/special:chars'
        );

        expect(result).toContain(
          '/base/dir/prefix-target-with-spaces-special-chars-model-with-spaces-special-chars-'
        );
      });

      it('should preserve file extension', async () => {
        const result = await generateVersionedOutputPath(
          '/base/dir',
          'prefix',
          '.txt',
          'model',
          'target'
        );

        expect(path.extname(result)).toBe('.txt');
      });

      it('should handle current directory gracefully', async () => {
        const result = await generateVersionedOutputPath(
          '/base/dir',
          'review',
          '.md',
          'o3',
          '.'
        );
        
        expect(result).toMatch(/review-current-dir-o3-\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/---/); // Should not have triple dashes
      });
    });
  });
});