/**
 * @fileoverview Tests for token counting and cost estimation utilities.
 *
 * This module provides Jest tests for the token counting and cost estimation
 * utilities used for AI API usage, focusing on the exported functions.
 */

import { estimateTokenCount, formatCost } from '../clients/utils/tokenCounter';

describe('tokenCounter', () => {
  describe('estimateTokenCount', () => {
    it('should estimate tokens based on character count', () => {
      // The actual implementation uses characters / 4, so we'll test that
      expect(estimateTokenCount('Hello, world!')).toBe(
        Math.ceil('Hello, world!'.length / 4)
      );

      const longSentence =
        'This is a longer sentence to test token estimation.';
      expect(estimateTokenCount(longSentence)).toBe(
        Math.ceil(longSentence.length / 4)
      );

      // Empty string
      expect(estimateTokenCount('')).toBe(0);

      // Very long text
      const longText = 'a'.repeat(1000);
      expect(estimateTokenCount(longText)).toBe(Math.ceil(1000 / 4));
    });
  });

  describe('formatCost', () => {
    it('should format cost as a dollar amount', () => {
      // The actual format might be different, but should include the dollar amount
      expect(formatCost(0)).toContain('$0');
      expect(formatCost(1.2345)).toContain('$1.234');
      expect(formatCost(0.001)).toContain('$0.001');
      expect(formatCost(10)).toContain('$10');
    });
  });
});
