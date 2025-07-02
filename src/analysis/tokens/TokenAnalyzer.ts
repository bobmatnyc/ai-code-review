/**
 * @fileoverview Token analysis service for pre-review token counting and estimation.
 *
 * This module provides fast, provider-agnostic token counting and analysis functionality
 * to estimate token usage and costs before performing actual reviews.
 */

import { getEnhancedModelMapping, getModelMapping } from '../../clients/utils/modelMaps';
import { countTokens } from '../../tokenizers';
import type { FileInfo } from '../../types/review';
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
  /** Safety margin factor for context window (0-1) */
  safetyMarginFactor?: number;
  /** Force single pass mode regardless of token count */
  forceSinglePass?: boolean;
}

/**
 * Service for analyzing token usage in files
 */
export class TokenAnalyzer {
  private static DEFAULT_PROMPT_OVERHEAD = 1500;
  private static DEFAULT_CONTEXT_MAINTENANCE_FACTOR = 0.15;
  private static DEFAULT_SAFETY_MARGIN_FACTOR = 0.1; // Use 90% of context window by default
  private static DEFAULT_CONTEXT_WINDOW = 100000; // Default fallback

  /**
   * Get the context window size for a model
   * @param modelName Name of the model
   * @returns Context window size in tokens
   */
  private static getContextWindowSize(modelName: string): number {
    logger.debug(`getContextWindowSize: modelName=${modelName}`);

    // First try to get from enhanced model mapping
    const enhancedMapping = getEnhancedModelMapping(modelName);
    if (enhancedMapping?.contextWindow) {
      logger.info(
        `Found context window size from enhanced mapping for ${modelName}: ${enhancedMapping.contextWindow.toLocaleString()} tokens`,
      );
      return enhancedMapping.contextWindow;
    }

    // Fall back to regular model mapping
    const mapping = getModelMapping(modelName);
    if (mapping?.contextWindow) {
      logger.info(
        `Found context window size from model mapping for ${modelName}: ${mapping.contextWindow.toLocaleString()} tokens`,
      );
      return mapping.contextWindow;
    }

    // Handle model names with provider prefix
    const baseName = modelName.includes(':') ? modelName.split(':')[1] : modelName;

    // Try pattern matching for known model families
    if (baseName) {
      // Gemini 2.x models
      if (/gemini-2\.[05]-(pro|flash)/i.test(baseName)) {
        const size = 1000000; // All Gemini 2.x models have 1M context
        logger.info(`Detected Gemini 2.x model variant: ${baseName}`);
        logger.info(`Using context window size: ${size.toLocaleString()} tokens`);
        return size;
      }

      // Gemini 1.5 models
      if (/gemini-1\.5-(pro|flash)/i.test(baseName)) {
        const size = 1000000; // All Gemini 1.5 models have 1M context
        logger.info(`Detected Gemini 1.5 model variant: ${baseName}`);
        logger.info(`Using context window size: ${size.toLocaleString()} tokens`);
        return size;
      }

      // Claude models
      if (baseName.includes('claude-3') || baseName.includes('claude-4')) {
        const size = 200000; // Claude 3/4 default
        logger.info(`Detected Claude 3/4 model variant: ${baseName}`);
        logger.info(`Using context window size: ${size.toLocaleString()} tokens`);
        return size;
      }

      // GPT-4 models
      if (baseName.includes('gpt-4o')) {
        const size = 128000; // GPT-4o has 128k context
        logger.info(`Detected GPT-4o model: ${baseName}`);
        logger.info(`Using context window size: ${size.toLocaleString()} tokens`);
        return size;
      }

      if (baseName.includes('gpt-4')) {
        const size = 128000; // GPT-4 Turbo default
        logger.info(`Detected GPT-4 model variant: ${baseName}`);
        logger.info(`Using context window size: ${size.toLocaleString()} tokens`);
        return size;
      }
    }

    // Default fallback
    logger.warn(`No matching context window size found for model: ${modelName}`);
    logger.warn(
      `Using default context window size: ${TokenAnalyzer.DEFAULT_CONTEXT_WINDOW.toLocaleString()} tokens`,
    );
    return TokenAnalyzer.DEFAULT_CONTEXT_WINDOW;
  }

  /**
   * Analyze token usage for a set of files
   * @param files Files to analyze
   * @param options Analysis options
   * @returns Token analysis result
   */
  public static analyzeFiles(
    files: FileInfo[],
    options: TokenAnalysisOptions,
  ): TokenAnalysisResult {
    logger.info('Analyzing token usage for files...');
    logger.debug(`TokenAnalyzer: modelName=${options.modelName}`);

    const contextWindowSize = TokenAnalyzer.getContextWindowSize(options.modelName);
    const promptOverhead =
      options.additionalPromptOverhead || TokenAnalyzer.DEFAULT_PROMPT_OVERHEAD;
    const contextMaintenanceFactor =
      options.contextMaintenanceFactor || TokenAnalyzer.DEFAULT_CONTEXT_MAINTENANCE_FACTOR;
    const safetyMarginFactor =
      options.safetyMarginFactor || TokenAnalyzer.DEFAULT_SAFETY_MARGIN_FACTOR;

    // Calculate effective context window size with safety margin
    const effectiveContextWindowSize = Math.floor(contextWindowSize * (1 - safetyMarginFactor));
    logger.info(
      `Using effective context window size: ${effectiveContextWindowSize.toLocaleString()} tokens (${Math.round((1 - safetyMarginFactor) * 100)}% of ${contextWindowSize.toLocaleString()} tokens)`,
    );

    // Analyze each file
    const fileAnalyses: FileTokenAnalysis[] = files.map((file) => {
      const content = file.content;
      const tokenCount = countTokens(content, options.modelName);
      const sizeInBytes = content.length;
      const tokensPerByte = sizeInBytes > 0 ? tokenCount / sizeInBytes : 0;

      return {
        path: file.path,
        relativePath: file.relativePath,
        tokenCount,
        sizeInBytes,
        tokensPerByte,
      };
    });

    // Calculate totals
    const totalTokens = fileAnalyses.reduce((sum, file) => sum + file.tokenCount, 0);
    const totalSizeInBytes = fileAnalyses.reduce((sum, file) => sum + file.sizeInBytes, 0);
    const averageTokensPerByte = totalSizeInBytes > 0 ? totalTokens / totalSizeInBytes : 0;

    // Estimate total tokens with overhead
    const estimatedTotalTokens = totalTokens + promptOverhead;

    // Determine if chunking is needed
    const exceedsContextWindow = estimatedTotalTokens > effectiveContextWindowSize;

    logger.info(`Token analysis summary:`);
    logger.info(`- Total files: ${files.length}`);
    logger.info(`- Total tokens: ${totalTokens.toLocaleString()}`);
    logger.info(`- Prompt overhead: ${promptOverhead.toLocaleString()}`);
    logger.info(`- Estimated total tokens: ${estimatedTotalTokens.toLocaleString()}`);
    logger.info(`- Context window size: ${contextWindowSize.toLocaleString()}`);
    logger.info(
      `- Effective context size (with safety margin): ${effectiveContextWindowSize.toLocaleString()}`,
    );
    logger.info(
      `- Context utilization: ${((estimatedTotalTokens / effectiveContextWindowSize) * 100).toFixed(2)}%`,
    );

    // Calculate recommended chunks if needed
    const chunkingRecommendation = TokenAnalyzer.generateChunkingRecommendation(
      fileAnalyses,
      estimatedTotalTokens,
      effectiveContextWindowSize,
      contextMaintenanceFactor,
      options.forceSinglePass,
    );

    // Log chunking decision
    if (chunkingRecommendation.chunkingRecommended) {
      logger.info(`Multi-pass review recommended: ${chunkingRecommendation.reason}`);
      logger.info(`Estimated passes needed: ${chunkingRecommendation.recommendedChunks.length}`);
    } else {
      logger.info(`Single-pass review recommended: ${chunkingRecommendation.reason}`);
    }

    // Special handling for Gemini 1.5/2.x models - add extra logging
    if (options.modelName.includes('gemini-1.5') || options.modelName.includes('gemini-2.')) {
      const modelVersion = options.modelName.includes('gemini-2.') ? '2.x' : '1.5';
      logger.info(`Using Gemini ${modelVersion} model with 1M token context window`);
      if (chunkingRecommendation.chunkingRecommended) {
        logger.info(
          `Note: Even with Gemini ${modelVersion}'s large context window, chunking is recommended because the content exceeds ${((effectiveContextWindowSize / 1000000) * 100).toFixed(0)}% of the context window`,
        );
      } else {
        logger.info(
          `Note: Using Gemini ${modelVersion}'s large context window (1M tokens) for single-pass review`,
        );
      }
    }

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
      chunkingRecommendation,
    };
  }

  /**
   * Generate a chunking recommendation for files that exceed context window
   * @param fileAnalyses Array of file token analyses
   * @param estimatedTotalTokens Total tokens including overhead
   * @param contextWindowSize Maximum context window size
   * @param contextMaintenanceFactor Context maintenance overhead factor
   * @param forceSinglePass Force single pass mode regardless of token count
   * @returns Chunking recommendation
   */
  private static generateChunkingRecommendation(
    fileAnalyses: FileTokenAnalysis[],
    estimatedTotalTokens: number,
    contextWindowSize: number,
    contextMaintenanceFactor: number,
    forceSinglePass?: boolean,
  ): ChunkingRecommendation {
    // If forceSinglePass is true, skip chunking regardless of token count
    if (forceSinglePass) {
      logger.debug(`Forcing single-pass review mode as requested (forceSinglePass=true)`);
      return {
        chunkingRecommended: false,
        recommendedChunks: [
          {
            files: fileAnalyses.map((f) => f.path),
            estimatedTokenCount: estimatedTotalTokens,
            priority: 1,
          },
        ],
        reason: 'Single-pass mode forced by configuration',
      };
    }

    // If content fits within context window, no chunking needed
    if (estimatedTotalTokens <= contextWindowSize) {
      logger.debug(
        `Content fits within context window (${estimatedTotalTokens.toLocaleString()} <= ${contextWindowSize.toLocaleString()} tokens)`,
      );
      return {
        chunkingRecommended: false,
        recommendedChunks: [
          {
            files: fileAnalyses.map((f) => f.path),
            estimatedTokenCount: estimatedTotalTokens,
            priority: 1,
          },
        ],
        reason: 'Content fits within model context window',
      };
    }

    logger.debug(
      `Content exceeds context window (${estimatedTotalTokens.toLocaleString()} > ${contextWindowSize.toLocaleString()} tokens)`,
    );
    logger.debug(
      `Generating chunking recommendation with context maintenance factor: ${contextMaintenanceFactor}`,
    );

    // Sort files by token count (largest first)
    const sortedFiles = [...fileAnalyses].sort((a, b) => b.tokenCount - a.tokenCount);

    // Calculate effective context window size accounting for context maintenance
    const effectiveContextSize = Math.floor(contextWindowSize * (1 - contextMaintenanceFactor));

    logger.debug(
      `Effective context size for chunking: ${effectiveContextSize.toLocaleString()} tokens (${Math.round((1 - contextMaintenanceFactor) * 100)}% of ${contextWindowSize.toLocaleString()} tokens)`,
    );

    // Create chunks of files that fit within the effective context size
    const chunks: FileChunk[] = [];
    let currentChunk: FileChunk = {
      files: [],
      estimatedTokenCount: 0,
      priority: 1,
    };

    for (const file of sortedFiles) {
      // Check if this individual file is too large for the context window
      if (file.tokenCount > effectiveContextSize) {
        logger.warn(
          `File "${file.path}" is too large for the context window (${file.tokenCount.toLocaleString()} > ${effectiveContextSize.toLocaleString()} tokens)`,
        );
        logger.warn(`This file will be processed alone but may exceed the model's capacity`);
      }

      // If this file would exceed the chunk size, start a new chunk
      if (
        currentChunk.estimatedTokenCount + file.tokenCount > effectiveContextSize &&
        currentChunk.files.length > 0
      ) {
        logger.debug(
          `Chunk ${chunks.length + 1} complete with ${currentChunk.files.length} files and ${currentChunk.estimatedTokenCount.toLocaleString()} tokens`,
        );
        chunks.push(currentChunk);
        currentChunk = {
          files: [],
          estimatedTokenCount: 0,
          priority: chunks.length + 1,
        };
      }

      // Add the file to the current chunk
      currentChunk.files.push(file.path);
      currentChunk.estimatedTokenCount += file.tokenCount;
      logger.debug(
        `Added file "${file.path}" (${file.tokenCount.toLocaleString()} tokens) to chunk ${chunks.length + 1}`,
      );
    }

    // Add the last chunk if it's not empty
    if (currentChunk.files.length > 0) {
      logger.debug(
        `Final chunk ${chunks.length + 1} complete with ${currentChunk.files.length} files and ${currentChunk.estimatedTokenCount.toLocaleString()} tokens`,
      );
      chunks.push(currentChunk);
    }

    logger.info(`Created ${chunks.length} chunks for multi-pass review`);

    return {
      chunkingRecommended: true,
      recommendedChunks: chunks,
      reason: `Content exceeds model context window (${estimatedTotalTokens.toLocaleString()} > ${contextWindowSize.toLocaleString()} tokens)`,
    };
  }

  /**
   * Analyze a single file for token usage
   * @param file File to analyze
   * @param options Analysis options
   * @returns Token analysis for the file
   */
  public static analyzeFile(file: FileInfo, options: TokenAnalysisOptions): FileTokenAnalysis {
    const content = file.content;
    const tokenCount = countTokens(content, options.modelName);
    const sizeInBytes = content.length;

    return {
      path: file.path,
      relativePath: file.relativePath,
      tokenCount,
      sizeInBytes,
      tokensPerByte: sizeInBytes > 0 ? tokenCount / sizeInBytes : 0,
    };
  }
}
