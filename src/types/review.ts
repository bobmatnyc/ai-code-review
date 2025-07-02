/**
 * @fileoverview Review type definitions.
 *
 * This module defines the types used for code reviews, including review types,
 * review options, and review results.
 */

import type { CostInfo } from '../clients/utils/tokenCounter';

// Re-export CostInfo for convenience
export type { CostInfo } from '../clients/utils/tokenCounter';

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
  | 'consolidated'
  | 'best-practices'
  | 'evaluation'
  | 'extract-patterns';

/**
 * Options for code reviews
 */
export interface ReviewOptions {
  /** Type of review to perform */
  type: ReviewType;
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
  /** Whether to enable semantic chunking for intelligent code analysis */
  enableSemanticChunking?: boolean;
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
  /** Path to a custom prompt file */
  promptFile?: string;
  /** Prompt fragments to inject into the review */
  promptFragments?: Array<{
    content: string;
    position: 'start' | 'middle' | 'end';
    priority?: number;
  }>;
  /** Prompt strategy to use */
  promptStrategy?: string;
  /** Whether to use cache for prompts */
  useCache?: boolean;
  /** Whether to automatically fix issues */
  autoFix?: boolean;
  /** Whether to use ts-prune for unused code detection */
  useTsPrune?: boolean;
  /** Whether to use ESLint for code analysis */
  useEslint?: boolean;
  /** Whether to trace code execution */
  traceCode?: boolean;
  /** UI language for output messages */
  uiLanguage?: string;
  /** Target file or directory (used internally) */
  target?: string;
  /** Schema instructions for structured output */
  schemaInstructions?: string;
  /** Examples for prompts */
  examples?: any[];
  /** Whether to prompt for all issues */
  promptAll?: boolean;
  /** Whether to skip specific file content */
  skipFileContent?: boolean;
  /** Whether this is a consolidation pass */
  isConsolidation?: boolean;
  /** Project name */
  projectName?: string;
  /** Strategy override */
  strategy?: string;
  /** Whether to suppress output */
  quiet?: boolean;
  /** Whether to focus on specific aspects */
  focused?: boolean;
  /** Whether to use consolidated review */
  consolidated?: boolean;
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
  /** File extension */
  extension?: string;
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
  /** Raw API response (for debugging) */
  response?: string;
  /** Output format of the review */
  outputFormat?: string;
  /** Project name for the review */
  projectName?: string;
  /** Total number of passes in multi-pass review */
  totalPasses?: number;
  /** Files included in the review */
  files?: FileInfo[];
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
