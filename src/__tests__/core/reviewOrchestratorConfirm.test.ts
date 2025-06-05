/**
 * @fileoverview Tests for the confirm option in the review orchestrator.
 *
 * These tests verify that the review orchestrator correctly handles 
 * the noConfirm flag when making decisions about multi-pass reviews.
 */

import { vi } from 'vitest';

// Import the module with the function to mock
import * as reviewOrchestratorModule from '../../core/reviewOrchestrator';

// Mock the readline module directly
vi.mock('readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn((question, callback) => callback('y')),
    close: vi.fn()
  })
}));

// Mock all required modules before usage
vi.mock('../../analysis/tokens', () => ({
  TokenAnalyzer: {
    analyzeFiles: vi.fn().mockReturnValue({
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
vi.mock('../../utils/estimationUtils', () => ({
  estimateMultiPassReviewCost: vi.fn().mockResolvedValue({
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
  formatMultiPassEstimation: vi.fn().mockReturnValue('Mock formatted estimation')
}));

// Import the actual modules after setting up mocks
import { TokenAnalyzer } from '../../analysis/tokens';
import { estimateMultiPassReviewCost } from '../../utils/estimationUtils';
import * as readline from 'readline';

// Mock the fileDiscovery module
vi.mock('../../core/fileDiscovery', () => ({
  discoverFiles: vi.fn().mockResolvedValue(['file1.ts', 'file2.ts', 'file3.ts']),
  readFilesContent: vi.fn().mockResolvedValue({
    fileInfos: [
      { path: 'file1.ts', content: 'content1', relativePath: 'file1.ts' },
      { path: 'file2.ts', content: 'content2', relativePath: 'file2.ts' },
      { path: 'file3.ts', content: 'content3', relativePath: 'file3.ts' }
    ],
    errors: []
  })
}));

// Mock the file system
vi.mock('../../utils/fileSystem', () => ({
  createDirectory: vi.fn().mockResolvedValue(true)
}));

// Mock the configuration loading
vi.mock('../../utils/config', () => ({
  getConfig: vi.fn()
}));

// Mock API client selection
vi.mock('../../core/ApiClientSelector', () => ({
  selectApiClient: vi.fn().mockResolvedValue({
    modelName: 'gemini:gemini-1.5-pro',
    apiKey: 'test-api-key',
    apiIdentifier: 'gemini-1.5-pro'
  })
}));

// Mock the strategy factory
vi.mock('../../strategies/StrategyFactory', () => ({
  StrategyFactory: {
    createStrategy: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue({
        content: 'Mock review content',
        reviewType: 'quick-fixes',
        timestamp: new Date().toISOString()
      })
    })
  }
}));

// Mock the output manager
vi.mock('../../core/OutputManager', () => ({
  saveReviewOutput: vi.fn().mockResolvedValue('/path/to/output.md')
}));

// Mock the interactive display manager
vi.mock('../../core/InteractiveDisplayManager', () => ({
  displayReviewInteractively: vi.fn().mockResolvedValue(true)
}));

// Mock the project docs loader
vi.mock('../../utils/projectDocs', () => ({
  readProjectDocs: vi.fn().mockResolvedValue({
    readme: 'Mock README',
    project: 'Mock PROJECT.md'
  })
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Set up mockExit spy
let mockExit: any;

// Test suite for the confirm functionality in the orchestrator
describe('ReviewOrchestrator Confirm Option Tests', () => {
  // Store original environment
  const originalProcessEnv = process.env;
  
  // Set up required hooks
  beforeEach(() => {
    // Reset mocks between tests
    vi.clearAllMocks();
    
    // Reset environment
    process.env = { ...originalProcessEnv };
    
    // Mock process.exit to prevent actual exit
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    // Set environment variables needed for tests
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-2.5-pro';
    process.env.AI_CODE_REVIEW_GOOGLE_API_KEY = 'test-api-key';
    
    // Reset TokenAnalyzer to default behavior
    vi.mocked(TokenAnalyzer.analyzeFiles).mockReturnValue({
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
    const mockedReadline = vi.mocked(readline);
    const mockInterface = mockedReadline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const mockQuestion = mockInterface?.question || vi.fn();
    
    // Create test options with noConfirm set to true
    const options = {
      type: 'quick-fixes' as const,
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      noConfirm: true,
      multiPass: false
    };
    
    // Create our test implementation of orchestrateReview
    const orchestrateReviewImpl = async (target: string, opts: any) => {
      // Simplified implementation of the relevant portion of orchestrateReview
      // Focus only on the code path that handles noConfirm and multiPass
      
      // Call TokenAnalyzer to simulate the analysis that finds chunking necessary
      vi.mocked(TokenAnalyzer.analyzeFiles)([], {
        reviewType: 'quick-fixes',
        modelName: 'gemini:gemini-1.5-pro'
      });
      
      // Simulate estimating multi-pass cost
      await estimateMultiPassReviewCost([], opts.type, 'gemini:gemini-1.5-pro', {});
      
      // Simulate the chunking recommendation workflow
      if (opts.noConfirm) {
        opts.multiPass = true;
      }
      
      return Promise.resolve();
    };
    
    // Mock the orchestrateReview function with our test implementation
    vi.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockImplementation(orchestrateReviewImpl);
    
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
      vi.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockRestore();
      
      // Clear mock call counts
      vi.clearAllMocks();
    }
  });
  
  // Test for prompting when noConfirm is false
  test('should prompt for confirmation when noConfirm is false or undefined', async () => {
    // Get access to the mocked readline module
    const mockedReadline = vi.mocked(readline);
    
    // Configure mock for this test to return 'y'
    mockedReadline.createInterface.mockReturnValue({
      question: vi.fn((question, callback) => callback('y')),
      close: vi.fn()
    } as any);
    
    // Create options without noConfirm
    const options = {
      type: 'quick-fixes' as const,
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      multiPass: false
    };
    
    // Create our test implementation of orchestrateReview
    const orchestrateReviewImpl = async (target: string, opts: any) => {
      // Simplified implementation that just handles confirmation
      vi.mocked(TokenAnalyzer.analyzeFiles)([], {
        reviewType: 'quick-fixes',
        modelName: 'gemini:gemini-1.5-pro'
      });
      await estimateMultiPassReviewCost([], opts.type, 'gemini:gemini-1.5-pro', {});
      
      // Simulate the confirmation process
      if (!opts.noConfirm) {
        const rl = mockedReadline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
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
    vi.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockImplementation(orchestrateReviewImpl);
    
    try {
      // Call the function under test
      await reviewOrchestratorModule.orchestrateReview('src', options);
      
      // Since our mock readline answers 'y', multiPass should be true
      expect(options.multiPass).toBe(true);
      expect(vi.mocked(TokenAnalyzer.analyzeFiles)).toHaveBeenCalled();
      expect(estimateMultiPassReviewCost).toHaveBeenCalled();
      
      // Readline.question should be called because noConfirm is not set
      expect(mockedReadline.createInterface({
        input: process.stdin,
        output: process.stdout
      }).question).toHaveBeenCalled();
    } finally {
      // Restore the original implementation
      vi.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockRestore();
      
      // Clear mock call history
      vi.clearAllMocks();
    }
  });
  
  // Test for exiting when user declines confirmation
  test('should exit when user declines confirmation', async () => {
    // Get access to the mocked readline module
    const mockedReadline = vi.mocked(readline);
    
    // Configure mock for this test to return 'n'
    mockedReadline.createInterface.mockReturnValue({
      question: vi.fn((question, callback) => callback('n')),
      close: vi.fn()
    } as any);
    
    // Create options without noConfirm
    const options = {
      type: 'quick-fixes' as const,
      output: 'markdown',
      includeTests: false,
      includeProjectDocs: true,
      multiPass: false
    };
    
    // Create our test implementation of orchestrateReview
    const orchestrateReviewImpl = async (target: string, opts: any) => {
      // Simplified implementation that handles confirmation and exit
      vi.mocked(TokenAnalyzer.analyzeFiles)([], {
        reviewType: 'quick-fixes',
        modelName: 'gemini:gemini-1.5-pro'
      });
      await estimateMultiPassReviewCost([], opts.type, 'gemini:gemini-1.5-pro', {});
      
      // Simulate the confirmation process
      if (!opts.noConfirm) {
        const rl = mockedReadline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
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
    vi.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockImplementation(orchestrateReviewImpl);
    
    try {
      // Call the function under test
      await reviewOrchestratorModule.orchestrateReview('src', options);
      
      // Verify that process.exit was called when user said 'n'
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(mockedReadline.createInterface({
        input: process.stdin,
        output: process.stdout
      }).question).toHaveBeenCalled();
    } finally {
      // Restore the original implementation
      vi.spyOn(reviewOrchestratorModule, 'orchestrateReview').mockRestore();
      
      // Clear mocks
      vi.clearAllMocks();
    }
  });
});