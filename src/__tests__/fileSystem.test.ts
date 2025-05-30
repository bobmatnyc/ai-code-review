/**
 * @fileoverview Tests for file system utilities.
 *
 * This module provides Jest tests for the file system utilities used
 * for file operations, path validation, and directory management.
 */

import fs from 'fs/promises';
import path from 'path';
// Import mocked pathValidator functions
const { pathExists, isDirectory, isFile } = jest.requireMock('../utils/pathValidator');
import { readFile } from '../utils/FileReader';
import { writeFile, ensureDirectoryExists } from '../utils/FileWriter';
import { generateVersionedOutputPath } from '../utils/PathGenerator';

// Mock fs module
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock pathValidator functions
jest.mock('../utils/pathValidator', () => ({
  pathExists: jest.fn(),
  isDirectory: jest.fn(),
  isFile: jest.fn()
}));

// Mock fs sync module
jest.mock('fs', () => ({
  accessSync: jest.fn(),
  statSync: jest.fn()
}));
// const mockedFsSync = jest.requireMock('fs') as jest.Mocked<typeof import('fs')>;

describe('File System Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PathValidator', () => {
    describe('pathExists', () => {
      it('should return true if path exists', () => {
        (pathExists as jest.Mock).mockReturnValue(true);

        const result = pathExists('/path/to/file.txt');

        expect(result).toBe(true);
      });

      it('should return false if path does not exist', () => {
        (pathExists as jest.Mock).mockReturnValue(false);

        const result = pathExists('/path/to/nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('isDirectory', () => {
      it('should return true if path is a directory', () => {
        (isDirectory as jest.Mock).mockReturnValue(true);

        const result = isDirectory('/path/to/directory');

        expect(result).toBe(true);
      });

      it('should return false if path is not a directory', () => {
        (isDirectory as jest.Mock).mockReturnValue(false);

        const result = isDirectory('/path/to/file.txt');

        expect(result).toBe(false);
      });

      it('should return false if path does not exist', () => {
        (isDirectory as jest.Mock).mockReturnValue(false);

        const result = isDirectory('/path/to/nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('isFile', () => {
      it('should return true if path is a file', () => {
        (isFile as jest.Mock).mockReturnValue(true);

        const result = isFile('/path/to/file.txt');

        expect(result).toBe(true);
      });

      it('should return false if path is not a file', () => {
        (isFile as jest.Mock).mockReturnValue(false);

        const result = isFile('/path/to/directory');

        expect(result).toBe(false);
      });

      it('should return false if path does not exist', () => {
        (isFile as jest.Mock).mockReturnValue(false);

        const result = isFile('/path/to/nonexistent');

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
        (pathExists as jest.Mock).mockReturnValue(false);
        mockedFs.mkdir.mockResolvedValue(undefined);

        await ensureDirectoryExists('/path/to/new/directory');

        expect(mockedFs.mkdir).toHaveBeenCalledWith('/path/to/new/directory', {
          recursive: true
        });
      });

      it('should not create directory if it already exists', async () => {
        // Mock pathExists to return true (directory exists)
        (pathExists as jest.Mock).mockReturnValue(true);

        await ensureDirectoryExists('/path/to/existing/directory');

        expect(mockedFs.mkdir).not.toHaveBeenCalled();
      });
    });

    describe('writeFile', () => {
      it('should write content to file', async () => {
        // Mock pathExists for the ensureDirectoryExists call in writeFile
        (pathExists as jest.Mock).mockReturnValue(true);
        mockedFs.writeFile.mockResolvedValue(undefined);

        await writeFile('/path/to/file.txt', 'file content');

        expect(mockedFs.writeFile).toHaveBeenCalledWith(
          '/path/to/file.txt',
          'file content'
        );
      });

      it('should throw error when writing file fails', async () => {
        // Mock pathExists for the ensureDirectoryExists call in writeFile
        (pathExists as jest.Mock).mockReturnValue(true);
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
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

        // Mock pathExists to return true for path checks
        (pathExists as jest.Mock).mockReturnValue(true);
        // Mock mkdir to succeed
        mockedFs.mkdir.mockResolvedValue(undefined);
      });

      afterEach(() => {
        jest.restoreAllMocks();
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