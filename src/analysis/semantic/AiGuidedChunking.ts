/**
 * @fileoverview AI-guided chunking service for intelligent code analysis
 *
 * This module provides AI-powered recommendations for optimal code chunking
 * strategies based on semantic analysis results. It integrates with various
 * AI providers to generate intelligent chunking plans that improve code
 * review effectiveness while respecting token limits and semantic coherence.
 */

import logger from '../../utils/logger';
import type {
  ChunkingRecommendation,
  ChunkingStrategy,
  Declaration,
  SemanticAnalysis,
} from './types';

/**
 * Configuration for AI-guided chunking
 */
export interface AiGuidedChunkingConfig {
  /** Whether AI-guided chunking is enabled */
  enabled: boolean;
  /** AI model to use for chunking recommendations */
  model?: string;
  /** Maximum time to wait for AI response (ms) */
  timeout: number;
  /** Whether to use cached results */
  useCache: boolean;
  /** Fallback to rule-based chunking on AI failure */
  fallbackEnabled: boolean;
  /** Review types that should use AI guidance */
  enabledReviewTypes: string[];
}

/**
 * Default configuration for AI-guided chunking
 */
const DEFAULT_CONFIG: AiGuidedChunkingConfig = {
  enabled: false, // Disabled for now - using enhanced rule-based approach
  timeout: 30000, // 30 seconds
  useCache: true,
  fallbackEnabled: true,
  enabledReviewTypes: ['architectural', 'security', 'performance'],
};

/**
 * Service for generating AI-guided code chunking recommendations
 */
export class AiGuidedChunking {
  private config: AiGuidedChunkingConfig;

  constructor(config: Partial<AiGuidedChunkingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate AI-guided chunking recommendation
   */
  public async generateChunkingRecommendation(
    analysis: SemanticAnalysis,
    reviewType: string,
  ): Promise<ChunkingRecommendation> {
    logger.debug(`Generating enhanced rule-based chunking for review type: ${reviewType}`);
    return this.generateEnhancedRuleBasedChunking(analysis, reviewType);
  }

  /**
   * Generate enhanced rule-based chunking recommendation
   */
  private generateEnhancedRuleBasedChunking(
    analysis: SemanticAnalysis,
    reviewType: string,
  ): ChunkingRecommendation {
    logger.debug('Generating enhanced rule-based chunking recommendation');

    // Enhanced strategy selection based on multiple factors
    let strategy: ChunkingStrategy = 'individual';
    let reasoning = '';

    // Factor 1: Review type preferences
    const reviewTypeStrategies: Record<string, ChunkingStrategy> = {
      architectural: 'hierarchical',
      security: 'contextual',
      performance: 'functional',
      'quick-fixes': 'individual',
      'unused-code': 'grouped',
    };

    // Factor 2: Code structure analysis
    const hasClasses = analysis.complexity.classCount > 0;
    const hasComplexFunctions = analysis.topLevelDeclarations.some(
      (d) => (d.cyclomaticComplexity || 0) > 10,
    );
    const hasManyDeclarations = analysis.topLevelDeclarations.length > 10;
    const hasHighComplexity = analysis.complexity.cyclomaticComplexity > 20;
    const hasInterconnectedImports = analysis.importGraph.length > 5;

    // Enhanced decision logic
    if (reviewType === 'architectural' && hasClasses) {
      strategy = 'hierarchical';
      reasoning =
        'Architectural review with class structures detected - using hierarchical chunking to preserve class-method relationships';
    } else if (reviewType === 'security' && hasInterconnectedImports) {
      strategy = 'contextual';
      reasoning =
        'Security review with complex imports detected - using contextual chunking to analyze data flow and dependencies';
    } else if (reviewType === 'performance' && hasComplexFunctions) {
      strategy = 'functional';
      reasoning =
        'Performance review with complex functions detected - using functional chunking to analyze execution paths';
    } else if (hasManyDeclarations && !hasHighComplexity) {
      strategy = 'grouped';
      reasoning = 'Many simple declarations detected - using grouped chunking for efficiency';
    } else if (hasClasses) {
      strategy = 'hierarchical';
      reasoning =
        'Object-oriented code detected - using hierarchical chunking to maintain class boundaries';
    } else if (hasHighComplexity) {
      strategy = 'individual';
      reasoning = 'High complexity detected - using individual chunking for focused analysis';
    } else {
      strategy = reviewTypeStrategies[reviewType] || 'individual';
      reasoning = `Using ${strategy} strategy based on review type: ${reviewType}`;
    }

    // Calculate estimated chunks with better logic
    let estimatedChunks = 1;
    switch (strategy) {
      case 'hierarchical':
        estimatedChunks = Math.max(
          1,
          analysis.complexity.classCount + Math.ceil(analysis.complexity.functionCount / 2),
        );
        break;
      case 'grouped':
        estimatedChunks = Math.max(1, Math.ceil(analysis.topLevelDeclarations.length / 5));
        break;
      case 'functional':
        estimatedChunks = Math.max(1, Math.ceil(analysis.complexity.functionCount / 2));
        break;
      case 'contextual':
        estimatedChunks = Math.max(1, Math.ceil(analysis.importGraph.length / 3));
        break;
      default: // individual
        estimatedChunks = Math.min(
          analysis.topLevelDeclarations.length,
          Math.ceil(analysis.totalLines / 100),
        );
    }

    return {
      strategy,
      chunks: [], // Will be generated by ChunkGenerator
      crossReferences: [],
      reasoning: `Enhanced rule-based: ${reasoning}`,
      estimatedTokens: analysis.totalLines * 4,
      estimatedChunks,
    };
  }

  /**
   * Map AI type string to ReviewUnit
   */
  private mapTypeToReviewUnit(type: string): string {
    const typeMap: Record<string, string> = {
      function: 'function',
      class: 'class',
      interface: 'interface',
      module: 'module',
      type: 'type_definitions',
      import: 'imports',
      export: 'exports',
    };
    return typeMap[type] || 'module';
  }

  /**
   * Determine review focus based on declarations
   */
  private determineReviewFocus(declarations: Declaration[], _analysis: SemanticAnalysis): string[] {
    const focuses = [];

    if (declarations.some((d) => d.type === 'class')) {
      focuses.push('architecture');
    }
    if (declarations.some((d) => (d.cyclomaticComplexity || 0) > 10)) {
      focuses.push('maintainability');
    }
    if (declarations.some((d) => d.name.includes('Auth') || d.name.includes('Security'))) {
      focuses.push('security');
    }

    return focuses.length > 0 ? focuses : ['maintainability'];
  }

  /**
   * Estimate token count for a line range
   */
  private estimateTokens(startLine: number, endLine: number): number {
    return (endLine - startLine + 1) * 4; // Rough estimate: 4 tokens per line
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AiGuidedChunkingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if enhanced rule-based chunking is available
   */
  public isAvailable(): boolean {
    return true; // Always available with enhanced rule-based approach
  }
}

/**
 * Default instance for easy import
 */
export const aiGuidedChunking = new AiGuidedChunking();
