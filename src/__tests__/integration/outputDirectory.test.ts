/**
 * @fileoverview Integration tests for output directory override functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArguments, mapArgsToReviewOptions } from '../../cli/argumentParser';
import { createOutputDirectory } from '../../core/handlers/OutputHandler';
import * as configManager from '../../utils/configManager';

// Mock dependencies
vi.mock('../../utils/configManager', () => ({
  default: {
    getPathsConfig: vi.fn(() => ({ outputDir: 'ai-code-review-docs' }))
  },
  getPathsConfig: vi.fn(() => ({ outputDir: 'ai-code-review-docs' }))
}));

vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Output Directory Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.argv to avoid interference from other tests
    process.argv = ['node', 'ai-code-review'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse --output-dir flag correctly', () => {
    // Mock process.argv with --output-dir flag
    process.argv = ['node', 'ai-code-review', 'src', '--output-dir', 'custom-reviews'];
    
    const argv = parseArguments();
    const options = mapArgsToReviewOptions(argv);
    
    expect(options.outputDir).toBe('custom-reviews');
  });

  it('should handle relative output directory paths', () => {
    const projectPath = '/mock/project';
    const result = createOutputDirectory(projectPath, {
      outputDir: 'custom-output'
    });
    
    expect(result).toBe('/mock/project/custom-output');
  });

  it('should handle absolute output directory paths', () => {
    const projectPath = '/mock/project';
    const result = createOutputDirectory(projectPath, {
      outputDir: '/tmp/reviews'
    });
    
    expect(result).toBe('/tmp/reviews');
  });

  it('should use environment variable when CLI flag not provided', () => {
    // Mock environment variable
    const originalEnv = process.env.AI_CODE_REVIEW_OUTPUT_DIR;
    process.env.AI_CODE_REVIEW_OUTPUT_DIR = 'env-output-dir';
    
    // Mock configManager to return the environment variable value
    vi.mocked(configManager.getPathsConfig).mockReturnValue({
      outputDir: 'env-output-dir',
      promptsDir: '',
      templatesDir: ''
    });
    
    const projectPath = '/mock/project';
    const result = createOutputDirectory(projectPath, {
      configOutputDir: 'env-output-dir'
    });
    
    expect(result).toBe('/mock/project/env-output-dir');
    
    // Restore environment variable
    if (originalEnv !== undefined) {
      process.env.AI_CODE_REVIEW_OUTPUT_DIR = originalEnv;
    } else {
      delete process.env.AI_CODE_REVIEW_OUTPUT_DIR;
    }
  });

  it('should prioritize CLI flag over environment variable', () => {
    // Mock environment variable
    const originalEnv = process.env.AI_CODE_REVIEW_OUTPUT_DIR;
    process.env.AI_CODE_REVIEW_OUTPUT_DIR = 'env-output-dir';
    
    const projectPath = '/mock/project';
    const result = createOutputDirectory(projectPath, {
      outputDir: 'cli-output-dir',
      configOutputDir: 'env-output-dir'
    });
    
    expect(result).toBe('/mock/project/cli-output-dir');
    
    // Restore environment variable
    if (originalEnv !== undefined) {
      process.env.AI_CODE_REVIEW_OUTPUT_DIR = originalEnv;
    } else {
      delete process.env.AI_CODE_REVIEW_OUTPUT_DIR;
    }
  });

  it('should validate security constraints', () => {
    const projectPath = '/mock/project';
    
    // Test path traversal protection
    expect(() => {
      createOutputDirectory(projectPath, {
        outputDir: '../dangerous-path'
      });
    }).toThrow('Output directory path cannot contain ".." for security reasons');
  });
});
