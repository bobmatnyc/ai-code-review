/**
 * @fileoverview Tests for the TokenAnalyzer
 */

import { describe, expect, it, vi } from 'vitest';
import { TokenAnalyzer, FileTokenAnalysis } from '../../analysis/tokens';

// Mock the getContextWindowSize method to return small context for test model
vi.mock('../../clients/utils/modelMaps', () => ({
  getEnhancedModelMapping: vi.fn((modelName: string) => {
    if (modelName === 'test-small-context') {
      return { contextWindow: 10000 }; // Small context window for testing
    }
    if (modelName.includes('gemini-1.5-pro')) {
      return { contextWindow: 1000000 }; // Large context for Gemini
    }
    return null;
  }),
  getModelMapping: vi.fn((modelName: string) => {
    if (modelName === 'test-small-context') {
      return { contextWindow: 10000 }; // Small context window for testing
    }
    if (modelName.includes('gemini-1.5-pro')) {
      return { contextWindow: 1000000 }; // Large context for Gemini
    }
    return null;
  })
}));

describe('TokenAnalyzer', () => {
  // Create some test file data
  const testFiles = [
    {
      path: '/test/file1.ts',
      relativePath: 'file1.ts',
      content: 'const hello = "world";\nexport default hello;'
    },
    {
      path: '/test/file2.ts',
      relativePath: 'file2.ts',
      content: 'import hello from "./file1";\nconsole.log(hello);'
    },
    {
      path: '/test/large-file.ts',
      relativePath: 'large-file.ts',
      content: 'x'.repeat(10000) // Large file to test chunking
    }
  ];

  const testOptions = {
    reviewType: 'quick-fixes',
    modelName: 'gemini:gemini-1.5-pro'
  };

  describe('analyzeFile', () => {
    it('should analyze a single file correctly', () => {
      const result = TokenAnalyzer.analyzeFile(testFiles[0], testOptions);
      
      expect(result).toBeDefined();
      expect(result.path).toBe(testFiles[0].path);
      expect(result.relativePath).toBe(testFiles[0].relativePath);
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.sizeInBytes).toBe(testFiles[0].content.length);
      expect(result.tokensPerByte).toBe(result.tokenCount / result.sizeInBytes);
    });
  });

  describe('analyzeFiles', () => {
    it('should analyze multiple files correctly', () => {
      const result = TokenAnalyzer.analyzeFiles(testFiles, testOptions);
      
      expect(result).toBeDefined();
      expect(result.files).toHaveLength(testFiles.length);
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.totalSizeInBytes).toBe(
        testFiles.reduce((sum, file) => sum + file.content.length, 0)
      );
      expect(result.fileCount).toBe(testFiles.length);
    });

    it('should recommend chunking for large content', () => {
      // Create a very large set of test files
      const largeFiles = Array(5).fill(null).map((_, i) => ({
        path: `/test/large-file-${i}.ts`,
        relativePath: `large-file-${i}.ts`,
        content: 'x'.repeat(3000) // 3KB files, collectively will exceed our test-small-context model
      }));

      const result = TokenAnalyzer.analyzeFiles(largeFiles, {
        ...testOptions,
        // Use our test model with small context window
        modelName: 'test-small-context'
      });

      expect(result.chunkingRecommendation.chunkingRecommended).toBe(true);
      expect(result.estimatedPassesNeeded).toBeGreaterThan(1);
      expect(result.chunkingRecommendation.recommendedChunks.length).toBeGreaterThan(1);
    });

    it('should not recommend chunking for small content', () => {
      // Small test files
      const smallFiles = Array(3).fill(null).map((_, i) => ({
        path: `/test/small-file-${i}.ts`,
        relativePath: `small-file-${i}.ts`,
        content: 'const x = 1;' // Tiny files
      }));

      const result = TokenAnalyzer.analyzeFiles(smallFiles, testOptions);

      expect(result.chunkingRecommendation.chunkingRecommended).toBe(false);
      expect(result.estimatedPassesNeeded).toBe(1);
      expect(result.chunkingRecommendation.recommendedChunks).toHaveLength(1);
    });
  });

  describe('generateChunkingRecommendation', () => {
    it('should generate appropriate chunks for files exceeding context window', () => {
      // Create a mix of file sizes
      const mixedFiles: FileTokenAnalysis[] = [
        {
          path: '/test/large1.ts',
          relativePath: 'large1.ts',
          tokenCount: 50000,
          sizeInBytes: 200000,
          tokensPerByte: 0.25
        },
        {
          path: '/test/large2.ts',
          relativePath: 'large2.ts',
          tokenCount: 40000,
          sizeInBytes: 160000,
          tokensPerByte: 0.25
        },
        {
          path: '/test/medium.ts',
          relativePath: 'medium.ts',
          tokenCount: 20000,
          sizeInBytes: 80000,
          tokensPerByte: 0.25
        },
        {
          path: '/test/small1.ts',
          relativePath: 'small1.ts',
          tokenCount: 5000,
          sizeInBytes: 20000,
          tokensPerByte: 0.25
        },
        {
          path: '/test/small2.ts',
          relativePath: 'small2.ts',
          tokenCount: 5000,
          sizeInBytes: 20000,
          tokensPerByte: 0.25
        }
      ];

      // We can't directly test generateChunkingRecommendation since it's private
      // So we'll test through analyzeFiles
      // Create files that will exceed our test small context model
      // These must be large enough to collectively exceed the effective context window
      // with the DEFAULT_PROMPT_OVERHEAD factored in
      const result = TokenAnalyzer.analyzeFiles([
        { path: mixedFiles[0].path, relativePath: mixedFiles[0].relativePath, content: 'x'.repeat(3000) },
        { path: mixedFiles[1].path, relativePath: mixedFiles[1].relativePath, content: 'x'.repeat(3000) },
        { path: mixedFiles[2].path, relativePath: mixedFiles[2].relativePath, content: 'x'.repeat(3000) },
        { path: mixedFiles[3].path, relativePath: mixedFiles[3].relativePath, content: 'x'.repeat(2000) },
        { path: mixedFiles[4].path, relativePath: mixedFiles[4].relativePath, content: 'x'.repeat(2000) }
      ], {
        ...testOptions,
        modelName: 'test-small-context' // Our test model with small context window
      });

      // Check that chunks are created appropriately
      expect(result.chunkingRecommendation.chunkingRecommended).toBe(true);
      expect(result.chunkingRecommendation.recommendedChunks.length).toBeGreaterThan(1);
      
      // Verify that files are distributed across multiple chunks
      const chunks = result.chunkingRecommendation.recommendedChunks;
      const totalFilesInChunks = chunks.reduce((sum, chunk) => sum + chunk.files.length, 0);
      
      // All files should be included in chunks
      expect(totalFilesInChunks).toBe(5);
      
      // Each chunk should respect the context window limits
      chunks.forEach(chunk => {
        expect(chunk.estimatedTokenCount).toBeLessThanOrEqual(9000); // Effective context size
      });
    });
  });
});