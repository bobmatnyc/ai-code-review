/**
 * @fileoverview Tests for the ConsolidatedReviewStrategy class.
 */

import { vi } from 'vitest';

// Mock dependencies before importing
vi.mock('../../core/ReviewGenerator');
vi.mock('../../utils/logger');
vi.mock('../../utils/ciDataCollector', () => ({
  collectCIData: vi.fn().mockResolvedValue({
    typeCheckErrors: 0,
    lintErrors: 0
  })
}));

// Import after mocking
import { ConsolidatedReviewStrategy } from '../../strategies/ConsolidatedReviewStrategy';
import { FileInfo, ReviewOptions } from '../../types/review';
import { ApiClientConfig } from '../../core/ApiClientSelector';
import { ProjectDocs } from '../../utils/projectDocs';
import { generateReview } from '../../core/ReviewGenerator';

describe('ConsolidatedReviewStrategy', () => {
  let strategy: ConsolidatedReviewStrategy;
  let mockFiles: FileInfo[];
  let mockOptions: ReviewOptions;
  let mockApiClientConfig: ApiClientConfig;
  let mockProjectDocs: ProjectDocs | null;

  beforeEach(() => {
    // Create a new strategy instance for each test
    strategy = new ConsolidatedReviewStrategy('quick-fixes');

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
      filePath: 'test.ts',
      reviewType: 'quick-fixes',
      content: 'Review content',
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
      'quick-fixes',
      mockProjectDocs,
      mockOptions,
      mockApiClientConfig
    );

    // Verify the result
    expect(result).toEqual({
      filePath: 'test.ts',
      reviewType: 'quick-fixes',
      content: 'Review content',
      timestamp: '2024-04-09T12:00:00Z'
    });
  });

  test('execute should use the correct review type', async () => {
    // Create a strategy with a different review type
    const securityStrategy = new ConsolidatedReviewStrategy('security');

    // Execute the strategy
    await securityStrategy.execute(
      mockFiles,
      'test-project',
      mockProjectDocs,
      { ...mockOptions, type: 'security' },
      mockApiClientConfig
    );

    // Verify generateReview was called with the correct review type
    expect(generateReview).toHaveBeenCalledWith(
      mockFiles,
      'test-project',
      'security',
      mockProjectDocs,
      { ...mockOptions, type: 'security' },
      mockApiClientConfig
    );
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
      'quick-fixes',
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
});