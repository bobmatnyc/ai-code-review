/**
 * @fileoverview Integration tests for command-line argument mapping.
 *
 * These tests verify that the parsed arguments are properly mapped to the appropriate
 * properties in the ReviewOptions object and passed to the command handlers.
 */

import { vi } from 'vitest';

// Mock process.exit globally before any imports
// And create a global mock that can be tracked
const mockExit = vi.fn();
Object.defineProperty(process, 'exit', {
  value: mockExit,
  configurable: true
});

// Mock all dependencies before imports
vi.mock('../../core/reviewOrchestrator', () => ({
  orchestrateReview: vi.fn()
}));

vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../../utils/ciDataCollector', () => ({
  collectCIData: vi.fn().mockResolvedValue({
    typeCheckErrors: 0,
    lintErrors: 0
  })
}));

import { reviewCode } from '../../commands/reviewCode';
import { orchestrateReview } from '../../core/reviewOrchestrator';

// Note: console.error is also mocked in the Error Handling describe block

describe('CLI Argument Mapping Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mockExit function
    mockExit.mockReset();
    // Ensure the orchestrateReview mock returns a resolved promise
    (orchestrateReview as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockExit.mockClear();
  });

  /**
   * Test basic options mapping
   */
  describe('Basic Options Mapping', () => {
    it('should map basic options correctly', async () => {
      const options = {
        type: 'security',
        output: 'json',
        includeTests: true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        type: 'security',
        output: 'json',
        includeTests: true
      }));
    });

    it('should handle interactive mode correctly', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        includeTests: false,
        interactive: true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        interactive: true
      }));
    });

    it('should handle auto-fix option correctly', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        includeTests: false,
        interactive: true,
        'auto-fix': true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        autoFix: true
      }));
    });

    it('should handle estimate option correctly', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        includeTests: false,
        estimate: true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        estimate: true
      }));
    });
  });

  /**
   * Test prompt-related options mapping
   */
  describe('Prompt Options Mapping', () => {
    it('should map prompt-file option correctly', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        includeTests: false,
        'prompt-file': 'custom-prompt.md',
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        promptFile: 'custom-prompt.md'
      }));
      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.not.objectContaining({
        'prompt-file': expect.anything()
      }));
    });

    it('should map prompt-fragment option correctly', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        includeTests: false,
        'prompt-fragment': 'Focus on performance issues',
        'prompt-fragment-position': 'start',
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        promptFragments: [{
          content: 'Focus on performance issues',
          position: 'start'
        }]
      }));
      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.not.objectContaining({
        'prompt-fragment': expect.anything()
      }));
    });

    it('should map prompt-strategy option correctly', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        includeTests: false,
        'prompt-strategy': 'langchain',
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        promptStrategy: 'langchain'
      }));
      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.not.objectContaining({
        'prompt-strategy': expect.anything()
      }));
    });
  });

  /**
   * Test dash-case to camelCase mapping
   */
  describe('Dash-Case to CamelCase Mapping', () => {
    it('should map include-tests to includeTests', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        'include-tests': true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        includeTests: true
      }));
      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.not.objectContaining({
        'include-tests': expect.anything()
      }));
    });

    it('should map include-project-docs to includeProjectDocs', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        'include-project-docs': true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        includeProjectDocs: true
      }));
    });

    it('should map include-dependency-analysis to includeDependencyAnalysis', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        'include-dependency-analysis': true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        includeDependencyAnalysis: true
      }));
    });

    it('should map use-cache to useCache', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        'use-cache': false,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        useCache: false
      }));
    });
  });

  /**
   * Test negated flags and special mappings
   */
  describe('Negated Flags and Special Mappings', () => {
    it('should map confirm: false to noConfirm: true (inverted logic)', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        confirm: false,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        noConfirm: true
      }));
      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.not.objectContaining({
        confirm: expect.anything()
      }));
    });

    it('should map use-ts-prune to useTsPrune', async () => {
      const options = {
        type: 'unused-code',
        output: 'markdown',
        'use-ts-prune': true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        useTsPrune: true
      }));
    });

    it('should map use-eslint to useEslint', async () => {
      const options = {
        type: 'unused-code',
        output: 'markdown',
        'use-eslint': true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        useEslint: true
      }));
    });

    it('should map trace-code to traceCode', async () => {
      const options = {
        type: 'unused-code',
        output: 'markdown',
        'trace-code': true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        traceCode: true
      }));
    });

    it('should map test-api to testApi', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        'test-api': true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        testApi: true
      }));
    });
  });

  /**
   * Test error handling
   */
  describe('Error Handling', () => {
    let consoleSpy: any;
    
    beforeEach(() => {
      // Spy on console.error to silence it in tests
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
      consoleSpy.mockRestore();
    });
    
    it('should catch and log errors from orchestrateReview', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        target: 'src/file.ts'
      };

      // Mock orchestrateReview to throw an error
      (orchestrateReview as any).mockRejectedValueOnce(new Error('Test error'));

      await reviewCode('src/file.ts', options);

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });
  });
});