/**
 * @fileoverview Tests for OpenRouter dynamic pricing module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the logger module (default export)
vi.mock('../../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  fetchOpenRouterPricing,
  getModelPricing,
  clearPricingCache,
  getCacheStats,
} from '../../../utils/pricing/openRouterPricing';

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('OpenRouter Pricing', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearPricingCache();
    mockFetch.mockReset();
  });

  describe('fetchOpenRouterPricing', () => {
    it('should fetch and parse pricing data successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'anthropic/claude-3-opus',
            context_length: 200000,
            pricing: {
              prompt: '0.000015',
              completion: '0.000075',
            },
          },
          {
            id: 'openai/gpt-4o',
            context_length: 128000,
            pricing: {
              prompt: '0.0000025',
              completion: '0.00001',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const pricing = await fetchOpenRouterPricing();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(pricing.size).toBe(2);

      const claudePricing = pricing.get('anthropic/claude-3-opus');
      expect(claudePricing).toBeDefined();
      expect(claudePricing?.inputPrice).toBe(15.0); // 0.000015 * 1M
      expect(claudePricing?.outputPrice).toBe(75.0); // 0.000075 * 1M

      const gptPricing = pricing.get('openai/gpt-4o');
      expect(gptPricing).toBeDefined();
      expect(gptPricing?.inputPrice).toBe(2.5);
      expect(gptPricing?.outputPrice).toBe(10.0);
    });

    it('should cache results and reuse them', async () => {
      const mockResponse = {
        data: [
          {
            id: 'test/model',
            context_length: 100000,
            pricing: {
              prompt: '0.000001',
              completion: '0.000002',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First call - should fetch
      const pricing1 = await fetchOpenRouterPricing();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(pricing1.size).toBe(1);

      // Second call - should use cache
      const pricing2 = await fetchOpenRouterPricing();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call
      expect(pricing2.size).toBe(1);
      expect(pricing2).toBe(pricing1); // Same object
    });

    it('should throw error for failed API requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchOpenRouterPricing()).rejects.toThrow('OpenRouter API returned status 500');
    });

    it('should throw error for invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'format' }),
      });

      await expect(fetchOpenRouterPricing()).rejects.toThrow('Invalid response format');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchOpenRouterPricing()).rejects.toThrow('Network error');
    });
  });

  describe('getModelPricing', () => {
    it('should return pricing for a specific model', async () => {
      const mockResponse = {
        data: [
          {
            id: 'anthropic/claude-4-sonnet',
            context_length: 200000,
            pricing: {
              prompt: '0.000003',
              completion: '0.000015',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const pricing = await getModelPricing('anthropic/claude-4-sonnet');

      expect(pricing).toBeDefined();
      expect(pricing?.inputPrice).toBe(3.0);
      expect(pricing?.outputPrice).toBe(15.0);
    });

    it('should return null for non-existent models', async () => {
      const mockResponse = {
        data: [
          {
            id: 'some/model',
            context_length: 100000,
            pricing: {
              prompt: '0.000001',
              completion: '0.000002',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const pricing = await getModelPricing('non/existent');

      expect(pricing).toBeNull();
    });

    it('should return null on API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const pricing = await getModelPricing('any/model');

      expect(pricing).toBeNull();
    });
  });

  describe('clearPricingCache', () => {
    it('should clear the cache', async () => {
      const mockResponse = {
        data: [
          {
            id: 'test/model',
            context_length: 100000,
            pricing: {
              prompt: '0.000001',
              completion: '0.000002',
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Fetch once to populate cache
      await fetchOpenRouterPricing();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearPricingCache();

      // Fetch again - should make a new API call
      await fetchOpenRouterPricing();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats when cache is empty', () => {
      const stats = getCacheStats();

      expect(stats.isValid).toBe(false);
      expect(stats.modelCount).toBe(0);
      expect(stats.lastFetched).toBeNull();
      expect(stats.age).toBe(0);
    });

    it('should return correct stats after caching', async () => {
      const mockResponse = {
        data: [
          {
            id: 'test/model1',
            context_length: 100000,
            pricing: {
              prompt: '0.000001',
              completion: '0.000002',
            },
          },
          {
            id: 'test/model2',
            context_length: 100000,
            pricing: {
              prompt: '0.000001',
              completion: '0.000002',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await fetchOpenRouterPricing();

      const stats = getCacheStats();

      expect(stats.isValid).toBe(true);
      expect(stats.modelCount).toBe(2);
      expect(stats.lastFetched).toBeTruthy(); // Check it's not null
      expect(stats.lastFetched).not.toBeNull();
      expect(stats.age).toBeGreaterThanOrEqual(0);
      expect(stats.age).toBeLessThan(60000); // Should be very recent (less than 1 minute)
    });
  });

  describe('Price conversion', () => {
    it('should convert price strings to per-million correctly', async () => {
      const mockResponse = {
        data: [
          {
            id: 'test/model',
            context_length: 100000,
            pricing: {
              prompt: '0.0000025', // $2.5 per million
              completion: '0.00001', // $10 per million
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const pricing = await getModelPricing('test/model');

      expect(pricing?.inputPrice).toBe(2.5);
      expect(pricing?.outputPrice).toBe(10.0);
    });

    it('should handle invalid price strings', async () => {
      const mockResponse = {
        data: [
          {
            id: 'test/invalid',
            context_length: 100000,
            pricing: {
              prompt: 'invalid',
              completion: 'invalid',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const pricing = await getModelPricing('test/invalid');

      expect(pricing?.inputPrice).toBe(0);
      expect(pricing?.outputPrice).toBe(0);
    });
  });
});
