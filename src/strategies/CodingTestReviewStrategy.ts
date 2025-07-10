/**
 * @fileoverview Coding test review strategy implementation.
 *
 * This module implements the coding test review strategy for evaluating candidate submissions
 * against assignment requirements using configurable scoring criteria and evaluation frameworks.
 */

import { AIDetectionEngine } from '../analysis/ai-detection/core/AIDetectionEngine';
import type {
  DetectionConfig,
  DetectionResult,
} from '../analysis/ai-detection/types/DetectionTypes';
import { SubmissionConverter } from '../analysis/ai-detection/utils/SubmissionConverter';
import type { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import type { FileInfo, ReviewOptions, ReviewResult } from '../types/review';
import { collectCIData } from '../utils/ciDataCollector';
import {
  convertToCodingTestConfig,
  createDefaultCodingTestConfig,
  loadCodingTestConfig,
  loadCodingTestConfigFromUrl,
  parseAssignmentText,
} from '../utils/codingTestConfigLoader';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import { BaseReviewStrategy } from './ReviewStrategy';

/**
 * Configuration interface for coding test evaluation
 */
export interface CodingTestConfig {
  /** Assignment specification */
  assignment?: {
    title?: string;
    description?: string;
    requirements?: string[];
    difficulty?: 'junior' | 'mid' | 'senior' | 'lead' | 'architect';
    timeLimit?: number;
    type?: 'coding-challenge' | 'take-home' | 'live-coding' | 'code-review';
  };

  /** Evaluation criteria with weights */
  criteria?: Record<string, number> & {
    correctness?: number;
    codeQuality?: number;
    architecture?: number;
    performance?: number;
    testing?: number;
    documentation?: number;
    errorHandling?: number;
    security?: number;
  };

  /** Scoring configuration */
  scoring?: {
    system?: 'numeric' | 'letter' | 'pass-fail' | 'custom';
    maxScore?: number;
    passingThreshold?: number;
    breakdown?: boolean;
  };

  /** Feedback configuration */
  feedback?: {
    level?: 'basic' | 'detailed' | 'comprehensive';
    includeExamples?: boolean;
    includeSuggestions?: boolean;
    includeResources?: boolean;
  };

  /** Technical constraints */
  constraints?: {
    allowedLibraries?: string[];
    forbiddenPatterns?: string[];
    targetLanguage?: string;
    framework?: string;
    nodeVersion?: string;
    memoryLimit?: number;
    executionTimeout?: number;
  };

  /** AI detection configuration */
  aiDetection?: {
    enabled?: boolean;
    threshold?: number;
    analyzers?: ('git' | 'documentation' | 'structural' | 'statistical' | 'linguistic')[];
    includeInReport?: boolean;
    failOnDetection?: boolean;
  };
}

/**
 * Strategy for coding test assessment and evaluation
 */
export class CodingTestReviewStrategy extends BaseReviewStrategy {
  private config: CodingTestConfig;
  private aiDetectionEngine?: AIDetectionEngine;

  /**
   * Create a new coding test review strategy
   * @param config Coding test configuration or options for loading configuration
   */
  constructor(config: CodingTestConfig | { fromFile?: string; fromUrl?: string } = {}) {
    super('coding-test');
    this.config = this.initializeConfig(config);
    // AI detection initialization moved to execute() method after config merge
  }

  /**
   * Execute the coding test review strategy
   * @param files Files to review
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  async execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult> {
    logger.info(`Executing coding test review strategy for ${projectName}...`);

    // Merge configuration from options
    const effectiveConfig = this.mergeOptionsWithConfig(options);

    // Initialize AI detection engine with merged configuration
    this.initializeAIDetectionWithConfig(effectiveConfig);

    // Collect CI data if applicable
    let ciData;
    if (this.shouldCollectCIData(files, options)) {
      logger.info('Collecting CI data for coding test evaluation...');
      ciData = await collectCIData(process.cwd());
      options.ciData = ciData;
    }

    // Run AI detection if enabled
    let aiDetectionResult: DetectionResult | null = null;
    if (effectiveConfig.aiDetection?.enabled && this.aiDetectionEngine) {
      logger.info('🔍 Starting AI detection analysis...');
      logger.debug(
        `AI detection configuration: threshold=${effectiveConfig.aiDetection.threshold}, analyzers=${effectiveConfig.aiDetection.analyzers?.join(',')}`,
      );

      const startTime = Date.now();
      try {
        logger.debug('Converting submission data for AI analysis...');
        const submission = await SubmissionConverter.convert(files, projectName, projectDocs);
        logger.debug(
          `Submission conversion completed. Files: ${submission.codebase.files.length}, Commits: ${submission.repository.commits.length}`,
        );

        logger.debug('Running AI detection engine analysis...');
        aiDetectionResult = await this.aiDetectionEngine.analyze(submission);

        const analysisTime = Date.now() - startTime;
        logger.info(`✅ AI detection completed in ${analysisTime}ms`);
        logger.info(
          `📊 Results: Confidence=${aiDetectionResult.confidenceScore.toFixed(3)}, AI Generated=${aiDetectionResult.isAIGenerated}, Patterns=${aiDetectionResult.detectedPatterns.length}`,
        );

        if (aiDetectionResult.isAIGenerated) {
          const riskLevel = this.calculateRiskLevel(aiDetectionResult.confidenceScore);
          logger.warn(`🚨 AI-generated content detected! Risk Level: ${riskLevel}`);

          // Log detected patterns for debugging
          if (aiDetectionResult.detectedPatterns.length > 0) {
            logger.debug('Detected patterns:');
            aiDetectionResult.detectedPatterns.forEach((pattern) => {
              logger.debug(
                `  - ${pattern.name} (${pattern.id}): confidence=${pattern.confidence}, score=${pattern.score}`,
              );
            });
          }

          // Log recommendations
          if (aiDetectionResult.recommendations.length > 0) {
            logger.info('AI detection recommendations:');
            aiDetectionResult.recommendations.forEach((rec) => {
              logger.info(`  ${rec}`);
            });
          }
        } else {
          logger.info('✅ No significant AI-generated patterns detected');
        }

        // Log analyzer performance
        if (aiDetectionResult.metadata.warnings.length > 0) {
          logger.warn('AI detection warnings:');
          aiDetectionResult.metadata.warnings.forEach((warning) => {
            logger.warn(`  ⚠️  ${warning}`);
          });
        }
      } catch (error) {
        const analysisTime = Date.now() - startTime;
        logger.error(
          `❌ AI detection failed after ${analysisTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (error instanceof Error && error.stack) {
          logger.debug('AI detection error stack:', error.stack);
        }

        // Log troubleshooting information
        logger.info('🔧 AI detection troubleshooting:');
        logger.info(
          '  1. Ensure the target directory contains a git repository with commit history',
        );
        logger.info('  2. Check that the project has documentation files (README, comments)');
        logger.info('  3. Verify sufficient disk space and memory availability');
        logger.info('  4. Try running with --debug flag for detailed logs');
        logger.info('  5. Consider using fewer analyzers (--ai-detection-analyzers git)');
      }
    } else if (effectiveConfig.aiDetection?.enabled && !this.aiDetectionEngine) {
      logger.warn('⚠️  AI detection enabled but engine not initialized. Check configuration.');
    } else {
      logger.debug('AI detection disabled or not configured');
    }

    // Prepare enhanced options with coding test context and AI detection results
    const enhancedOptions = this.enhanceOptionsWithCodingTestContext(
      options,
      effectiveConfig,
      aiDetectionResult,
    );

    // Generate the review using the selected API client
    const result = await generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      enhancedOptions,
      apiClientConfig,
    );

    // Enhance result with coding test metadata and AI detection
    return this.enhanceResultWithCodingTestMetadata(result, effectiveConfig, aiDetectionResult);
  }

  /**
   * Initialize configuration from various sources
   * @param config Configuration or loading options
   * @returns Initialized configuration
   */
  private initializeConfig(
    config: CodingTestConfig | { fromFile?: string; fromUrl?: string },
  ): CodingTestConfig {
    // Check if it's a loading configuration
    if ('fromFile' in config || 'fromUrl' in config) {
      if (config.fromFile) {
        logger.info(`Loading coding test configuration from file: ${config.fromFile}`);
        const extendedConfig = loadCodingTestConfig(config.fromFile);
        return this.normalizeConfig(convertToCodingTestConfig(extendedConfig));
      }

      if (config.fromUrl) {
        logger.info(`Loading coding test configuration from URL: ${config.fromUrl}`);
        // Note: This would need to be handled asynchronously in a real implementation
        // For now, we'll fall back to default configuration
        logger.warn(
          'URL-based configuration loading not implemented in constructor. Using default configuration.',
        );
        return this.normalizeConfig(createDefaultCodingTestConfig());
      }

      // No valid loading option provided, use default
      return this.normalizeConfig(createDefaultCodingTestConfig());
    }

    // It's a direct configuration object
    return this.normalizeConfig(config as CodingTestConfig);
  }

  /**
   * Normalize and validate configuration
   * @param config Input configuration
   * @returns Normalized configuration
   */
  private normalizeConfig(config: CodingTestConfig): CodingTestConfig {
    const normalized: CodingTestConfig = {
      assignment: {
        difficulty: 'mid',
        type: 'coding-challenge',
        timeLimit: 120,
        ...config.assignment,
      },
      criteria: {
        correctness: 30,
        codeQuality: 25,
        architecture: 20,
        performance: 15,
        testing: 10,
        ...config.criteria,
      },
      scoring: {
        system: 'numeric',
        maxScore: 100,
        passingThreshold: 70,
        breakdown: true,
        ...config.scoring,
      },
      feedback: {
        level: 'detailed',
        includeExamples: true,
        includeSuggestions: true,
        includeResources: false,
        ...config.feedback,
      },
      constraints: {
        ...config.constraints,
      },
      aiDetection: {
        enabled: false,
        threshold: 0.7,
        analyzers: ['git', 'documentation'],
        includeInReport: true,
        failOnDetection: false,
        ...config.aiDetection,
      },
    };

    // Validate criteria weights sum to 100
    this.validateCriteriaWeights(normalized.criteria!);

    return normalized;
  }

  /**
   * Validate that criteria weights sum to 100
   * @param criteria Criteria configuration
   */
  private validateCriteriaWeights(criteria: Record<string, number>): void {
    const total = Object.values(criteria).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(total - 100) > 0.1) {
      logger.warn(`Criteria weights sum to ${total}, expected 100. Normalizing...`);

      // Normalize weights to sum to 100
      const normalizationFactor = 100 / total;
      Object.keys(criteria).forEach((key) => {
        criteria[key] = Math.round(criteria[key] * normalizationFactor);
      });
    }
  }

  /**
   * Merge CLI options with configuration
   * @param options Review options
   * @returns Merged configuration
   */
  private mergeOptionsWithConfig(options: ReviewOptions): CodingTestConfig {
    const merged = { ...this.config };

    // Merge assignment configuration
    if (options.assignmentFile || options.assignmentText || options.assignmentUrl) {
      merged.assignment = {
        ...merged.assignment,
      };

      // Handle assignment text parsing
      if (options.assignmentText) {
        const parsedAssignment = parseAssignmentText(options.assignmentText);
        merged.assignment = {
          ...merged.assignment,
          ...parsedAssignment,
        };
      }

      // Handle assignment file loading
      if (options.assignmentFile) {
        try {
          const fs = require('node:fs');
          const assignmentContent = fs.readFileSync(options.assignmentFile, 'utf8');
          const parsedAssignment = parseAssignmentText(assignmentContent);
          merged.assignment = {
            ...merged.assignment,
            ...parsedAssignment,
          };
        } catch (error) {
          logger.warn(`Failed to load assignment file ${options.assignmentFile}:`, error);
        }
      }
    }

    if (options.assessmentType) {
      merged.assignment!.type = options.assessmentType;
    }

    if (options.difficultyLevel) {
      merged.assignment!.difficulty = options.difficultyLevel;
    }

    if (options.timeLimit) {
      merged.assignment!.timeLimit = options.timeLimit;
    }

    // Merge criteria weights
    const criteriaUpdates: Record<string, number> = {};
    if (options.weightCorrectness !== undefined)
      criteriaUpdates.correctness = options.weightCorrectness;
    if (options.weightCodeQuality !== undefined)
      criteriaUpdates.codeQuality = options.weightCodeQuality;
    if (options.weightArchitecture !== undefined)
      criteriaUpdates.architecture = options.weightArchitecture;
    if (options.weightPerformance !== undefined)
      criteriaUpdates.performance = options.weightPerformance;
    if (options.weightTesting !== undefined) criteriaUpdates.testing = options.weightTesting;

    if (Object.keys(criteriaUpdates).length > 0) {
      merged.criteria = { ...merged.criteria, ...criteriaUpdates };
      this.validateCriteriaWeights(merged.criteria);
    }

    // Merge scoring configuration
    if (options.scoringSystem) {
      merged.scoring!.system = options.scoringSystem;
    }

    if (options.maxScore !== undefined) {
      merged.scoring!.maxScore = options.maxScore;
    }

    if (options.passingThreshold !== undefined) {
      merged.scoring!.passingThreshold = options.passingThreshold;
    }

    if (options.scoreBreakdown !== undefined) {
      merged.scoring!.breakdown = options.scoreBreakdown;
    }

    // Merge feedback configuration
    if (options.feedbackLevel) {
      merged.feedback!.level = options.feedbackLevel;
    }

    if (options.includeExamples !== undefined) {
      merged.feedback!.includeExamples = options.includeExamples;
    }

    if (options.includeSuggestions !== undefined) {
      merged.feedback!.includeSuggestions = options.includeSuggestions;
    }

    if (options.includeResources !== undefined) {
      merged.feedback!.includeResources = options.includeResources;
    }

    // Merge constraints
    if (options.allowedLibraries) {
      merged.constraints!.allowedLibraries = options.allowedLibraries;
    }

    if (options.forbiddenPatterns) {
      merged.constraints!.forbiddenPatterns = options.forbiddenPatterns;
    }

    if (options.language) {
      merged.constraints!.targetLanguage = options.language;
    }

    if (options.framework) {
      merged.constraints!.framework = options.framework;
    }

    // Merge AI detection configuration from CLI options
    if (options.enableAiDetection !== undefined) {
      merged.aiDetection!.enabled = options.enableAiDetection;
    }

    if (options.aiDetectionThreshold !== undefined) {
      merged.aiDetection!.threshold = options.aiDetectionThreshold;
    }

    if (options.aiDetectionAnalyzers) {
      const analyzers = options.aiDetectionAnalyzers.split(',').map((a) => a.trim()) as (
        | 'git'
        | 'documentation'
        | 'structural'
        | 'statistical'
        | 'linguistic'
      )[];
      merged.aiDetection!.analyzers = analyzers;
    }

    if (options.aiDetectionIncludeInReport !== undefined) {
      merged.aiDetection!.includeInReport = options.aiDetectionIncludeInReport;
    }

    if (options.aiDetectionFailOnDetection !== undefined) {
      merged.aiDetection!.failOnDetection = options.aiDetectionFailOnDetection;
    }

    return merged;
  }

  /**
   * Determine if CI data should be collected
   * @param files Files being reviewed
   * @param options Review options
   * @returns True if CI data should be collected
   */
  private shouldCollectCIData(files: FileInfo[], options: ReviewOptions): boolean {
    return (
      options.language === 'typescript' ||
      files.some((f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
    );
  }

  /**
   * Enhance options with coding test context
   * @param options Original options
   * @param config Effective configuration
   * @returns Enhanced options
   */
  private enhanceOptionsWithCodingTestContext(
    options: ReviewOptions,
    config: CodingTestConfig,
    aiDetectionResult?: DetectionResult | null,
  ): ReviewOptions {
    const enhanced = { ...options };

    // Add coding test metadata to options
    enhanced.codingTestConfig = config;

    // Add prompt fragments for assignment context
    if (!enhanced.promptFragments) {
      enhanced.promptFragments = [];
    }

    // Add assignment context
    if (config.assignment) {
      enhanced.promptFragments.push({
        content: this.buildAssignmentContextPrompt(config.assignment),
        position: 'start',
        priority: 1,
      });
    }

    // Add evaluation criteria context
    if (config.criteria) {
      enhanced.promptFragments.push({
        content: this.buildCriteriaContextPrompt(config.criteria),
        position: 'start',
        priority: 2,
      });
    }

    // Add scoring context
    if (config.scoring) {
      enhanced.promptFragments.push({
        content: this.buildScoringContextPrompt(config.scoring),
        position: 'start',
        priority: 3,
      });
    }

    // Add feedback instructions
    if (config.feedback) {
      enhanced.promptFragments.push({
        content: this.buildFeedbackInstructionsPrompt(config.feedback),
        position: 'middle',
        priority: 1,
      });
    }

    // Add constraints context
    if (config.constraints) {
      enhanced.promptFragments.push({
        content: this.buildConstraintsContextPrompt(config.constraints),
        position: 'middle',
        priority: 2,
      });
    }

    // Add AI detection context if available
    if (aiDetectionResult && config.aiDetection?.includeInReport) {
      enhanced.promptFragments.push({
        content: this.buildAIDetectionContextPrompt(aiDetectionResult, config.aiDetection),
        position: 'middle',
        priority: 0, // High priority for AI detection results
      });

      // Add AI detection data for template rendering
      if (!enhanced.metadata) {
        enhanced.metadata = {};
      }
      enhanced.metadata.aiDetection = {
        isAIGenerated: aiDetectionResult.isAIGenerated,
        confidenceScore: aiDetectionResult.confidenceScore,
        patternsDetected: aiDetectionResult.detectedPatterns.length,
        highConfidencePatterns: aiDetectionResult.detectedPatterns.filter(
          (p) => p.confidence === 'high',
        ).length,
        analysisTime: aiDetectionResult.metadata.totalAnalysisTime,
        analyzersUsed: aiDetectionResult.metadata.enabledAnalyzers,
      };
    }

    return enhanced;
  }

  /**
   * Build assignment context prompt
   * @param assignment Assignment configuration
   * @returns Assignment context prompt
   */
  private buildAssignmentContextPrompt(
    assignment: NonNullable<CodingTestConfig['assignment']>,
  ): string {
    let prompt = '## Assignment Context\n\n';

    if (assignment.title) {
      prompt += `**Assignment Title:** ${assignment.title}\n\n`;
    }

    if (assignment.description) {
      prompt += `**Assignment Description:**\n${assignment.description}\n\n`;
    }

    if (assignment.requirements && assignment.requirements.length > 0) {
      prompt += `**Requirements:**\n`;
      assignment.requirements.forEach((req) => {
        prompt += `- ${req}\n`;
      });
      prompt += '\n';
    }

    prompt += `**Assessment Type:** ${assignment.type}\n`;
    prompt += `**Difficulty Level:** ${assignment.difficulty}\n`;

    if (assignment.timeLimit) {
      prompt += `**Time Limit:** ${assignment.timeLimit} minutes\n`;
    }

    return prompt;
  }

  /**
   * Build criteria context prompt
   * @param criteria Criteria configuration
   * @returns Criteria context prompt
   */
  private buildCriteriaContextPrompt(criteria: NonNullable<CodingTestConfig['criteria']>): string {
    let prompt = '## Evaluation Criteria\n\n';
    prompt += 'Evaluate the code based on the following weighted criteria:\n\n';

    Object.entries(criteria).forEach(([criterion, weight]) => {
      prompt += `- **${this.formatCriterionName(criterion)}:** ${weight}% weight\n`;
    });

    return prompt + '\n';
  }

  /**
   * Build scoring context prompt
   * @param scoring Scoring configuration
   * @returns Scoring context prompt
   */
  private buildScoringContextPrompt(scoring: NonNullable<CodingTestConfig['scoring']>): string {
    let prompt = '## Scoring System\n\n';
    prompt += `**System:** ${scoring.system}\n`;
    prompt += `**Maximum Score:** ${scoring.maxScore}\n`;
    prompt += `**Passing Threshold:** ${scoring.passingThreshold}\n`;

    if (scoring.breakdown) {
      prompt += '**Score Breakdown:** Required for each criterion\n';
    }

    return prompt + '\n';
  }

  /**
   * Build feedback instructions prompt
   * @param feedback Feedback configuration
   * @returns Feedback instructions prompt
   */
  private buildFeedbackInstructionsPrompt(
    feedback: NonNullable<CodingTestConfig['feedback']>,
  ): string {
    let prompt = '## Feedback Instructions\n\n';
    prompt += `**Detail Level:** ${feedback.level}\n`;

    if (feedback.includeExamples) {
      prompt += '- Include specific code examples in feedback\n';
    }

    if (feedback.includeSuggestions) {
      prompt += '- Provide concrete improvement suggestions\n';
    }

    if (feedback.includeResources) {
      prompt += '- Include relevant learning resources\n';
    }

    return prompt + '\n';
  }

  /**
   * Build constraints context prompt
   * @param constraints Constraints configuration
   * @returns Constraints context prompt
   */
  private buildConstraintsContextPrompt(
    constraints: NonNullable<CodingTestConfig['constraints']>,
  ): string {
    let prompt = '## Technical Constraints\n\n';

    if (constraints.allowedLibraries && constraints.allowedLibraries.length > 0) {
      prompt += `**Allowed Libraries:** ${constraints.allowedLibraries.join(', ')}\n`;
    }

    if (constraints.forbiddenPatterns && constraints.forbiddenPatterns.length > 0) {
      prompt += `**Forbidden Patterns:** ${constraints.forbiddenPatterns.join(', ')}\n`;
    }

    if (constraints.targetLanguage) {
      prompt += `**Target Language:** ${constraints.targetLanguage}\n`;
    }

    if (constraints.framework) {
      prompt += `**Framework:** ${constraints.framework}\n`;
    }

    if (constraints.nodeVersion) {
      prompt += `**Node.js Version:** ${constraints.nodeVersion}\n`;
    }

    if (constraints.memoryLimit) {
      prompt += `**Memory Limit:** ${constraints.memoryLimit} MB\n`;
    }

    if (constraints.executionTimeout) {
      prompt += `**Execution Timeout:** ${constraints.executionTimeout} seconds\n`;
    }

    return prompt + '\n';
  }

  /**
   * Format criterion name for display
   * @param criterion Criterion key
   * @returns Formatted criterion name
   */
  private formatCriterionName(criterion: string): string {
    return criterion
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Enhance result with coding test metadata
   * @param result Original result
   * @param config Configuration used
   * @returns Enhanced result
   */
  private enhanceResultWithCodingTestMetadata(
    result: ReviewResult,
    config: CodingTestConfig,
    aiDetectionResult?: DetectionResult | null,
  ): ReviewResult {
    const enhanced = {
      ...result,
      metadata: {
        ...result.metadata,
        codingTestConfig: config,
        assessmentType: config.assignment?.type || 'coding-challenge',
        difficultyLevel: config.assignment?.difficulty || 'mid',
        criteriaWeights: config.criteria,
        scoringSystem: config.scoring?.system || 'numeric',
        maxScore: config.scoring?.maxScore || 100,
        passingThreshold: config.scoring?.passingThreshold || 70,
      },
    };

    // Add AI detection results to metadata if available
    if (aiDetectionResult) {
      enhanced.metadata.aiDetection = {
        isAIGenerated: aiDetectionResult.isAIGenerated,
        confidenceScore: aiDetectionResult.confidenceScore,
        patternsDetected: aiDetectionResult.detectedPatterns.length,
        highConfidencePatterns: aiDetectionResult.detectedPatterns.filter(
          (p) => p.confidence === 'high',
        ).length,
        analysisTime: aiDetectionResult.metadata.totalAnalysisTime,
        analyzersUsed: aiDetectionResult.metadata.enabledAnalyzers,
      };
    }

    return enhanced;
  }

  /**
   * Initialize AI detection engine with merged configuration
   * @param config Effective configuration after merging options
   */
  private initializeAIDetectionWithConfig(config: CodingTestConfig): void {
    if (config.aiDetection?.enabled) {
      const detectionConfig: Partial<DetectionConfig> = {
        detectionThreshold: config.aiDetection.threshold || 0.7,
        enabledAnalyzers: config.aiDetection.analyzers || ['git', 'documentation'],
        enableCaching: true,
        includeEvidence: true,
        generateRecommendations: true,
      };

      this.aiDetectionEngine = new AIDetectionEngine(detectionConfig);
      logger.info(
        'AI detection engine initialized with analyzers:',
        detectionConfig.enabledAnalyzers,
      );
    } else {
      logger.info('AI detection disabled or not configured');
    }
  }

  /**
   * Initialize AI detection engine if enabled (legacy method - kept for compatibility)
   */
  private initializeAIDetection(): void {
    if (this.config.aiDetection?.enabled) {
      const detectionConfig: Partial<DetectionConfig> = {
        detectionThreshold: this.config.aiDetection.threshold || 0.7,
        enabledAnalyzers: this.config.aiDetection.analyzers || ['git', 'documentation'],
        enableCaching: true,
        includeEvidence: true,
        generateRecommendations: true,
      };

      this.aiDetectionEngine = new AIDetectionEngine(detectionConfig);
      logger.info(
        'AI detection engine initialized with analyzers:',
        detectionConfig.enabledAnalyzers,
      );
    }
  }

  /**
   * Build AI detection context prompt
   * @param aiDetectionResult AI detection analysis result
   * @param config AI detection configuration
   * @returns AI detection context prompt
   */
  private buildAIDetectionContextPrompt(
    aiDetectionResult: DetectionResult,
    config: NonNullable<CodingTestConfig['aiDetection']>,
  ): string {
    let prompt = '## AI-Generated Code Detection Results\n\n';

    if (aiDetectionResult.isAIGenerated) {
      prompt += `🚨 **ALERT: AI-Generated Content Detected**\n\n`;
      prompt += `**Confidence Score:** ${(aiDetectionResult.confidenceScore * 100).toFixed(1)}%\n`;
      prompt += `**Risk Level:** ${this.calculateRiskLevel(aiDetectionResult.confidenceScore)}\n\n`;
    } else {
      prompt += `✅ **Human-Authored Code Detected**\n\n`;
      prompt += `**Confidence Score:** ${(aiDetectionResult.confidenceScore * 100).toFixed(1)}%\n\n`;
    }

    if (aiDetectionResult.detectedPatterns.length > 0) {
      prompt += `**Detected Patterns (${aiDetectionResult.detectedPatterns.length}):**\n`;

      const highConfidencePatterns = aiDetectionResult.detectedPatterns.filter(
        (p) => p.confidence === 'high',
      );
      if (highConfidencePatterns.length > 0) {
        prompt += `\n*High Confidence Patterns:*\n`;
        highConfidencePatterns.forEach((pattern) => {
          prompt += `- **${pattern.name}** (${pattern.id}): ${pattern.description}\n`;
        });
      }

      const mediumConfidencePatterns = aiDetectionResult.detectedPatterns.filter(
        (p) => p.confidence === 'medium',
      );
      if (mediumConfidencePatterns.length > 0) {
        prompt += `\n*Medium Confidence Patterns:*\n`;
        mediumConfidencePatterns.forEach((pattern) => {
          prompt += `- **${pattern.name}** (${pattern.id}): ${pattern.description}\n`;
        });
      }
    }

    if (aiDetectionResult.recommendations.length > 0) {
      prompt += `\n**Evaluation Recommendations:**\n`;
      aiDetectionResult.recommendations.forEach((rec) => {
        prompt += `- ${rec}\n`;
      });
    }

    prompt += `\n**Instructions for Evaluation:**\n`;
    if (aiDetectionResult.isAIGenerated) {
      prompt += `- This submission requires additional verification due to AI detection\n`;
      prompt += `- Focus evaluation on candidate's understanding rather than just code functionality\n`;
      prompt += `- Consider the specific patterns detected when assessing authenticity\n`;
      if (config.failOnDetection) {
        prompt += `- **IMPORTANT:** Configuration indicates this submission should fail if AI-generated\n`;
      }
    } else {
      prompt += `- Proceed with standard evaluation criteria\n`;
      prompt += `- AI detection indicates likely human authorship\n`;
    }

    return prompt + '\n';
  }

  /**
   * Calculate risk level based on confidence score
   * @param confidenceScore Confidence score from 0.0 to 1.0
   * @returns Risk level
   */
  private calculateRiskLevel(confidenceScore: number): string {
    if (confidenceScore >= 0.9) return 'CRITICAL';
    if (confidenceScore >= 0.8) return 'HIGH';
    if (confidenceScore >= 0.6) return 'MEDIUM';
    return 'LOW';
  }
}
