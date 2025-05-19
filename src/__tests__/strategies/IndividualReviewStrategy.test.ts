/**
 * @fileoverview Tests for the IndividualReviewStrategy class.
 */

import { IndividualReviewStrategy } from '../../strategies/IndividualReviewStrategy';
import { FileInfo, ReviewOptions } from '../../types/review';
import { ApiClientConfig } from '../../core/ApiClientSelector';
import { ProjectDocs } from '../../utils/projectDocs';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../../utils/ciDataCollector', () => ({
  collectCIData: jest.fn().mockResolvedValue({
    typeCheckErrors: 0,
    lintErrors: 0
  })
}));

// Create mock for dynamically imported module
const mockGenerateReview = jest.fn();
jest.mock('../../clients/geminiClient.js', () => ({
  generateReview: mockGenerateReview
}), { virtual: true });

// Mock dynamic import
jest.mock('../clients/geminiClient.js', () => ({
  __esModule: true,
  generateReview: mockGenerateReview
}), { virtual: true });

describe('IndividualReviewStrategy', () => {
  let strategy: IndividualReviewStrategy;
  let mockFiles: FileInfo[];
  let mockOptions: ReviewOptions;
  let mockApiClientConfig: ApiClientConfig;
  let mockProjectDocs: ProjectDocs | null;
  
  beforeEach(() => {
    // Create a new strategy instance for each test
    strategy = new IndividualReviewStrategy('quick-fixes');
    
    // Set up mock data
    mockFiles = [
      { 
        path: 'test.ts', 
        content: 'console.log("test")',
        relativePath: 'test.ts'
      }
    ];
    
    mockOptions = { 
      type: 'quick-fixes', 
      includeTests: false, 
      output: 'markdown',
      individual: true
    };
    
    mockApiClientConfig = { 
      clientType: 'Google', 
      modelName: 'gemini-1.5-pro' 
    };
    
    mockProjectDocs = {
      readme: 'Test README',
      packageJson: { name: 'test-project', version: '1.0.0' },
      tsconfig: { compilerOptions: { target: 'es2020' } }
    };
    
    // Reset mocks
    jest.resetAllMocks();
    mockGenerateReview.mockReset();
    
    // Mock implementation of generateReview
    mockGenerateReview.mockResolvedValue({
      filePath: 'test.ts',
      reviewType: 'quick-fixes',
      content: 'Review content',
      timestamp: '2024-04-09T12:00:00Z'
    });
  });
  
  test('execute should call generateReview with correct parameters for Google client', async () => {
    // Execute the strategy
    const result = await strategy.execute(
      mockFiles,
      'test-project',
      mockProjectDocs,
      mockOptions,
      mockApiClientConfig
    );
    
    // Verify generateReview was called with correct parameters
    expect(mockGenerateReview).toHaveBeenCalledWith(
      mockFiles[0].content,
      mockFiles[0].path,
      'quick-fixes',
      mockProjectDocs,
      mockOptions
    );
    
    // Verify the result
    expect(result).toEqual({
      filePath: 'test.ts',
      reviewType: 'quick-fixes',
      content: 'Review content',
      timestamp: '2024-04-09T12:00:00Z'
    });
  });
  
  test('execute should throw an error if no files are provided', async () => {
    // Execute the strategy with an empty files array
    await expect(
      strategy.execute(
        [],
        'test-project',
        mockProjectDocs,
        mockOptions,
        mockApiClientConfig
      )
    ).rejects.toThrow('No files to review');
  });
  
  test('execute should handle errors from generateReview', async () => {
    // Mock generateReview to throw an error
    mockGenerateReview.mockRejectedValue(new Error('Test error'));
    
    // Execute the strategy and expect it to throw
    await expect(
      strategy.execute(
        mockFiles,
        'test-project',
        mockProjectDocs,
        mockOptions,
        mockApiClientConfig
      )
    ).rejects.toThrow('Test error');
  });
  
  test('execute should use the correct review type', async () => {
    // Create a strategy with a different review type
    const securityStrategy = new IndividualReviewStrategy('security');
    
    // Execute the strategy
    await securityStrategy.execute(
      mockFiles,
      'test-project',
      mockProjectDocs,
      { ...mockOptions, type: 'security' },
      mockApiClientConfig
    );
    
    // Verify generateReview was called with the correct review type
    expect(mockGenerateReview).toHaveBeenCalledWith(
      mockFiles[0].content,
      mockFiles[0].path,
      'security',
      mockProjectDocs,
      { ...mockOptions, type: 'security' }
    );
  });
});