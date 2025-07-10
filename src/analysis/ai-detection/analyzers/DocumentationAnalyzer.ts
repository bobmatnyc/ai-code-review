/**
 * @fileoverview Documentation analyzer for detecting AI-generated content patterns.
 *
 * This analyzer examines README files, code comments, and documentation structure
 * to identify characteristics commonly associated with AI-generated documentation.
 */

import type {
  CodeFile,
  CodeSubmission,
  DetectedPattern,
  DocumentationResult,
  PatternDetectionResult,
} from '../types/DetectionTypes';
import { BaseAnalyzer } from './BaseAnalyzer';

/**
 * Analyzer for documentation patterns that may indicate AI generation
 */
export class DocumentationAnalyzer extends BaseAnalyzer {
  /**
   * Get analyzer name
   */
  getAnalyzerName(): string {
    return 'documentation';
  }

  /**
   * Analyze documentation for AI-generated patterns
   * @param submission Code submission to analyze
   * @returns Documentation analysis result
   */
  async analyze(submission: CodeSubmission): Promise<DocumentationResult> {
    this.startTimer();
    const patterns: DetectedPattern[] = [];

    try {
      const { documentation } = submission;

      // Pattern H2.1: Template README Structure
      if (documentation.readme) {
        const readmeResult = this.analyzeREADMEStructure(documentation.readme);
        if (readmeResult.detected) {
          patterns.push(
            this.createDetectedPattern(
              'H2.1',
              'Template README Structure',
              'high',
              readmeResult.score,
              'README follows AI-generated template structure with standard sections',
              readmeResult.evidence || {},
            ),
          );
        }
      }

      // Pattern H2.2: Excessive Comment Density
      const commentResult = this.analyzeCommentDensity(documentation.codeFiles);
      if (commentResult.detected) {
        patterns.push(
          this.createDetectedPattern(
            'H2.2',
            'Excessive Comment Density',
            'high',
            commentResult.score,
            'Unusually high and uniform comment density across files',
            commentResult.evidence || {},
          ),
        );
      }

      // Pattern H2.3: AI-Style Documentation
      if (documentation.readme) {
        const aiStyleResult = this.detectAIStyleDocumentation(documentation.readme);
        if (aiStyleResult.detected) {
          patterns.push(
            this.createDetectedPattern(
              'H2.3',
              'AI-Style Documentation',
              'high',
              aiStyleResult.score,
              'Documentation exhibits characteristics typical of AI-generated content',
              aiStyleResult.evidence || {},
            ),
          );
        }
      }

      // Pattern M2.4: Uniform Comment Patterns
      const uniformCommentResult = this.analyzeUniformCommentPatterns(documentation.codeFiles);
      if (uniformCommentResult.detected) {
        patterns.push(
          this.createDetectedPattern(
            'M2.4',
            'Uniform Comment Patterns',
            'medium',
            uniformCommentResult.score,
            'Comments follow suspiciously uniform patterns across files',
            uniformCommentResult.evidence || {},
          ),
        );
      }

      const avgCommentDensity = this.calculateAverageCommentDensity(documentation.codeFiles);

      return {
        analyzer: 'documentation',
        patterns,
        metadata: {
          filesAnalyzed: documentation.codeFiles.length,
          hasReadme: !!documentation.readme,
          avgCommentDensity,
        },
      };
    } catch (error) {
      console.error('Error in DocumentationAnalyzer:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Analyze README structure for template patterns
   * @param readme README content
   * @returns Pattern detection result
   */
  private analyzeREADMEStructure(readme: string): PatternDetectionResult {
    const standardSections = [
      'installation',
      'usage',
      'api',
      'contributing',
      'license',
      'features',
      'requirements',
      'examples',
      'documentation',
      'getting started',
      'quick start',
      'configuration',
      'support',
    ];

    const sections = this.extractSections(readme);
    const sectionLower = sections.map((s) => s.toLowerCase());

    const matchedStandard = sectionLower.filter((section) =>
      standardSections.some((std) => section.includes(std) || std.includes(section)),
    );

    const completeness = matchedStandard.length / standardSections.length;

    // High completeness (>60%) suggests template usage
    if (completeness > 0.6 && sections.length >= 5) {
      const badges = this.countBadges(readme);
      const genericPhrases = this.countGenericPhrases(readme);
      const templateIndicators = this.countTemplateIndicators(readme);

      const score = Math.min(
        0.95,
        0.5 +
          completeness * 0.25 +
          Math.min(badges, 5) * 0.03 +
          Math.min(genericPhrases, 10) * 0.02 +
          templateIndicators * 0.05,
      );

      return this.createPatternResult(true, score, {
        completeness,
        matchedSections: matchedStandard,
        totalSections: sections.length,
        badgeCount: badges,
        genericPhraseCount: genericPhrases,
        templateIndicatorCount: templateIndicators,
        sectionOrder: this.analyzeSectionOrder(sections),
        standardSections,
      });
    }

    return this.createPatternResult(false, completeness * 0.3);
  }

  /**
   * Analyze comment density across code files
   * @param codeFiles Array of code files
   * @returns Pattern detection result
   */
  private analyzeCommentDensity(codeFiles: CodeFile[]): PatternDetectionResult {
    if (codeFiles.length === 0) {
      return this.createPatternResult(false, 0);
    }

    const densities = codeFiles.map((file) => this.calculateCommentDensity(file.content));
    const averageDensity = densities.reduce((a, b) => a + b, 0) / densities.length;
    const uniformity = this.calculateUniformity(densities);

    // High density (>40%) with high uniformity (>0.8) suggests AI generation
    if (averageDensity > 0.4 && uniformity > 0.8 && codeFiles.length >= 3) {
      const score = Math.min(0.95, 0.5 + averageDensity * 0.3 + uniformity * 0.2);

      return this.createPatternResult(true, score, {
        averageDensity,
        uniformity,
        fileCount: codeFiles.length,
        densityDistribution: densities,
        threshold: { density: 0.4, uniformity: 0.8 },
        filesWithHighDensity: densities.filter((d) => d > 0.5).length,
      });
    }

    return this.createPatternResult(false, Math.max(averageDensity - 0.2, 0) * 0.5);
  }

  /**
   * Detect AI-style documentation patterns
   * @param readme README content
   * @returns Pattern detection result
   */
  private detectAIStyleDocumentation(readme: string): PatternDetectionResult {
    const aiIndicators = {
      overlyFormal: this.countOverlyFormalLanguage(readme),
      perfectGrammar: this.checkPerfectGrammar(readme),
      templatePhrases: this.countTemplatePhrases(readme),
      comprehensiveStructure: this.checkComprehensiveStructure(readme),
      technicalPrecision: this.checkTechnicalPrecision(readme),
      lackOfPersonality: this.checkLackOfPersonality(readme),
    };

    const totalIndicators = Object.keys(aiIndicators).length;
    const positiveIndicators = Object.values(aiIndicators).filter(Boolean).length;
    const ratio = positiveIndicators / totalIndicators;

    // If most indicators are present, suggest AI generation
    if (ratio > 0.6) {
      const score = Math.min(0.9, 0.5 + ratio * 0.4);

      return this.createPatternResult(true, score, {
        indicators: aiIndicators,
        positiveIndicators,
        totalIndicators,
        ratio,
        readmeLength: readme.length,
        wordCount: readme.split(/\s+/).length,
      });
    }

    return this.createPatternResult(false, ratio * 0.4);
  }

  /**
   * Analyze uniform comment patterns across files
   * @param codeFiles Array of code files
   * @returns Pattern detection result
   */
  private analyzeUniformCommentPatterns(codeFiles: CodeFile[]): PatternDetectionResult {
    if (codeFiles.length < 3) {
      return this.createPatternResult(false, 0);
    }

    const commentPatterns = codeFiles.map((file) => this.extractCommentPatterns(file.content));
    const uniformityScore = this.calculateCommentPatternUniformity(commentPatterns);

    // High uniformity suggests AI-generated comments
    if (uniformityScore > 0.8) {
      const score = Math.min(0.85, 0.4 + uniformityScore * 0.4);

      return this.createPatternResult(true, score, {
        uniformityScore,
        fileCount: codeFiles.length,
        commonPatterns: this.findCommonCommentPatterns(commentPatterns),
        threshold: 0.8,
      });
    }

    return this.createPatternResult(false, uniformityScore * 0.3);
  }

  /**
   * Calculate comment density for a single file
   * @param content File content
   * @returns Comment density ratio (0.0 to 1.0)
   */
  private calculateCommentDensity(content: string): number {
    const lines = content.split('\n');
    const codeLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('#') && // Python/shell comments
        !trimmed.match(/^\s*\/\*/) && // Multi-line comment start
        !trimmed.match(/\*\/\s*$/)
      ); // Multi-line comment end
    });

    const commentLines = lines.length - codeLines.length;
    return lines.length > 0 ? commentLines / lines.length : 0;
  }

  /**
   * Calculate average comment density across files
   * @param codeFiles Array of code files
   * @returns Average comment density
   */
  private calculateAverageCommentDensity(codeFiles: CodeFile[]): number {
    if (codeFiles.length === 0) return 0;

    const densities = codeFiles.map((file) => this.calculateCommentDensity(file.content));
    return densities.reduce((sum, density) => sum + density, 0) / densities.length;
  }

  /**
   * Count template indicators in README
   * @param readme README content
   * @returns Number of template indicators
   */
  private countTemplateIndicators(readme: string): number {
    const templatePatterns = [
      /\[!\[.*?\]\(.*?\)\]\(.*?\)/g, // Nested badge syntax
      /## Table of Contents/gi,
      /\*\*Note:\*\*/gi,
      /Replace `.*?` with/gi,
      /\$\{.*?\}/g, // Template variables
      /\[\[.*?\]\]/g, // Wiki-style links
    ];

    let count = 0;
    for (const pattern of templatePatterns) {
      const matches = readme.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Analyze section ordering for template patterns
   * @param sections Array of section names
   * @returns Section order analysis
   */
  private analyzeSectionOrder(sections: string[]): any {
    const standardOrder = [
      'title',
      'description',
      'installation',
      'usage',
      'api',
      'examples',
      'contributing',
      'license',
    ];

    let orderScore = 0;
    let lastIndex = -1;

    sections.forEach((section) => {
      const sectionLower = section.toLowerCase();
      const standardIndex = standardOrder.findIndex(
        (std) => sectionLower.includes(std) || std.includes(sectionLower),
      );

      if (standardIndex > lastIndex) {
        orderScore++;
        lastIndex = standardIndex;
      }
    });

    return {
      orderScore,
      maxPossibleScore: Math.min(sections.length, standardOrder.length),
      followsStandardOrder: orderScore / Math.min(sections.length, standardOrder.length) > 0.8,
    };
  }

  /**
   * Count overly formal language patterns
   * @param content Text content
   * @returns Count of formal language indicators
   */
  private countOverlyFormalLanguage(content: string): number {
    const formalPatterns = [
      /furthermore/gi,
      /moreover/gi,
      /in addition/gi,
      /consequently/gi,
      /subsequently/gi,
      /comprehensive/gi,
      /sophisticated/gi,
      /facilitate/gi,
      /utilize/gi,
      /implement.*functionality/gi,
    ];

    let count = 0;
    for (const pattern of formalPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Check for perfect grammar indicators
   * @param content Text content
   * @returns True if grammar seems too perfect
   */
  private checkPerfectGrammar(content: string): boolean {
    // Simple heuristics for "too perfect" grammar
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length < 5) return false;

    const indicators = {
      noContractions: !content.match(/\b(don't|won't|can't|it's|you're|we're)\b/i),
      consistentCapitalization: this.hasConsistentCapitalization(content),
      noTypos: !content.match(/\b(teh|recieve|seperate|definately)\b/i),
      perfectPunctuation: this.hasPerfectPunctuation(content),
    };

    const positiveCount = Object.values(indicators).filter(Boolean).length;
    return positiveCount >= 3;
  }

  /**
   * Count template phrases
   * @param content Text content
   * @returns Number of template phrases
   */
  private countTemplatePhrases(content: string): number {
    const templatePhrases = [
      /this project provides/gi,
      /easy to use/gi,
      /getting started is simple/gi,
      /follow these steps/gi,
      /comprehensive solution/gi,
      /powerful and flexible/gi,
      /designed to be/gi,
      /built with.*in mind/gi,
    ];

    let count = 0;
    for (const pattern of templatePhrases) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Check for comprehensive structure
   * @param content Text content
   * @returns True if structure is suspiciously comprehensive
   */
  private checkComprehensiveStructure(content: string): boolean {
    const sections = this.extractSections(content);
    return sections.length > 8 && content.length > 2000;
  }

  /**
   * Check for technical precision
   * @param content Text content
   * @returns True if technically precise in AI-like way
   */
  private checkTechnicalPrecision(content: string): boolean {
    const technicalIndicators = [
      /version \d+\.\d+\.\d+/gi,
      /node\.js \d+\.\d+/gi,
      /typescript \d+\.\d+/gi,
      /npm install/gi,
      /yarn add/gi,
      /pnpm install/gi,
    ];

    let count = 0;
    for (const pattern of technicalIndicators) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count > 5;
  }

  /**
   * Check for lack of personality
   * @param content Text content
   * @returns True if lacks personal touches
   */
  private checkLackOfPersonality(content: string): boolean {
    const personalityIndicators = [
      /\bi\b/gi, // First person
      /my/gi,
      /personally/gi,
      /in my opinion/gi,
      /i think/gi,
      /i believe/gi,
      /hope/gi,
      /feel free/gi,
    ];

    let count = 0;
    for (const pattern of personalityIndicators) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count < 3 && content.length > 1000;
  }

  /**
   * Extract comment patterns from code
   * @param content Code content
   * @returns Comment pattern analysis
   */
  private extractCommentPatterns(content: string): any {
    const lines = content.split('\n');
    const commentLines = lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    });

    return {
      density: commentLines.length / lines.length,
      avgLength:
        commentLines.reduce((sum, line) => sum + line.length, 0) / (commentLines.length || 1),
      patterns: commentLines.map((line) => line.trim().substring(0, 20)), // First 20 chars
    };
  }

  /**
   * Calculate uniformity of comment patterns across files
   * @param patterns Array of comment patterns
   * @returns Uniformity score
   */
  private calculateCommentPatternUniformity(patterns: any[]): number {
    if (patterns.length < 2) return 0;

    const densities = patterns.map((p) => p.density);
    const avgLengths = patterns.map((p) => p.avgLength);

    const densityUniformity = this.calculateUniformity(densities);
    const lengthUniformity = this.calculateUniformity(avgLengths);

    return (densityUniformity + lengthUniformity) / 2;
  }

  /**
   * Find common comment patterns
   * @param patterns Array of comment patterns
   * @returns Common patterns found
   */
  private findCommonCommentPatterns(patterns: any[]): string[] {
    const allPatterns = patterns.flatMap((p) => p.patterns);
    const patternCounts = new Map<string, number>();

    allPatterns.forEach((pattern) => {
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
    });

    return Array.from(patternCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([pattern]) => pattern)
      .slice(0, 10); // Top 10 common patterns
  }

  /**
   * Check for consistent capitalization
   * @param content Text content
   * @returns True if capitalization is very consistent
   */
  private hasConsistentCapitalization(content: string): boolean {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 5);
    if (sentences.length < 3) return false;

    const capitalizedSentences = sentences.filter((s) => {
      const trimmed = s.trim();
      return trimmed.length > 0 && trimmed[0] === trimmed[0].toUpperCase();
    });

    return capitalizedSentences.length / sentences.length > 0.95;
  }

  /**
   * Check for perfect punctuation
   * @param content Text content
   * @returns True if punctuation is suspiciously perfect
   */
  private hasPerfectPunctuation(content: string): boolean {
    // Check for consistent spacing after punctuation
    const punctuationSpacing = content.match(/[.!?]\s{2,}/g);
    const inconsistentSpacing = content.match(/[.!?][^\s]/g);

    return !inconsistentSpacing && (punctuationSpacing?.length || 0) > 0;
  }

  /**
   * Create empty result for error cases
   * @returns Empty documentation analysis result
   */
  private createEmptyResult(): DocumentationResult {
    return {
      analyzer: 'documentation',
      patterns: [],
      metadata: {
        filesAnalyzed: 0,
        hasReadme: false,
        avgCommentDensity: 0,
      },
    };
  }
}
