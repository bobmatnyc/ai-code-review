/**
 * @fileoverview Rate limiting utilities for API request management.
 *
 * This module provides rate limiting functionality to prevent exceeding API rate limits
 * when making requests to the Gemini API. It implements a sliding window approach to
 * track requests over time and enforces waiting periods when necessary to stay within
 * the allowed request rate.
 *
 * Key responsibilities:
 * - Tracking API request timing
 * - Enforcing maximum requests per minute limits
 * - Implementing waiting periods when rate limits are approached
 * - Providing a global rate limiter instance for consistent application-wide limiting
 * - Preventing rate limit errors by proactively managing request timing
 *
 * The rate limiter is critical for maintaining reliable API access and preventing
 * service disruptions due to rate limiting by the Gemini API.
 */

/**
 * A simple rate limiter to ensure we don't exceed a certain number of requests per minute
 */
export class RateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequestsPerMinute: number;

  /**
   * Create a new rate limiter
   * @param maxRequestsPerMinute Maximum number of requests allowed per minute
   */
  constructor(maxRequestsPerMinute: number = 60) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
  }

  /**
   * Check if a request can be made, and if so, record it
   * @returns True if the request can be made, false otherwise
   */
  public async acquireToken(): Promise<void> {
    // Clean up old requests (older than 1 minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);

    // Check if we've reached the limit
    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      // Calculate how long to wait
      const oldestRequest = this.requestTimes[0];
      const timeToWait = oldestRequest + 60 * 1000 - now + 100; // Add 100ms buffer

      console.log(`Rate limit reached. Waiting ${(timeToWait / 1000).toFixed(1)} seconds before next request...`);

      // Wait until we can make another request
      await new Promise(resolve => setTimeout(resolve, timeToWait));

      // Try again after waiting
      return this.acquireToken();
    }

    // Record this request
    this.requestTimes.push(now);
  }

  /**
   * Alias for acquireToken for compatibility with other rate limiters
   */
  public async acquire(): Promise<void> {
    return this.acquireToken();
  }

  /**
   * Release the token (no-op in this implementation, but included for compatibility)
   */
  public release(): void {
    // This is a no-op in our implementation since we don't have a token pool
    // But we include it for compatibility with other rate limiters
  }
}

// Create a singleton instance for the application
export const globalRateLimiter = new RateLimiter(55); // Use 55 instead of 60 to provide a safety margin
