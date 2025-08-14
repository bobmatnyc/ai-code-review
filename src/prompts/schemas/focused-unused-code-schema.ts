/**
 * @fileoverview Schema for focused unused code review.
 *
 * This module defines a simplified schema focused solely on detecting unused code.
 */

import { z } from 'zod';

/**
 * Confidence level for an unused code finding
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Types of unused code elements
 */
export type UnusedElementType =
  | 'file'
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'import'
  | 'dead-branch'
  | 'parameter'
  | 'property'
  | 'enum'
  | 'export'
  | 'hook'
  | 'component';

/**
 * Schema for a single unused code element
 */
export const UnusedElementSchema = z.object({
  /**
   * Type of the unused element
   */
  elementType: z
    .enum([
      'file',
      'function',
      'class',
      'interface',
      'type',
      'variable',
      'import',
      'dead-branch',
      'parameter',
      'property',
      'enum',
      'export',
      'hook',
      'component',
    ])
    .describe('Type of unused code element'),

  /**
   * Name of the element
   */
  name: z.string().describe('Name of the unused code element'),

  /**
   * File where the element is located
   */
  filePath: z.string().describe('File path containing the unused element'),

  /**
   * Line numbers where the element is defined
   */
  location: z.object({
    startLine: z.number().describe('Starting line number'),
    endLine: z.number().optional().describe('Ending line number'),
  }),

  /**
   * Code snippet showing the unused element
   */
  codeSnippet: z.string().describe('Code snippet showing the unused element'),

  /**
   * Confidence level that this element is truly unused
   */
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe('Confidence level that this element is truly unused'),

  /**
   * Explanation for the confidence assessment
   */
  confidenceReason: z.string().describe('Explanation for the confidence level'),

  /**
   * Whether other code depends on this element
   */
  hasDependents: z.boolean().default(false).describe('Whether other code depends on this element'),

  /**
   * Elements that depend on this element (if any)
   */
  dependents: z
    .array(z.string())
    .optional()
    .describe('Elements that depend on this element (if any)'),

  /**
   * Potential risks of removing this element
   */
  removalRisks: z.string().optional().describe('Potential risks of removing this element'),
});

/**
 * Schema for the focused unused code review result
 */
export const FocusedUnusedCodeReviewSchema = z.object({
  /**
   * Unused files
   */
  unusedFiles: z.array(UnusedElementSchema).describe('Files that are never imported or used'),

  /**
   * Unused functions
   */
  unusedFunctions: z.array(UnusedElementSchema).describe('Functions that are never called'),

  /**
   * Unused classes
   */
  unusedClasses: z.array(UnusedElementSchema).describe('Classes that are never instantiated'),

  /**
   * Unused types and interfaces
   */
  unusedTypesAndInterfaces: z
    .array(UnusedElementSchema)
    .describe('Types and interfaces that are never used'),

  /**
   * Dead code branches
   */
  deadCodeBranches: z.array(UnusedElementSchema).describe('Code branches that can never execute'),

  /**
   * Unused variables and imports
   */
  unusedVariablesAndImports: z
    .array(UnusedElementSchema)
    .describe('Variables and imports that are never used'),

  /**
   * Summary statistics
   */
  summary: z
    .object({
      totalUnusedElements: z.number().describe('Total number of unused elements found'),
      highConfidenceCount: z.number().describe('Number of high-confidence findings'),
      filesWithUnusedCode: z.number().describe('Number of files containing unused code'),
      potentialCodeReduction: z
        .string()
        .describe('Estimated percentage of code that could be removed'),
    })
    .describe('Summary statistics of the unused code findings'),
});

/**
 * Type for an unused element
 */
export type UnusedElement = z.infer<typeof UnusedElementSchema>;

/**
 * Type for the focused unused code review result
 */
export type FocusedUnusedCodeReview = z.infer<typeof FocusedUnusedCodeReviewSchema>;

/**
 * LangChain parser for focused unused code review
 * Note: Temporarily commented out due to TypeScript compilation issues
 */
// export const focusedUnusedCodeReviewParser = StructuredOutputParser.fromZodSchema(
//   FocusedUnusedCodeReviewSchema,
// );

/**
 * Get format instructions for the focused unused code review parser
 * @returns Format instructions string
 */
export function getFocusedUnusedCodeReviewFormatInstructions(): string {
  return 'Please provide output in the specified JSON format for focused unused code review.';
  // return focusedUnusedCodeReviewParser.getFormatInstructions();
}
