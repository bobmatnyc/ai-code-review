/**
 * @fileoverview Core types for TreeSitter semantic analysis
 *
 * This module defines the fundamental interfaces for semantic code analysis,
 * chunking recommendations, and context-aware review processing.
 */

/**
 * Main result of semantic analysis for a code file
 */
export interface SemanticAnalysis {
  /** Programming language detected */
  language: string;
  /** Total number of lines in the file */
  totalLines: number;
  /** Top-level declarations found in the file */
  topLevelDeclarations: Declaration[];
  /** Import/dependency relationships */
  importGraph: ImportRelationship[];
  /** Code complexity metrics */
  complexity: ComplexityMetrics;
  /** AI-recommended chunking strategy */
  suggestedChunkingStrategy: ChunkingRecommendation;
  /** File path being analyzed */
  filePath: string;
  /** Timestamp of analysis */
  analyzedAt: Date;
}

/**
 * Represents a code declaration (function, class, interface, etc.)
 */
export interface Declaration {
  /** Type of declaration */
  type: DeclarationType;
  /** Name/identifier of the declaration */
  name: string;
  /** Starting line number (1-based) */
  startLine: number;
  /** Ending line number (1-based) */
  endLine: number;
  /** Names of dependencies this declaration uses */
  dependencies: string[];
  /** Cyclomatic complexity if applicable */
  cyclomaticComplexity?: number;
  /** Export status */
  exportStatus: ExportStatus;
  /** Optional documentation/comments */
  documentation?: string;
  /** Nested declarations (e.g., methods in a class) */
  children?: Declaration[];
  /** Modifiers (public, private, static, etc.) */
  modifiers?: string[];
}

/**
 * Types of code declarations
 */
export type DeclarationType =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'const'
  | 'let'
  | 'var'
  | 'enum'
  | 'namespace'
  | 'method'
  | 'property'
  | 'import'
  | 'export';

/**
 * Export status of declarations
 */
export type ExportStatus = 'exported' | 'internal' | 'default_export';

/**
 * Import/dependency relationship
 */
export interface ImportRelationship {
  /** What is being imported */
  imported: string;
  /** Source module/file */
  from: string;
  /** Type of import */
  importType: ImportType;
  /** Line number of the import */
  line: number;
  /** Whether this import is actually used */
  isUsed: boolean;
}

/**
 * Types of imports
 */
export type ImportType = 'default' | 'named' | 'namespace' | 'side_effect' | 'dynamic';

/**
 * Code complexity metrics
 */
export interface ComplexityMetrics {
  /** Cyclomatic complexity of the entire file */
  cyclomaticComplexity: number;
  /** Cognitive complexity score */
  cognitiveComplexity: number;
  /** Nesting depth */
  maxNestingDepth: number;
  /** Number of functions */
  functionCount: number;
  /** Number of classes */
  classCount: number;
  /** Total number of declarations */
  totalDeclarations: number;
  /** Lines of code (excluding comments/whitespace) */
  linesOfCode: number;
  /** Halstead complexity measures */
  halstead?: HalsteadMetrics;
}

/**
 * Halstead complexity measures
 */
export interface HalsteadMetrics {
  /** Number of distinct operators */
  distinctOperators: number;
  /** Number of distinct operands */
  distinctOperands: number;
  /** Total operators */
  totalOperators: number;
  /** Total operands */
  totalOperands: number;
  /** Program vocabulary */
  vocabulary: number;
  /** Program length */
  length: number;
  /** Calculated volume */
  volume: number;
  /** Difficulty */
  difficulty: number;
  /** Effort */
  effort: number;
}

/**
 * AI-recommended chunking strategy
 */
export interface ChunkingRecommendation {
  /** Overall chunking strategy */
  strategy: ChunkingStrategy;
  /** Individual code chunks */
  chunks: CodeChunk[];
  /** Relationships between chunks */
  crossReferences: ChunkRelationship[];
  /** Reasoning for the chunking decision */
  reasoning: string;
  /** Estimated token count for the entire analysis */
  estimatedTokens: number;
  /** Estimated number of chunks */
  estimatedChunks: number;
}

/**
 * Chunking strategy types
 */
export type ChunkingStrategy =
  | 'individual' // Each declaration reviewed individually
  | 'grouped' // Related declarations grouped together
  | 'hierarchical' // Nested structure (classes with methods)
  | 'functional' // Group by functional relationships
  | 'contextual'; // Group by shared context/dependencies

/**
 * Individual code chunk for review
 */
export interface CodeChunk {
  /** Unique identifier for this chunk */
  id: string;
  /** Type of review unit */
  type: ReviewUnit;
  /** Line range [start, end] (1-based, inclusive) */
  lines: [number, number];
  /** Declarations included in this chunk */
  declarations: Declaration[];
  /** Related code for context understanding */
  context: Declaration[];
  /** Review priority */
  priority: ReviewPriority;
  /** Specific review focuses for this chunk */
  reviewFocus: ReviewFocus[];
  /** Estimated token count for this chunk */
  estimatedTokens: number;
  /** Dependencies needed for understanding */
  dependencies: string[];
  /** The actual code content of this chunk */
  content?: string;
  /** Metadata for semantic analysis and consolidation */
  metadata?: {
    semanticInfo?: {
      declarations?: Declaration[];
      complexity?: number;
      threadCount?: number;
      groupType?: string;
    };
    consolidation?: {
      originalThreads?: number;
      threadIds?: string[];
      consolidationReason?: string;
    };
  };
}

/**
 * Types of review units
 */
export type ReviewUnit =
  | 'function'
  | 'class'
  | 'module'
  | 'interface'
  | 'type_definitions'
  | 'imports'
  | 'exports'
  | 'configuration'
  | 'tests';

/**
 * Review priority levels
 */
export type ReviewPriority = 'high' | 'medium' | 'low';

/**
 * Review focus areas
 */
export type ReviewFocus =
  | 'security'
  | 'performance'
  | 'architecture'
  | 'maintainability'
  | 'testing'
  | 'documentation'
  | 'type_safety'
  | 'error_handling';

/**
 * Relationship between code chunks
 */
export interface ChunkRelationship {
  /** Source chunk ID */
  from: string;
  /** Target chunk ID */
  to: string;
  /** Type of relationship */
  relationship: RelationshipType;
  /** Strength of the relationship (0-1) */
  strength: number;
  /** Description of the relationship */
  description: string;
}

/**
 * Types of relationships between chunks
 */
export type RelationshipType =
  | 'depends_on'
  | 'calls'
  | 'implements'
  | 'extends'
  | 'imports'
  | 'configures'
  | 'tests';

/**
 * Configuration for semantic analysis
 */
export interface SemanticAnalysisConfig {
  /** Languages to analyze */
  enabledLanguages: string[];
  /** Minimum complexity threshold for individual analysis */
  complexityThreshold: number;
  /** Maximum chunk size in lines */
  maxChunkSize: number;
  /** Whether to include dependency analysis */
  includeDependencyAnalysis: boolean;
  /** Whether to calculate Halstead metrics */
  includeHalsteadMetrics: boolean;
  /** Custom chunking rules */
  customChunkingRules?: ChunkingRule[];
}

/**
 * Custom chunking rule
 */
export interface ChunkingRule {
  /** Name of the rule */
  name: string;
  /** Language this rule applies to */
  language: string;
  /** Pattern to match */
  pattern: string;
  /** Chunking strategy to apply */
  strategy: ChunkingStrategy;
  /** Priority of this rule */
  priority: number;
}

/**
 * Error information for semantic analysis
 */
export interface SemanticAnalysisError {
  /** Error type */
  type: 'parse_error' | 'language_not_supported' | 'file_too_large' | 'analysis_failed';
  /** Error message */
  message: string;
  /** Line number where error occurred (if applicable) */
  line?: number;
  /** Column number where error occurred (if applicable) */
  column?: number;
  /** Stack trace for debugging */
  stack?: string;
}

/**
 * Result of semantic analysis that may include errors
 */
export interface SemanticAnalysisResult {
  /** Analysis result if successful */
  analysis?: SemanticAnalysis;
  /** Errors encountered during analysis */
  errors: SemanticAnalysisError[];
  /** Whether analysis was successful */
  success: boolean;
  /** Fallback to line-based chunking if semantic analysis failed */
  fallbackUsed: boolean;
}
