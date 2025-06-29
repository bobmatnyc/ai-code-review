/**
 * @fileoverview Validation system for extract-patterns review output quality.
 *
 * This module provides comprehensive validation and quality assessment for
 * extract-patterns review results, ensuring output meets quality standards
 * and provides actionable insights.
 */

import { z } from 'zod';
import { ExtractPatternsReview, ExtractPatternsReviewRootSchema } from '../prompts/schemas/extract-patterns-schema';

/**
 * Quality score levels
 */
export enum QualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good', 
  ADEQUATE = 'adequate',
  POOR = 'poor'
}

/**
 * Validation issue severity
 */
export enum IssueSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Validation issue interface
 */
export interface ValidationIssue {
  field: string;
  severity: IssueSeverity;
  message: string;
  suggestion?: string;
}

/**
 * Quality metrics for pattern extraction
 */
export interface QualityMetrics {
  completeness: number; // 0-100
  accuracy: number; // 0-100
  usefulness: number; // 0-100
  specificity: number; // 0-100
  overall: number; // 0-100
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  qualityLevel: QualityLevel;
  qualityMetrics: QualityMetrics;
  issues: ValidationIssue[];
  suggestions: string[];
  summary: string;
}

/**
 * Extract patterns output validator
 */
export class ExtractPatternsValidator {
  /**
   * Validate extract patterns output
   */
  static validate(output: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];

    // Schema validation
    const schemaResult = this.validateSchema(output);
    if (!schemaResult.isValid) {
      return {
        isValid: false,
        qualityLevel: QualityLevel.POOR,
        qualityMetrics: this.getDefaultMetrics(),
        issues: schemaResult.issues,
        suggestions: ['Fix schema validation errors before proceeding'],
        summary: 'Output does not conform to required schema'
      };
    }

    const patterns = schemaResult.data!;
    
    // Content quality validation
    const contentIssues = this.validateContent(patterns);
    issues.push(...contentIssues);

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(patterns, issues);
    
    // Determine overall quality level
    const qualityLevel = this.determineQualityLevel(qualityMetrics);
    
    // Generate suggestions
    const contentSuggestions = this.generateSuggestions(patterns, issues);
    suggestions.push(...contentSuggestions);

    return {
      isValid: true,
      qualityLevel,
      qualityMetrics,
      issues,
      suggestions,
      summary: this.generateSummary(qualityLevel, qualityMetrics, issues.length)
    };
  }

  /**
   * Validate against schema
   */
  private static validateSchema(output: unknown): { isValid: boolean; data?: ExtractPatternsReview; issues: ValidationIssue[] } {
    try {
      const result = ExtractPatternsReviewRootSchema.parse(output);
      return { isValid: true, data: result.patterns, issues: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues: ValidationIssue[] = error.errors.map(err => ({
          field: err.path.join('.'),
          severity: IssueSeverity.CRITICAL,
          message: err.message,
          suggestion: 'Ensure the field is present and has the correct type'
        }));
        return { isValid: false, issues };
      }
      
      return {
        isValid: false,
        issues: [{
          field: 'root',
          severity: IssueSeverity.CRITICAL,
          message: 'Failed to parse output as valid JSON',
          suggestion: 'Ensure output is valid JSON format'
        }]
      };
    }
  }

  /**
   * Validate content quality
   */
  private static validateContent(patterns: ExtractPatternsReview): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Project overview validation
    if (patterns.projectOverview.purpose.length < 20) {
      issues.push({
        field: 'projectOverview.purpose',
        severity: IssueSeverity.WARNING,
        message: 'Project purpose description is too brief',
        suggestion: 'Provide more detailed explanation of what the project does'
      });
    }

    // Technology stack validation
    if (patterns.technologyStack.coreLanguages.length === 0) {
      issues.push({
        field: 'technologyStack.coreLanguages',
        severity: IssueSeverity.CRITICAL,
        message: 'No core languages identified',
        suggestion: 'Identify at least one primary programming language'
      });
    }

    // Code metrics validation
    if (patterns.codeMetrics.totalFiles === 0) {
      issues.push({
        field: 'codeMetrics.totalFiles',
        severity: IssueSeverity.CRITICAL,
        message: 'Total files count is zero',
        suggestion: 'Ensure file counting is working correctly'
      });
    }

    // Architectural patterns validation
    if (patterns.architecturalPatterns.length === 0) {
      issues.push({
        field: 'architecturalPatterns',
        severity: IssueSeverity.WARNING,
        message: 'No architectural patterns identified',
        suggestion: 'Look for common design patterns like Strategy, Factory, Observer, etc.'
      });
    }

    // Check for generic/vague patterns
    patterns.architecturalPatterns.forEach((pattern, index) => {
      if (pattern.examples.length === 0) {
        issues.push({
          field: `architecturalPatterns[${index}].examples`,
          severity: IssueSeverity.WARNING,
          message: `No examples provided for pattern: ${pattern.patternName}`,
          suggestion: 'Provide specific file names or code examples'
        });
      }
    });

    // Exemplar characteristics validation
    if (patterns.exemplarCharacteristics.strengths.length === 0) {
      issues.push({
        field: 'exemplarCharacteristics.strengths',
        severity: IssueSeverity.WARNING,
        message: 'No strengths identified',
        suggestion: 'Identify what makes this codebase worth studying'
      });
    }

    if (patterns.exemplarCharacteristics.patternsToEmulate.length === 0) {
      issues.push({
        field: 'exemplarCharacteristics.patternsToEmulate',
        severity: IssueSeverity.WARNING,
        message: 'No patterns to emulate identified',
        suggestion: 'Identify specific patterns that could be replicated in other projects'
      });
    }

    // Summary validation
    if (patterns.summary.length < 50) {
      issues.push({
        field: 'summary',
        severity: IssueSeverity.WARNING,
        message: 'Summary is too brief',
        suggestion: 'Provide a more comprehensive 2-3 sentence summary'
      });
    }

    return issues;
  }

  /**
   * Calculate quality metrics
   */
  private static calculateQualityMetrics(patterns: ExtractPatternsReview, issues: ValidationIssue[]): QualityMetrics {
    // Completeness: Based on presence and quality of required fields
    let completeness = 100;
    const criticalIssues = issues.filter(i => i.severity === IssueSeverity.CRITICAL);
    const warningIssues = issues.filter(i => i.severity === IssueSeverity.WARNING);
    
    completeness -= criticalIssues.length * 20;
    completeness -= warningIssues.length * 5;
    completeness = Math.max(0, completeness);

    // Accuracy: Based on realistic metrics and specific examples
    let accuracy = 100;
    if (patterns.codeMetrics.averageFunctionLength > 200) accuracy -= 10;
    if (patterns.codeMetrics.averageFileLength > 1000) accuracy -= 10;
    if (patterns.architecturalPatterns.some(p => p.examples.length === 0)) accuracy -= 15;
    accuracy = Math.max(0, accuracy);

    // Usefulness: Based on actionable insights and specific recommendations
    let usefulness = 100;
    if (patterns.exemplarCharacteristics.patternsToEmulate.length === 0) usefulness -= 20;
    if (patterns.replicationGuide.keyDecisions.length < 3) usefulness -= 15;
    if (patterns.replicationGuide.commonPitfalls.length === 0) usefulness -= 10;
    usefulness = Math.max(0, usefulness);

    // Specificity: Based on concrete examples and detailed descriptions
    let specificity = 100;
    const hasVagueDescriptions = [
      patterns.projectOverview.purpose,
      patterns.summary,
      ...patterns.exemplarCharacteristics.strengths
    ].some(text => text.includes('good') || text.includes('nice') || text.includes('well'));
    
    if (hasVagueDescriptions) specificity -= 20;
    if (patterns.architecturalPatterns.length === 0) specificity -= 30;
    specificity = Math.max(0, specificity);

    // Overall: Weighted average
    const overall = Math.round(
      (completeness * 0.3 + accuracy * 0.25 + usefulness * 0.25 + specificity * 0.2)
    );

    return {
      completeness: Math.round(completeness),
      accuracy: Math.round(accuracy),
      usefulness: Math.round(usefulness),
      specificity: Math.round(specificity),
      overall
    };
  }

  /**
   * Determine quality level from metrics
   */
  private static determineQualityLevel(metrics: QualityMetrics): QualityLevel {
    if (metrics.overall >= 90) return QualityLevel.EXCELLENT;
    if (metrics.overall >= 75) return QualityLevel.GOOD;
    if (metrics.overall >= 60) return QualityLevel.ADEQUATE;
    return QualityLevel.POOR;
  }

  /**
   * Generate improvement suggestions
   */
  private static generateSuggestions(patterns: ExtractPatternsReview, issues: ValidationIssue[]): string[] {
    const suggestions: string[] = [];

    if (issues.some(i => i.field.includes('architecturalPatterns'))) {
      suggestions.push('Look for more specific design patterns like Strategy, Factory, Observer, Decorator, etc.');
    }

    if (issues.some(i => i.field.includes('examples'))) {
      suggestions.push('Provide concrete file names and code snippets as examples');
    }

    if (patterns.exemplarCharacteristics.strengths.length < 3) {
      suggestions.push('Identify more specific strengths that make this codebase exemplary');
    }

    if (patterns.replicationGuide.keyDecisions.length < 5) {
      suggestions.push('Document more architectural and tooling decisions that would be important for replication');
    }

    return suggestions;
  }

  /**
   * Generate validation summary
   */
  private static generateSummary(qualityLevel: QualityLevel, metrics: QualityMetrics, issueCount: number): string {
    const levelDescriptions = {
      [QualityLevel.EXCELLENT]: 'Excellent quality pattern extraction with comprehensive insights',
      [QualityLevel.GOOD]: 'Good quality pattern extraction with minor areas for improvement',
      [QualityLevel.ADEQUATE]: 'Adequate pattern extraction but could be more detailed',
      [QualityLevel.POOR]: 'Poor quality pattern extraction requiring significant improvement'
    };

    return `${levelDescriptions[qualityLevel]}. Overall score: ${metrics.overall}/100 with ${issueCount} validation issues.`;
  }

  /**
   * Get default metrics for failed validation
   */
  private static getDefaultMetrics(): QualityMetrics {
    return {
      completeness: 0,
      accuracy: 0,
      usefulness: 0,
      specificity: 0,
      overall: 0
    };
  }
}
