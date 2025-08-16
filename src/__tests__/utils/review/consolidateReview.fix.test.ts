/**
 * Unit test to verify the consolidation bug fix
 * 
 * WHY: This test ensures that consolidation instructions are passed correctly
 * and not treated as source code to review.
 * 
 * DESIGN DECISION: We mock the client.generateReview to inspect how it's called
 * and verify that:
 * 1. The first parameter (fileContent) is empty string, not consolidation instructions
 * 2. The consolidation instructions are passed in the projectDocs.readme field
 * 3. The skipFileContent option is set to true
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { consolidateReview } from '../../../utils/review/consolidateReview';
import { ReviewResult } from '../../../types/review';

// Mock logger to reduce noise in tests
vi.mock('../../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock config
vi.mock('../../../utils/config', () => ({
  getConfig: vi.fn(() => ({
    selectedModel: 'test-model',
    writerModel: undefined,
  })),
  config: {
    selectedModel: 'test-model',
    writerModel: undefined,
  },
}));

// Mock the ClientFactory
const mockClient = {
  generateReview: vi.fn(),
  initialize: vi.fn().mockResolvedValue(undefined),
  getIsInitialized: vi.fn().mockReturnValue(true),
  model: 'test-model',
  provider: 'gemini',
};

vi.mock('../../../clients/factory/clientFactory', () => ({
  ClientFactory: {
    createClient: vi.fn(() => mockClient),
    createFromModel: vi.fn(() => mockClient),
  },
}));

describe('consolidateReview bug fix', () => {
  let generateReviewSpy: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Create a spy for generateReview
    generateReviewSpy = vi.fn().mockResolvedValue({
      content: '# Consolidated Review\n\nThis is a consolidated review result.',
    });
    
    // Set up the mock client's generateReview method
    mockClient.generateReview = generateReviewSpy;
    mockClient.provider = 'gemini'; // Reset provider to default for each test
  });

  test('should pass consolidation instructions in projectDocs.readme, not as fileContent', async () => {
    const mockReview: ReviewResult = {
      content: '## Pass 1: Review of 1 Files\n\nReview content for pass 1\n\n### High Priority\n- Issue title: Test issue 1\n\n### Medium Priority\n- Issue title: Test issue 2',
      filePath: 'multi-pass-review',
      reviewType: 'comprehensive',
      timestamp: '2024-01-01T00:00:00Z',
      projectName: 'test-project',
      costInfo: {
        passCount: 1,
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        estimatedCost: 0.01,
      },
    };

    await consolidateReview(mockReview);

    // Verify generateReview was called
    expect(generateReviewSpy).toHaveBeenCalled();
    
    // Get the call arguments
    const [fileContent, filePath, reviewType, projectDocs, options] = generateReviewSpy.mock.calls[0];
    
    // Critical assertions for the bug fix:
    
    // 1. File content should be empty string, NOT consolidation instructions
    expect(fileContent).toBe('');
    expect(fileContent).not.toContain('CONSOLIDATION INSTRUCTIONS');
    expect(fileContent).not.toContain('You are an expert code reviewer');
    
    // 2. File path should indicate this is a consolidation task
    expect(filePath).toBe('CONSOLIDATION_TASK');
    
    // 3. Review type should be 'consolidated' for proper markdown output
    expect(reviewType).toBe('consolidated');
    
    // 4. Project docs should contain the consolidation instructions in readme field
    expect(projectDocs).toBeDefined();
    expect(projectDocs.readme).toBeDefined();
    expect(projectDocs.readme).toContain('You are an expert code reviewer tasked with creating a consolidated final report');
    expect(projectDocs.readme).toContain('multi-pass code review of a project named "test-project"');
    
    // 5. Options should indicate this is a consolidation with skipFileContent
    expect(options).toBeDefined();
    expect(options.skipFileContent).toBe(true);
    expect(options.isConsolidation).toBe(true);
  });

  test('should handle OpenRouter provider correctly', async () => {
    // Change provider to openrouter to test the other code path
    mockClient.provider = 'openrouter';
    
    const mockReview: ReviewResult = {
      content: '## Pass 1: Review of 1 Files\n\nReview content for pass 1\n\n### High Priority\n- Issue title: OpenRouter test issue',
      filePath: 'multi-pass-review',
      reviewType: 'comprehensive',
      timestamp: '2024-01-01T00:00:00Z',
      projectName: 'test-project',
      modelUsed: 'openrouter:gpt-4',
    };

    await consolidateReview(mockReview);

    // Verify generateReview was called
    expect(generateReviewSpy).toHaveBeenCalled();
    
    // Verify the same fix applies to OpenRouter path
    const [fileContent, , , projectDocs] = generateReviewSpy.mock.calls[0];
    
    // File content should still be empty
    expect(fileContent).toBe('');
    
    // Consolidation instructions should be in projectDocs.readme
    expect(projectDocs?.readme).toContain('You are an expert code reviewer tasked with creating a consolidated final report');
  });

  test('should not pass consolidation instructions as code to review', async () => {
    const mockReview: ReviewResult = {
      content: '## Pass 1: Review of 2 Files\n\n## Security Review\nNo vulnerabilities found\n\n## Pass 2: Review of 2 Files\n\n## Security Review Pass 2\nAll secure',
      filePath: 'multi-pass-review',
      reviewType: 'security',
      timestamp: '2024-01-01T00:00:00Z',
      projectName: 'test-project',
      costInfo: {
        passCount: 2,
        inputTokens: 5000,
        outputTokens: 1000,
        totalTokens: 6000,
        estimatedCost: 0.05,
      },
    };

    await consolidateReview(mockReview);

    // Verify generateReview was called
    expect(generateReviewSpy).toHaveBeenCalled();
    
    const [fileContent] = generateReviewSpy.mock.calls[0];
    
    // The bug would have caused the consolidation prompt to be passed as fileContent
    // This would then be wrapped in code blocks and reviewed as TypeScript
    // Our fix ensures fileContent is empty
    expect(fileContent).toBe('');
    expect(fileContent).not.toMatch(/```typescript/);
    expect(fileContent).not.toMatch(/```ts/);
  });
});