/**
 * @fileoverview Tests for the confirm option in the review orchestrator.
 *
 * These tests verify that the review orchestrator correctly handles 
 * the noConfirm flag when making decisions about multi-pass reviews.
 */

import { orchestrateReview } from '../../core/reviewOrchestrator';
import { TokenAnalyzer } from '../../analysis/tokens/TokenAnalyzer';
import { estimateMultiPassReviewCost } from '../../utils/estimationUtils';

// Mock the tokenAnalyzer
jest.mock('../../analysis/tokens/TokenAnalyzer', () => ({
  TokenAnalyzer: {
    analyzeFiles: jest.fn().mockReturnValue({
      files: [],
      totalTokens: 1000000,
      totalSizeInBytes: 1000000,
      averageTokensPerByte: 1,
      fileCount: 10,
      promptOverheadTokens: 1500,
      estimatedTotalTokens: 1001500,
      contextWindowSize: 100000,
      exceedsContextWindow: true,
      estimatedPassesNeeded: 3,
      chunkingRecommendation: {
        chunkingRecommended: true,
        recommendedChunks: [
          { files: ['file1.ts'], estimatedTokenCount: 300000, priority: 1 },
          { files: ['file2.ts'], estimatedTokenCount: 300000, priority: 2 },
          { files: ['file3.ts'], estimatedTokenCount: 300000, priority: 3 }
        ],
        reason: 'Content exceeds model context window'
      }
    })
  }
}));

// Mock the estimationUtils
jest.mock('../../utils/estimationUtils', () => ({
  estimateMultiPassReviewCost: jest.fn().mockResolvedValue({
    inputTokens: 1000000,
    outputTokens: 100000,
    totalTokens: 1100000,
    estimatedCost: 0.05,
    formattedCost: '$0.05',
    fileCount: 10,
    totalFileSize: 1000000,
    passCount: 3,
    perPassCosts: [
      { passNumber: 1, inputTokens: 300000, outputTokens: 30000, totalTokens: 330000, estimatedCost: 0.015 },
      { passNumber: 2, inputTokens: 300000, outputTokens: 30000, totalTokens: 330000, estimatedCost: 0.015 },
      { passNumber: 3, inputTokens: 300000, outputTokens: 30000, totalTokens: 330000, estimatedCost: 0.015 }
    ]
  }),
  formatMultiPassEstimation: jest.fn().mockReturnValue('Mock formatted estimation')
}));

// Mock the fileDiscovery module
jest.mock('../../core/fileDiscovery', () => ({
  discoverFiles: jest.fn().mockResolvedValue(['file1.ts', 'file2.ts', 'file3.ts']),
  readFilesContent: jest.fn().mockResolvedValue([
    { path: 'file1.ts', content: 'content1', relativePath: 'file1.ts' },
    { path: 'file2.ts', content: 'content2', relativePath: 'file2.ts' },
    { path: 'file3.ts', content: 'content3', relativePath: 'file3.ts' }
  ])
}));

// Mock the file system
jest.mock('../../utils/fileSystem', () => ({
  createDirectory: jest.fn().mockResolvedValue(true)
}));

// Mock the configuration loading
jest.mock('../../utils/config', () => ({
  getConfig: jest.fn()
}));

// Mock the readline module
jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn(),
    close: jest.fn()
  })
}));

// Mock API client selection
jest.mock('../../core/ApiClientSelector', () => ({
  selectApiClient: jest.fn().mockResolvedValue({
    modelName: 'gemini:gemini-1.5-pro',
    apiKey: 'test-api-key'
  })
}));

// Mock the strategy factory
jest.mock('../../strategies/StrategyFactory', () => ({
  StrategyFactory: {
    createStrategy: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue({
        content: 'Mock review content',
        reviewType: 'quick-fixes',
        timestamp: new Date().toISOString()
      })
    })
  }
}));

// Mock the output manager
jest.mock('../../core/OutputManager', () => ({
  saveReviewOutput: jest.fn().mockResolvedValue('/path/to/output.md')
}));

// Mock the interactive display manager
jest.mock('../../core/InteractiveDisplayManager', () => ({
  displayReviewInteractively: jest.fn().mockResolvedValue(true)
}));

// Mock the project docs loader
jest.mock('../../utils/projectDocs', () => ({
  readProjectDocs: jest.fn().mockResolvedValue({
    readme: 'Mock README',
    project: 'Mock PROJECT.md'
  })
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('ReviewOrchestrator Confirm Option Tests', () => {
  // Mock environment
  const originalProcessEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.env
    process.env = { ...originalProcessEnv };
    
    // Set up readline question mock with different behavior per test
    const readline = require('readline');
    readline.createInterface.mockReturnValue({
      question: jest.fn((question, callback) => callback('y')),
      close: jest.fn()
    });
  });
  
  afterAll(() => {
    process.env = originalProcessEnv;
  });

  it('should automatically enable multi-pass when noConfirm is true', async () => {
    const options = {
      type: 'quick-fixes',
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      noConfirm: true
    };
    
    await orchestrateReview('src', options);
    
    // Verify that multiPass was enabled without prompting
    expect(options.multiPass).toBe(true);
    
    // Verify that the token analysis was performed
    expect(TokenAnalyzer.analyzeFiles).toHaveBeenCalled();
    
    // Verify that cost estimation was performed
    expect(estimateMultiPassReviewCost).toHaveBeenCalled();
    
    // Check that readline was not used for confirmation
    const readline = require('readline');
    expect(readline.createInterface().question).not.toHaveBeenCalled();
  });
  
  it('should prompt for confirmation when noConfirm is false or undefined', async () => {
    const options = {
      type: 'quick-fixes',
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      // noConfirm is not set
    };
    
    const readline = require('readline');
    readline.createInterface().question.mockImplementationOnce((question, callback) => {
      expect(question).toContain('Proceed with multi-pass review?');
      callback('y'); // User confirms
    });
    
    await orchestrateReview('src', options);
    
    // Verify that the user was prompted for confirmation
    expect(readline.createInterface().question).toHaveBeenCalled();
    
    // Verify that multiPass was enabled after confirmation
    expect(options.multiPass).toBe(true);
    
    // Verify that token analysis was performed
    expect(TokenAnalyzer.analyzeFiles).toHaveBeenCalled();
    
    // Verify that cost estimation was performed
    expect(estimateMultiPassReviewCost).toHaveBeenCalled();
  });
  
  it('should exit when user declines confirmation', async () => {
    const options = {
      type: 'quick-fixes',
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      // noConfirm is not set
    };
    
    // Mock process.exit
    const originalExit = process.exit;
    process.exit = jest.fn() as any;
    
    const readline = require('readline');
    readline.createInterface().question.mockImplementationOnce((question, callback) => {
      callback('n'); // User declines
    });
    
    await orchestrateReview('src', options);
    
    // Verify that process.exit was called
    expect(process.exit).toHaveBeenCalledWith(0);
    
    // Restore process.exit
    process.exit = originalExit;
  });
});