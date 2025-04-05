/**
 * Types of code reviews supported by the tool
 */
export type ReviewType = 'architectural' | 'quick-fixes' | 'security' | 'performance';

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
}
