/**
 * @fileoverview TreeSitter-based semantic analyzer for intelligent code chunking
 *
 * This module provides the core semantic analysis engine that uses TreeSitter
 * to parse code into AST representations and extract meaningful structural
 * information for AI-guided chunking decisions.
 */

import Parser from 'tree-sitter';
import PHP from 'tree-sitter-php';
import Python from 'tree-sitter-python';
import Ruby from 'tree-sitter-ruby';
import TypeScript from 'tree-sitter-typescript';
import logger from '../../utils/logger';
import { AiGuidedChunking } from './AiGuidedChunking';
import type {
  SemanticAnalysis,
  SemanticAnalysisConfig,
  SemanticAnalysisError,
  SemanticAnalysisResult,
} from './types';
import { generateChunkingRecommendation } from './utils/ChunkingRecommender';
import { calculateComplexity } from './utils/ComplexityAnalyzer';
import { extractDeclarations } from './utils/DeclarationExtractor';
import { extractImports } from './utils/ImportAnalyzer';
// Import utility modules
import { detectLanguage, isLanguageSupported, LANGUAGE_PARSERS } from './utils/LanguageDetector';

/**
 * Default configuration for semantic analysis
 */
const DEFAULT_CONFIG: SemanticAnalysisConfig = {
  enabledLanguages: ['typescript', 'javascript', 'python', 'ruby'],
  complexityThreshold: 10,
  maxChunkSize: 500,
  includeDependencyAnalysis: true,
  includeHalsteadMetrics: false,
  customChunkingRules: [],
};

/**
 * TreeSitter semantic analyzer engine
 */
export class SemanticAnalyzer {
  private parsers: Map<string, Parser> = new Map();
  private config: SemanticAnalysisConfig;
  private aiGuidedChunking: AiGuidedChunking;

  constructor(config: Partial<SemanticAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiGuidedChunking = new AiGuidedChunking();
    this.initializeParsers();
  }

  /**
   * Initialize TreeSitter parsers for supported languages
   */
  private initializeParsers(): void {
    for (const language of this.config.enabledLanguages) {
      if (language in LANGUAGE_PARSERS) {
        try {
          const languageGrammar = this.getLanguageGrammar(language);
          if (!languageGrammar) {
            logger.warn(`No grammar available for ${language}, skipping`);
            continue;
          }

          const parser = new Parser();
          parser.setLanguage(languageGrammar);
          this.parsers.set(language, parser);
          logger.debug(`Initialized TreeSitter parser for ${language}`);
        } catch (error) {
          logger.error(`Failed to initialize parser for ${language}:`, error);
          // Continue with other languages even if one fails
        }
      }
    }
  }

  /**
   * Get language grammar based on language name
   */
  private getLanguageGrammar(language: string): any {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return TypeScript.typescript;
      case 'tsx':
      case 'jsx':
        return TypeScript.tsx;
      case 'python':
        return Python;
      case 'ruby':
        return Ruby;
      case 'php':
        return PHP;
      default:
        return null;
    }
  }

  /**
   * Perform semantic analysis on code content
   */
  public async analyzeCode(
    content: string,
    filePath: string,
    language?: string,
  ): Promise<SemanticAnalysisResult> {
    const errors: SemanticAnalysisError[] = [];

    try {
      // Detect language if not provided
      const detectedLanguage = language || detectLanguage(filePath);

      if (!this.isLanguageSupported(detectedLanguage)) {
        errors.push({
          type: 'language_not_supported',
          message: `Language '${detectedLanguage}' is not supported for semantic analysis`,
        });
        return { errors, success: false, fallbackUsed: true };
      }

      // Check file size limits (500KB limit to prevent TreeSitter issues)
      if (content.length > 500000) {
        errors.push({
          type: 'file_too_large',
          message: 'File is too large for semantic analysis',
        });
        return { errors, success: false, fallbackUsed: true };
      }

      const parser = this.parsers.get(detectedLanguage);
      if (!parser) {
        errors.push({
          type: 'analysis_failed',
          message: `No parser available for language: ${detectedLanguage}`,
        });
        return { errors, success: false, fallbackUsed: true };
      }

      // Parse the code
      let tree: any;
      try {
        tree = parser.parse(content);
      } catch (parseError) {
        // Handle TreeSitter-specific errors
        if (parseError instanceof Error && parseError.message.includes('Invalid argument')) {
          errors.push({
            type: 'file_too_large',
            message: 'File content is too complex or large for TreeSitter parsing',
          });
          return { errors, success: false, fallbackUsed: true };
        }
        throw parseError; // Re-throw other parsing errors
      }

      if (tree.rootNode.hasError) {
        errors.push({
          type: 'parse_error',
          message: 'TreeSitter encountered parsing errors',
        });
        // Continue with partial analysis
      }

      // Perform semantic analysis
      const analysis = await this.performAnalysis(
        tree.rootNode,
        content,
        filePath,
        detectedLanguage,
      );

      return {
        analysis,
        errors,
        success: true,
        fallbackUsed: false,
      };
    } catch (error) {
      const analysisError: SemanticAnalysisError = {
        type: 'analysis_failed',
        message: error instanceof Error ? error.message : 'Unknown analysis error',
        stack: error instanceof Error ? error.stack : undefined,
      };

      logger.error('Semantic analysis failed:', error);
      return {
        errors: [analysisError],
        success: false,
        fallbackUsed: true,
      };
    }
  }

  /**
   * Perform the core semantic analysis
   */
  private async performAnalysis(
    rootNode: Parser.SyntaxNode,
    content: string,
    filePath: string,
    language: string,
  ): Promise<SemanticAnalysis> {
    const lines = content.split('\n');

    // Extract top-level declarations
    const declarations = extractDeclarations(rootNode, lines, language);

    // Build import graph
    const importGraph = extractImports(rootNode, lines, language);

    // Calculate complexity metrics
    const complexity = calculateComplexity(
      rootNode,
      content,
      declarations,
      this.config.includeHalsteadMetrics,
    );

    // Generate chunking recommendation
    const suggestedChunkingStrategy = await generateChunkingRecommendation(
      this.aiGuidedChunking,
      declarations,
      importGraph,
      complexity,
      lines.length,
      filePath,
      language,
      'quick-fixes', // Default review type - could be passed as parameter
    );

    return {
      language,
      totalLines: lines.length,
      topLevelDeclarations: declarations,
      importGraph,
      complexity,
      suggestedChunkingStrategy,
      filePath,
      analyzedAt: new Date(),
    };
  }

  /**
   * Check if language is supported
   */
  private isLanguageSupported(language: string): boolean {
    return isLanguageSupported(language, this.config.enabledLanguages, this.parsers);
  }

  /**
   * Get list of supported languages
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SemanticAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
    // Reinitialize parsers if languages changed
    if (config.enabledLanguages) {
      this.parsers.clear();
      this.initializeParsers();
    }
  }
}

/**
 * Default semantic analyzer instance
 */
export const semanticAnalyzer = new SemanticAnalyzer();

/**
 * Convenience function for analyzing code
 */
export async function analyzeCodeSemantics(
  content: string,
  filePath: string,
  language?: string,
): Promise<SemanticAnalysisResult> {
  return semanticAnalyzer.analyzeCode(content, filePath, language);
}
