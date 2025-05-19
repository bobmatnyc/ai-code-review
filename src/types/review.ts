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

import { OutputFormat, ProgrammingLanguage, PriorityFilter } from './common';
import { StructuredReview } from './structuredReview';

/**
 * Types of code reviews supported by the tool
 */
export type ReviewType =
  | 'architectural'
  | 'arch'         // Alias for architectural
  | 'quick-fixes'
  | 'security'
  | 'performance'
  | 'consolidated'
  | 'unused-code'
  | 'code-tracing-unused-code'
  | 'best-practices';

/**
 * Options for the review command
 */
export interface ReviewOptions {
  /**
   * Type of review to perform
   */
  type: ReviewType;

  /**
   * Whether to include test files in the review
   */
  includeTests: boolean;

  /**
   * Output format (markdown or json)
   */
  output: OutputFormat;

  /**
   * Whether to include project documentation in the context
   */
  includeProjectDocs?: boolean;
  
  /**
   * Whether to include dependency analysis in architectural reviews
   * Only applicable for architectural review type
   */
  includeDependencyAnalysis?: boolean;

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
   * Can be a boolean or a priority filter indicating which issues to show
   */
  interactive?: boolean | PriorityFilter;

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
  language?: ProgrammingLanguage;
  
  /**
   * Framework detected or specified for the code review
   */
  framework?: string;

  /**
   * Whether to list available models based on configured API keys
   */
  listmodels?: boolean;

  /**
   * Whether to list all supported models and their configuration names
   */
  models?: boolean;

  /**
   * Custom review strategy to use (plugin name)
   */
  strategy?: string;

  /**
   * Path to a custom prompt template file
   */
  promptFile?: string;

  /**
   * Custom prompt fragments to inject into the prompt
   */
  promptFragments?: {
    content: string;
    position: 'start' | 'middle' | 'end';
    priority?: number;
  }[];

  /**
   * Whether to use cached prompts
   */
  useCache?: boolean;

  /**
   * Prompt strategy to use (e.g., 'anthropic', 'gemini', 'openai', 'langchain')
   */
  promptStrategy?: string;

  /**
   * Whether to use the focused review strategy (currently for unused-code type)
   */
  focused?: boolean;

  /**
   * Whether to use code tracing for unused code detection with high confidence
   */
  traceCode?: boolean;

  /**
   * Whether to use ts-prune for static analysis of unused exports
   */
  useTsPrune?: boolean;
  
  /**
   * Whether to use eslint for static analysis of unused variables
   */
  useEslint?: boolean;

  /**
   * Schema instructions for structured output
   * @internal
   */
  schemaInstructions?: string;

  /**
   * Language-specific instructions
   * @internal
   */
  languageInstructions?: string;

  /**
   * Raw code string (used in some strategies)
   * @internal
   */
  code?: string;

  /**
   * CI/CD data to include in the review
   * @internal
   */
  ciData?: {
    typeCheckErrors?: number;
    lintErrors?: number;
    typeCheckOutput?: string;
    lintOutput?: string;
  };

  /**
   * Example demos for few-shot learning
   * @internal
   */
  examples?: any[];
  
  /**
   * Whether to use multi-pass review for large files
   */
  multiPass?: boolean;
  
  /**
   * Current pass number in a multi-pass review
   * @internal
   */
  passNumber?: number;
  
  /**
   * Total number of passes in a multi-pass review
   * @internal
   */
  totalPasses?: number;
  
  /**
   * Context maintenance factor for multi-pass reviews (0-1)
   * Represents proportion of context window reserved for maintaining state
   */
  contextMaintenanceFactor?: number;
  
  /**
   * Skip confirmation when multi-pass review is automatically enabled
   */
  noConfirm?: boolean;
  
  /**
   * Whether this is a consolidation pass for a multi-pass review
   * @internal
   */
  isConsolidation?: boolean;
  
  /**
   * Whether to operate in consolidation mode (special prompt processing)
   * @internal
   */
  consolidationMode?: boolean;
  
  /**
   * Whether to skip file content in the review (for consolidation)
   * @internal
   */
  skipFileContent?: boolean;
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
  relativePath?: string;

  /**
   * Content of the file
   */
  content: string;

  /**
   * File extension (without the dot)
   */
  extension?: string;

  /**
   * Filename without path
   */
  filename?: string;
}

/**
 * Per-pass cost information for multi-pass reviews
 */
export interface PassCost {
  /**
   * Pass number (1-based)
   */
  passNumber: number;
  
  /**
   * Number of input tokens for this pass
   */
  inputTokens: number;
  
  /**
   * Number of output tokens for this pass
   */
  outputTokens: number;
  
  /**
   * Total number of tokens for this pass
   */
  totalTokens: number;
  
  /**
   * Estimated cost for this pass in USD
   */
  estimatedCost: number;
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
  
  /**
   * Number of passes in a multi-pass review
   */
  passCount?: number;
  
  /**
   * Per-pass cost breakdown for multi-pass reviews
   */
  perPassCosts?: PassCost[];
  
  /**
   * Context maintenance factor used for this review (0-1)
   */
  contextMaintenanceFactor?: number;
}

/**
 * Result of a code review
 */
export interface ReviewResult {
  /**
   * Path to the reviewed file
   */
  filePath?: string;

  /**
   * List of files included in the review
   */
  files?: string[];

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
  costInfo?: ReviewCost;
  
  /**
   * Alias for costInfo (kept for backward compatibility)
   * @deprecated Use costInfo instead
   */
  cost?: ReviewCost;

  /**
   * The model used to generate the review
   */
  modelUsed?: string;

  /**
   * Name of the project being reviewed
   */
  projectName?: string;

  /**
   * Detected language for the project
   */
  detectedLanguage?: string;
  
  /**
   * Detected framework for the project
   */
  detectedFramework?: string;
  
  /**
   * Detected framework version
   */
  frameworkVersion?: string;
  
  /**
   * Detected CSS frameworks
   */
  cssFrameworks?: Array<{ name: string; version?: string }>;

  /**
   * Structured review data (if available)
   */
  structuredData?: StructuredReview;

  /**
   * Command line options used for this review
   */
  commandOptions?: string;

  /**
   * Version of the tool used for the review
   */
  toolVersion?: string;
  
  /**
   * Whether this is a multi-pass review
   */
  isMultiPass?: boolean;
  
  /**
   * Current pass number if this is a multi-pass review
   */
  passNumber?: number;
  
  /**
   * Total number of passes if this is a multi-pass review
   */
  totalPasses?: number;
  
  /**
   * Token analysis results if available
   */
  tokenAnalysis?: import('../analysis/tokens').TokenAnalysisResult;

  /**
   * Raw response from the API (used in some strategies)
   * @deprecated Use structuredData instead
   */
  response?: StructuredReview;

  /**
   * Output format of the review
   * @deprecated Use options.output instead
   */
  outputFormat?: string;

  /**
   * Metadata for the review
   * @deprecated Use structuredData instead
   */
  metadata?: Record<string, unknown>;
}
