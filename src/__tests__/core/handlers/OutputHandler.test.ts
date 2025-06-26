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
    resolve: vi.fn().mockImplementation((dir, file) => `${dir}/${file}`),
    isAbsolute: vi.fn().mockImplementation(path => path.startsWith('/'))
  };
});

describe('OutputHandler', () => {
  const mockReviewResult = { 
    issues: [],
    cost: '$0.10'
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleReviewOutput', () => {
    it('should save review output to file', async () => {
      await handleReviewOutput(mockReviewResult, mockOptions, mockOutputBaseDir);
      
      expect(saveReviewOutput).toHaveBeenCalledWith(
        mockReviewResult,
        mockOptions,
        mockOutputBaseDir,
        'openai:gpt-4',
        'src'
      );
      expect(logger.info).toHaveBeenCalledWith(`Review saved to: ${mockOutputPath}`);
      expect(logger.info).toHaveBeenCalledWith('Review completed successfully');
      expect(logger.info).toHaveBeenCalledWith('Estimated cost: $0.10');
    });

    it('should handle interactive mode', async () => {
      const interactiveOptions = { ...mockOptions, interactive: true };
      
      await handleReviewOutput(mockReviewResult, interactiveOptions, mockOutputBaseDir);
      
      expect(displayReviewInteractively).toHaveBeenCalledWith(
        mockOutputPath,
        expect.any(String),
        interactiveOptions
      );
    });

    it('should handle errors during save', async () => {
      vi.mocked(saveReviewOutput).mockRejectedValue(new Error('Save error'));
      
      await handleReviewOutput(mockReviewResult, mockOptions, mockOutputBaseDir);
      
      expect(logger.error).toHaveBeenCalledWith('Failed to save review output: Save error');
    });

    it('should handle errors during interactive display', async () => {
      const interactiveOptions = { ...mockOptions, interactive: true };
      vi.mocked(displayReviewInteractively).mockRejectedValue(new Error('Display error'));
      
      await handleReviewOutput(mockReviewResult, interactiveOptions, mockOutputBaseDir);
      
      expect(logger.error).toHaveBeenCalledWith('Failed to display review interactively: Display error');
    });

    it('should handle token usage information', async () => {
      const reviewResultWithTokens = { 
        ...mockReviewResult,
        tokenUsage: { input: 100, output: 50, total: 150 }
      };
      
      await handleReviewOutput(reviewResultWithTokens as any, mockOptions, mockOutputBaseDir);
      
      expect(logger.info).toHaveBeenCalledWith('Token usage: 100 input + 50 output = 150 total');
    });
  });

  describe('createOutputDirectory', () => {
    it('should handle absolute output directory path', () => {
      const options = { outputDir: '/absolute/path', configOutputDir: 'default' };
      const result = createOutputDirectory('/project', options);
      
      expect(result).toBe('/absolute/path');
      expect(path.isAbsolute).toHaveBeenCalledWith('/absolute/path');
      expect(logger.info).toHaveBeenCalledWith('Using custom output directory: /absolute/path');
    });

    it('should handle relative output directory path', () => {
      const options = { outputDir: 'relative/path', configOutputDir: 'default' };
      const result = createOutputDirectory('/project', options);
      
      expect(result).toBe('/project/relative/path');
      expect(path.isAbsolute).toHaveBeenCalledWith('relative/path');
      expect(path.resolve).toHaveBeenCalledWith('/project', 'relative/path');
      expect(logger.info).toHaveBeenCalledWith('Using custom output directory: /project/relative/path');
    });

    it('should use config output directory if no output directory is specified', () => {
      const options = { configOutputDir: 'config/path' };
      const result = createOutputDirectory('/project', options);
      
      expect(result).toBe('/project/config/path');
    });

    it('should use default output directory if no output directory is specified', () => {
      const options = {};
      const result = createOutputDirectory('/project', options);
      
      expect(result).toBe('/project/ai-code-review-docs');
      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});