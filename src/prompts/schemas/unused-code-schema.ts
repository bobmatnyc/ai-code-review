/**
 * @fileoverview Schema for unused code review structured output.
 *
 * This module defines the schema for structured output from the unused code review,
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
 * Schema for an unused code issue
 */
export const UnusedCodeIssueSchema = z.object({
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
  }),

  /**
   * Assessment of confidence that this code is truly unused
   */
  assessment: z
    .string()
    .describe('Confidence assessment with reasoning that this code is truly unused'),

  /**
   * Suggested action (remove or keep with explanation)
   */
  suggestedAction: z
    .string()
    .describe('Suggested action: remove the code or explanation why it should be kept'),

  /**
   * Risk level of removing this code
   */
  riskLevel: z.enum(['high', 'medium', 'low']).describe('Risk level of removing this code'),

  /**
   * Impact level of the issue
   */
  impactLevel: z.enum(['high', 'medium', 'low']).describe('Impact level of the issue'),

  /**
   * Category of unused code
   */
  category: z
    .enum(['deadCode', 'redundantCode', 'deprecatedFeature', 'featureFlag', 'other'])
    .describe('Category of unused code'),
});

/**
 * Schema for the complete unused code review result
 */
export const UnusedCodeReviewSchema = z.object({
  /**
   * Array of high impact unused code issues
   */
  highImpactIssues: z.array(UnusedCodeIssueSchema).describe('High impact unused code issues'),

  /**
   * Array of medium impact unused code issues
   */
  mediumImpactIssues: z.array(UnusedCodeIssueSchema).describe('Medium impact unused code issues'),

  /**
   * Array of low impact unused code issues
   */
  lowImpactIssues: z.array(UnusedCodeIssueSchema).describe('Low impact unused code issues'),

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
});

/**
 * Type for an unused code issue
 */
export type UnusedCodeIssue = z.infer<typeof UnusedCodeIssueSchema>;

/**
 * Type for the complete unused code review result
 */
export type UnusedCodeReview = z.infer<typeof UnusedCodeReviewSchema>;

/**
 * LangChain parser for unused code review output
 */
export const unusedCodeReviewParser = StructuredOutputParser.fromZodSchema(UnusedCodeReviewSchema);

/**
 * Get format instructions for the unused code review parser
 * @returns Format instructions string
 */
export function getUnusedCodeReviewFormatInstructions(): string {
  return unusedCodeReviewParser.getFormatInstructions();
}
