/**
 * @fileoverview Improved schema for unused code review structured output.
 *
 * This module defines an enhanced schema for structured output from the unused code review,
 * using Zod for schema validation and LangChain for parsing.
 */

import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

/**
 * Risk level for removing unused code
 */
export type RiskLevel = 'high' | 'medium' | 'low';

/**
 * Impact level for unused code issues
 */
export type ImpactLevel = 'high' | 'medium' | 'low';

/**
 * Categories of unused code
 */
export type UnusedCodeCategory =
  | 'unusedFile'
  | 'unusedFunction'
  | 'unusedClass'
  | 'unusedModule'
  | 'deadCode'
  | 'unreachableCode'
  | 'unusedVariable'
  | 'unusedImport'
  | 'commentedCode'
  | 'redundantCode'
  | 'deprecatedFeature'
  | 'featureFlag'
  | 'unusedParameter'
  | 'unusedProperty'
  | 'unusedType'
  | 'other';

/**
 * Schema for an unused code issue with more detailed categorization
 */
export const ImprovedUnusedCodeIssueSchema = z.object({
  /**
   * Title/name of the unused code issue
   */
  title: z.string().describe('Brief title describing the unused code issue'),

  /**
   * Detailed description of the unused code issue
   */
  description: z.string().describe('Detailed description of the unused code issue'),

  /**
   * Location information (file and line numbers)
   */
  location: z.object({
    file: z.string().optional().describe('File path'),
    lineStart: z.number().optional().describe('Starting line number'),
    lineEnd: z.number().optional().describe('Ending line number'),
    codeSnippet: z.string().optional().describe('Small code snippet showing the unused code'),
  }),

  /**
   * Assessment of confidence that this code is truly unused
   */
  assessment: z.object({
    confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level'),
    reasoning: z.string().describe('Reasoning for the confidence assessment'),
    staticAnalysisHint: z
      .string()
      .optional()
      .describe('Hint for static analysis tool configuration that could catch this'),
  }),

  /**
   * Suggested action (remove or keep with explanation)
   */
  suggestedAction: z.object({
    action: z.enum(['remove', 'refactor', 'keep']).describe('Suggested action'),
    replacement: z
      .string()
      .optional()
      .describe('Suggested replacement code if refactoring is recommended'),
    explanation: z.string().describe('Explanation for the suggested action'),
  }),

  /**
   * Risk level of removing this code
   */
  riskLevel: z.enum(['high', 'medium', 'low']).describe('Risk level of removing this code'),

  /**
   * Impact level of the issue
   */
  impactLevel: z.enum(['high', 'medium', 'low']).describe('Impact level of the issue'),

  /**
   * Category of unused code (more detailed than before)
   */
  category: z
    .enum([
      'unusedFile',
      'unusedFunction',
      'unusedClass',
      'unusedModule',
      'deadCode',
      'unreachableCode',
      'unusedVariable',
      'unusedImport',
      'commentedCode',
      'redundantCode',
      'deprecatedFeature',
      'featureFlag',
      'unusedParameter',
      'unusedProperty',
      'unusedType',
      'other',
    ])
    .describe('Detailed category of unused code'),

  /**
   * Flag indicating if this is a complete element (file, function, class) that can be entirely removed
   */
  isCompleteElement: z
    .boolean()
    .describe(
      'True if this is a complete element like a file, function, or class that can be removed entirely',
    ),

  /**
   * Potential dependencies or references that should be checked
   */
  relatedChecks: z
    .array(z.string())
    .optional()
    .describe(
      'Additional files or components that should be checked to confirm this is truly unused',
    ),
});

/**
 * Enhanced schema for the complete unused code review result
 */
export const ImprovedUnusedCodeReviewSchema = z.object({
  /**
   * Array of high impact unused code issues
   */
  highImpactIssues: z
    .array(ImprovedUnusedCodeIssueSchema)
    .describe('High impact unused code issues'),

  /**
   * Array of medium impact unused code issues
   */
  mediumImpactIssues: z
    .array(ImprovedUnusedCodeIssueSchema)
    .describe('Medium impact unused code issues'),

  /**
   * Array of low impact unused code issues
   */
  lowImpactIssues: z.array(ImprovedUnusedCodeIssueSchema).describe('Low impact unused code issues'),

  /**
   * Summary of the unused code review
   */
  summary: z.string().describe('Overall summary of the unused code review findings'),

  /**
   * General recommendations for preventing unused code
   */
  recommendations: z
    .array(z.string())
    .describe('General recommendations for preventing unused code in the future'),

  /**
   * Project-wide patterns observed
   */
  codebasePatterns: z
    .array(
      z.object({
        pattern: z.string().describe('Description of the pattern'),
        impact: z.string().describe('Impact of the pattern on code quality'),
        suggestion: z.string().describe('Suggestion to improve the pattern'),
      }),
    )
    .optional()
    .describe('Project-wide patterns related to unused code'),

  /**
   * Static analysis tools that could help
   */
  recommendedTools: z
    .array(
      z.object({
        tool: z.string().describe('Tool name'),
        description: z.string().describe('Brief description of the tool'),
        configuration: z.string().optional().describe('Suggested configuration'),
      }),
    )
    .optional()
    .describe('Recommended static analysis tools for preventing unused code'),
});

/**
 * Type for an improved unused code issue
 */
export type ImprovedUnusedCodeIssue = z.infer<typeof ImprovedUnusedCodeIssueSchema>;

/**
 * Type for the complete improved unused code review result
 */
export type ImprovedUnusedCodeReview = z.infer<typeof ImprovedUnusedCodeReviewSchema>;

/**
 * LangChain parser for improved unused code review output
 * Simplified to avoid TypeScript deep instantiation issues
 */
export const improvedUnusedCodeReviewParser = StructuredOutputParser.fromZodSchema(
  ImprovedUnusedCodeReviewSchema as any,
);

/**
 * Get format instructions for the improved unused code review parser
 * @returns Format instructions string
 */
export function getImprovedUnusedCodeReviewFormatInstructions(): string {
  return improvedUnusedCodeReviewParser.getFormatInstructions();
}
