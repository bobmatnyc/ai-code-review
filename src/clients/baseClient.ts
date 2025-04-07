/**
 * @fileoverview Base interface and abstract class for AI clients.
 *
 * This module provides a common interface and abstract base class for AI clients
 * to reduce code duplication and standardize the API across different providers.
 */

import { ReviewOptions, ReviewResult, FileInfo, ReviewCost, ReviewType } from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';
import { StreamHandler } from '../utils/streamHandler';
import { globalRateLimiter } from '../utils/rateLimiter';
import { getConfig } from '../utils/config';
import logger from '../utils/logger';

/**
 * Interface for AI clients
 */
export interface IAiClient {
  /**
   * Generate a review for a single file
   * @param fileInfo File information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  generateReview(
    fileInfo: FileInfo,
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  /**
   * Generate a consolidated review for multiple files
   * @param files Array of file information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  generateConsolidatedReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  /**
   * Generate an architectural review for multiple files
   * @param files Array of file information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  generateArchitecturalReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  /**
   * Generate a security review for multiple files
   * @param files Array of file information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  generateSecurityReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  /**
   * Generate a performance review for multiple files
   * @param files Array of file information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  generatePerformanceReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  /**
   * Check if the client is initialized and ready to use
   * @returns True if the client is initialized
   */
  isInitialized(): boolean;

  /**
   * Initialize the client with the specified model
   * @param modelName Model name
   * @returns True if initialization was successful
   */
  initialize(modelName?: string): Promise<boolean>;
}

/**
 * Abstract base class for AI clients
 */
export abstract class BaseAiClient implements IAiClient {
  protected rateLimiter = globalRateLimiter;
  protected useMockResponses = false;
  protected initialized = false;
  protected config = getConfig();

  /**
   * Set up a stream handler based on review options
   * @param options Review options
   * @returns StreamHandler instance or undefined
   */
  protected setupStreamHandler(options: ReviewOptions): StreamHandler | undefined {
    if (options.interactive) {
      return new StreamHandler(options.type as ReviewType, this.config.selectedModel);
    }
    return undefined;
  }

  /**
   * Format a prompt with code content
   * @param code Code content
   * @param language Programming language
   * @returns Formatted code block
   */
  protected formatCodeBlock(code: string, language?: string): string {
    return `\`\`\`${language || ''}
${code}
\`\`\``;
  }

  /**
   * Log an error with consistent formatting
   * @param method Method name
   * @param error Error object
   */
  protected logError(method: string, error: any): void {
    logger.error(`[${this.constructor.name}] Error in ${method}:`, error);
  }

  // Abstract methods that must be implemented by subclasses
  abstract generateReview(
    fileInfo: FileInfo,
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  abstract generateConsolidatedReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  abstract generateArchitecturalReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  abstract generateSecurityReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  abstract generatePerformanceReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult>;

  abstract isInitialized(): boolean;

  abstract initialize(modelName?: string): Promise<boolean>;
}
