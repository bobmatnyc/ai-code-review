/**
 * Simplified test for debugging CLI argument mapping
 */

import { vi } from 'vitest';

// Mock the exit function before any imports
global.process.exit = vi.fn(() => {
  throw new Error('process.exit called');
}) as unknown as typeof process.exit;

// Mock all dependencies
vi.mock('../../core/reviewOrchestrator', () => ({
  orchestrateReview: vi.fn().mockResolvedValue(undefined)
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

describe('Simple CLI Argument Mapping Test', () => {
  it('should work with basic options', async () => {
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
});