/**
 * @fileoverview Type definitions for the code review system.
 *
 * This module defines the core type system used throughout the code review tool,
 * including review types, options, results, and file information structures.
 * These types provide a consistent interface for data exchange between different
 * components of the system.
 *
 * Key type definitions include:
 * - ReviewType: The different types of reviews supported (architectural, quick-fixes, etc.)
 * - ReviewOptions: Configuration options for review operations
 * - FileInfo: Structure for file content and metadata
 * - ReviewResult: Structure for review outputs and metadata
 * - ReviewCost: Information about token usage and estimated costs
 *
 * These types ensure type safety and consistency across the application while
 * providing clear documentation of the data structures used throughout the system.
 */

/**
 * Types of code reviews supported by the tool
 */
export type ReviewType =
  | 'architectural'
  | 'quick-fixes'
  | 'security'
  | 'performance'
  | 'consolidated';

/**
 * Options for the review command
 */
export interface ReviewOptions {
  /**
   * Type of review to perform
   */
  type: string;

  /**
   * Whether to include test files in the review
   */
  includeTests: boolean;

  /**
   * Output format (markdown or json)
   */
  output: string;

  /**
   * Whether to include project documentation in the context
   */
  includeProjectDocs?: boolean;

  /**
   * Whether to generate a consolidated review instead of individual file reviews
   */
  consolidated?: boolean;

  /**
   * Whether to generate individual file reviews instead of a consolidated review
   */
  individual?: boolean;

  /**
   * Whether to display review results with optional priority filter
   * Can be a boolean or a string indicating the priority filter (h, m, l, a)
   */
  interactive?: boolean | string;

  /**
   * Whether to automatically implement high priority fixes without confirmation
   */
  autoFix?: boolean;

  /**
   * Whether to prompt for confirmation on all fixes, including high priority ones
   */
  promptAll?: boolean;

  /**
   * Whether to test API connections before running the review
   */
  testApi?: boolean;

  /**
   * Whether to enable debug mode with additional logging
   */
  debug?: boolean;

  /**
   * Whether to suppress non-essential output
   */
  quiet?: boolean;

  /**
   * Whether to estimate token usage and cost without performing the review
   */
  estimate?: boolean;

  /**
   * Programming language for the code review
   */
  language?: string;

  /**
   * Whether to list available models based on configured API keys
   */
  listmodels?: boolean;
}

/**
 * Information about a file to be reviewed
 */
export interface FileInfo {
  /**
   * Absolute path to the file
   */
  path: string;

  /**
   * Relative path from the project root
   */
  relativePath: string;

  /**
   * Content of the file
   */
  content: string;
}

/**
 * Cost information for a review
 */
export interface ReviewCost {
  /**
   * Number of input tokens
   */
  inputTokens: number;

  /**
   * Number of output tokens
   */
  outputTokens: number;

  /**
   * Total number of tokens
   */
  totalTokens: number;

  /**
   * Estimated cost in USD
   */
  estimatedCost: number;

  /**
   * Formatted cost string
   */
  formattedCost: string;
}

/**
 * Result of a code review
 */
export interface ReviewResult {
  /**
   * Path to the reviewed file
   */
  filePath: string;

  /**
   * Type of review performed
   */
  reviewType: ReviewType;

  /**
   * Content of the review
   */
  content: string;

  /**
   * Timestamp of when the review was generated
   */
  timestamp: string;

  /**
   * Cost information for the review (if available)
   */
  cost?: ReviewCost;

  /**
   * Whether this is a mock response
   */
  isMock: boolean;

  /**
   * The model used to generate the review
   */
  modelUsed?: string;
}
