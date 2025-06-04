/**
 * @fileoverview Tests for the confirm/no-confirm option.
 *
 * These tests specifically verify that the confirm option is correctly parsed
 * and mapped to the noConfirm property with the correct inverted logic.
 */

import { reviewCode } from '../../commands/reviewCode';
import { orchestrateReview } from '../../core/reviewOrchestrator';
import { validateArguments } from '../../cli/argumentParser';
import { vi } from 'vitest';

// Mock the review orchestrator
vi.mock('../../core/reviewOrchestrator', () => ({
  orchestrateReview: vi.fn()
}));

// Mock the logger
vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock the readline module
vi.mock('readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn((question, callback) => callback('y')),
    close: vi.fn()
  })
}));

// Mock the exit function to prevent tests from exiting
vi.spyOn(process, 'exit').mockImplementation(() => {
  return undefined as never;
});

describe('Confirm Option Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Option Parsing', () => {
    it('should map --no-confirm to confirm=false', () => {
      // This simulates how yargs handles --no-[option] flags
      const args = {
        type: 'quick-fixes',
        output: 'markdown',
        confirm: false
      };

      const validated = validateArguments(args as any);
      
      expect(validated.noConfirm).toBe(true);
      expect(validated.confirm).toBeUndefined();
    });
    
    it('should use default confirm=true when not specified', () => {
      const args = {
        type: 'quick-fixes',
        output: 'markdown'
      };

      const validated = validateArguments(args as any);
      
      expect(validated.noConfirm).toBeUndefined();
    });
  });

  describe('Option Mapping in reviewCode', () => {
    it('should correctly map confirm=false to noConfirm=true', async () => {
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
    });
    
    it('should set noConfirm to false when confirm=true', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        confirm: true,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        noConfirm: false
      }));
    });
  });

  describe('Integration with orchestrateReview', () => {
    // This is a minimal test due to the complexity of fully mocking the reviewOrchestrator
    it('should forward the noConfirm flag to orchestrateReview', async () => {
      const options = {
        type: 'quick-fixes',
        output: 'markdown',
        confirm: false,
        target: 'src/file.ts'
      };

      await reviewCode('src/file.ts', options);

      // Verify the flag is passed to orchestrateReview
      expect(orchestrateReview).toHaveBeenCalledWith('src/file.ts', expect.objectContaining({
        noConfirm: true
      }));
    });
  });
});