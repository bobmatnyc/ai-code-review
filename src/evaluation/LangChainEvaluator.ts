/**
 * @fileoverview LangChain-based evaluation framework for extract-patterns reviews.
 *
 * This module implements evaluation metrics and methodologies inspired by
 * LangChain's evaluation framework to assess the quality and effectiveness
 * of pattern extraction results.
 */

import type { ExtractPatternsReview } from '../prompts/schemas/extract-patterns-schema';
import logger from '../utils/logger';
import {
  ExtractPatternsValidator,
  type ValidationResult,
} from '../validation/ExtractPatternsValidator';

/**
 * Evaluation criteria for pattern extraction
 */
export interface EvaluationCriteria {
  relevance: number; // How relevant are the extracted patterns
  completeness: number; // How complete is the analysis
  actionability: number; // How actionable are the insights
  specificity: number; // How specific and concrete are the findings
  novelty: number; // How novel or insightful are the patterns identified
}

/**
 * Evaluation result with detailed scoring
 */
export interface EvaluationResult {
  criteria: EvaluationCriteria;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  validationResult: ValidationResult;
}

/**
 * Reference patterns for comparison
 */
export interface ReferencePattern {
  name: string;
  description: string;
  expectedIndicators: string[];
  weight: number; // Importance weight 0-1
}

/**
 * LangChain-inspired evaluator for extract-patterns reviews
 */
export class LangChainEvaluator {
  private static readonly REFERENCE_PATTERNS: ReferencePattern[] = [
    {
      name: 'Strategy Pattern',
      description: 'Different algorithms/behaviors encapsulated in separate classes',
      expectedIndicators: ['interface', 'implements', 'strategy', 'algorithm'],
      weight: 0.9,
    },
    {
      name: 'Factory Pattern',
      description: 'Object creation abstracted through factory methods',
      expectedIndicators: ['factory', 'create', 'builder', 'new'],
      weight: 0.8,
    },
    {
      name: 'Observer Pattern',
      description: 'Event-driven communication between objects',
      expectedIndicators: ['event', 'listener', 'subscribe', 'notify', 'emit'],
      weight: 0.7,
    },
    {
      name: 'Dependency Injection',
      description: 'Dependencies provided externally rather than created internally',
      expectedIndicators: ['inject', 'dependency', 'container', 'provider'],
      weight: 0.8,
    },
    {
      name: 'Repository Pattern',
      description: 'Data access abstraction layer',
      expectedIndicators: ['repository', 'data', 'persistence', 'storage'],
      weight: 0.7,
    },
  ];

  /**
   * Evaluate extract-patterns review result
   */
  static async evaluate(
    patterns: ExtractPatternsReview,
    sourceCodeContext?: string[],
  ): Promise<EvaluationResult> {
    logger.info('Starting LangChain-based evaluation of extract-patterns result');

    // First run validation
    const validationResult = ExtractPatternsValidator.validate({ patterns });

    // Calculate evaluation criteria
    const criteria = LangChainEvaluator.evaluateCriteria(patterns, sourceCodeContext);

    // Calculate overall score
    const overallScore = LangChainEvaluator.calculateOverallScore(criteria);

    // Determine grade
    const grade = LangChainEvaluator.determineGrade(overallScore);

    // Identify strengths and weaknesses
    const strengths = LangChainEvaluator.identifyStrengths(patterns, criteria);
    const weaknesses = LangChainEvaluator.identifyWeaknesses(patterns, criteria);

    // Generate recommendations
    const recommendations = LangChainEvaluator.generateRecommendations(
      patterns,
      criteria,
      validationResult,
    );

    const result: EvaluationResult = {
      criteria,
      overallScore,
      grade,
      strengths,
      weaknesses,
      recommendations,
      validationResult,
    };

    logger.info(`Evaluation completed with grade ${grade} (${overallScore}/100)`);
    return result;
  }

  /**
   * Evaluate individual criteria
   */
  private static evaluateCriteria(
    patterns: ExtractPatternsReview,
    sourceCodeContext?: string[],
  ): EvaluationCriteria {
    return {
      relevance: LangChainEvaluator.evaluateRelevance(patterns, sourceCodeContext),
      completeness: LangChainEvaluator.evaluateCompleteness(patterns),
      actionability: LangChainEvaluator.evaluateActionability(patterns),
      specificity: LangChainEvaluator.evaluateSpecificity(patterns),
      novelty: LangChainEvaluator.evaluateNovelty(patterns),
    };
  }

  /**
   * Evaluate relevance of extracted patterns
   */
  private static evaluateRelevance(
    patterns: ExtractPatternsReview,
    _sourceCodeContext?: string[],
  ): number {
    let score = 100;

    // Check if identified patterns match expected patterns for the codebase
    const identifiedPatterns = patterns.architecturalPatterns.map((p) =>
      p.patternName.toLowerCase(),
    );

    // Penalty for generic or vague pattern names
    const genericPatterns = ['pattern', 'structure', 'organization', 'approach'];
    const hasGenericPatterns = identifiedPatterns.some((name) =>
      genericPatterns.some((generic) => name.includes(generic)),
    );

    if (hasGenericPatterns) score -= 20;

    // Bonus for identifying specific, well-known patterns
    const wellKnownPatterns = LangChainEvaluator.REFERENCE_PATTERNS.map((p) =>
      p.name.toLowerCase(),
    );
    const identifiedWellKnown = identifiedPatterns.filter((name) =>
      wellKnownPatterns.some((known) => name.includes(known.split(' ')[0])),
    );

    score += identifiedWellKnown.length * 10;

    // Check if technology stack is accurately identified
    if (patterns.technologyStack.coreLanguages.length === 0) score -= 30;
    if (patterns.technologyStack.frameworks.length === 0) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Evaluate completeness of analysis
   */
  private static evaluateCompleteness(patterns: ExtractPatternsReview): number {
    let score = 0;
    const maxScore = 100;

    // Check presence of all major sections
    const sections = [
      { field: 'projectOverview', weight: 15 },
      { field: 'technologyStack', weight: 15 },
      { field: 'codeMetrics', weight: 10 },
      { field: 'architecturalPatterns', weight: 20 },
      { field: 'codeStyle', weight: 15 },
      { field: 'testingStrategy', weight: 10 },
      { field: 'exemplarCharacteristics', weight: 10 },
      { field: 'replicationGuide', weight: 5 },
    ];

    sections.forEach((section) => {
      const value = (patterns as any)[section.field];
      if (value && LangChainEvaluator.hasSubstantialContent(value)) {
        score += section.weight;
      }
    });

    return Math.min(maxScore, score);
  }

  /**
   * Evaluate actionability of insights
   */
  private static evaluateActionability(patterns: ExtractPatternsReview): number {
    let score = 100;

    // Check replication guide quality
    if (patterns.replicationGuide.setupRequirements.length < 3) score -= 20;
    if (patterns.replicationGuide.keyDecisions.length < 3) score -= 20;
    if (patterns.replicationGuide.implementationOrder.length < 3) score -= 15;
    if (patterns.replicationGuide.commonPitfalls.length === 0) score -= 15;

    // Check exemplar characteristics
    if (patterns.exemplarCharacteristics.patternsToEmulate.length === 0) score -= 20;
    if (patterns.exemplarCharacteristics.lessonsLearned.length === 0) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Evaluate specificity of findings
   */
  private static evaluateSpecificity(patterns: ExtractPatternsReview): number {
    let score = 100;

    // Check for concrete examples in architectural patterns
    const patternsWithoutExamples = patterns.architecturalPatterns.filter(
      (p) => p.examples.length === 0,
    );
    score -= patternsWithoutExamples.length * 15;

    // Check for vague language
    const textFields = [
      patterns.projectOverview.purpose,
      patterns.summary,
      ...patterns.exemplarCharacteristics.strengths,
    ];

    const vagueWords = ['good', 'nice', 'well', 'proper', 'appropriate', 'suitable'];
    const hasVagueLanguage = textFields.some((text) =>
      vagueWords.some((word) => text.toLowerCase().includes(word)),
    );

    if (hasVagueLanguage) score -= 25;

    // Check for specific technology versions
    const hasVersions = patterns.technologyStack.coreLanguages.some((tech) => tech.version);
    if (!hasVersions) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Evaluate novelty and insight quality
   */
  private static evaluateNovelty(patterns: ExtractPatternsReview): number {
    let score = 70; // Base score for standard analysis

    // Bonus for identifying less common but valuable patterns
    const advancedPatterns = ['decorator', 'adapter', 'facade', 'proxy', 'command', 'mediator'];
    const identifiedAdvanced = patterns.architecturalPatterns.filter((p) =>
      advancedPatterns.some((advanced) => p.patternName.toLowerCase().includes(advanced)),
    );

    score += identifiedAdvanced.length * 15;

    // Bonus for insightful lessons learned
    const insightfulKeywords = [
      'performance',
      'scalability',
      'maintainability',
      'testing',
      'deployment',
    ];
    const hasInsights = patterns.exemplarCharacteristics.lessonsLearned.some((lesson) =>
      insightfulKeywords.some((keyword) => lesson.toLowerCase().includes(keyword)),
    );

    if (hasInsights) score += 20;

    // Bonus for comprehensive pitfall identification
    if (patterns.replicationGuide.commonPitfalls.length >= 3) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate overall score from criteria
   */
  private static calculateOverallScore(criteria: EvaluationCriteria): number {
    const weights = {
      relevance: 0.25,
      completeness: 0.2,
      actionability: 0.25,
      specificity: 0.2,
      novelty: 0.1,
    };

    return Math.round(
      criteria.relevance * weights.relevance +
        criteria.completeness * weights.completeness +
        criteria.actionability * weights.actionability +
        criteria.specificity * weights.specificity +
        criteria.novelty * weights.novelty,
    );
  }

  /**
   * Determine letter grade from score
   */
  private static determineGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Identify strengths in the analysis
   */
  private static identifyStrengths(
    patterns: ExtractPatternsReview,
    criteria: EvaluationCriteria,
  ): string[] {
    const strengths: string[] = [];

    if (criteria.relevance >= 80) {
      strengths.push('Highly relevant pattern identification');
    }

    if (criteria.completeness >= 85) {
      strengths.push('Comprehensive analysis across all dimensions');
    }

    if (criteria.actionability >= 80) {
      strengths.push('Actionable insights and clear replication guidance');
    }

    if (criteria.specificity >= 80) {
      strengths.push('Specific examples and concrete details provided');
    }

    if (patterns.architecturalPatterns.length >= 3) {
      strengths.push('Multiple architectural patterns identified');
    }

    if (patterns.exemplarCharacteristics.patternsToEmulate.length >= 3) {
      strengths.push('Clear patterns identified for emulation');
    }

    return strengths;
  }

  /**
   * Identify weaknesses in the analysis
   */
  private static identifyWeaknesses(
    patterns: ExtractPatternsReview,
    criteria: EvaluationCriteria,
  ): string[] {
    const weaknesses: string[] = [];

    if (criteria.relevance < 70) {
      weaknesses.push('Pattern identification lacks relevance to actual codebase');
    }

    if (criteria.completeness < 70) {
      weaknesses.push('Analysis missing key components or sections');
    }

    if (criteria.actionability < 70) {
      weaknesses.push('Insights lack actionable guidance for replication');
    }

    if (criteria.specificity < 70) {
      weaknesses.push('Analysis too generic, needs more specific examples');
    }

    if (patterns.architecturalPatterns.length === 0) {
      weaknesses.push('No architectural patterns identified');
    }

    return weaknesses;
  }

  /**
   * Generate improvement recommendations
   */
  private static generateRecommendations(
    patterns: ExtractPatternsReview,
    criteria: EvaluationCriteria,
    validationResult: ValidationResult,
  ): string[] {
    const recommendations: string[] = [];

    if (criteria.specificity < 80) {
      recommendations.push('Provide more specific examples with file names and code snippets');
    }

    if (criteria.actionability < 80) {
      recommendations.push('Enhance replication guide with more detailed implementation steps');
    }

    if (patterns.architecturalPatterns.length < 2) {
      recommendations.push(
        'Look for additional design patterns like Factory, Observer, or Decorator',
      );
    }

    if (validationResult.issues.length > 0) {
      recommendations.push('Address validation issues to improve output quality');
    }

    return recommendations;
  }

  /**
   * Check if content has substantial information
   */
  private static hasSubstantialContent(value: any): boolean {
    if (typeof value === 'string') {
      return value.length > 10;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length > 0;
    }
    return false;
  }
}
