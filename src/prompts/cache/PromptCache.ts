/**
 * @fileoverview Prompt cache for storing and retrieving optimized prompts.
 *
 * This module provides functionality for caching optimized prompts and retrieving
 * them for future use. It supports both memory-based and file-based caching.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ReviewType } from '../../types/review';
import logger from '../../utils/logger';

/**
 * Interface for a cached prompt
 */
export interface CachedPrompt {
  /**
   * Content of the prompt
   */
  content: string;

  /**
   * Rating of the prompt (1-5)
   */
  rating: number;

  /**
   * Timestamp when the prompt was cached
   */
  timestamp: string;

  /**
   * Number of times the prompt has been used
   */
  usageCount: number;
}

/**
 * Cache for optimized prompts
 */
export class PromptCache {
  private static instance: PromptCache;
  private memoryCache: Map<string, CachedPrompt[]> = new Map();
  private cacheDir: string;

  /**
   * Create a new prompt cache
   * @param cacheDir Directory for storing cached prompts
   */
  private constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  /**
   * Get the singleton instance
   * @param cacheDir Directory for storing cached prompts
   * @returns The prompt cache instance
   */
  static getInstance(cacheDir?: string): PromptCache {
    if (!PromptCache.instance) {
      const defaultCacheDir = path.resolve(process.cwd(), '.prompt-cache');
      PromptCache.instance = new PromptCache(cacheDir || defaultCacheDir);

      // Initialize the cache
      PromptCache.instance.initialize().catch((error) => {
        logger.error(
          `Error initializing prompt cache: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
    return PromptCache.instance;
  }

  /**
   * Initialize the prompt cache
   */
  private async initialize(): Promise<void> {
    try {
      // Create the cache directory if it doesn't exist
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Load cached prompts from disk
      await this.loadCachedPrompts();

      logger.debug(`Initialized prompt cache in ${this.cacheDir}`);
    } catch (error) {
      logger.error(
        `Error initializing prompt cache: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load cached prompts from disk
   */
  private async loadCachedPrompts(): Promise<void> {
    try {
      // Get all files in the cache directory
      const files = await fs.readdir(this.cacheDir);

      // Load each cache file
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            // Read the cache file
            const filePath = path.join(this.cacheDir, file);
            const content = await fs.readFile(filePath, 'utf-8');

            // Parse the cache file
            const cache = JSON.parse(content) as Record<string, CachedPrompt[]>;

            // Add each entry to the memory cache
            for (const [key, prompts] of Object.entries(cache)) {
              this.memoryCache.set(key, prompts);
            }

            logger.debug(`Loaded cached prompts from ${filePath}`);
          } catch (error) {
            logger.error(
              `Error loading cache file ${file}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        `Error loading cached prompts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Save the memory cache to disk
   */
  private async saveCacheToDisk(): Promise<void> {
    try {
      // Create a cache object from the memory cache
      const cache: Record<string, CachedPrompt[]> = {};

      // Add each entry to the cache object
      for (const [key, prompts] of this.memoryCache.entries()) {
        cache[key] = prompts;
      }

      // Write the cache object to disk
      const filePath = path.join(this.cacheDir, 'prompts.json');
      await fs.writeFile(filePath, JSON.stringify(cache, null, 2));

      logger.debug(`Saved prompt cache to ${filePath}`);
    } catch (error) {
      logger.error(
        `Error saving prompt cache: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Cache a prompt for future use
   * @param reviewType Type of review
   * @param promptContent Content of the prompt
   * @param rating Rating of the prompt (1-5)
   */
  async cachePrompt(reviewType: ReviewType, promptContent: string, rating: number): Promise<void> {
    try {
      // Create a cached prompt object
      const cachedPrompt: CachedPrompt = {
        content: promptContent,
        rating,
        timestamp: new Date().toISOString(),
        usageCount: 0,
      };

      // Get the key for the review type
      const key = this.getCacheKey(reviewType);

      // Get the existing prompts for this review type
      const existingPrompts = this.memoryCache.get(key) || [];

      // Add the new prompt to the list
      existingPrompts.push(cachedPrompt);

      // Sort prompts by rating (highest first)
      existingPrompts.sort((a, b) => b.rating - a.rating);

      // Keep only the top 5 prompts
      const topPrompts = existingPrompts.slice(0, 5);

      // Update the memory cache
      this.memoryCache.set(key, topPrompts);

      // Save the cache to disk
      await this.saveCacheToDisk();

      logger.debug(`Cached prompt for ${reviewType} review type with rating ${rating}`);
    } catch (error) {
      logger.error(
        `Error caching prompt: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the best cached prompt for a review type
   * @param reviewType Type of review
   * @returns The best cached prompt, or undefined if none exists
   */
  getBestPrompt(reviewType: ReviewType): CachedPrompt | undefined {
    try {
      // Get the key for the review type
      const key = this.getCacheKey(reviewType);

      // Get the prompts for this review type
      const prompts = this.memoryCache.get(key) || [];

      // If there are no prompts, return undefined
      if (prompts.length === 0) {
        return undefined;
      }

      // Get the best prompt (highest rating)
      const bestPrompt = prompts[0];

      // Increment the usage count
      bestPrompt.usageCount++;

      // Save the cache to disk
      this.saveCacheToDisk().catch((error) => {
        logger.error(
          `Error saving prompt cache: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

      return bestPrompt;
    } catch (error) {
      logger.error(
        `Error getting best prompt: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  /**
   * Get all cached prompts for a review type
   * @param reviewType Type of review
   * @returns Array of cached prompts
   */
  getAllPrompts(reviewType: ReviewType): CachedPrompt[] {
    try {
      // Get the key for the review type
      const key = this.getCacheKey(reviewType);

      // Get the prompts for this review type
      return this.memoryCache.get(key) || [];
    } catch (error) {
      logger.error(
        `Error getting all prompts: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Clear the cache for a review type
   * @param reviewType Type of review
   */
  async clearCache(reviewType: ReviewType): Promise<void> {
    try {
      // Get the key for the review type
      const key = this.getCacheKey(reviewType);

      // Remove the prompts for this review type
      this.memoryCache.delete(key);

      // Save the cache to disk
      await this.saveCacheToDisk();

      logger.debug(`Cleared cache for ${reviewType} review type`);
    } catch (error) {
      logger.error(
        `Error clearing cache: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Clear the entire cache
   */
  async clearAllCaches(): Promise<void> {
    try {
      // Clear the memory cache
      this.memoryCache.clear();

      // Save the cache to disk
      await this.saveCacheToDisk();

      logger.debug('Cleared all prompt caches');
    } catch (error) {
      logger.error(
        `Error clearing all caches: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the cache key for a review type
   * @param reviewType Type of review
   * @returns Cache key
   */
  private getCacheKey(reviewType: ReviewType): string {
    return `prompt:${reviewType}`;
  }
}
