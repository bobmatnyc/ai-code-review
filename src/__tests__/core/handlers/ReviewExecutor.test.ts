/**
 * @fileoverview Tests for ReviewExecutor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeReview, determineIfMultiPassNeeded } from '../../../core/handlers/ReviewExecutor';
import { StrategyFactory } from '../../../strategies/StrategyFactory';
import logger from '../../../utils/logger';

// Mock dependencies
vi.mock('../../../strategies/StrategyFactory');
vi.mock('../../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('ReviewExecutor', () => {
  const mockStrategy = {
    execute: vi.fn().mockResolvedValue({ issues: [] })
  };
  
  const mockFileInfos = [
    { path: 'file1.ts', content: 'content1', relativePath: 'file1.ts' }
  ];
  
  const mockOptions = { 
    type: 'quick-fixes',
    multiPass: false,
    forceSinglePass: false
  };
  
  const mockApiClientConfig = { 
    modelName: 'openai:gpt-4'
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(StrategyFactory.createStrategy).mockReturnValue(mockStrategy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('executeReview', () => {
    it('should execute review with correct strategy', async () => {
      // Mock the strategy.execute to return a specific value
      vi.mocked(mockStrategy.execute).mockResolvedValue({ issues: [] });
      
      const result = await executeReview(
        mockFileInfos,
        mockOptions,
        mockApiClientConfig,
        null,
        null,
        null
      );
      
      expect(StrategyFactory.createStrategy).toHaveBeenCalledWith(mockOptions);
      expect(mockStrategy.execute).toHaveBeenCalled();
      expect(result).toEqual({ issues: [] });
      expect(logger.info).toHaveBeenCalledWith('Using quick-fixes review strategy');
    });

    it('should throw error for unsupported review type', async () => {
      vi.mocked(StrategyFactory.createStrategy).mockReturnValue(null);
      
      await expect(executeReview(
        mockFileInfos,
        mockOptions,
        mockApiClientConfig,
        null,
        null,
        null
      )).rejects.toThrow('Unsupported review type: quick-fixes');
    });

    it('should enable multi-pass mode when needed', async () => {
      const options = { ...mockOptions, multiPass: true };
      
      await executeReview(
        mockFileInfos,
        options,
        mockApiClientConfig,
        null,
        null,
        null
      );
      
      expect(logger.info).toHaveBeenCalledWith('Using multi-pass review due to content size or complexity');
    });
  });

  describe('determineIfMultiPassNeeded', () => {
    it('should return true when multiPass option is enabled', () => {
      const options = { ...mockOptions, multiPass: true };
      const result = determineIfMultiPassNeeded(options, null);
      expect(result).toBe(true);
    });

    it('should return false when forceSinglePass option is enabled', () => {
      const options = { ...mockOptions, forceSinglePass: true };
      const tokenAnalysis = { 
        chunkingRecommendation: { chunkingRecommended: true } 
      };
      const result = determineIfMultiPassNeeded(options, tokenAnalysis);
      expect(result).toBe(false);
    });

    it('should use token analysis recommendation when available', () => {
      const tokenAnalysis = { 
        chunkingRecommendation: { chunkingRecommended: true } 
      };
      const result = determineIfMultiPassNeeded(mockOptions, tokenAnalysis);
      expect(result).toBe(true);
    });

    it('should default to false when no information is available', () => {
      const result = determineIfMultiPassNeeded(mockOptions, null);
      expect(result).toBe(false);
    });
  });
});