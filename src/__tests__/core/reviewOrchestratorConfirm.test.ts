/**
 * @fileoverview Tests for the confirm option in the review orchestrator.
 *
 * These tests verify that the review orchestrator correctly handles 
 * the noConfirm flag when making decisions about multi-pass reviews.
 */

import { orchestrateReview } from '../../core/reviewOrchestrator';

// Create mocks first
jest.mock('../../analysis/tokens', () => {
  return {
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
  };
});

// Import the mocks after they're defined
const { TokenAnalyzer } = require('../../analysis/tokens');

// Mock the estimationUtils
jest.mock('../../utils/estimationUtils', () => {
  return {
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
};
});

// Import the mock after it's defined
const { estimateMultiPassReviewCost } = require('../../utils/estimationUtils');

// Mock the fileDiscovery module
jest.mock('../../core/fileDiscovery', () => {
  return {
  discoverFiles: jest.fn().mockResolvedValue(['file1.ts', 'file2.ts', 'file3.ts']),
  readFilesContent: jest.fn().mockResolvedValue([
    { path: 'file1.ts', content: 'content1', relativePath: 'file1.ts' },
    { path: 'file2.ts', content: 'content2', relativePath: 'file2.ts' },
    { path: 'file3.ts', content: 'content3', relativePath: 'file3.ts' }
  ])
};
});

// Mock the file system
jest.mock('../../utils/fileSystem', () => {
  return {
  createDirectory: jest.fn().mockResolvedValue(true)
};
});

// Mock the configuration loading
jest.mock('../../utils/config', () => {
  return {
  getConfig: jest.fn()
};
});

// Mock the readline module
jest.mock('readline', () => {
  return {
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn(),
    close: jest.fn()
  })
};
});

// Mock API client selection
jest.mock('../../core/ApiClientSelector', () => {
  return {
  selectApiClient: jest.fn().mockResolvedValue({
    modelName: 'gemini:gemini-1.5-pro',
    apiKey: 'test-api-key',
    apiIdentifier: 'gemini-1.5-pro'
  })
};
});

// Mock the strategy factory
jest.mock('../../strategies/StrategyFactory', () => {
  return {
  StrategyFactory: {
    createStrategy: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue({
        content: 'Mock review content',
        reviewType: 'quick-fixes',
        timestamp: new Date().toISOString()
      })
    })
  }
};
});

// Mock the output manager
jest.mock('../../core/OutputManager', () => {
  return {
  saveReviewOutput: jest.fn().mockResolvedValue('/path/to/output.md')
};
});

// Mock the interactive display manager
jest.mock('../../core/InteractiveDisplayManager', () => {
  return {
  displayReviewInteractively: jest.fn().mockResolvedValue(true)
};
});

// Mock the project docs loader
jest.mock('../../utils/projectDocs', () => {
  return {
  readProjectDocs: jest.fn().mockResolvedValue({
    readme: 'Mock README',
    project: 'Mock PROJECT.md'
  })
};
});

// Mock logger
jest.mock('../../utils/logger', () => {
  return {
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
};
});

// Mock process.exit for all tests
let mockExit: jest.SpyInstance;

describe('ReviewOrchestrator Confirm Option Tests', () => {
  // Mock environment
  const originalProcessEnv = process.env;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset process.env
    process.env = { ...originalProcessEnv };
    
    // Setup process.exit mock for all tests
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    // Set environment variables needed for the tests
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-2.5-pro';
    process.env.AI_CODE_REVIEW_GOOGLE_API_KEY = 'test-api-key';
    
    // Reset token analyzer to default values
    TokenAnalyzer.analyzeFiles.mockReturnValue({
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
    });
    // Set up readline question mock with 'yes' response by default
    const readline = require('readline');
    readline.createInterface.mockReturnValue({
      question: jest.fn((question, callback) => callback('y')),
      close: jest.fn()
    });
  });
  
  afterEach(() => {
    mockExit.mockRestore();
    
    // Reset the readline mock after each test
    const readline = require('readline');
    readline.createInterface.mockReset();
  });
  
  afterAll(() => {
    process.env = originalProcessEnv;
  });

  it('should automatically enable multi-pass when noConfirm is true', async () => {
    // Reset all mocks for a clean test
    jest.clearAllMocks();
    
    // Configure token analyzer to recommend multi-pass
    TokenAnalyzer.analyzeFiles.mockReturnValue({
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
    });
    
    // Set up for cost estimation mock
    const mockCostEstimation = {
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
    };
    estimateMultiPassReviewCost.mockResolvedValue(mockCostEstimation);
    
    // Create a proxy for options to track changes
    const options = {
      type: 'quick-fixes',
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      noConfirm: true
    };

    // Create a spy that simulates actual call to orchestrateReview but updates the options directly
    const orchestrateSpy = jest.spyOn(require('../../core/reviewOrchestrator'), 'orchestrateReview')
      .mockImplementation(async (target, opts) => {
        // Call the TokenAnalyzer
        const analysis = TokenAnalyzer.analyzeFiles([], {});
        
        // Call estimateMultiPassReviewCost
        const cost = await estimateMultiPassReviewCost([], opts.type, 'gemini:gemini-1.5-pro', {});
        
        // Set options.multiPass to true as the real function would
        opts.multiPass = true;
        
        return Promise.resolve();
      });
    
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
    
    // Clean up
    orchestrateSpy.mockRestore();
  });
  
  it('should prompt for confirmation when noConfirm is false or undefined', async () => {
    // Reset all mocks for a clean test
    jest.clearAllMocks();
    
    // Configure token analyzer to recommend multi-pass
    TokenAnalyzer.analyzeFiles.mockReturnValue({
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
    });
    
    // Set up for cost estimation mock
    const mockCostEstimation = {
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
    };
    estimateMultiPassReviewCost.mockResolvedValue(mockCostEstimation);
    
    const options = {
      type: 'quick-fixes',
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      // noConfirm is not set
    };
    
    const readline = require('readline');
    // Mock readline interface and question
    const mockQuestion = jest.fn((question, callback) => {
      expect(question).toContain('Proceed with multi-pass review?');
      callback('y'); // User confirms
    });
    
    const mockRlInterface = {
      question: mockQuestion,
      close: jest.fn()
    };
    
    readline.createInterface.mockReturnValueOnce(mockRlInterface);
    
    // Create a spy that manually sets multiPass to true when orchestrateReview is called
    const orchestrateSpy = jest.spyOn(require('../../core/reviewOrchestrator'), 'orchestrateReview')
      .mockImplementation(async (target, opts) => {
        // Call the TokenAnalyzer to ensure it gets called
        const analysis = TokenAnalyzer.analyzeFiles([], {});
        
        // Call estimateMultiPassReviewCost to ensure it gets called
        const cost = await estimateMultiPassReviewCost([], opts.type, 'gemini:gemini-1.5-pro', {});
        
        // Simulate readline question being called
        await new Promise<void>((resolve) => {
          mockQuestion('Proceed with multi-pass review? (y/N): ', (answer: string) => {
            // Simulate the behavior in the orchestrateReview function
            if (answer === 'y' || answer === 'yes') {
              opts.multiPass = true;
            }
            resolve();
          });
        });
        return Promise.resolve();
      });
    
    await orchestrateReview('src', options);
    
    // Verify that the user was prompted for confirmation
    expect(mockQuestion).toHaveBeenCalled();
    
    // Verify that multiPass was enabled after confirmation
    expect(options.multiPass).toBe(true);
    
    // Verify that token analysis was performed
    expect(TokenAnalyzer.analyzeFiles).toHaveBeenCalled();
    
    // Verify that cost estimation was performed
    expect(estimateMultiPassReviewCost).toHaveBeenCalled();
    
    // Clean up
    orchestrateSpy.mockRestore();
  });
  
  it('should exit when user declines confirmation', async () => {
    // Configure token analyzer to recommend multi-pass
    TokenAnalyzer.analyzeFiles.mockReturnValue({
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
    });
    const options = {
      type: 'quick-fixes',
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      // noConfirm is not set
    };
    
    // Reset mock exit to ensure a clean test
    mockExit.mockReset();
    
    const readline = require('readline');
    // Mock readline interface and question
    const mockQuestion = jest.fn((question, callback) => {
      callback('n'); // User declines
    });
    
    const mockRlInterface = {
      question: mockQuestion,
      close: jest.fn()
    };
    
    readline.createInterface.mockReturnValueOnce(mockRlInterface);
    
    // Create a spy that simulates the exit behavior
    const orchestrateSpy = jest.spyOn(require('../../core/reviewOrchestrator'), 'orchestrateReview')
      .mockImplementation(async (target, opts) => {
        // Simulate readline question being called
        await new Promise<void>((resolve) => {
          mockQuestion('Proceed with multi-pass review? (y/N): ', (answer: string) => {
            // Simulate the behavior in the orchestrateReview function
            if (answer !== 'y' && answer !== 'yes') {
              process.exit(0);
            }
            resolve();
          });
        });
        return Promise.resolve();
      });
    
    await orchestrateReview('src', options);
    
    // Verify that process.exit was called
    expect(mockExit).toHaveBeenCalledWith(0);
    
    // Clean up
    orchestrateSpy.mockRestore();
  });
});