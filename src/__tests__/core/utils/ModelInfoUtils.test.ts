/**
 * @fileoverview Tests for ModelInfoUtils
 */

import { describe, it, expect } from 'vitest';
import { getProviderDisplayInfo } from '../../../core/utils/ModelInfoUtils';

describe('ModelInfoUtils', () => {
  describe('getProviderDisplayInfo', () => {
    it('should parse valid provider:model format', () => {
      const result = getProviderDisplayInfo('openai:gpt-4');
      expect(result).toEqual({
        provider: 'Openai',
        model: 'gpt-4'
      });
    });

    it('should handle capitalization in provider name', () => {
      const result = getProviderDisplayInfo('OPENAI:gpt-4');
      expect(result.provider).toBe('Openai');
    });

    it('should handle fallback parsing for simple format', () => {
      const result = getProviderDisplayInfo('openai:custom-model');
      expect(result).toEqual({
        provider: 'Openai',
        model: 'custom-model'
      });
    });

    it('should return unknown provider for invalid format', () => {
      const result = getProviderDisplayInfo('invalid-format');
      expect(result).toEqual({
        provider: 'Unknown',
        model: 'invalid-format'
      });
    });
  });
});