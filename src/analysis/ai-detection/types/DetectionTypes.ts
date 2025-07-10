/**
 * @fileoverview Core type definitions for AI-generated code detection.
 *
 * This module defines the interfaces and types used throughout the AI detection engine,
 * providing a consistent type system for pattern detection, analysis results, and configuration.
 */

/**
 * Main detection result interface containing analysis outcomes
 */
export interface DetectionResult {
  /** Whether the code is determined to be AI-generated */
  isAIGenerated: boolean;
  /** Overall confidence score from 0.0 to 1.0 */
  confidenceScore: number;
  /** Array of specific patterns detected */
  detectedPatterns: DetectedPattern[];
  /** Detailed breakdown of each analysis component */
  analysisBreakdown: AnalysisBreakdown;
  /** Actionable recommendations based on findings */
  recommendations: string[];
  /** Additional metadata about the detection process */
  metadata: DetectionMetadata;
}

/**
 * Individual pattern detection result
 */
export interface DetectedPattern {
  /** Unique pattern identifier (e.g., 'H1.1', 'M5.3') */
  id: string;
  /** Human-readable pattern name */
  name: string;
  /** Confidence level category */
  confidence: 'high' | 'medium' | 'low';
  /** Numerical confidence score from 0.0 to 1.0 */
  score: number;
  /** Supporting evidence for this pattern */
  evidence: PatternEvidence;
  /** Detailed description of what this pattern indicates */
  description: string;
}

/**
 * Evidence supporting a pattern detection
 */
export interface PatternEvidence {
  /** Type of evidence collected */
  type: 'git' | 'documentation' | 'structural' | 'statistical' | 'linguistic';
  /** Raw data supporting the detection */
  data: Record<string, any>;
  /** Specific locations in code where pattern was found */
  locations?: CodeLocation[];
  /** Additional context for human reviewers */
  context?: string;
}

/**
 * Location reference within codebase
 */
export interface CodeLocation {
  /** File path relative to project root */
  filePath: string;
  /** Line number (1-indexed) */
  lineNumber?: number;
  /** Column number (1-indexed) */
  columnNumber?: number;
  /** Range of lines if applicable */
  lineRange?: [number, number];
}

/**
 * Comprehensive breakdown of all analysis components
 */
export interface AnalysisBreakdown {
  /** Git history analysis results */
  gitHistoryAnalysis: GitAnalysisResult;
  /** Documentation structure analysis results */
  documentationAnalysis: DocumentationResult;
  /** Code structure analysis results */
  structuralAnalysis: StructuralResult;
  /** Statistical pattern analysis results */
  statisticalAnalysis: StatisticalResult;
  /** Natural language analysis results */
  linguisticAnalysis: LinguisticResult;
}

/**
 * Git history analysis result
 */
export interface GitAnalysisResult {
  /** Name of the analyzer */
  analyzer: 'git-history';
  /** Patterns detected by git analysis */
  patterns: DetectedPattern[];
  /** Analysis metadata */
  metadata: {
    /** Total number of commits analyzed */
    totalCommits: number;
    /** Time taken for analysis in milliseconds */
    analysisTime: number;
    /** Whether repository had sufficient history */
    sufficientHistory: boolean;
  };
}

/**
 * Documentation analysis result
 */
export interface DocumentationResult {
  /** Name of the analyzer */
  analyzer: 'documentation';
  /** Patterns detected by documentation analysis */
  patterns: DetectedPattern[];
  /** Analysis metadata */
  metadata: {
    /** Number of files analyzed */
    filesAnalyzed: number;
    /** Whether README file was present */
    hasReadme: boolean;
    /** Average comment density across files */
    avgCommentDensity: number;
  };
}

/**
 * Structural analysis result
 */
export interface StructuralResult {
  /** Name of the analyzer */
  analyzer: 'structural';
  /** Patterns detected by structural analysis */
  patterns: DetectedPattern[];
  /** Analysis metadata */
  metadata: {
    /** Number of files analyzed */
    filesAnalyzed: number;
    /** Number of functions analyzed */
    functionsAnalyzed: number;
    /** Average cyclomatic complexity */
    avgComplexity: number;
  };
}

/**
 * Statistical analysis result
 */
export interface StatisticalResult {
  /** Name of the analyzer */
  analyzer: 'statistical';
  /** Patterns detected by statistical analysis */
  patterns: DetectedPattern[];
  /** Analysis metadata */
  metadata: {
    /** Total tokens processed */
    totalTokens: number;
    /** Unique tokens found */
    uniqueTokens: number;
    /** Shannon entropy score */
    entropy: number;
  };
}

/**
 * Linguistic analysis result
 */
export interface LinguisticResult {
  /** Name of the analyzer */
  analyzer: 'linguistic';
  /** Patterns detected by linguistic analysis */
  patterns: DetectedPattern[];
  /** Analysis metadata */
  metadata: {
    /** Text blocks analyzed */
    textBlocks: number;
    /** Vocabulary diversity score */
    vocabularyDiversity: number;
  };
}

/**
 * Detection metadata for tracking and debugging
 */
export interface DetectionMetadata {
  /** When the analysis was performed */
  timestamp: Date;
  /** Version of the detection engine */
  engineVersion: string;
  /** Which analyzers were enabled */
  enabledAnalyzers: string[];
  /** Total time taken for complete analysis */
  totalAnalysisTime: number;
  /** Any warnings or non-fatal errors */
  warnings: string[];
  /** Cache hit/miss information */
  cacheInfo?: {
    hit: boolean;
    key?: string;
  };
}

/**
 * Configuration for detection engine
 */
export interface DetectionConfig {
  /** Global detection threshold (0.0 - 1.0) */
  detectionThreshold: number;
  /** List of analyzers to enable */
  enabledAnalyzers: ('git' | 'documentation' | 'structural' | 'statistical' | 'linguistic')[];
  /** Weights for different pattern confidence levels */
  patternWeights: PatternWeights;
  /** Confidence thresholds for pattern classification */
  confidenceThresholds: ConfidenceThresholds;
  /** Maximum time allowed for analysis (milliseconds) */
  maxAnalysisTime: number;
  /** Whether to enable result caching */
  enableCaching: boolean;
  /** Output format configuration */
  outputFormat: 'detailed' | 'summary' | 'score-only';
  /** Whether to include evidence in results */
  includeEvidence: boolean;
  /** Whether to generate recommendations */
  generateRecommendations: boolean;
}

/**
 * Weights for different pattern confidence levels
 */
export interface PatternWeights {
  /** Weight for high confidence patterns */
  highConfidence: number;
  /** Weight for medium confidence patterns */
  mediumConfidence: number;
  /** Weight for low confidence patterns */
  lowConfidence: number;
}

/**
 * Thresholds for pattern confidence classification
 */
export interface ConfidenceThresholds {
  /** Minimum score for high confidence classification */
  highConfidence: number;
  /** Minimum score for medium confidence classification */
  mediumConfidence: number;
  /** Minimum score for low confidence classification */
  lowConfidence: number;
}

/**
 * Input data for AI detection analysis
 */
export interface CodeSubmission {
  /** Git repository information */
  repository: GitRepository;
  /** Parsed codebase structure */
  codebase: ParsedCodebase;
  /** Documentation content */
  documentation: DocumentationSet;
}

/**
 * Git repository data
 */
export interface GitRepository {
  /** List of commits in chronological order */
  commits: GitCommit[];
  /** Repository root path */
  rootPath?: string;
}

/**
 * Individual git commit data
 */
export interface GitCommit {
  /** Commit hash */
  hash: string;
  /** Commit message */
  message: string;
  /** Files changed in this commit */
  changedFiles: string[];
  /** Timestamp of the commit */
  timestamp: Date;
  /** Author information */
  author?: {
    name: string;
    email: string;
  };
}

/**
 * Parsed codebase structure
 */
export interface ParsedCodebase {
  /** List of code files */
  files: CodeFile[];
  /** List of parsed functions */
  functions: ParsedFunction[];
  /** Overall project statistics */
  statistics?: {
    totalLines: number;
    totalFiles: number;
    languages: string[];
  };
}

/**
 * Individual code file data
 */
export interface CodeFile {
  /** File path relative to project root */
  path: string;
  /** File content */
  content: string;
  /** Detected programming language */
  language: string;
  /** File size in bytes */
  size: number;
  /** File modification time */
  lastModified?: Date;
}

/**
 * Parsed function information
 */
export interface ParsedFunction {
  /** Function name */
  name: string;
  /** File containing the function */
  filePath: string;
  /** Starting line number */
  startLine: number;
  /** Ending line number */
  endLine: number;
  /** Function parameters */
  parameters: string[];
  /** Return type if available */
  returnType?: string;
  /** Number of conditional statements */
  conditionals: any[];
  /** Number of loops */
  loops: any[];
  /** Number of try-catch blocks */
  catches: any[];
  /** Number of logical operators */
  logicalOperators: any[];
}

/**
 * Documentation set for analysis
 */
export interface DocumentationSet {
  /** README file content */
  readme?: string;
  /** Code files with their documentation */
  codeFiles: CodeFile[];
  /** Other documentation files */
  otherDocs?: DocumentationFile[];
}

/**
 * Documentation file
 */
export interface DocumentationFile {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** Type of documentation */
  type: 'readme' | 'changelog' | 'api' | 'guide' | 'other';
}

/**
 * Result from pattern detection analysis
 */
export interface PatternDetectionResult {
  /** Whether the pattern was detected */
  detected: boolean;
  /** Confidence score for this pattern */
  score: number;
  /** Supporting evidence */
  evidence?: Record<string, any>;
}

/**
 * Default configuration values
 */
export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  detectionThreshold: 0.7,
  enabledAnalyzers: ['git', 'documentation', 'structural'],
  patternWeights: {
    highConfidence: 0.9,
    mediumConfidence: 0.7,
    lowConfidence: 0.5,
  },
  confidenceThresholds: {
    highConfidence: 0.9,
    mediumConfidence: 0.7,
    lowConfidence: 0.5,
  },
  maxAnalysisTime: 30000, // 30 seconds
  enableCaching: true,
  outputFormat: 'detailed',
  includeEvidence: true,
  generateRecommendations: true,
};
