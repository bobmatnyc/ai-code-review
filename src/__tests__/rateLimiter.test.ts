/**
 * @fileoverview Tests for rate limiting utilities.
 *
 * This module provides Jest tests for the rate limiting utilities used
 * to manage API request rates and prevent exceeding rate limits.
 */

import { RateLimiter } from '../utils/rateLimiter';

// Mock Date.now() to control time in tests
const originalDateNow = Date.now;

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockTime: number;

  beforeEach(() => {
    // Start with a fixed timestamp
    mockTime = 1000000000000;
    
    // Mock Date.now to return controlled time
    global.Date.now = jest.fn(() => mockTime);
    
    // Create a new rate limiter with 5 requests per minute limit
    rateLimiter = new RateLimiter(5);
  });

  afterEach(() => {
    // Restore original Date.now
    global.Date.now = originalDateNow;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('acquireToken', () => {
    it('should allow requests within the rate limit', async () => {
      // Should allow 5 requests immediately
      for (let i = 0; i < 5; i++) {
        await expect(rateLimiter.acquireToken()).resolves.not.toThrow();
      }
    });

    it('should clean up old request times', async () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await rateLimiter.acquireToken();
      }
      
      // Advance time by more than a minute
      mockTime += 61 * 1000;
      
      // Should allow 5 more requests since the old ones are cleaned up
      for (let i = 0; i < 5; i++) {
        await expect(rateLimiter.acquireToken()).resolves.not.toThrow();
      }
    });

    it('should wait when rate limit is reached', async () => {
      // Mock setTimeout to execute immediately
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      // Make 5 requests to reach the limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.acquireToken();
      }
      
      // Start a request that should wait
      const acquirePromise = rateLimiter.acquireToken();
      
      // Verify setTimeout was called
      expect(setTimeoutSpy).toHaveBeenCalled();
      
      // Advance time to simulate waiting
      mockTime += 60 * 1000 + 100; // 60 seconds + 100ms buffer
      
      // Run the timer
      jest.runAllTimers();
      
      // The promise should resolve
      await expect(acquirePromise).resolves.not.toThrow();
      
      // Clean up
      jest.useRealTimers();
    });
  });

  describe('acquire', () => {
    it('should be an alias for acquireToken', async () => {
      // Spy on acquireToken
      const acquireTokenSpy = jest.spyOn(rateLimiter, 'acquireToken');
      
      // Call acquire
      await rateLimiter.acquire();
      
      // Verify acquireToken was called
      expect(acquireTokenSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('release', () => {
    it('should be a no-op function for compatibility', () => {
      // Should not throw
      expect(() => rateLimiter.release()).not.toThrow();
    });
  });

  describe('globalRateLimiter', () => {
    it('should export a global rate limiter instance', () => {
      // Import the global rate limiter
      const { globalRateLimiter } = require('../utils/rateLimiter');
      
      // Should be an instance of RateLimiter
      expect(globalRateLimiter).toBeInstanceOf(RateLimiter);
    });
  });
});
