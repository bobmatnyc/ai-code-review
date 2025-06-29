/**
 * @fileoverview Tests for OutputHandler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleReviewOutput, createOutputDirectory } from '../../../core/handlers/OutputHandler';
import { saveReviewOutput } from '../../../core/OutputManager';
import { displayReviewInteractively } from '../../../core/InteractiveDisplayManager';
import logger from '../../../utils/logger';
import * as path from 'path';

// Mock dependencies
vi.mock('../../../core/OutputManager');
vi.mock('../../../core/InteractiveDisplayManager');
vi.mock('../../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    resolve: vi.fn().mockImplementation((dir, file) => {
      if (file === undefined) {
        return dir; // When called with just one argument, return it as-is
      }
      return `${dir}/${file}`;
    }),
    isAbsolute: vi.fn().mockImplementation(path => path.startsWith('/'))
  };
});

describe('OutputHandler', () => {
  // Test with both string cost (legacy) and object cost (current format)
  const mockReviewResultStringCost = { 
    issues: [],
    cost: '$0.10'
  };
  
  const mockReviewResultObjectCost = {
    issues: [],
    cost: {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      estimatedCost: 0.10,
      formattedCost: '$0.10 USD',
      cost: 0.10
    }
  };
  
  const mockOptions = { 
    type: 'quick-fixes',
    output: 'markdown',
    interactive: false,
    target: 'src',
    model: 'openai:gpt-4'
  };
  
  const mockOutputBaseDir = '/output';
  const mockOutputPath = '/output/review.md';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(saveReviewOutput).mockResolvedValue(mockOutputPath);
    
    // Mock implementation for createOutputDirectory
    vi.spyOn(path, 'isAbsolute').mockImplementation((pathStr) => pathStr.startsWith('/'));
    vi.spyOn(path, 'resolve').mockImplementation((dir, file) => `${dir}/${file}`);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleReviewOutput', () => {
    it('should save review output to file with string cost format', async () => {
      await handleReviewOutput(mockReviewResultStringCost, mockOptions, mockOutputBaseDir);
      
      expect(saveReviewOutput).toHaveBeenCalledWith(
        mockReviewResultStringCost,
        mockOptions,
        mockOutputBaseDir,
        'openai:gpt-4',
        'src'
      );
      expect(logger.info).toHaveBeenCalledWith(`Review saved to: ${mockOutputPath}`);
      expect(logger.info).toHaveBeenCalledWith('Review completed successfully');
      expect(logger.info).toHaveBeenCalledWith('Estimated cost: $0.10');
    });
    
    it('should save review output to file with object cost format', async () => {
      await handleReviewOutput(mockReviewResultObjectCost, mockOptions, mockOutputBaseDir);
      
      expect(saveReviewOutput).toHaveBeenCalledWith(
        mockReviewResultObjectCost,
        mockOptions,
        mockOutputBaseDir,
        'openai:gpt-4',
        'src'
      );
      expect(logger.info).toHaveBeenCalledWith(`Review saved to: ${mockOutputPath}`);
      expect(logger.info).toHaveBeenCalledWith('Review completed successfully');
      expect(logger.info).toHaveBeenCalledWith('Estimated cost: $0.10 USD');
    });

    it('should handle interactive mode', async () => {
      const interactiveOptions = { ...mockOptions, interactive: true };
      
      await handleReviewOutput(mockReviewResultStringCost, interactiveOptions, mockOutputBaseDir);
      
      expect(displayReviewInteractively).toHaveBeenCalledWith(
        mockOutputPath,
        expect.any(String),
        interactiveOptions
      );
    });

    it('should handle errors during save', async () => {
      vi.mocked(saveReviewOutput).mockRejectedValue(new Error('Save error'));
      
      await handleReviewOutput(mockReviewResultStringCost, mockOptions, mockOutputBaseDir);
      
      expect(logger.error).toHaveBeenCalledWith('Failed to save review output: Save error');
    });

    it('should handle errors during interactive display', async () => {
      const interactiveOptions = { ...mockOptions, interactive: true };
      vi.mocked(displayReviewInteractively).mockRejectedValue(new Error('Display error'));
      
      await handleReviewOutput(mockReviewResultStringCost, interactiveOptions, mockOutputBaseDir);
      
      expect(logger.error).toHaveBeenCalledWith('Failed to display review interactively: Display error');
    });

    it('should handle token usage information', async () => {
      const reviewResultWithTokens = { 
        ...mockReviewResultStringCost,
        tokenUsage: { input: 100, output: 50, total: 150 }
      };
      
      await handleReviewOutput(reviewResultWithTokens as any, mockOptions, mockOutputBaseDir);
      
      expect(logger.info).toHaveBeenCalledWith('Token usage: 100 input + 50 output = 150 total');
    });
  });

  describe('createOutputDirectory', () => {
    beforeEach(() => {
      // Reset mocks for each test
      vi.clearAllMocks();
    });

    it('should use default output directory when no options provided', () => {
      const result = createOutputDirectory('/project', {});
      expect(result).toBe('/project/ai-code-review-docs');
    });

    it('should use CLI outputDir option when provided', () => {
      const result = createOutputDirectory('/project', { outputDir: 'custom-output' });
      expect(result).toBe('/project/custom-output');
      expect(logger.info).toHaveBeenCalledWith('Using custom output directory: /project/custom-output');
    });

    it('should use config outputDir when CLI option not provided', () => {
      const result = createOutputDirectory('/project', { configOutputDir: 'config-output' });
      expect(result).toBe('/project/config-output');
    });

    it('should prioritize CLI outputDir over config outputDir', () => {
      const result = createOutputDirectory('/project', {
        outputDir: 'cli-output',
        configOutputDir: 'config-output'
      });
      expect(result).toBe('/project/cli-output');
    });

    it('should handle absolute paths correctly', () => {
      const result = createOutputDirectory('/project', { outputDir: '/tmp/reviews' });
      expect(result).toBe('/tmp/reviews');
    });

    it('should throw error for paths containing ".."', () => {
      expect(() => {
        createOutputDirectory('/project', { outputDir: '../dangerous-path' });
      }).toThrow('Output directory path cannot contain ".." for security reasons');
    });

    it('should throw error for relative paths that escape project directory', () => {
      expect(() => {
        createOutputDirectory('/project', { outputDir: '../../outside-project' });
      }).toThrow('Output directory path cannot contain ".." for security reasons');
    });

    it('should allow relative paths within project directory', () => {
      const result = createOutputDirectory('/project', { outputDir: 'subdir/output' });
      expect(result).toBe('/project/subdir/output');
    });
  });
});