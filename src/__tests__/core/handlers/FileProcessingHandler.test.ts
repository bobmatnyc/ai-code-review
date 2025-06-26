/**
 * @fileoverview Tests for FileProcessingHandler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { discoverFilesForReview, readFilesForReview } from '../../../core/handlers/FileProcessingHandler';
import * as fileDiscovery from '../../../core/fileDiscovery';
import logger from '../../../utils/logger';

// Mock dependencies
vi.mock('../../../core/fileDiscovery');
vi.mock('../../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('FileProcessingHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('discoverFilesForReview', () => {
    it('should discover files successfully', async () => {
      const mockFiles = ['file1.ts', 'file2.ts'];
      vi.mocked(fileDiscovery.discoverFiles).mockResolvedValue(mockFiles);

      const result = await discoverFilesForReview('target', '/project', { type: 'quick-fixes' });
      
      expect(result).toEqual(mockFiles);
      expect(fileDiscovery.discoverFiles).toHaveBeenCalledWith('target', '/project', undefined);
      expect(logger.info).toHaveBeenCalledWith('Discovered 2 files to review');
    });

    it('should handle empty file list', async () => {
      vi.mocked(fileDiscovery.discoverFiles).mockResolvedValue([]);

      const result = await discoverFilesForReview('target', '/project', { type: 'quick-fixes' });
      
      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('No files found for review in target');
    });

    it('should handle errors during file discovery', async () => {
      const error = new Error('Discovery error');
      vi.mocked(fileDiscovery.discoverFiles).mockRejectedValue(error);

      await expect(discoverFilesForReview('target', '/project', { type: 'quick-fixes' }))
        .rejects.toThrow('Could not discover files to review in target');
      
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('readFilesForReview', () => {
    it('should read file contents successfully', async () => {
      const mockFiles = ['file1.ts', 'file2.ts'];
      const mockResult = {
        fileInfos: [
          { path: 'file1.ts', content: 'content1', relativePath: 'file1.ts' },
          { path: 'file2.ts', content: 'content2', relativePath: 'file2.ts' }
        ],
        errors: []
      };
      
      vi.mocked(fileDiscovery.readFilesContent).mockResolvedValue(mockResult);

      const result = await readFilesForReview(mockFiles, '/project');
      
      expect(result).toEqual(mockResult);
      expect(fileDiscovery.readFilesContent).toHaveBeenCalledWith(mockFiles, '/project');
      expect(logger.info).toHaveBeenCalledWith('Successfully read 2 out of 2 files');
    });

    it('should handle errors during file reading', async () => {
      const mockFiles = ['file1.ts', 'file2.ts'];
      const mockResult = {
        fileInfos: [{ path: 'file1.ts', content: 'content1', relativePath: 'file1.ts' }],
        errors: [{ path: 'file2.ts', error: 'Read error' }]
      };
      
      vi.mocked(fileDiscovery.readFilesContent).mockResolvedValue(mockResult);

      const result = await readFilesForReview(mockFiles, '/project');
      
      expect(result).toEqual(mockResult);
      expect(logger.warn).toHaveBeenCalledWith('Failed to read 1 file(s):');
    });

    it('should throw error when no files could be read', async () => {
      const mockFiles = ['file1.ts', 'file2.ts'];
      const mockResult = {
        fileInfos: [],
        errors: [
          { path: 'file1.ts', error: 'Read error 1' },
          { path: 'file2.ts', error: 'Read error 2' }
        ]
      };
      
      vi.mocked(fileDiscovery.readFilesContent).mockResolvedValue(mockResult);

      await expect(readFilesForReview(mockFiles, '/project'))
        .rejects.toThrow('No files could be read for review');
      
      expect(logger.error).toHaveBeenCalled();
    });
  });
});