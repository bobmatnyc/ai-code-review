/**
 * @fileoverview Token analysis service for pre-review token counting and estimation.
 *
 * This module provides fast, provider-agnostic token counting and analysis functionality
 * to estimate token usage and costs before performing actual reviews.
 */

import { FileInfo } from '../../types/review';
import { countTokens } from '../../tokenizers';
import logger from '../../utils/logger';

/**
 * Result of token analysis for a single file
 */
export interface FileTokenAnalysis {
  /** Path to the file */
  path: string;
  /** Relative path to the file */
  relativePath: string | undefined;
  /** Number of tokens in the file */
  tokenCount: number;
  /** Size of file in bytes */
  sizeInBytes: number;
  /** Tokens per byte ratio (used for optimization analysis) */
  tokensPerByte: number;
}

/**
 * Result of token analysis for a set of files
 */
export interface TokenAnalysisResult {
  /** Analysis of individual files */
  files: FileTokenAnalysis[];
  /** Total number of tokens across all files */
  totalTokens: number;
  /** Total size of all files in bytes */
  totalSizeInBytes: number;
  /** Average tokens per byte across all files */
  averageTokensPerByte: number;
  /** Total number of files analyzed */
  fileCount: number;
  /** Token overhead for prompts, instructions, etc. */
  promptOverheadTokens: number;
  /** Estimated total token count including overhead */
  estimatedTotalTokens: number;
  /** Maximum context window size for the model */
  contextWindowSize: number;
  /** Whether the content exceeds the context window */
  exceedsContextWindow: boolean;
  /** Number of passes needed for multi-pass review */
  estimatedPassesNeeded: number;
  /** Chunking strategy recommendation */
  chunkingRecommendation: ChunkingRecommendation;
}

/**
 * Recommendation for chunking strategy
 */
export interface ChunkingRecommendation {
  /** Whether chunking is recommended */
  chunkingRecommended: boolean;
  /** Approximate file chunks for multi-pass processing */
  recommendedChunks: FileChunk[];
  /** Reason for chunking recommendation */
  reason: string;
}

/**
 * A chunk of files for multi-pass processing
 */
export interface FileChunk {
  /** Files in this chunk */
  files: string[];
  /** Estimated token count for this chunk */
  estimatedTokenCount: number;
  /** Priority of this chunk (higher = more important) */
  priority: number;
}

/**
 * Options for token analysis
 */
export interface TokenAnalysisOptions {
  /** Type of review being performed */
  reviewType: string;
  /** Name of the model being used */
  modelName: string;
  /** Whether to optimize for speed (less accurate) or precision */
  optimizeForSpeed?: boolean;
  /** Additional prompt overhead to consider */
  additionalPromptOverhead?: number;
  /** Context maintenance factor for multi-pass reviews (0-1) */
  contextMaintenanceFactor?: number;
}

/**
 * Service for analyzing token usage in files
 */
export class TokenAnalyzer {
  private static DEFAULT_PROMPT_OVERHEAD = 1500;
  private static DEFAULT_CONTEXT_MAINTENANCE_FACTOR = 0.15;

  /**
   * Model context window sizes (maximum tokens)
   * This is a simplified version - in production we'd get this from modelMaps.ts
   */
  private static MODEL_CONTEXT_SIZES: Record<string, number> = {
    'gemini-1.5-pro': 1000000,
    'gemini-1.5-flash': 1000000,
    'claude-3-opus': 200000,
    'claude-3-sonnet': 200000,
    'claude-4-opus': 200000,
    'claude-4-sonnet': 200000,
    'gpt-4o': 128000,
    'gpt-4-turbo': 128000,
    // For testing purposes, add a model with very small context
    'test-small-context': 5000,
    default: 100000
  };

  /**
   * Get the context window size for a model
   * @param modelName Name of the model
   * @returns Context window size in tokens
   */
  private static getContextWindowSize(modelName: string): number {
    // Handle model names with provider prefix
    const baseName = modelName.includes(':') 
      ? modelName.split(':')[1] 
      : modelName;
    
    logger.debug(`getContextWindowSize: modelName=${modelName}, baseName=${baseName}`);
    
    // Use explicit existence check for default value
    if (baseName && TokenAnalyzer.MODEL_CONTEXT_SIZES[baseName]) {
      const size = TokenAnalyzer.MODEL_CONTEXT_SIZES[baseName];
      logger.debug(`getContextWindowSize: found size=${size} for model=${baseName}`);
      return size;
    }
    
    // We know default exists in our static map but TypeScript doesn't, so use a fallback
    const defaultSize = TokenAnalyzer.MODEL_CONTEXT_SIZES.default || 100000;
    logger.debug(`getContextWindowSize: using default size=${defaultSize}`);
    return defaultSize;
  }

  /**
   * Analyze token usage for a set of files
   * @param files Files to analyze
   * @param options Analysis options
   * @returns Token analysis result
   */
  public static analyzeFiles(
    files: FileInfo[],
    options: TokenAnalysisOptions
  ): TokenAnalysisResult {
    logger.info('Analyzing token usage for files...');
    logger.debug(`TokenAnalyzer: modelName=${options.modelName}`);
    
    const contextWindowSize = this.getContextWindowSize(options.modelName);
    const promptOverhead = options.additionalPromptOverhead || 
      TokenAnalyzer.DEFAULT_PROMPT_OVERHEAD;
    const contextMaintenanceFactor = options.contextMaintenanceFactor || 
      TokenAnalyzer.DEFAULT_CONTEXT_MAINTENANCE_FACTOR;
    
    // Analyze each file
    const fileAnalyses: FileTokenAnalysis[] = files.map(file => {
      const content = file.content;
      const tokenCount = countTokens(content, options.modelName);
      const sizeInBytes = content.length;
      const tokensPerByte = sizeInBytes > 0 ? tokenCount / sizeInBytes : 0;
      
      return {
        path: file.path,
        relativePath: file.relativePath,
        tokenCount,
        sizeInBytes,
        tokensPerByte
      };
    });
    
    // Calculate totals
    const totalTokens = fileAnalyses.reduce((sum, file) => sum + file.tokenCount, 0);
    const totalSizeInBytes = fileAnalyses.reduce((sum, file) => sum + file.sizeInBytes, 0);
    const averageTokensPerByte = totalSizeInBytes > 0 
      ? totalTokens / totalSizeInBytes 
      : 0;
    
    // Estimate total tokens with overhead
    const estimatedTotalTokens = totalTokens + promptOverhead;
    
    // Determine if chunking is needed
    const exceedsContextWindow = estimatedTotalTokens > contextWindowSize;
    
    // Calculate recommended chunks if needed
    const chunkingRecommendation = this.generateChunkingRecommendation(
      fileAnalyses,
      estimatedTotalTokens,
      contextWindowSize,
      contextMaintenanceFactor
    );
    
    return {
      files: fileAnalyses,
      totalTokens,
      totalSizeInBytes,
      averageTokensPerByte,
      fileCount: files.length,
      promptOverheadTokens: promptOverhead,
      estimatedTotalTokens,
      contextWindowSize,
      exceedsContextWindow,
      estimatedPassesNeeded: chunkingRecommendation.recommendedChunks.length,
      chunkingRecommendation
    };
  }
  
  /**
   * Generate a chunking recommendation for files that exceed context window
   * @param fileAnalyses Array of file token analyses
   * @param estimatedTotalTokens Total tokens including overhead
   * @param contextWindowSize Maximum context window size
   * @param contextMaintenanceFactor Context maintenance overhead factor
   * @returns Chunking recommendation
   */
  private static generateChunkingRecommendation(
    fileAnalyses: FileTokenAnalysis[],
    estimatedTotalTokens: number,
    contextWindowSize: number,
    contextMaintenanceFactor: number
  ): ChunkingRecommendation {
    // If content fits within context window, no chunking needed
    if (estimatedTotalTokens <= contextWindowSize) {
      return {
        chunkingRecommended: false,
        recommendedChunks: [
          {
            files: fileAnalyses.map(f => f.path),
            estimatedTokenCount: estimatedTotalTokens,
            priority: 1
          }
        ],
        reason: 'Content fits within model context window'
      };
    }
    
    // Sort files by token count (largest first)
    const sortedFiles = [...fileAnalyses].sort((a, b) => b.tokenCount - a.tokenCount);
    
    // Calculate effective context window size accounting for context maintenance
    const effectiveContextSize = Math.floor(
      contextWindowSize * (1 - contextMaintenanceFactor)
    );
    
    // Create chunks of files that fit within the effective context size
    const chunks: FileChunk[] = [];
    let currentChunk: FileChunk = {
      files: [],
      estimatedTokenCount: 0,
      priority: 1
    };
    
    for (const file of sortedFiles) {
      // If this file would exceed the chunk size, start a new chunk
      if (currentChunk.estimatedTokenCount + file.tokenCount > effectiveContextSize && 
          currentChunk.files.length > 0) {
        chunks.push(currentChunk);
        currentChunk = {
          files: [],
          estimatedTokenCount: 0,
          priority: chunks.length + 1
        };
      }
      
      // Add the file to the current chunk
      currentChunk.files.push(file.path);
      currentChunk.estimatedTokenCount += file.tokenCount;
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.files.length > 0) {
      chunks.push(currentChunk);
    }
    
    return {
      chunkingRecommended: true,
      recommendedChunks: chunks,
      reason: `Content exceeds model context window (${estimatedTotalTokens} > ${contextWindowSize})`
    };
  }
  
  /**
   * Analyze a single file for token usage
   * @param file File to analyze
   * @param options Analysis options
   * @returns Token analysis for the file
   */
  public static analyzeFile(
    file: FileInfo,
    options: TokenAnalysisOptions
  ): FileTokenAnalysis {
    const content = file.content;
    const tokenCount = countTokens(content, options.modelName);
    const sizeInBytes = content.length;
    
    return {
      path: file.path,
      relativePath: file.relativePath,
      tokenCount,
      sizeInBytes,
      tokensPerByte: sizeInBytes > 0 ? tokenCount / sizeInBytes : 0
    };
  }
}