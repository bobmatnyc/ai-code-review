/**
 * Simplified test for debugging CLI argument mapping
 */

// Mock the exit function before any imports
global.process.exit = jest.fn(() => {
  throw new Error('process.exit called');
}) as any;

// Mock all dependencies
jest.mock('../../core/reviewOrchestrator', () => ({
  orchestrateReview: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../utils/ciDataCollector', () => ({
  collectCIData: jest.fn().mockResolvedValue({
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