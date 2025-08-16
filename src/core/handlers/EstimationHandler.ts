/**
 * @fileoverview Token and cost estimation handler for code review
 *
 * This module handles token usage estimation and cost analysis for code review,
 * including both semantic and traditional token-based approaches.
 */

import { SemanticChunkingIntegration } from '../../analysis/semantic';
import type { ReviewOptions } from '../../types/review';
import { estimateFromFilePaths } from '../../utils/estimationUtils';
import logger from '../../utils/logger';
import type { FileInfo } from '../fileDiscovery';
import { getProviderDisplayInfo } from '../utils/ModelInfoUtils';

/**
 * Perform token usage and cost estimation for review
 *
 * @param fileInfos Array of file information objects
 * @param filesToReview Array of file paths
 * @param options Review options
 * @param modelName Model name to use for estimation
 * @returns Promise that resolves when estimation is complete
 */
export async function performEstimation(
  fileInfos: FileInfo[],
  filesToReview: string[],
  options: ReviewOptions,
  modelName: string,
): Promise<void> {
  logger.info('Calculating token usage and cost estimates...');

  try {
    // Ensure we have at least some files to analyze
    if (fileInfos.length === 0) {
      throw new Error(
        'No files could be read for review. Please check file permissions and paths.',
      );
    }

    // Use the new TokenAnalyzer for more comprehensive analysis
    const { TokenAnalyzer } = await import('../../analysis/tokens');
    const { estimateMultiPassReviewCost } = await import('../../utils/estimationUtils');

    const tokenAnalysisOptions = {
      reviewType: options.type,
      modelName: modelName,
      contextMaintenanceFactor: options.contextMaintenanceFactor || 0.15,
      forceSinglePass: options.forceSinglePass,
      batchTokenLimit: options.batchTokenLimit,
    };

    const tokenAnalysis = TokenAnalyzer.analyzeFiles(fileInfos, tokenAnalysisOptions);

    // Try semantic chunking for intelligent code analysis
    try {
      const semanticIntegration = new SemanticChunkingIntegration({
        enableSemanticChunking: options.enableSemanticChunking ?? true,
        enableFallback: true,
        forceSemantic: [],
        forceTraditional: [],
        preferSemantic: true,
        maxFileSizeForSemantic: 1024 * 1024,
        enableCaching: true,
      });

      if (semanticIntegration.canUseSemanticChunking(fileInfos)) {
        logger.info('🧠 Using semantic code analysis with TreeSitter...');

        const semanticResult = await semanticIntegration.analyzeAndChunk(fileInfos, {
          reviewType: options.type,
        });

        if (!semanticResult.fallbackUsed && semanticResult.chunks.length > 0) {
          logger.info(`✅ Semantic analysis complete:`);
          logger.info(`   • Method: ${semanticResult.method}`);
          logger.info(`   • Chunks discovered: ${semanticResult.chunks.length}`);

          if (semanticResult.method === 'semantic') {
            // Check if consolidation occurred
            const hasConsolidation = semanticResult.chunks.some(
              (chunk) =>
                typeof chunk.metadata?.consolidation?.originalThreads === 'number' &&
                chunk.metadata.consolidation.originalThreads > 1,
            );

            if (hasConsolidation) {
              const totalOriginalThreads = semanticResult.chunks.reduce(
                (sum: number, chunk) => sum + (chunk.metadata?.consolidation?.originalThreads || 1),
                0,
              );
              logger.info(
                `   • Semantic threads: ${totalOriginalThreads} → ${semanticResult.chunks.length} batches`,
              );
              logger.info(
                `   • Note: Threads consolidated into efficient batches for optimal AI processing`,
              );
            } else {
              logger.info(`   • Semantic threads: ${semanticResult.chunks.length}`);
              logger.info(
                `   • Note: Threads preserve code structure boundaries (functions, classes, etc.)`,
              );
            }

            // Show batch/thread details
            semanticResult.chunks.forEach((chunk, index: number) => {
              const consolidation = chunk.metadata?.consolidation;
              const structureInfo = chunk.metadata?.semanticInfo
                ? ` (${chunk.metadata.semanticInfo.declarations?.length || 0} declarations)`
                : '';

              if (consolidation) {
                logger.info(
                  `   • Batch ${index + 1}: ${consolidation.originalThreads} threads, ~${chunk.estimatedTokens} tokens${structureInfo}`,
                );
              } else {
                logger.info(
                  `   • Thread ${index + 1}: ~${chunk.estimatedTokens} tokens${structureInfo}`,
                );
              }
            });
          } else {
            logger.info(
              `   • Files analyzed: ${semanticResult.chunks.reduce((sum: number, chunk) => sum + ((chunk as any).files?.length || 0), 0)}`,
            );
            // Show traditional chunk details
            semanticResult.chunks.forEach((chunk, index: number) => {
              logger.info(
                `   • Chunk ${index + 1}: ${(chunk as any).files?.length || 0} files, ~${chunk.estimatedTokens} tokens`,
              );
            });
          }

          if (semanticResult.metrics) {
            logger.info(`   • Analysis time: ${semanticResult.metrics.analysisTimeMs}ms`);
          }
        } else {
          logger.info('ℹ️  Semantic analysis not optimal, using traditional chunking');
        }
      } else {
        logger.info('ℹ️  Files not suitable for semantic analysis, using traditional chunking');
      }
    } catch (error) {
      logger.warn(
        `Semantic chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      logger.info('ℹ️  Falling back to traditional token-based analysis');
    }

    // Get cost estimate based on token analysis
    const costEstimation = await estimateMultiPassReviewCost(fileInfos, options.type, modelName, {
      passCount: tokenAnalysis.chunkingRecommendation.chunkingRecommended
        ? tokenAnalysis.estimatedPassesNeeded
        : 1,
      contextMaintenanceFactor: tokenAnalysisOptions.contextMaintenanceFactor,
    });

    // Get provider and model information
    const providerInfo = getProviderDisplayInfo(modelName);

    // Display a summary without file details
    logger.info(
      `\n=== Token Usage and Cost Estimation ===\n\nProvider: ${providerInfo.provider}\nModel: ${providerInfo.model}\nFiles: ${tokenAnalysis.fileCount} (${(tokenAnalysis.totalSizeInBytes / 1024 / 1024).toFixed(2)} MB total)\n\nToken Information:\n  Input Tokens: ${costEstimation.inputTokens.toLocaleString()}\n  Estimated Output Tokens: ${costEstimation.outputTokens.toLocaleString()}\n  Total Tokens: ${costEstimation.totalTokens.toLocaleString()}\n  Context Window Size: ${tokenAnalysis.contextWindowSize.toLocaleString()}\n  Context Utilization: ${((tokenAnalysis.estimatedTotalTokens / tokenAnalysis.contextWindowSize) * 100).toFixed(2)}%\n\n${
        tokenAnalysis.chunkingRecommendation.chunkingRecommended
          ? `Multi-Pass Analysis:\n  Chunking Required: Yes\n  Reason: ${tokenAnalysis.chunkingRecommendation.reason || 'Content exceeds context window'}\n  Estimated Passes: ${tokenAnalysis.estimatedPassesNeeded}`
          : `Multi-Pass Analysis:\n  Chunking Required: No\n  Reason: ${tokenAnalysis.chunkingRecommendation.reason || 'Content fits within context window'}`
      }\n\nEstimated Cost: ${costEstimation.formattedCost || 'Unable to estimate cost'}\n\nNote: This is an estimate based on approximate token counts and may vary\n      based on the actual content and model behavior.\n`,
    );

    // If chunking is recommended, inform the user that it will be automatic
    if (tokenAnalysis.chunkingRecommendation.chunkingRecommended) {
      logger.info(
        '\nImportant: Multi-pass review will be automatically enabled when needed. No flag required.',
      );

      // If forceSinglePass is enabled, inform the user
      if (options.forceSinglePass) {
        logger.info(
          '\nNote: --force-single-pass is enabled, which will override the chunking recommendation.',
        );
        logger.info(
          "      This may result in token limit errors if the content exceeds the model's context window.",
        );
      }
    }
  } catch (_error) {
    // Fall back to the legacy estimator if TokenAnalyzer fails
    logger.warn('Advanced token analysis failed, falling back to basic estimation');

    // Estimate token usage and cost using the legacy estimator
    const estimation = await estimateFromFilePaths(filesToReview, options.type, modelName);

    // Get provider and model information
    const providerInfo = getProviderDisplayInfo(modelName);

    // Display the estimation results without file details
    logger.info(
      `\n=== Token Usage and Cost Estimation ===\n\nReview Type: ${options.type}\nProvider: ${providerInfo.provider}\nModel: ${providerInfo.model}\nFiles: ${estimation.fileCount} (${(estimation.totalFileSize / 1024 / 1024).toFixed(2)} MB total)\n\nToken Usage:\n  Input Tokens: ${estimation.inputTokens.toLocaleString()}\n  Estimated Output Tokens: ${estimation.outputTokens.toLocaleString()}\n  Total Tokens: ${estimation.totalTokens.toLocaleString()}\n\nEstimated Cost: ${estimation.formattedCost}\n\nNote: This is an estimate based on approximate token counts and may vary\n      based on the actual content and model behavior.\n`,
    );
  }
}
