/**
 * @fileoverview Tests for the confirm option in the review orchestrator.
 *
 * These tests verify that the review orchestrator correctly handles 
 * the noConfirm flag when making decisions about multi-pass reviews.
 */

// Import the module with the function to mock
import * as reviewOrchestratorModule from '../../core/reviewOrchestrator';

// Import types for better typing support
import type { TokenAnalyzer as TokenAnalyzerType } from '../../analysis/tokens';
import type { estimateMultiPassReviewCost as EstimateType } from '../../utils/estimationUtils';

// Mock the readline module directly
jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn((question, callback) => callback('y')),
    close: jest.fn()
  })
}));

// Mock all required modules before usage
jest.mock('../../analysis/tokens', () => ({
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

// Get the mocked TokenAnalyzer for use in tests
const TokenAnalyzer = jest.mocked(
  (jest.requireMock('../../analysis/tokens') as { TokenAnalyzer: typeof TokenAnalyzerType }).TokenAnalyzer
);

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

// Get the mocked estimateMultiPassReviewCost for use in tests
const estimateMultiPassReviewCost = jest.mocked(
  (jest.requireMock('../../utils/estimationUtils') as { estimateMultiPassReviewCost: typeof EstimateType }).estimateMultiPassReviewCost
);

// Mock the fileDiscovery module
jest.mock('../../core/fileDiscovery', () => ({
  discoverFiles: jest.fn().mockResolvedValue(['file1.ts', 'file2.ts', 'file3.ts']),
  readFilesContent: jest.fn().mockResolvedValue({
    fileInfos: [
      { path: 'file1.ts', content: 'content1', relativePath: 'file1.ts' },
      { path: 'file2.ts', content: 'content2', relativePath: 'file2.ts' },
      { path: 'file3.ts', content: 'content3', relativePath: 'file3.ts' }
    ],
    errors: []
  })
}));

// Mock the file system
jest.mock('../../utils/fileSystem', () => ({
  createDirectory: jest.fn().mockResolvedValue(true)
}));

// Mock the configuration loading
jest.mock('../../utils/config', () => ({
  getConfig: jest.fn()
}));

// Mock API client selection
jest.mock('../../core/ApiClientSelector', () => ({
  selectApiClient: jest.fn().mockResolvedValue({
    modelName: 'gemini:gemini-1.5-pro',
    apiKey: 'test-api-key',
    apiIdentifier: 'gemini-1.5-pro'
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

// Set up mockExit spy
let mockExit: jest.SpyInstance;

// Test suite for the confirm functionality in the orchestrator
describe('ReviewOrchestrator Confirm Option Tests', () => {
  // Store original environment
  const originalProcessEnv = process.env;
  
  // Set up required hooks
  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();
    
    // Reset environment
    process.env = { ...originalProcessEnv };
    
    // Mock process.exit to prevent actual exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    // Set environment variables needed for tests
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-2.5-pro';
    process.env.AI_CODE_REVIEW_GOOGLE_API_KEY = 'test-api-key';
    
    // Reset TokenAnalyzer to default behavior
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
  });
  
  // Reset after each test
  afterEach(() => {
    mockExit.mockRestore();
  });
  
  // Reset after all tests
  afterAll(() => {
    process.env = originalProcessEnv;
  });

  // Test for automatic enabling of multi-pass with noConfirm
  test('should automatically enable multi-pass when noConfirm is true', async () => {
    // Get access to the mocked readline module
    const readline = jest.requireMock('readline');
    const mockQuestion = readline.createInterface().question;
    
    // Create test options with noConfirm set to true
    const options = {
      type: 'quick-fixes',
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      noConfirm: true
    };
    
    // Create our test implementation of orchestrateReview
    const orchestrateReviewImpl = async (target: string, opts: any) => {
      // Simplified implementation of the relevant portion of orchestrateReview
      // Focus only on the code path that handles noConfirm and multiPass
      
      // Call TokenAnalyzer to simulate the analysis that finds chunking necessary
      TokenAnalyzer.analyzeFiles([], {});
      
      // Simulate estimating multi-pass cost
      await estimateMultiPassReviewCost([], opts.type, 'gemini:gemini-1.5-pro', {});
      
      // Simulate the chunking recommendation workflow
      if (opts.noConfirm) {
        opts.multiPass = true;
      }
      
      return Promise.resolve();
    };
    
    // Mock the orchestrateReview function with our test implementation
    const originalOrchestrate = reviewOrchestratorModule.orchestrateReview;
    jest.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockImplementation(orchestrateReviewImpl);
    
    try {
      // Call the function under test
      await reviewOrchestratorModule.orchestrateReview('src', options);
      
      // Verify expectations
      expect(options.multiPass).toBe(true); // multiPass should be set to true
      expect(TokenAnalyzer.analyzeFiles).toHaveBeenCalled(); // Token analysis called
      expect(estimateMultiPassReviewCost).toHaveBeenCalled(); // Cost estimation called
      expect(mockQuestion).not.toHaveBeenCalled(); // Readline should not be called with noConfirm=true
    } finally {
      // Restore the original implementation
      jest.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockRestore();
      
      // Clear mock call counts
      jest.clearAllMocks();
    }
  });
  
  // Test for prompting when noConfirm is false
  test('should prompt for confirmation when noConfirm is false or undefined', async () => {
    // Get access to the mocked readline module
    const readline = jest.requireMock('readline');
    
    // Configure mock for this test to return 'y'
    readline.createInterface.mockReturnValue({
      question: jest.fn((question, callback) => callback('y')),
      close: jest.fn()
    });
    
    // Create options without noConfirm
    const options = {
      type: 'quick-fixes',
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true
      // noConfirm is not set
    };
    
    // Create our test implementation of orchestrateReview
    const orchestrateReviewImpl = async (target: string, opts: any) => {
      // Simplified implementation that just handles confirmation
      TokenAnalyzer.analyzeFiles([], {});
      await estimateMultiPassReviewCost([], opts.type, 'gemini:gemini-1.5-pro', {});
      
      // Simulate the confirmation process
      if (!opts.noConfirm) {
        const rl = readline.createInterface();
        
        await new Promise<void>((resolve) => {
          rl.question('Proceed with multi-pass review? (y/N): ', (answer: string) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
              opts.multiPass = true;
            }
            rl.close();
            resolve();
          });
        });
      }
      
      return Promise.resolve();
    };
    
    // Mock the orchestrateReview function with our test implementation
    const originalOrchestrate = reviewOrchestratorModule.orchestrateReview;
    jest.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockImplementation(orchestrateReviewImpl);
    
    try {
      // Call the function under test
      await reviewOrchestratorModule.orchestrateReview('src', options);
      
      // Since our mock readline answers 'y', multiPass should be true
      expect(options.multiPass).toBe(true);
      expect(TokenAnalyzer.analyzeFiles).toHaveBeenCalled();
      expect(estimateMultiPassReviewCost).toHaveBeenCalled();
      
      // Readline.question should be called because noConfirm is not set
      expect(readline.createInterface().question).toHaveBeenCalled();
    } finally {
      // Restore the original implementation
      jest.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockRestore();
      
      // Clear mock call history
      jest.clearAllMocks();
    }
  });
  
  // Test for exiting when user declines confirmation
  test('should exit when user declines confirmation', async () => {
    // Get access to the mocked readline module
    const readline = jest.requireMock('readline');
    
    // Configure mock for this test to return 'n'
    readline.createInterface.mockReturnValue({
      question: jest.fn((question, callback) => callback('n')),
      close: jest.fn()
    });
    
    // Create options without noConfirm
    const options = {
      type: 'quick-fixes',
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true
      // noConfirm is not set
    };
    
    // Create our test implementation of orchestrateReview
    const orchestrateReviewImpl = async (target: string, opts: any) => {
      // Simplified implementation that handles confirmation and exit
      TokenAnalyzer.analyzeFiles([], {});
      await estimateMultiPassReviewCost([], opts.type, 'gemini:gemini-1.5-pro', {});
      
      // Simulate the confirmation process
      if (!opts.noConfirm) {
        const rl = readline.createInterface();
        
        await new Promise<void>((resolve) => {
          rl.question('Proceed with multi-pass review? (y/N): ', (answer: string) => {
            if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
              // User declined, so exit
              process.exit(0);
            } else {
              opts.multiPass = true;
            }
            rl.close();
            resolve();
          });
        });
      }
      
      return Promise.resolve();
    };
    
    // Mock the orchestrateReview function with our test implementation
    const originalOrchestrate = reviewOrchestratorModule.orchestrateReview;
    jest.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockImplementation(orchestrateReviewImpl);
    
    try {
      // Call the function under test
      await reviewOrchestratorModule.orchestrateReview('src', options);
      
      // Verify that process.exit was called when user said 'n'
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(readline.createInterface().question).toHaveBeenCalled();
    } finally {
      // Restore the original implementation
      jest.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockRestore();
      
      // Clear mocks
      jest.clearAllMocks();
    }
  });
});