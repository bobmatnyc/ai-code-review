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
  /** Force maximum tokens per batch (for testing consolidation) */
  batchTokenLimit?: number;
}

/**
 * Service for analyzing token usage in files
 */
export class TokenAnalyzer {
  private static DEFAULT_PROMPT_OVERHEAD = 1500;
  private static DEFAULT_CONTEXT_MAINTENANCE_FACTOR = 0.08; // Reduced to 8% for better efficiency
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
      // Gemini 2.x models - Use accurate 1,048,576 token limit
      if (/gemini-2\.[05]-(pro|flash)/i.test(baseName)) {
        const size = 1048576; // Actual Gemini 2.x context window
        logger.info(`Detected Gemini 2.x model variant: ${baseName}`);
        logger.info(`Using context window size: ${size.toLocaleString()} tokens (actual limit)`);
        return size;
      }

      // Gemini 1.5 models - Use accurate 1,048,576 token limit
      if (/gemini-1\.5-(pro|flash)/i.test(baseName)) {
        const size = 1048576; // Actual Gemini 1.5 context window
        logger.info(`Detected Gemini 1.5 model variant: ${baseName}`);
        logger.info(`Using context window size: ${size.toLocaleString()} tokens (actual limit)`);
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
      options.batchTokenLimit,
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
      logger.info(`Using Gemini ${modelVersion} model with 1,048,576 token context window`);
      if (chunkingRecommendation.chunkingRecommended) {
        logger.info(
          `Note: Even with Gemini ${modelVersion}'s large context window, chunking is recommended because the content exceeds ${((effectiveContextWindowSize / 1048576) * 100).toFixed(0)}% of the context window`,
        );
      } else {
        logger.info(
          `Note: Using Gemini ${modelVersion}'s large context window (1,048,576 tokens) for single-pass review`,
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
   * @param batchTokenLimit Force maximum tokens per batch (for testing)
   * @returns Chunking recommendation
   */
  private static generateChunkingRecommendation(
    fileAnalyses: FileTokenAnalysis[],
    estimatedTotalTokens: number,
    contextWindowSize: number,
    contextMaintenanceFactor: number,
    forceSinglePass?: boolean,
    batchTokenLimit?: number,
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

    // If batchTokenLimit is provided, use it to force smaller batches
    let effectiveContextLimit = contextWindowSize;
    if (batchTokenLimit && batchTokenLimit > 0) {
      effectiveContextLimit = Math.min(batchTokenLimit, contextWindowSize);
      logger.info(
        `Using batch token limit: ${batchTokenLimit.toLocaleString()} tokens (forcing smaller batches for testing)`,
      );
      if (batchTokenLimit < contextWindowSize) {
        logger.info(
          `This will force chunking even if content would fit in the model's context window`,
        );
      }
    }

    // If content fits within context window, no chunking needed
    if (estimatedTotalTokens <= effectiveContextLimit) {
      logger.debug(
        `Content fits within effective limit (${estimatedTotalTokens.toLocaleString()} <= ${effectiveContextLimit.toLocaleString()} tokens)`,
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
        reason: batchTokenLimit
          ? 'Content fits within batch token limit'
          : 'Content fits within model context window',
      };
    }

    logger.debug(
      `Content exceeds effective limit (${estimatedTotalTokens.toLocaleString()} > ${effectiveContextLimit.toLocaleString()} tokens)`,
    );
    logger.debug(
      `Generating chunking recommendation with context maintenance factor: ${contextMaintenanceFactor}`,
    );

    // Calculate effective context window size accounting for context maintenance
    const effectiveContextSize = Math.floor(effectiveContextLimit * (1 - contextMaintenanceFactor));

    logger.debug(
      `Effective context size for chunking: ${effectiveContextSize.toLocaleString()} tokens (${Math.round((1 - contextMaintenanceFactor) * 100)}% of ${effectiveContextLimit.toLocaleString()} tokens)`,
    );

    // Use optimized bin-packing algorithm for better chunk distribution
    const chunks = TokenAnalyzer.optimizedBinPacking(
      fileAnalyses,
      effectiveContextSize,
      effectiveContextLimit,
    );

    logger.info(`Created ${chunks.length} optimized chunks for multi-pass review`);

    let reason = `Content exceeds effective limit (${estimatedTotalTokens.toLocaleString()} > ${effectiveContextLimit.toLocaleString()} tokens)`;
    if (batchTokenLimit && batchTokenLimit < contextWindowSize) {
      reason = `Batch token limit forcing smaller batches (limit: ${batchTokenLimit.toLocaleString()} tokens)`;
    }

    return {
      chunkingRecommended: true,
      recommendedChunks: chunks,
      reason,
    };
  }

  /**
   * Optimized bin-packing algorithm to minimize the number of chunks
   * Uses an advanced first-fit decreasing with multi-level optimization
   * @param fileAnalyses Array of file token analyses
   * @param maxChunkSize Maximum size for each chunk in tokens
   * @param contextWindowSize Original context window for logging
   * @returns Array of optimized file chunks
   */
  private static optimizedBinPacking(
    fileAnalyses: FileTokenAnalysis[],
    maxChunkSize: number,
    _contextWindowSize: number,
  ): FileChunk[] {
    // Sort files by token count (largest first) for first-fit decreasing
    const sortedFiles = [...fileAnalyses].sort((a, b) => b.tokenCount - a.tokenCount);

    // Calculate target chunk size for optimal distribution
    const totalTokens = sortedFiles.reduce((sum, f) => sum + f.tokenCount, 0);
    const minChunksNeeded = Math.ceil(totalTokens / maxChunkSize);
    const targetChunkSize = Math.floor(totalTokens / minChunksNeeded);

    logger.debug(`Bin-packing optimization:`);
    logger.debug(`  - Total tokens: ${totalTokens.toLocaleString()}`);
    logger.debug(`  - Max chunk size: ${maxChunkSize.toLocaleString()}`);
    logger.debug(`  - Min chunks needed: ${minChunksNeeded}`);
    logger.debug(`  - Target chunk size: ${targetChunkSize.toLocaleString()}`);

    // Initialize chunks array
    const chunks: FileChunk[] = [];

    // Track oversized files separately
    const oversizedFiles: FileTokenAnalysis[] = [];
    const largeFiles: FileTokenAnalysis[] = [];
    const mediumFiles: FileTokenAnalysis[] = [];
    const smallFiles: FileTokenAnalysis[] = [];

    // Categorize files by size for better packing
    for (const file of sortedFiles) {
      if (file.tokenCount > maxChunkSize) {
        oversizedFiles.push(file);
        logger.warn(
          `File "${file.path}" is oversized (${file.tokenCount.toLocaleString()} > ${maxChunkSize.toLocaleString()} tokens)`,
        );
      } else if (file.tokenCount > maxChunkSize * 0.5) {
        largeFiles.push(file);
      } else if (file.tokenCount > maxChunkSize * 0.2) {
        mediumFiles.push(file);
      } else {
        smallFiles.push(file);
      }
    }

    logger.debug(`File categorization:`);
    logger.debug(`  - Oversized: ${oversizedFiles.length}`);
    logger.debug(`  - Large (>50% of max): ${largeFiles.length}`);
    logger.debug(`  - Medium (20-50% of max): ${mediumFiles.length}`);
    logger.debug(`  - Small (<20% of max): ${smallFiles.length}`);

    // Process oversized files first (split them if possible)
    for (const file of oversizedFiles) {
      // For now, put oversized files in their own chunks
      // TODO: In future, we could split file content
      chunks.push({
        files: [file.path],
        estimatedTokenCount: file.tokenCount,
        priority: chunks.length + 1,
      });
      logger.debug(
        `Created dedicated chunk ${chunks.length} for oversized file "${file.path}" (${file.tokenCount.toLocaleString()} tokens)`,
      );
    }

    // Process large files - try to pair them optimally
    for (const file of largeFiles) {
      let placed = false;

      // Try to find a chunk with complementary space
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const remainingSpace = maxChunkSize - chunk.estimatedTokenCount;

        // Check if this file fits well (within 80% efficiency)
        if (
          remainingSpace >= file.tokenCount &&
          chunk.estimatedTokenCount + file.tokenCount >= targetChunkSize * 0.8
        ) {
          chunk.files.push(file.path);
          chunk.estimatedTokenCount += file.tokenCount;
          placed = true;
          logger.debug(
            `Added large file "${file.path}" (${file.tokenCount.toLocaleString()} tokens) to chunk ${i + 1}`,
          );
          break;
        }
      }

      if (!placed) {
        // Create a new chunk for this large file
        chunks.push({
          files: [file.path],
          estimatedTokenCount: file.tokenCount,
          priority: chunks.length + 1,
        });
        logger.debug(
          `Created new chunk ${chunks.length} for large file "${file.path}" (${file.tokenCount.toLocaleString()} tokens)`,
        );
      }
    }

    // Process medium files - use first-fit with efficiency threshold
    for (const file of mediumFiles) {
      let placed = false;

      // Find first chunk where this file fits efficiently
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const remainingSpace = maxChunkSize - chunk.estimatedTokenCount;

        if (remainingSpace >= file.tokenCount) {
          chunk.files.push(file.path);
          chunk.estimatedTokenCount += file.tokenCount;
          placed = true;
          logger.debug(
            `Added medium file "${file.path}" (${file.tokenCount.toLocaleString()} tokens) to chunk ${i + 1}`,
          );
          break;
        }
      }

      if (!placed) {
        // Create a new chunk
        chunks.push({
          files: [file.path],
          estimatedTokenCount: file.tokenCount,
          priority: chunks.length + 1,
        });
        logger.debug(
          `Created new chunk ${chunks.length} for medium file "${file.path}" (${file.tokenCount.toLocaleString()} tokens)`,
        );
      }
    }

    // Process small files - pack them to fill gaps
    // Sort small files for better packing (largest first)
    smallFiles.sort((a, b) => b.tokenCount - a.tokenCount);

    for (const file of smallFiles) {
      let placed = false;

      // Find the fullest chunk that can still fit this file
      let bestChunkIndex = -1;
      let bestChunkFullness = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const remainingSpace = maxChunkSize - chunk.estimatedTokenCount;
        const chunkFullness = chunk.estimatedTokenCount / maxChunkSize;

        if (remainingSpace >= file.tokenCount && chunkFullness > bestChunkFullness) {
          bestChunkIndex = i;
          bestChunkFullness = chunkFullness;
        }
      }

      if (bestChunkIndex !== -1) {
        const chunk = chunks[bestChunkIndex];
        chunk.files.push(file.path);
        chunk.estimatedTokenCount += file.tokenCount;
        placed = true;
        logger.debug(
          `Added small file "${file.path}" (${file.tokenCount.toLocaleString()} tokens) to chunk ${bestChunkIndex + 1}`,
        );
      }

      if (!placed) {
        // Create a new chunk only if absolutely necessary
        chunks.push({
          files: [file.path],
          estimatedTokenCount: file.tokenCount,
          priority: chunks.length + 1,
        });
        logger.debug(
          `Created new chunk ${chunks.length} for small file "${file.path}" (${file.tokenCount.toLocaleString()} tokens)`,
        );
      }
    }

    // Perform aggressive balancing to minimize chunk count
    const balancedChunks = TokenAnalyzer.aggressiveBalance(chunks, fileAnalyses, maxChunkSize);

    // Log chunk statistics
    const avgTokensPerChunk = Math.round(
      balancedChunks.reduce((sum, c) => sum + c.estimatedTokenCount, 0) / balancedChunks.length,
    );
    const maxTokensInChunk = Math.max(...balancedChunks.map((c) => c.estimatedTokenCount));
    const minTokensInChunk = Math.min(...balancedChunks.map((c) => c.estimatedTokenCount));

    logger.info(`Chunk statistics:`);
    logger.info(`  - Total chunks: ${balancedChunks.length}`);
    logger.info(`  - Average tokens per chunk: ${avgTokensPerChunk.toLocaleString()}`);
    logger.info(`  - Max tokens in a chunk: ${maxTokensInChunk.toLocaleString()}`);
    logger.info(`  - Min tokens in a chunk: ${minTokensInChunk.toLocaleString()}`);
    logger.info(`  - Chunk efficiency: ${((avgTokensPerChunk / maxChunkSize) * 100).toFixed(1)}%`);

    return balancedChunks;
  }

  /**
   * Aggressive balancing to minimize chunk count and maximize efficiency
   * @param chunks Initial chunks from bin-packing
   * @param fileAnalyses Original file analyses for lookup
   * @param maxChunkSize Maximum size for each chunk
   * @returns Balanced chunks with minimized count
   */
  private static aggressiveBalance(
    chunks: FileChunk[],
    fileAnalyses: FileTokenAnalysis[],
    maxChunkSize: number,
  ): FileChunk[] {
    // Create a map for quick file lookups
    const fileMap = new Map<string, FileTokenAnalysis>();
    for (const file of fileAnalyses) {
      fileMap.set(file.path, file);
    }

    // First pass: Try to merge small chunks
    const mergedChunks: FileChunk[] = [];
    const sortedForMerging = [...chunks].sort(
      (a, b) => a.estimatedTokenCount - b.estimatedTokenCount,
    );
    const usedChunks = new Set<number>();

    for (let i = 0; i < sortedForMerging.length; i++) {
      if (usedChunks.has(i)) continue;

      const chunk1 = sortedForMerging[i];
      const mergedChunk: FileChunk = {
        files: [...chunk1.files],
        estimatedTokenCount: chunk1.estimatedTokenCount,
        priority: mergedChunks.length + 1,
      };
      usedChunks.add(i);

      // Try to merge with other small chunks
      for (let j = i + 1; j < sortedForMerging.length; j++) {
        if (usedChunks.has(j)) continue;

        const chunk2 = sortedForMerging[j];
        const combinedSize = mergedChunk.estimatedTokenCount + chunk2.estimatedTokenCount;

        // Merge if combined size is still within limits
        if (combinedSize <= maxChunkSize) {
          mergedChunk.files.push(...chunk2.files);
          mergedChunk.estimatedTokenCount = combinedSize;
          usedChunks.add(j);
          logger.debug(
            `Merged chunks: ${chunk2.files.length} files (${chunk2.estimatedTokenCount.toLocaleString()} tokens) into chunk with ${mergedChunk.files.length} files`,
          );
        }
      }

      mergedChunks.push(mergedChunk);
    }

    logger.debug(`Chunk merging reduced count from ${chunks.length} to ${mergedChunks.length}`);

    // Second pass: Balance the merged chunks
    const sortedChunks = [...mergedChunks].sort(
      (a, b) => a.estimatedTokenCount - b.estimatedTokenCount,
    );

    // Try to move files to achieve better balance
    let improved = true;
    let iterations = 0;
    const maxIterations = 20; // More iterations for aggressive optimization

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // Find the most and least full chunks
      sortedChunks.sort((a, b) => a.estimatedTokenCount - b.estimatedTokenCount);

      for (let i = 0; i < Math.floor(sortedChunks.length / 2); i++) {
        const smallChunk = sortedChunks[i];
        const largeChunk = sortedChunks[sortedChunks.length - 1 - i];

        // Calculate variance threshold based on chunk count
        const varianceThreshold = Math.max(500, maxChunkSize * 0.05); // 5% of max or 500 tokens

        // Skip if chunks are already well balanced
        if (largeChunk.estimatedTokenCount - smallChunk.estimatedTokenCount < varianceThreshold) {
          continue;
        }

        // Try to find optimal file to move
        let bestFile: string | null = null;
        let bestImprovement = 0;

        for (const filePath of largeChunk.files) {
          const file = fileMap.get(filePath);
          if (!file) continue;

          const newSmallSize = smallChunk.estimatedTokenCount + file.tokenCount;
          const newLargeSize = largeChunk.estimatedTokenCount - file.tokenCount;

          // Check if moving this file would improve balance
          if (newSmallSize <= maxChunkSize && newLargeSize > 0) {
            const currentDiff = largeChunk.estimatedTokenCount - smallChunk.estimatedTokenCount;
            const newDiff = Math.abs(newLargeSize - newSmallSize);
            const improvement = currentDiff - newDiff;

            if (improvement > bestImprovement) {
              bestFile = filePath;
              bestImprovement = improvement;
            }
          }
        }

        // Move the best file if found
        if (bestFile && bestImprovement > 100) {
          const file = fileMap.get(bestFile)!;
          largeChunk.files = largeChunk.files.filter((f) => f !== bestFile);
          smallChunk.files.push(bestFile);

          // Update token counts
          largeChunk.estimatedTokenCount -= file.tokenCount;
          smallChunk.estimatedTokenCount += file.tokenCount;

          logger.debug(
            `Balanced: Moved file "${bestFile}" (${file.tokenCount.toLocaleString()} tokens) - improvement: ${bestImprovement.toLocaleString()} tokens`,
          );

          improved = true;
        }
      }
    }

    // Final pass: Remove any empty chunks
    const finalChunks = sortedChunks.filter((chunk) => chunk.files.length > 0);

    // Re-assign priorities based on token count (largest first for processing)
    finalChunks.sort((a, b) => b.estimatedTokenCount - a.estimatedTokenCount);
    finalChunks.forEach((chunk, index) => {
      chunk.priority = index + 1;
    });

    if (iterations === maxIterations) {
      logger.debug(`Aggressive balancing stopped after ${maxIterations} iterations`);
    } else {
      logger.debug(`Aggressive balancing completed in ${iterations} iterations`);
    }

    return finalChunks;
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
