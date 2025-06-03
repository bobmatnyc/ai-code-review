/**
 * @fileoverview Review type definitions.
 *
 * This module defines the types used for code reviews, including review types,
 * review options, and review results.
 */

import { CostInfo } from './tokenAnalysis';

/**
 * Types of code reviews that can be performed
 */
export type ReviewType =
  | 'quick-fixes'
  | 'architectural'
  | 'security'
  | 'performance'
  | 'unused-code'
  | 'focused-unused-code'
  | 'code-tracing-unused-code'
  | 'improved-quick-fixes'
  | 'consolidated';

/**
 * Options for code reviews
 */
export interface ReviewOptions {
  /** Type of review to perform */
  type: ReviewType;
  /** Whether to generate individual reviews for each file */
  individual?: boolean;
  /** Output format (markdown or json) */
  output?: string;
  /** Directory to save review output */
  outputDir?: string;
  /** Model to use for the review */
  model?: string;
  /** Whether to include test files in the review */
  includeTests?: boolean;
  /** Whether to include project documentation in the review context */
  includeProjectDocs?: boolean;
  /** Whether to include dependency analysis in the review */
  includeDependencyAnalysis?: boolean;
  /** Whether to run in interactive mode */
  interactive?: boolean;
  /** Whether to test API connections before running the review */
  testApi?: boolean;
  /** Whether to estimate token usage and cost without performing the review */
  estimate?: boolean;
  /** Whether to use multi-pass review for large codebases */
  multiPass?: boolean;
  /** Whether to force single-pass review even if token analysis suggests multiple passes are needed */
  forceSinglePass?: boolean;
  /** Context maintenance factor for multi-pass reviews (0-1) */
  contextMaintenanceFactor?: number;
  /** Whether to skip confirmation prompts */
  noConfirm?: boolean;
  /** Whether to enable debug logging */
  debug?: boolean;
  /** Programming language of the code being reviewed */
  language?: string;
  /** Framework used in the code being reviewed */
  framework?: string;
  /** Whether to list available models based on configured API keys */
  listmodels?: boolean;
  /** Whether to list all supported models and their configuration names */
  models?: boolean;
  /** CI/CD data (TypeScript errors, lint errors) - internal use only */
  ciData?: any;
}

/**
 * Information about a file to be reviewed
 */
export interface FileInfo {
  /** Path to the file */
  path: string;
  /** Relative path to the file from the project root */
  relativePath?: string;
  /** Content of the file */
  content: string;
}

/**
 * Result of a code review
 */
export interface ReviewResult {
  /** Content of the review */
  content: string;
  /** Path to the file that was reviewed */
  filePath: string;
  /** Type of review that was performed */
  reviewType: ReviewType;
  /** Timestamp when the review was generated */
  timestamp: string;
  /** Cost information for the review */
  cost?: CostInfo;
  /** Cost information for the review (alias for cost) */
  costInfo?: CostInfo;
  /** Model used for the review */
  modelUsed?: string;
  /** Structured data from the review */
  structuredData?: any;
  /** Metadata about the review */
  metadata?: any;
  /** Tool version used for the review */
  toolVersion?: string;
  /** Command options used for the review */
  commandOptions?: string;
  /** Detected language of the code */
  detectedLanguage?: string;
  /** Detected framework of the code */
  detectedFramework?: string;
  /** Detected framework version */
  frameworkVersion?: string;
  /** Detected CSS frameworks */
  cssFrameworks?: Array<{ name: string; version?: string }>;
}

/**
 * Cost information for a single pass in a multi-pass review
 */
export interface PassCost {
  /** Pass number */
  passNumber: number;
  /** Input tokens for this pass */
  inputTokens: number;
  /** Output tokens for this pass */
  outputTokens: number;
  /** Total tokens for this pass */
  totalTokens: number;
  /** Estimated cost for this pass */
  estimatedCost: number;
}
