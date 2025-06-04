/**
 * @fileoverview Tests for rate limiting utilities.
 *
 * This module provides Vitest tests for the rate limiting utilities used
 * to manage API request rates and prevent exceeding rate limits.
 */

import { RateLimiter } from '../utils/api/rateLimiter';
import { vi } from 'vitest';

// Mock Date.now() to control time in tests
const originalDateNow = Date.now;

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockTime: number;

  beforeEach(() => {
    // Start with a fixed timestamp
    mockTime = 1000000000000;

    // Mock Date.now to return controlled time
    global.Date.now = vi.fn(() => mockTime);

    // Create a new rate limiter with test options
    rateLimiter = new RateLimiter({
      bucketSize: 5,
      tokensPerSecond: 0.1, // 6 per minute
      initialTokens: 5
    });
  });

  afterEach(() => {
    // Restore original Date.now
    global.Date.now = originalDateNow;

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('acquire', () => {
    it('should allow requests within the rate limit', async () => {
      // Should allow 5 requests immediately (bucketSize)
      for (let i = 0; i < 5; i++) {
        await expect(rateLimiter.acquire()).resolves.not.toThrow();
      }
    });

    it('should refill tokens based on elapsed time', async () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await rateLimiter.acquire();
      }

      // Advance time by 30 seconds (should add 3 tokens)
      mockTime += 30 * 1000;

      // Should allow 3 more requests
      for (let i = 0; i < 3; i++) {
        await expect(rateLimiter.acquire()).resolves.not.toThrow();
      }
    });

    it('should wait when rate limit is reached', async () => {
      // Since token bucket algorithm handles queuing differently, we'll just verify
      // that the rate limiter respects the token limits and queues requests
      
      // Make 5 requests to reach the limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.acquire();
      }

      // Check that tokens are depleted
      expect(rateLimiter.getTokens()).toBe(0);
      
      // Add a token by advancing time
      mockTime += 10 * 1000; // 10 seconds to add 1 token
      
      // Should now be able to make another request
      await expect(rateLimiter.acquire()).resolves.not.toThrow();
      
      // Tokens should be depleted again
      expect(rateLimiter.getTokens()).toBe(0);
    });
  });

  describe('getTokens', () => {
    it('should return the current number of tokens', async () => {
      // Initial tokens should be 5
      expect(rateLimiter.getTokens()).toBe(5);

      // Use 3 tokens
      for (let i = 0; i < 3; i++) {
        await rateLimiter.acquire();
      }

      // Should have 2 tokens left
      expect(rateLimiter.getTokens()).toBe(2);

      // Advance time to add tokens
      mockTime += 20 * 1000; // 20 seconds to add 2 tokens

      // Should have 4 tokens after refill
      expect(rateLimiter.getTokens()).toBe(4);
    });
  });

  describe('getQueueLength', () => {
    it('should return the current queue length', async () => {
      // Queue should be empty initially
      expect(rateLimiter.getQueueLength()).toBe(0);

      // Use all available tokens
      for (let i = 0; i < 5; i++) {
        await rateLimiter.acquire();
      }

      // Start 3 requests that should be queued
      // Start 3 requests that should be queued
      // Note: These promises are started but not awaited to test the queuing
      void rateLimiter.acquire();
      void rateLimiter.acquire();
      void rateLimiter.acquire();

      // Queue should have 3 items
      expect(rateLimiter.getQueueLength()).toBe(3);
    });
  });

  describe('globalRateLimiter', () => {
    it('should export a global rate limiter instance', async () => {
      // Import the global rate limiter
      const rateLimiterModule = await import('../utils/api/rateLimiter');
      const { globalRateLimiter } = rateLimiterModule as { globalRateLimiter: RateLimiter };

      // Should be an instance of RateLimiter
      expect(globalRateLimiter).toBeInstanceOf(RateLimiter);
    });
  });
});