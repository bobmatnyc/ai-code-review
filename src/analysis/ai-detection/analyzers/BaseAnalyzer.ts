/**
 * @fileoverview Base analyzer class for AI detection patterns.
 *
 * This module provides the abstract base class that all specific analyzers extend,
 * ensuring consistent interface and common functionality across different analysis types.
 */

import type {
  CodeSubmission,
  DetectedPattern,
  DetectionConfig,
  PatternDetectionResult,
} from '../types/DetectionTypes';

/**
 * Abstract base class for all AI detection analyzers
 */
export abstract class BaseAnalyzer {
  protected config: DetectionConfig;
  protected startTime = 0;

  /**
   * Create a new base analyzer
   * @param config Detection configuration
   */
  constructor(config: DetectionConfig) {
    this.config = config;
  }

  /**
   * Analyze the submission for AI-generated patterns
   * @param submission Code submission to analyze
   * @returns Analysis result specific to this analyzer
   */
  abstract analyze(submission: CodeSubmission): Promise<any>;

  /**
   * Get the analyzer name
   * @returns Analyzer identifier
   */
  abstract getAnalyzerName(): string;

  /**
   * Check if this analyzer is enabled in configuration
   * @returns True if analyzer should run
   */
  isEnabled(): boolean {
    return this.config.enabledAnalyzers.includes(this.getAnalyzerName() as any);
  }

  /**
   * Start timing analysis
   */
  protected startTimer(): void {
    this.startTime = Date.now();
  }

  /**
   * Get elapsed time since timer start
   * @returns Elapsed time in milliseconds
   */
  protected getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Create a detected pattern object
   * @param id Pattern identifier
   * @param name Human-readable name
   * @param confidence Confidence level
   * @param score Numerical score
   * @param description Pattern description
   * @param evidenceData Supporting evidence
   * @returns Detected pattern object
   */
  protected createDetectedPattern(
    id: string,
    name: string,
    confidence: 'high' | 'medium' | 'low',
    score: number,
    description: string,
    evidenceData: Record<string, any>,
  ): DetectedPattern {
    return {
      id,
      name,
      confidence,
      score: Math.min(1.0, Math.max(0.0, score)), // Clamp between 0 and 1
      evidence: {
        type: this.getAnalyzerName() as any,
        data: evidenceData,
        context: `Detected by ${this.getAnalyzerName()} analyzer`,
      },
      description,
    };
  }

  /**
   * Create a pattern detection result
   * @param detected Whether pattern was detected
   * @param score Confidence score
   * @param evidence Supporting evidence
   * @returns Pattern detection result
   */
  protected createPatternResult(
    detected: boolean,
    score: number,
    evidence?: Record<string, any>,
  ): PatternDetectionResult {
    return {
      detected,
      score: Math.min(1.0, Math.max(0.0, score)),
      evidence,
    };
  }

  /**
   * Calculate uniformity of a numeric array
   * Used for detecting suspiciously uniform patterns in code
   * @param values Array of numeric values
   * @returns Uniformity score from 0.0 to 1.0 (higher = more uniform)
   */
  protected calculateUniformity(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to uniformity score (inverse of coefficient of variation)
    if (mean === 0) return 1; // All values are 0, perfectly uniform
    const coefficientOfVariation = standardDeviation / mean;

    // Return uniformity score (higher = more uniform)
    return Math.max(0, 1 - Math.min(1, coefficientOfVariation));
  }

  /**
   * Calculate variance of a numeric array
   * @param values Array of numeric values
   * @param mean Pre-calculated mean (optional)
   * @returns Variance value
   */
  protected calculateVariance(values: number[], mean?: number): number {
    if (values.length < 2) return 0;

    const avgValue = mean ?? values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + (val - avgValue) ** 2, 0) / values.length;
  }

  /**
   * Extract sections from markdown or text content
   * @param content Text content to analyze
   * @returns Array of section headers found
   */
  protected extractSections(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Markdown headers
      if (trimmed.startsWith('#')) {
        const headerText = trimmed.replace(/^#+\s*/, '').replace(/\s*#+\s*$/, '');
        if (headerText) {
          sections.push(headerText);
        }
      }

      // Underlined headers (=== or ---)
      else if (trimmed.match(/^[=-]{3,}$/)) {
        const prevLineIdx = lines.indexOf(line) - 1;
        if (prevLineIdx >= 0) {
          const prevLine = lines[prevLineIdx].trim();
          if (prevLine && !prevLine.startsWith('#')) {
            sections.push(prevLine);
          }
        }
      }
    }

    return sections;
  }

  /**
   * Count badges in markdown content
   * @param content Markdown content
   * @returns Number of badges found
   */
  protected countBadges(content: string): number {
    // Common badge patterns
    const badgePatterns = [
      /!\[.*?\]\(https:\/\/img\.shields\.io/g,
      /!\[.*?\]\(https:\/\/badge\.fury\.io/g,
      /!\[.*?\]\(https:\/\/travis-ci/g,
      /!\[.*?\]\(https:\/\/ci\.appveyor/g,
      /!\[.*?\]\(https:\/\/codecov\.io/g,
      /!\[.*?\]\(https:\/\/coveralls\.io/g,
    ];

    let badgeCount = 0;
    for (const pattern of badgePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        badgeCount += matches.length;
      }
    }

    return badgeCount;
  }

  /**
   * Count generic phrases that suggest AI generation
   * @param content Text content to analyze
   * @returns Number of generic phrases found
   */
  protected countGenericPhrases(content: string): number {
    const genericPhrases = [
      /this project provides/gi,
      /easy to use/gi,
      /getting started/gi,
      /simply install/gi,
      /contributions are welcome/gi,
      /feel free to/gi,
      /comprehensive solution/gi,
      /powerful and flexible/gi,
    ];

    let phraseCount = 0;
    for (const pattern of genericPhrases) {
      const matches = content.match(pattern);
      if (matches) {
        phraseCount += matches.length;
      }
    }

    return phraseCount;
  }

  /**
   * Validate that a score is within valid range
   * @param score Score to validate
   * @returns Clamped score between 0.0 and 1.0
   */
  protected validateScore(score: number): number {
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Check if analysis should timeout
   * @returns True if analysis has exceeded time limit
   */
  protected shouldTimeout(): boolean {
    return this.getElapsedTime() > this.config.maxAnalysisTime;
  }

  /**
   * Create timeout error
   * @returns Error object for timeout
   */
  protected createTimeoutError(): Error {
    return new Error(
      `${this.getAnalyzerName()} analysis timed out after ${this.config.maxAnalysisTime}ms`,
    );
  }
}
