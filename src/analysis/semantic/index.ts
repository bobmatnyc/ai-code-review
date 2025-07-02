/**
 * @fileoverview Semantic analysis integration layer
 *
 * This module provides the main entry point for TreeSitter-based semantic
 * code analysis, exposing a unified API for intelligent chunking and
 * context-aware code review processing.
 */

// Export all types first
export * from './types';

// Import the types we need
import type {
  ChunkingRecommendation,
  ReviewFocus,
  SemanticAnalysisError,
  SemanticAnalysisResult,
} from './types';

export { AiGuidedChunking, aiGuidedChunking } from './AiGuidedChunking';
export { ChunkGenerator, chunkGenerator, generateSemanticChunks } from './ChunkGenerator';
// Export main classes
export { analyzeCodeSemantics, SemanticAnalyzer, semanticAnalyzer } from './SemanticAnalyzer';
export { SemanticChunkingIntegration } from './SemanticChunkingIntegration';

import logger from '../../utils/logger';
import { ChunkGenerator } from './ChunkGenerator';
import { SemanticAnalyzer } from './SemanticAnalyzer';
import type { SemanticAnalysisConfig } from './types';

/**
 * Configuration for the integrated semantic analysis system
 */
export interface SemanticAnalysisSystemConfig {
  /** Semantic analyzer configuration */
  analyzer?: Partial<SemanticAnalysisConfig>;
  /** Chunk generator configuration */
  chunkGenerator?: {
    maxChunkSize?: number;
    minChunkSize?: number;
    includeContext?: boolean;
    maxContextDeclarations?: number;
    tokensPerLine?: number;
    highComplexityThreshold?: number;
    mediumComplexityThreshold?: number;
  };
  /** Whether to enable fallback to line-based chunking */
  enableFallback?: boolean;
  /** Whether to cache analysis results */
  enableCaching?: boolean;
}

/**
 * Extended result that includes chunking information
 */
export interface SemanticAnalysisSystemResult extends SemanticAnalysisResult {
  chunking?: ChunkingRecommendation;
  metadata?: {
    filePath: string;
    language: string;
    reviewType: string;
    analyzedAt: Date;
    fallbackReason?: string;
  };
}

/**
 * Integrated semantic analysis system
 */
export class SemanticAnalysisSystem {
  private analyzer: SemanticAnalyzer;
  private chunkGenerator: ChunkGenerator;
  private config: SemanticAnalysisSystemConfig;
  private cache: Map<string, SemanticAnalysisSystemResult> = new Map();

  constructor(config: SemanticAnalysisSystemConfig = {}) {
    this.config = {
      enableFallback: true,
      enableCaching: true,
      ...config,
    };

    this.analyzer = new SemanticAnalyzer(config.analyzer);
    this.chunkGenerator = new ChunkGenerator(config.chunkGenerator);
  }

  /**
   * Perform complete semantic analysis and generate intelligent chunks
   */
  public async analyzeAndChunk(
    content: string,
    filePath: string,
    options: {
      language?: string;
      reviewType?: string;
      useCache?: boolean;
    } = {},
  ): Promise<SemanticAnalysisSystemResult> {
    const { language, reviewType = 'quick-fixes', useCache = this.config.enableCaching } = options;

    // Check cache if enabled
    const cacheKey = this.generateCacheKey(content, filePath, language, reviewType);
    if (useCache && this.cache.has(cacheKey)) {
      logger.debug(`Using cached analysis for ${filePath}`);
      return this.cache.get(cacheKey)!;
    }

    try {
      logger.debug(`Starting semantic analysis for ${filePath}`);

      // Perform semantic analysis
      const analysisResult = await this.analyzer.analyzeCode(content, filePath, language);

      if (!analysisResult.success) {
        logger.warn(`Semantic analysis failed for ${filePath}, errors:`, analysisResult.errors);

        if (this.config.enableFallback && analysisResult.fallbackUsed) {
          return this.generateFallbackResult(content, filePath, reviewType, analysisResult.errors);
        }

        throw new Error(
          `Semantic analysis failed: ${analysisResult.errors.map((e) => e.message).join(', ')}`,
        );
      }

      // Generate intelligent chunks
      const chunkingRecommendation = this.chunkGenerator.generateChunks(
        analysisResult.analysis!,
        content,
        reviewType,
      );

      const result = {
        analysis: analysisResult.analysis,
        chunking: chunkingRecommendation,
        errors: analysisResult.errors,
        success: true,
        fallbackUsed: false,
        metadata: {
          filePath,
          language: analysisResult.analysis!.language,
          reviewType,
          analyzedAt: new Date(),
          totalChunks: chunkingRecommendation.chunks.length,
          totalTokens: chunkingRecommendation.estimatedTokens,
        },
      };

      // Cache result if enabled
      if (useCache) {
        this.cache.set(cacheKey, result);
      }

      logger.info(
        `Semantic analysis completed for ${filePath}: ${chunkingRecommendation.chunks.length} chunks, ${chunkingRecommendation.estimatedTokens} tokens`,
      );

      return result;
    } catch (error) {
      logger.error(`Semantic analysis system error for ${filePath}:`, error);

      if (this.config.enableFallback) {
        logger.info(`Falling back to line-based chunking for ${filePath}`);
        return this.generateFallbackResult(content, filePath, reviewType, [
          {
            type: 'analysis_failed' as const,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ]);
      }

      throw error;
    }
  }

  /**
   * Generate fallback result when semantic analysis fails
   */
  private generateFallbackResult(
    content: string,
    filePath: string,
    reviewType: string,
    errors: SemanticAnalysisError[],
  ): SemanticAnalysisSystemResult {
    const lines = content.split('\n');
    const chunkSize = Math.min(500, Math.max(50, lines.length / 4));
    const chunks = [];
    let chunkId = 1;

    for (let i = 0; i < lines.length; i += chunkSize) {
      const endLine = Math.min(i + chunkSize, lines.length);

      chunks.push({
        id: `fallback_${chunkId++}`,
        type: 'module' as const,
        lines: [i + 1, endLine] as [number, number],
        declarations: [],
        context: [],
        priority: 'medium' as const,
        reviewFocus: this.getDefaultReviewFocus(reviewType),
        estimatedTokens: (endLine - i) * 4,
        dependencies: [],
      });
    }

    return {
      analysis: undefined,
      chunking: {
        strategy: 'individual' as const,
        chunks,
        crossReferences: [],
        reasoning: 'Used fallback line-based chunking due to semantic analysis failure',
        estimatedTokens: lines.length * 4,
        estimatedChunks: chunks.length,
      },
      errors,
      success: false,
      fallbackUsed: true,
      metadata: {
        filePath,
        language: 'unknown',
        reviewType,
        analyzedAt: new Date(),
        fallbackReason: 'Semantic analysis failed',
      },
    };
  }

  /**
   * Get default review focus for a review type
   */
  private getDefaultReviewFocus(reviewType: string): ReviewFocus[] {
    const focusMap: Record<string, ReviewFocus[]> = {
      'quick-fixes': ['maintainability', 'performance'],
      architectural: ['architecture', 'type_safety', 'maintainability'],
      security: ['security', 'error_handling'],
      performance: ['performance', 'architecture'],
      'unused-code': ['maintainability', 'architecture'],
    };

    return focusMap[reviewType] || ['maintainability'];
  }

  /**
   * Generate cache key for analysis results
   */
  private generateCacheKey(
    content: string,
    filePath: string,
    language?: string,
    reviewType?: string,
  ): string {
    // Create a hash-like key based on content and parameters
    const contentHash = this.simpleHash(content);
    return `${filePath}:${contentHash}:${language || 'auto'}:${reviewType || 'quick-fixes'}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear analysis cache
   */
  public clearCache(): void {
    this.cache.clear();
    logger.debug('Semantic analysis cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.config.enableCaching ?? true,
    };
  }

  /**
   * Update system configuration
   */
  public updateConfig(config: Partial<SemanticAnalysisSystemConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.analyzer) {
      this.analyzer.updateConfig(config.analyzer);
    }

    if (config.chunkGenerator) {
      this.chunkGenerator.updateConfig(config.chunkGenerator);
    }
  }

  /**
   * Get supported languages
   */
  public getSupportedLanguages(): string[] {
    return this.analyzer.getSupportedLanguages();
  }

  /**
   * Check if a language is supported
   */
  public isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language);
  }
}

/**
 * Default semantic analysis system instance
 */
export const semanticAnalysisSystem = new SemanticAnalysisSystem();

/**
 * Convenience function for complete semantic analysis and chunking
 */
export async function analyzeAndChunkCode(
  content: string,
  filePath: string,
  options: {
    language?: string;
    reviewType?: string;
    useCache?: boolean;
  } = {},
) {
  return semanticAnalysisSystem.analyzeAndChunk(content, filePath, options);
}

/**
 * Convenience function to check if semantic analysis is available for a file
 */
export function canAnalyzeFile(filePath: string): boolean {
  const extension = filePath.split('.').pop()?.toLowerCase();
  const supportedExtensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'rb', 'php'];
  return supportedExtensions.includes(extension || '');
}

/**
 * Convenience function to detect language from file path
 */
export function detectLanguageFromPath(filePath: string): string | null {
  const extension = filePath.split('.').pop()?.toLowerCase();

  const extensionMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    php: 'php',
  };

  return extensionMap[extension || ''] || null;
}
