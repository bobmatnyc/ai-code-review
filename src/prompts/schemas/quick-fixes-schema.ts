/**
 * @fileoverview Schema for quick fixes review structured output.
 *
 * This module defines the schema for structured output from the quick fixes review,
 * using Zod for schema validation and LangChain for parsing.
 */

import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

/**
 * Priority level for issues
 */
export type PriorityLevel = 'high' | 'medium' | 'low';

/**
 * Issue category
 */
export type IssueCategory =
  | 'bug'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'readability'
  | 'testing'
  | 'documentation'
  | 'configuration'
  | 'typing'
  | 'error-handling'
  | 'other';

/**
 * Schema for a quick fix issue
 */
export const QuickFixIssueSchema = z.object({
  /**
   * Title of the issue
   */
  title: z.string().describe('Brief title describing the issue'),

  /**
   * Detailed description of the issue
   */
  description: z.string().describe('Detailed description of the issue'),

  /**
   * Location information (file and line numbers)
   */
  location: z.object({
    file: z.string().optional().describe('File path'),
    lineStart: z.number().optional().describe('Starting line number'),
    lineEnd: z.number().optional().describe('Ending line number'),
    codeSnippet: z.string().optional().describe('Small code snippet showing the issue'),
  }),

  /**
   * Suggested fix for the issue
   */
  suggestedFix: z.object({
    code: z.string().describe('Code snippet showing the fix'),
    explanation: z.string().describe('Explanation of the fix'),
  }),

  /**
   * Impact of fixing the issue
   */
  impact: z.string().describe('Impact of fixing this issue'),

  /**
   * Effort level required to fix (1-5 scale)
   */
  effort: z
    .number()
    .min(1)
    .max(5)
    .describe('Effort level required to fix (1: very easy, 5: complex)'),

  /**
   * Priority level of the issue
   */
  priority: z.enum(['high', 'medium', 'low']).describe('Priority level of the issue'),

  /**
   * Category of the issue
   */
  category: z
    .enum([
      'bug',
      'security',
      'performance',
      'maintainability',
      'readability',
      'testing',
      'documentation',
      'configuration',
      'typing',
      'error-handling',
      'other',
    ])
    .describe('Category of the issue'),

  /**
   * Tags related to the issue
   */
  tags: z.array(z.string()).optional().describe('Tags related to the issue'),
});

/**
 * Schema for the complete quick fixes review result
 */
export const QuickFixesReviewSchema = z.object({
  /**
   * Array of high priority issues
   */
  highPriorityIssues: z
    .array(QuickFixIssueSchema)
    .describe('High priority issues that should be fixed immediately'),

  /**
   * Array of medium priority issues
   */
  mediumPriorityIssues: z
    .array(QuickFixIssueSchema)
    .describe('Medium priority issues that should be fixed soon'),

  /**
   * Array of low priority issues
   */
  lowPriorityIssues: z
    .array(QuickFixIssueSchema)
    .describe('Low priority issues that could be fixed when time allows'),

  /**
   * Summary of the quick fixes review
   */
  summary: z.string().describe('Overall summary of the quick fixes review findings'),

  /**
   * General recommendations
   */
  recommendations: z.array(z.string()).describe('General recommendations for improving the code'),

  /**
   * Positive aspects of the code
   */
  positiveAspects: z
    .array(z.string())
    .describe('Positive aspects of the code that should be preserved'),

  /**
   * Development tools that could help
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
    .describe('Recommended development tools for preventing these issues'),
});

/**
 * Type for a quick fix issue
 */
export type QuickFixIssue = z.infer<typeof QuickFixIssueSchema>;

/**
 * Type for the complete quick fixes review result
 */
export type QuickFixesReview = z.infer<typeof QuickFixesReviewSchema>;

/**
 * LangChain parser for quick fixes review output
 */
export const quickFixesReviewParser = StructuredOutputParser.fromZodSchema(QuickFixesReviewSchema);

/**
 * Get format instructions for the quick fixes review parser
 * @returns Format instructions string
 */
export function getQuickFixesReviewFormatInstructions(): string {
  return quickFixesReviewParser.getFormatInstructions();
}
