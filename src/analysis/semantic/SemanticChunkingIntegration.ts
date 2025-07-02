/**
 * @fileoverview Semantic chunking integration with robust fallback
 *
 * This module provides a seamless integration layer that attempts semantic
 * chunking first, then gracefully falls back to the existing TokenAnalyzer
 * approach when semantic analysis fails or is not available.
 */

import type { FileInfo } from '../../types/review';
import logger from '../../utils/logger';
import { ChunkGenerator, type ChunkGeneratorConfig } from './ChunkGenerator';
import { SemanticAnalyzer } from './SemanticAnalyzer';
import type { CodeChunk, ReviewFocus, SemanticAnalysis, SemanticAnalysisConfig } from './types';

/**
 * Simple line-based chunking result for fallback
 */
interface LineBasedChunkingResult {
  totalFiles: number;
  estimatedTotalTokens: number;
  chunks: Array<{
    estimatedTokenCount: number;
    priority: string;
    startLine: number;
    endLine: number;
  }>;
}

/**
 * Configuration for the integrated chunking system
 */
export interface ChunkingIntegrationConfig {
  /** Whether to enable semantic chunking */
  enableSemanticChunking: boolean;
  /** Whether to enable fallback to TokenAnalyzer */
  enableFallback: boolean;
  /** Languages to force semantic analysis for */
  forceSemantic: string[];
  /** Languages to force traditional analysis for */
  forceTraditional: string[];
  /** Whether to prefer semantic for supported languages */
  preferSemantic: boolean;
  /** Performance threshold - max file size for semantic analysis (bytes) */
  maxFileSizeForSemantic: number;
  /** Whether to cache analysis results */
  enableCaching: boolean;
  /** Maximum tokens per consolidated batch */
  maxTokensPerBatch: number;
  /** Minimum threads per batch before consolidation */
  minThreadsPerBatch: number;
  /** Maximum threads per batch */
  maxThreadsPerBatch: number;
  /** Semantic analysis system configuration */
  semanticConfig?: {
    analyzer?: Partial<SemanticAnalysisConfig>;
    chunkGenerator?: Partial<ChunkGeneratorConfig>;
  };
}

/**
 * System statistics interface
 */
interface SystemStats {
  config: ChunkingIntegrationConfig;
  supportedLanguages: string[];
  cacheSize: number;
  semanticSystemStats: {
    size: number;
    enabled: boolean;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ChunkingIntegrationConfig = {
  enableSemanticChunking: true,
  enableFallback: true,
  forceSemantic: [],
  forceTraditional: ['json', 'yaml', 'xml', 'csv'],
  preferSemantic: true,
  maxFileSizeForSemantic: 1024 * 1024, // 1MB
  enableCaching: true,
  maxTokensPerBatch: 4000, // Target batch size for efficient AI processing
  minThreadsPerBatch: 3, // Minimum threads to consider for consolidation
  maxThreadsPerBatch: 30, // Maximum threads in a single batch - increased to allow larger consolidations
  semanticConfig: {
    analyzer: {
      enabledLanguages: ['typescript', 'javascript', 'python', 'ruby'],
      complexityThreshold: 10,
      maxChunkSize: 500,
      includeDependencyAnalysis: true,
      includeHalsteadMetrics: false,
    },
  },
};

/**
 * Result of integrated chunking analysis
 */
export interface IntegratedChunkingResult {
  /** Generated chunks */
  chunks: CodeChunk[];
  /** Analysis method used */
  method: 'semantic' | 'traditional' | 'hybrid';
  /** Whether fallback was used */
  fallbackUsed: boolean;
  /** Semantic analysis result (if available) */
  semanticAnalysis?: SemanticAnalysis;
  /** Line-based chunking result (if used) */
  lineBasedResult?: LineBasedChunkingResult;
  /** Errors encountered */
  errors: string[];
  /** Performance metrics */
  metrics: {
    analysisTimeMs: number;
    chunkingTimeMs: number;
    totalTokens: number;
    chunksGenerated: number;
  };
  /** Reasoning for the chunking approach used */
  reasoning: string;
}

/**
 * Integrated semantic chunking system with robust fallback
 */
export class SemanticChunkingIntegration {
  private config: ChunkingIntegrationConfig;
  private semanticAnalyzer: SemanticAnalyzer;
  private chunkGenerator: ChunkGenerator;
  private cache: Map<string, IntegratedChunkingResult> = new Map();

  constructor(config: Partial<ChunkingIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.semanticAnalyzer = new SemanticAnalyzer(this.config.semanticConfig?.analyzer);
    this.chunkGenerator = new ChunkGenerator(this.config.semanticConfig?.chunkGenerator);
  }

  /**
   * Check if a file can be analyzed semantically
   */
  private canAnalyzeFile(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const supportedExtensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'rb'];
    return supportedExtensions.includes(extension || '');
  }

  /**
   * Detect language from file path
   */
  private detectLanguageFromPath(filePath: string): string | null {
    const extension = filePath.split('.').pop()?.toLowerCase();

    const extensionMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      rb: 'ruby',
    };

    return extensionMap[extension || ''] || null;
  }

  /**
   * Check if a language is supported for semantic analysis
   */
  private isLanguageSupported(language: string): boolean {
    return this.semanticAnalyzer.getSupportedLanguages().includes(language);
  }

  /**
   * Consolidate semantic threads into efficient batches
   */
  private consolidateSemanticThreads(chunks: CodeChunk[]): CodeChunk[] {
    if (chunks.length < this.config.minThreadsPerBatch) {
      return chunks;
    }

    logger.debug(`Consolidating ${chunks.length} semantic threads into batches`);

    // Calculate total tokens to determine if we can fit everything in one batch
    const totalTokens = chunks.reduce((sum, chunk) => sum + (chunk.estimatedTokens || 0), 0);

    // If all chunks can fit within a single batch's token limit and thread count,
    // create one consolidated batch instead of grouping by affinity
    if (
      totalTokens <= this.config.maxTokensPerBatch &&
      chunks.length <= this.config.maxThreadsPerBatch
    ) {
      logger.info(
        `All ${chunks.length} threads fit within limits (${totalTokens} tokens) - creating single batch`,
      );
      const singleBatch = this.mergeBatchChunks(chunks, 'consolidated', 1);
      return [singleBatch];
    }

    // Otherwise, group chunks by type and complexity for better consolidation
    const groupedChunks = this.groupChunksByAffinity(chunks);
    const consolidatedBatches: CodeChunk[] = [];

    // First, try to combine smaller groups to minimize batch count
    const groupEntries = Object.entries(groupedChunks).filter(([_, chunks]) => chunks.length > 0);
    const sortedGroups = groupEntries.sort((a, b) => a[1].length - b[1].length);

    // Attempt to merge small groups together
    const mergedGroups: Array<[string, CodeChunk[]]> = [];
    let currentMergedGroup: CodeChunk[] = [];
    let currentMergedTokens = 0;
    let currentMergedName = '';

    for (const [groupType, groupChunks] of sortedGroups) {
      const groupTokens = groupChunks.reduce((sum, chunk) => sum + (chunk.estimatedTokens || 0), 0);

      if (currentMergedGroup.length === 0) {
        currentMergedGroup = groupChunks;
        currentMergedTokens = groupTokens;
        currentMergedName = groupType;
      } else if (
        currentMergedTokens + groupTokens <= this.config.maxTokensPerBatch &&
        currentMergedGroup.length + groupChunks.length <= this.config.maxThreadsPerBatch
      ) {
        // Merge this group with the current merged group
        currentMergedGroup.push(...groupChunks);
        currentMergedTokens += groupTokens;
        currentMergedName = `${currentMergedName}_${groupType}`;
      } else {
        // Can't merge, save current and start new
        mergedGroups.push([currentMergedName, currentMergedGroup]);
        currentMergedGroup = groupChunks;
        currentMergedTokens = groupTokens;
        currentMergedName = groupType;
      }
    }

    // Don't forget the last group
    if (currentMergedGroup.length > 0) {
      mergedGroups.push([currentMergedName, currentMergedGroup]);
    }

    // Now create batches from the merged groups
    for (const [groupType, groupChunks] of mergedGroups) {
      const batches = this.createBatchesFromGroup(groupChunks, groupType);
      consolidatedBatches.push(...batches);
    }

    logger.info(
      `Consolidated ${chunks.length} threads into ${consolidatedBatches.length} efficient batches`,
    );
    return consolidatedBatches;
  }

  /**
   * Group chunks by semantic affinity (related code structures)
   */
  private groupChunksByAffinity(chunks: CodeChunk[]): Record<string, CodeChunk[]> {
    const groups: Record<string, CodeChunk[]> = {
      classes: [],
      functions: [],
      interfaces: [],
      utilities: [],
      tests: [],
      other: [],
    };

    chunks.forEach((chunk) => {
      // Use chunk content if available, otherwise classify by declarations
      const chunkText = chunk.content || '';
      const declarations = chunk.declarations || [];

      // Classify chunks based on content patterns or declaration types
      const hasInterface =
        chunkText.includes('interface ') || declarations.some((d) => d.type === 'interface');
      const hasClass = chunkText.includes('class ') || declarations.some((d) => d.type === 'class');
      const hasFunction =
        chunkText.includes('function ') || declarations.some((d) => d.type === 'function');
      const hasTest =
        chunkText.includes('test') || chunkText.includes('spec') || chunkText.includes('describe');
      const hasUtil =
        chunkText.includes('util') ||
        chunkText.includes('helper') ||
        chunkText.includes('constant');

      if (hasInterface) {
        groups.interfaces.push(chunk);
      } else if (hasClass) {
        groups.classes.push(chunk);
      } else if (hasFunction) {
        if (hasTest) {
          groups.tests.push(chunk);
        } else if (hasUtil) {
          groups.utilities.push(chunk);
        } else {
          groups.functions.push(chunk);
        }
      } else {
        groups.other.push(chunk);
      }
    });

    return groups;
  }

  /**
   * Create batches from a group of related chunks
   */
  private createBatchesFromGroup(chunks: CodeChunk[], groupType: string): CodeChunk[] {
    if (chunks.length === 0) return [];

    const batches: CodeChunk[] = [];
    let currentBatch: CodeChunk[] = [];
    let currentTokens = 0;

    // Sort chunks by size for optimal packing
    const sortedChunks = chunks.sort((a, b) => (a.estimatedTokens || 0) - (b.estimatedTokens || 0));

    for (const chunk of sortedChunks) {
      const chunkTokens = chunk.estimatedTokens || 0;

      // Check if adding this chunk would exceed limits
      const wouldExceedTokens = currentTokens + chunkTokens > this.config.maxTokensPerBatch;
      const wouldExceedCount = currentBatch.length >= this.config.maxThreadsPerBatch;

      if ((wouldExceedTokens || wouldExceedCount) && currentBatch.length > 0) {
        // Create batch from current chunks
        batches.push(this.mergeBatchChunks(currentBatch, groupType, batches.length + 1));
        currentBatch = [chunk];
        currentTokens = chunkTokens;
      } else {
        currentBatch.push(chunk);
        currentTokens += chunkTokens;
      }
    }

    // Add remaining chunks as final batch
    if (currentBatch.length > 0) {
      batches.push(this.mergeBatchChunks(currentBatch, groupType, batches.length + 1));
    }

    return batches;
  }

  /**
   * Merge multiple chunks into a single consolidated batch
   */
  private mergeBatchChunks(chunks: CodeChunk[], groupType: string, batchNumber: number): CodeChunk {
    const totalTokens = chunks.reduce((sum, chunk) => sum + (chunk.estimatedTokens || 0), 0);
    const mergedContent = chunks.map((chunk) => chunk.content || '').join('\n\n');

    // Extract all declarations from chunks
    const allDeclarations = chunks.flatMap((chunk) => chunk.declarations || []);

    return {
      id: `semantic_batch_${groupType}_${batchNumber}`,
      type: 'module',
      lines: [
        Math.min(...chunks.map((c) => c.lines?.[0] || 1)),
        Math.max(...chunks.map((c) => c.lines?.[1] || 1)),
      ] as [number, number],
      declarations: allDeclarations,
      context: chunks.flatMap((c) => c.context || []),
      priority: chunks[0]?.priority || 'medium',
      reviewFocus: chunks[0]?.reviewFocus || ['maintainability'],
      estimatedTokens: totalTokens,
      dependencies: [...new Set(chunks.flatMap((c) => c.dependencies || []))],
      content: mergedContent,
      metadata: {
        semanticInfo: {
          declarations: allDeclarations,
          complexity: allDeclarations.reduce((sum, d) => sum + (d.cyclomaticComplexity || 1), 0),
          threadCount: chunks.length,
          groupType,
        },
        consolidation: {
          originalThreads: chunks.length,
          threadIds: chunks.map((c) => c.id),
          consolidationReason: `Merged ${chunks.length} ${groupType} threads for efficient processing`,
        },
      },
    };
  }

  /**
   * Analyze files and generate optimal chunks with fallback
   */
  public async analyzeAndChunk(
    files: FileInfo[],
    options: {
      reviewType?: string;
      modelName?: string;
      forceSemantic?: boolean;
      forceTraditional?: boolean;
      useCache?: boolean;
    } = {},
  ): Promise<IntegratedChunkingResult> {
    const startTime = Date.now();
    const {
      reviewType = 'quick-fixes',
      modelName = 'gemini:gemini-1.5-pro',
      forceSemantic = false,
      forceTraditional = false,
      useCache = this.config.enableCaching,
    } = options;

    const errors: string[] = [];
    let method: 'semantic' | 'traditional' | 'hybrid' = 'semantic';
    let fallbackUsed = false;
    let semanticAnalysis: SemanticAnalysis | undefined;
    let lineBasedResult: LineBasedChunkingResult | undefined;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(files, reviewType, modelName);
      if (useCache && this.cache.has(cacheKey)) {
        logger.debug('Using cached chunking result');
        return this.cache.get(cacheKey)!;
      }

      // Determine chunking strategy
      const strategy = this.determineChunkingStrategy(files, {
        forceSemantic,
        forceTraditional,
        reviewType,
      });

      logger.info(`Using ${strategy} chunking strategy for ${files.length} files`);

      let chunks: CodeChunk[] = [];
      let reasoning = '';

      if (strategy === 'semantic' && this.config.enableSemanticChunking) {
        // Attempt semantic chunking
        const semanticResult = await this.attemptSemanticChunking(files, reviewType);

        if (semanticResult.success) {
          chunks = semanticResult.chunks;
          semanticAnalysis = semanticResult.analysis;
          method = 'semantic';
          reasoning = semanticResult.reasoning;
        } else {
          errors.push(...semanticResult.errors);

          if (this.config.enableFallback) {
            logger.info('Semantic chunking failed, falling back to traditional approach');
            const fallbackResult = await this.performTraditionalChunking(files, { reviewType });
            chunks = fallbackResult.chunks;
            lineBasedResult = fallbackResult.chunkingResult;
            method = 'traditional';
            fallbackUsed = true;
            reasoning = `Fallback to traditional chunking: ${semanticResult.errors.join(', ')}`;
          } else {
            throw new Error(`Semantic chunking failed: ${semanticResult.errors.join(', ')}`);
          }
        }
      } else {
        // Use traditional chunking
        const traditionalResult = await this.performTraditionalChunking(files, { reviewType });
        chunks = traditionalResult.chunks;
        lineBasedResult = traditionalResult.chunkingResult;
        method = 'traditional';
        reasoning =
          strategy === 'traditional'
            ? 'Traditional chunking selected by strategy'
            : 'Semantic chunking disabled';
      }

      const endTime = Date.now();
      const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.estimatedTokens, 0);

      const result: IntegratedChunkingResult = {
        chunks,
        method,
        fallbackUsed,
        semanticAnalysis,
        lineBasedResult,
        errors,
        metrics: {
          analysisTimeMs: endTime - startTime,
          chunkingTimeMs: endTime - startTime, // Simplified for now
          totalTokens,
          chunksGenerated: chunks.length,
        },
        reasoning,
      };

      // Cache result
      if (useCache) {
        this.cache.set(cacheKey, result);
      }

      logger.info(
        `Chunking complete: ${chunks.length} chunks, ${totalTokens} tokens, method: ${method}`,
      );
      return result;
    } catch (error) {
      logger.error('Integrated chunking failed:', error);

      // Last resort fallback
      if (this.config.enableFallback && !forceTraditional) {
        logger.warn('Attempting emergency fallback to traditional chunking');
        try {
          const fallbackResult = await this.performTraditionalChunking(files, {
            reviewType,
            modelName,
          });
          return {
            chunks: fallbackResult.chunks,
            method: 'traditional',
            fallbackUsed: true,
            lineBasedResult: fallbackResult.chunkingResult,
            errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
            metrics: {
              analysisTimeMs: Date.now() - startTime,
              chunkingTimeMs: 0,
              totalTokens: fallbackResult.chunks.reduce(
                (sum, chunk) => sum + chunk.estimatedTokens,
                0,
              ),
              chunksGenerated: fallbackResult.chunks.length,
            },
            reasoning: 'Emergency fallback due to complete analysis failure',
          };
        } catch (fallbackError) {
          logger.error('Emergency fallback also failed:', fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Determine the best chunking strategy for the given files
   */
  private determineChunkingStrategy(
    files: FileInfo[],
    options: {
      forceSemantic?: boolean;
      forceTraditional?: boolean;
      reviewType?: string;
    },
  ): 'semantic' | 'traditional' {
    const { forceSemantic, forceTraditional } = options;

    // Forced strategies
    if (forceSemantic) return 'semantic';
    if (forceTraditional) return 'traditional';

    // Check if semantic chunking is enabled
    if (!this.config.enableSemanticChunking) return 'traditional';

    // Check file characteristics
    const hasSemanticSupportedFiles = files.some((file) => {
      const language = this.detectLanguageFromPath(file.path);
      return language && this.isLanguageSupported(language);
    });

    if (!hasSemanticSupportedFiles) {
      logger.debug('No semantic-supported files found, using traditional chunking');
      return 'traditional';
    }

    // Check file sizes
    const hasOversizedFiles = files.some(
      (file) => file.content.length > this.config.maxFileSizeForSemantic,
    );

    if (hasOversizedFiles) {
      logger.debug('Large files detected, using traditional chunking for performance');
      return 'traditional';
    }

    // Check language preferences
    const languages = files.map((file) => this.detectLanguageFromPath(file.path)).filter(Boolean);

    if (languages.some((lang) => this.config.forceTraditional.includes(lang!))) {
      return 'traditional';
    }

    if (languages.some((lang) => this.config.forceSemantic.includes(lang!))) {
      return 'semantic';
    }

    // Default preference
    return this.config.preferSemantic ? 'semantic' : 'traditional';
  }

  /**
   * Attempt semantic chunking for files
   */
  private async attemptSemanticChunking(
    files: FileInfo[],
    reviewType: string,
  ): Promise<{
    success: boolean;
    chunks: CodeChunk[];
    analysis?: SemanticAnalysis;
    errors: string[];
    reasoning: string;
  }> {
    const errors: string[] = [];
    const allChunks: CodeChunk[] = [];
    let primaryAnalysis: SemanticAnalysis | undefined;

    try {
      for (const file of files) {
        // Check if file can be analyzed semantically
        if (!this.canAnalyzeFile(file.path)) {
          logger.debug(`Skipping semantic analysis for ${file.path} - unsupported file type`);
          continue;
        }

        const language = this.detectLanguageFromPath(file.path);
        if (!language || !this.isLanguageSupported(language)) {
          logger.debug(
            `Skipping semantic analysis for ${file.path} - unsupported language: ${language}`,
          );
          continue;
        }

        // Perform semantic analysis
        const analysisResult = await this.semanticAnalyzer.analyzeCode(
          file.content,
          file.path,
          language,
        );

        if (!analysisResult.success || !analysisResult.analysis) {
          logger.debug(`Semantic analysis failed for ${file.path}:`, analysisResult.errors);
          continue;
        }

        // Generate chunks
        const chunkingResult = this.chunkGenerator.generateChunks(
          analysisResult.analysis,
          file.content,
          reviewType,
        );

        if (analysisResult.success && chunkingResult.chunks) {
          // Consolidate semantic threads if we have many small chunks
          const consolidatedChunks = this.consolidateSemanticThreads(chunkingResult.chunks);
          chunkingResult.chunks = consolidatedChunks;
          // Add file-specific prefix to chunk IDs to avoid conflicts
          const filePrefix = this.sanitizeFileName(file.path);
          const fileChunks = chunkingResult.chunks.map((chunk: CodeChunk) => ({
            ...chunk,
            id: `${filePrefix}_${chunk.id}`,
          }));

          allChunks.push(...fileChunks);

          if (!primaryAnalysis) {
            primaryAnalysis = analysisResult.analysis!;
          }
        } else {
          errors.push(
            `Semantic analysis failed for ${file.path}: ${analysisResult.errors.map((e) => (typeof e === 'object' && e.message ? e.message : e.toString())).join(', ')}`,
          );
        }
      }

      if (allChunks.length === 0) {
        return {
          success: false,
          chunks: [],
          errors: errors.length > 0 ? errors : ['No semantic chunks could be generated'],
          reasoning: 'Semantic analysis produced no usable chunks',
        };
      }

      return {
        success: true,
        chunks: allChunks,
        analysis: primaryAnalysis,
        errors,
        reasoning: `Generated ${allChunks.length} semantic chunks across ${files.length} files`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown semantic analysis error';
      logger.error('Semantic chunking attempt failed:', error);

      return {
        success: false,
        chunks: [],
        errors: [...errors, errorMessage],
        reasoning: 'Semantic analysis threw an exception',
      };
    }
  }

  /**
   * Perform traditional TokenAnalyzer-based chunking
   */
  private async performTraditionalChunking(
    files: FileInfo[],
    options: {
      reviewType?: string;
      modelName?: string;
    },
  ): Promise<{
    chunks: CodeChunk[];
    chunkingResult: LineBasedChunkingResult;
  }> {
    const { reviewType = 'quick-fixes' } = options;

    logger.debug(`Performing line-based chunking fallback for ${files.length} files`);

    // Simple line-based chunking as fallback
    const chunks: CodeChunk[] = [];
    let totalTokens = 0;
    let chunkId = 1;

    for (const file of files) {
      const lines = file.content.split('\n');
      const fileTokens = lines.length * 4; // Rough estimate: 4 tokens per line
      totalTokens += fileTokens;

      // Chunk files larger than 500 lines
      const chunkSize = 500;
      if (lines.length <= chunkSize) {
        // Single chunk for small files
        chunks.push({
          id: `fallback_${chunkId++}`,
          type: 'module',
          lines: [1, lines.length],
          declarations: [],
          context: [],
          priority: 'medium',
          reviewFocus: this.getTraditionalReviewFocus(reviewType),
          estimatedTokens: fileTokens,
          dependencies: [],
        });
      } else {
        // Multiple chunks for large files
        for (let i = 0; i < lines.length; i += chunkSize) {
          const endLine = Math.min(i + chunkSize, lines.length);
          const chunkTokens = (endLine - i) * 4;

          chunks.push({
            id: `fallback_${chunkId++}`,
            type: 'module',
            lines: [i + 1, endLine],
            declarations: [],
            context: [],
            priority: 'medium',
            reviewFocus: this.getTraditionalReviewFocus(reviewType),
            estimatedTokens: chunkTokens,
            dependencies: [],
          });
        }
      }
    }

    const chunkingResult: LineBasedChunkingResult = {
      totalFiles: files.length,
      estimatedTotalTokens: totalTokens,
      chunks: chunks.map((chunk) => ({
        estimatedTokenCount: chunk.estimatedTokens,
        priority: chunk.priority,
        startLine: chunk.lines[0],
        endLine: chunk.lines[1],
      })),
    };

    logger.debug(
      `Line-based chunking generated ${chunks.length} chunks with ${totalTokens} estimated tokens`,
    );

    return {
      chunks,
      chunkingResult,
    };
  }

  /**
   * Get review focus for traditional chunking based on review type
   */
  private getTraditionalReviewFocus(reviewType: string): ReviewFocus[] {
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
   * Sanitize file name for use in chunk IDs
   */
  private sanitizeFileName(filePath: string): string {
    return filePath
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  /**
   * Generate cache key for analysis results
   */
  private generateCacheKey(files: FileInfo[], reviewType: string, modelName: string): string {
    const fileHashes = files.map((f) => this.simpleHash(f.content + f.path)).join('_');
    return `${fileHashes}_${reviewType}_${modelName}`;
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
   * Check if semantic chunking is available for files
   */
  public canUseSemanticChunking(files: FileInfo[]): boolean {
    if (!this.config.enableSemanticChunking) return false;

    return files.some((file) => {
      const language = this.detectLanguageFromPath(file.path);
      return (
        language &&
        this.isLanguageSupported(language) &&
        file.content.length <= this.config.maxFileSizeForSemantic
      );
    });
  }

  /**
   * Get system statistics
   */
  public getStats(): SystemStats {
    return {
      config: this.config,
      supportedLanguages: this.semanticAnalyzer.getSupportedLanguages(),
      cacheSize: this.cache.size,
      semanticSystemStats: {
        size: this.cache.size,
        enabled: this.config.enableCaching,
      },
    };
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.cache.clear();
    this.cache.clear();
    logger.debug('Cleared all chunking integration caches');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ChunkingIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.semanticConfig?.analyzer) {
      this.semanticAnalyzer.updateConfig(config.semanticConfig.analyzer);
    }
    if (config.semanticConfig?.chunkGenerator) {
      this.chunkGenerator.updateConfig(config.semanticConfig.chunkGenerator);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): ChunkingIntegrationConfig {
    return { ...this.config };
  }
}

/**
 * Default integration instance
 */
export const semanticChunkingIntegration = new SemanticChunkingIntegration();

/**
 * Convenience function for integrated chunking with fallback
 */
export async function analyzeAndChunkWithFallback(
  files: FileInfo[],
  options: {
    reviewType?: string;
    modelName?: string;
    forceSemantic?: boolean;
    forceTraditional?: boolean;
    useCache?: boolean;
  } = {},
): Promise<IntegratedChunkingResult> {
  return semanticChunkingIntegration.analyzeAndChunk(files, options);
}

/**
 * Convenience function to check semantic chunking availability
 */
export function isSemanticChunkingAvailable(files: FileInfo[]): boolean {
  return semanticChunkingIntegration.canUseSemanticChunking(files);
}
