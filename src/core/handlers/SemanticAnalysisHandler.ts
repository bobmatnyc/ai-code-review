/**
 * @fileoverview Semantic analysis handler for code review
 *
 * This module handles semantic analysis of code for intelligent chunking
 * and review optimization.
 */

import type { ReviewOptions } from '../../types/review';
import logger from '../../utils/logger';
import type { FileInfo } from '../fileDiscovery';

/**
 * Configuration for semantic analysis
 */
export interface SemanticAnalysisConfig {
  enableSemanticChunking?: boolean;
  enableFallback?: boolean;
  forceSemantic?: string[];
  forceTraditional?: string[];
  preferSemantic?: boolean;
  maxFileSizeForSemantic?: number;
  enableCaching?: boolean;
}

/**
 * Result of semantic analysis
 */
export interface SemanticAnalysisResult {
  method: string;
  chunks: Array<{
    metadata?: {
      consolidation?: {
        originalThreads: number;
      };
      semanticInfo?: {
        declarations?: unknown[];
      };
    };
    estimatedTokens: number;
    files?: unknown[];
  }>;
  fallbackUsed: boolean;
  metrics?: {
    analysisTimeMs: number;
  };
}

/**
 * Perform semantic analysis on files for review
 *
 * @param fileInfos Array of file information objects
 * @param options Review options
 * @param config Semantic analysis configuration
 * @returns Promise that resolves to semantic analysis result
 */
export async function performSemanticAnalysis(
  fileInfos: FileInfo[],
  options: ReviewOptions,
  config: SemanticAnalysisConfig = {},
): Promise<SemanticAnalysisResult | null> {
  try {
    const { SemanticChunkingIntegration } = await import('../../analysis/semantic');

    const semanticIntegration = new SemanticChunkingIntegration({
      enableSemanticChunking: options.enableSemanticChunking ?? true,
      enableFallback: config.enableFallback ?? true,
      forceSemantic: config.forceSemantic ?? [],
      forceTraditional: config.forceTraditional ?? [],
      preferSemantic: config.preferSemantic ?? true,
      maxFileSizeForSemantic: config.maxFileSizeForSemantic ?? 1024 * 1024,
      enableCaching: config.enableCaching ?? true,
    });

    if (!semanticIntegration.canUseSemanticChunking(fileInfos)) {
      logger.info('Files not suitable for semantic analysis, using traditional chunking');
      return null;
    }

    logger.info('Using semantic code analysis with TreeSitter...');

    const semanticResult = await semanticIntegration.analyzeAndChunk(fileInfos, {
      reviewType: options.type,
    });

    if (semanticResult.fallbackUsed || semanticResult.chunks.length === 0) {
      logger.info('Semantic analysis not optimal, using traditional chunking');
      return null;
    }

    logger.info(`Semantic analysis complete:`);
    logger.info(`• Method: ${semanticResult.method}`);
    logger.info(`• Chunks discovered: ${semanticResult.chunks.length}`);

    if (semanticResult.method === 'semantic') {
      // Check if consolidation occurred
      const hasConsolidation = semanticResult.chunks.some(
        (chunk) =>
          typeof chunk.metadata?.consolidation?.originalThreads === 'number' &&
          chunk.metadata.consolidation.originalThreads > 1,
      );

      if (hasConsolidation) {
        const totalOriginalThreads = semanticResult.chunks.reduce(
          (sum, chunk) => sum + (chunk.metadata?.consolidation?.originalThreads || 1),
          0,
        );
        logger.info(
          `• Semantic threads: ${totalOriginalThreads} → ${semanticResult.chunks.length} batches`,
        );
        logger.info(
          `• Note: Threads consolidated into efficient batches for optimal AI processing`,
        );
      } else {
        logger.info(`• Semantic threads: ${semanticResult.chunks.length}`);
        logger.info(
          `• Note: Threads preserve code structure boundaries (functions, classes, etc.)`,
        );
      }
    } else {
      logger.info(
        `• Files analyzed: ${semanticResult.chunks.reduce((sum, chunk) => sum + ((chunk as any).files?.length || 0), 0)}`,
      );
    }

    if (semanticResult.metrics) {
      logger.info(`• Analysis time: ${semanticResult.metrics.analysisTimeMs}ms`);
    }

    return semanticResult as SemanticAnalysisResult;
  } catch (error) {
    logger.warn(
      `Semantic chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    logger.info('Falling back to traditional token-based analysis');
    return null;
  }
}

/**
 * Log detailed information about semantic chunks
 *
 * @param semanticResult Semantic analysis result
 */
export function logSemanticChunkDetails(semanticResult: SemanticAnalysisResult): void {
  if (semanticResult.method === 'semantic') {
    // Show batch/thread details
    semanticResult.chunks.forEach((chunk, index) => {
      const consolidation = chunk.metadata?.consolidation;
      const structureInfo = chunk.metadata?.semanticInfo
        ? ` (${chunk.metadata.semanticInfo.declarations?.length || 0} declarations)`
        : '';

      if (consolidation) {
        logger.info(
          `• Batch ${index + 1}: ${consolidation.originalThreads} threads, ~${chunk.estimatedTokens} tokens${structureInfo}`,
        );
      } else {
        logger.info(`• Thread ${index + 1}: ~${chunk.estimatedTokens} tokens${structureInfo}`);
      }
    });
  } else {
    // Show traditional chunk details
    semanticResult.chunks.forEach((chunk, index) => {
      logger.info(
        `• Chunk ${index + 1}: ${chunk.files?.length || 0} files, ~${chunk.estimatedTokens} tokens`,
      );
    });
  }
}
