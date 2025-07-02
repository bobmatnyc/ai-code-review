/**
 * @fileoverview Rate limiter for API requests.
 *
 * This module provides a rate limiter for API requests to prevent
 * exceeding API rate limits. It uses a simple token bucket algorithm
 * to limit the number of requests per second.
 */

import logger from '../logger';

/**
 * Rate limiter options
 */
interface RateLimiterOptions {
  /**
   * Maximum number of tokens in the bucket
   */
  bucketSize: number;

  /**
   * Number of tokens added per second
   */
  tokensPerSecond: number;

  /**
   * Initial number of tokens in the bucket
   */
  initialTokens?: number;
}

/**
 * Rate limiter for API requests
 */
export class RateLimiter {
  private bucketSize: number;
  private tokensPerSecond: number;
  private tokens: number;
  private lastRefillTime: number;
  private waitQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  /**
   * Create a new rate limiter
   * @param options Rate limiter options
   */
  constructor(options: RateLimiterOptions) {
    this.bucketSize = options.bucketSize;
    this.tokensPerSecond = options.tokensPerSecond;
    this.tokens = options.initialTokens ?? this.bucketSize;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill the token bucket based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const newTokens = elapsedSeconds * this.tokensPerSecond;

    if (newTokens > 0) {
      this.tokens = Math.min(this.bucketSize, this.tokens + newTokens);
      this.lastRefillTime = now;
    }
  }

  /**
   * Process the wait queue
   */
  private processQueue(): void {
    while (this.waitQueue.length > 0 && this.tokens >= 1) {
      const { resolve, timeout } = this.waitQueue.shift()!;
      clearTimeout(timeout);
      this.tokens -= 1;
      resolve();
    }
  }

  /**
   * Acquire a token from the bucket
   * @param timeoutMs Timeout in milliseconds
   * @returns Promise that resolves when a token is acquired
   */
  async acquire(timeoutMs = 30000): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove this request from the queue
        const index = this.waitQueue.findIndex((item) => item.resolve === resolve);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
        }

        reject(new Error('Rate limit timeout exceeded'));
      }, timeoutMs);

      this.waitQueue.push({ resolve, reject, timeout });

      // Log if the queue is getting long
      if (this.waitQueue.length > 5) {
        logger.warn(`Rate limiter queue length: ${this.waitQueue.length}`);
      }
    });
  }

  /**
   * Get the current number of tokens in the bucket
   * @returns Number of tokens
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get the current queue length
   * @returns Queue length
   */
  getQueueLength(): number {
    return this.waitQueue.length;
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new RateLimiter({
  bucketSize: 10,
  tokensPerSecond: 2,
});
