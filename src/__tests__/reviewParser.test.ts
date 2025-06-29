/**
 * @fileoverview Simple tests for reviewParser module.
 */

import { IssuePriority } from '../types/reviewSchema';
import { formatIssueForDisplay } from '../utils/reviewParser';
import { vi } from 'vitest';

// Mock the logger to prevent console output in tests
vi.mock('../utils/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

// Basic tests that focus on just the formatting function
describe('reviewParser', () => {
  describe('formatIssueForDisplay', () => {
    it('should format a high priority issue correctly', () => {
      const issue = {
        id: 'ISSUE-1',
        priority: IssuePriority.HIGH,
        description: 'A high priority issue',
        filePath: 'src/example.ts',
        location: {
          startLine: 10,
          endLine: 15
        },
        currentCode: 'function example() {\n  // Problematic code\n}',
        suggestedCode: 'function example() {\n  // Fixed code\n}',
        explanation: 'This is why the code should be fixed'
      };

      const result = formatIssueForDisplay(issue, 'src/example.ts', 0, 0);

      expect(result).toContain('Issue 1.1');
      expect(result).toContain('[HIGH]');
      expect(result).toContain('A high priority issue');
      expect(result).toContain('src/example.ts');
      expect(result).toContain('Lines 10-15');
      expect(result).toContain('function example()');
      expect(result).toContain('This is why the code should be fixed');
    });

    it('should format a medium priority issue correctly', () => {
      const issue = {
        id: 'ISSUE-2',
        priority: IssuePriority.MEDIUM,
        description: 'A medium priority issue',
        filePath: 'src/example.ts',
        location: {
          startLine: 20,
          endLine: 25
        },
        currentCode: 'function example2() {\n  // Problematic code\n}',
        suggestedCode: 'function example2() {\n  // Fixed code\n}',
        explanation: 'This is why the code should be fixed'
      };

      const result = formatIssueForDisplay(issue, 'src/example.ts', 1, 0);

      expect(result).toContain('Issue 2.1');
      expect(result).toContain('[MEDIUM]');
      expect(result).toContain('A medium priority issue');
    });

    it('should format a low priority issue correctly', () => {
      const issue = {
        id: 'ISSUE-3',
        priority: IssuePriority.LOW,
        description: 'A low priority issue',
        filePath: 'src/example.ts',
        location: {
          startLine: 30,
          endLine: 35
        },
        currentCode: 'function example3() {\n  // Problematic code\n}',
        suggestedCode: 'function example3() {\n  // Fixed code\n}',
        explanation: 'This is why the code should be fixed'
      };

      const result = formatIssueForDisplay(issue, 'src/example.ts', 2, 0);

      expect(result).toContain('Issue 3.1');
      expect(result).toContain('[LOW]');
      expect(result).toContain('A low priority issue');
    });
  });
});
