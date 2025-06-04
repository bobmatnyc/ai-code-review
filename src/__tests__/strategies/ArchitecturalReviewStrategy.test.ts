/**
 * @fileoverview Tests for the ArchitecturalReviewStrategy class.
 */

import { ArchitecturalReviewStrategy } from '../../strategies/ArchitecturalReviewStrategy';
import { FileInfo, ReviewOptions } from '../../types/review';
import { ApiClientConfig } from '../../core/ApiClientSelector';
import { ProjectDocs } from '../../utils/projectDocs';
import { generateReview } from '../../core/ReviewGenerator';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../core/ReviewGenerator');
vi.mock('../../utils/logger');

describe('ArchitecturalReviewStrategy', () => {
  let strategy: ArchitecturalReviewStrategy;
  let mockFiles: FileInfo[];
  let mockOptions: ReviewOptions;
  let mockApiClientConfig: ApiClientConfig;
  let mockProjectDocs: ProjectDocs | null;
  
  beforeEach(() => {
    // Create a new strategy instance for each test
    strategy = new ArchitecturalReviewStrategy();
    
    // Set up mock data
    mockFiles = [
      { 
        path: 'test.ts', 
        content: 'console.log("test")',
        relativePath: 'test.ts'
      },
      {
        path: 'test2.ts',
        content: 'console.log("test2")',
        relativePath: 'test2.ts'
      }
    ];
    
    mockOptions = { 
      type: 'architectural', 
      includeTests: false, 
      output: 'markdown' 
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
    vi.resetAllMocks();
    
    // Mock implementation of generateReview
    (generateReview as any).mockResolvedValue({
      filePath: 'project-review',
      reviewType: 'architectural',
      content: 'Architectural review content',
      timestamp: '2024-04-09T12:00:00Z'
    });
  });
  
  test('execute should call generateReview with correct parameters', async () => {
    // Execute the strategy
    const result = await strategy.execute(
      mockFiles,
      'test-project',
      mockProjectDocs,
      mockOptions,
      mockApiClientConfig
    );
    
    // Verify generateReview was called with correct parameters
    expect(generateReview).toHaveBeenCalledWith(
      mockFiles,
      'test-project',
      'architectural',
      mockProjectDocs,
      mockOptions,
      mockApiClientConfig
    );
    
    // Verify the result
    expect(result).toEqual({
      filePath: 'project-review',
      reviewType: 'architectural',
      content: 'Architectural review content',
      timestamp: '2024-04-09T12:00:00Z'
    });
  });
  
  test('execute should handle null projectDocs', async () => {
    // Execute the strategy with null projectDocs
    await strategy.execute(
      mockFiles,
      'test-project',
      null,
      mockOptions,
      mockApiClientConfig
    );
    
    // Verify generateReview was called with null projectDocs
    expect(generateReview).toHaveBeenCalledWith(
      mockFiles,
      'test-project',
      'architectural',
      null,
      mockOptions,
      mockApiClientConfig
    );
  });
  
  test('execute should handle errors from generateReview', async () => {
    // Mock generateReview to throw an error
    (generateReview as any).mockRejectedValue(new Error('Test error'));
    
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
  
  test('strategy should always use architectural review type', async () => {
    // Execute the strategy with a different review type
    await strategy.execute(
      mockFiles,
      'test-project',
      mockProjectDocs,
      { ...mockOptions, type: 'quick-fixes' },
      mockApiClientConfig
    );
    
    // Verify generateReview was called with architectural review type
    expect(generateReview).toHaveBeenCalledWith(
      mockFiles,
      'test-project',
      'architectural',
      mockProjectDocs,
      { ...mockOptions, type: 'quick-fixes' },
      mockApiClientConfig
    );
  });
});