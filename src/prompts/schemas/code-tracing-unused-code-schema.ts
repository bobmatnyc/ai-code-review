/**
 * @fileoverview Schema for code tracing unused code review.
 *
 * This module defines a schema for code tracing unused code review that includes
 * detailed evidence for why each element is considered unused.
 */

import { StructuredOutputParser } from '@langchain/core/output_parsers';
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
 * Schema for the evidence of why an element is unused
 */
export const TraceEvidenceSchema = z.object({
  /**
   * Definition information - where the element is defined
   */
  definition: z.object({
    /**
     * File where the element is defined
     */
    file: z.string().describe('File where the element is defined'),

    /**
     * Line number where the element is defined
     */
    line: z.number().describe('Line number where the element is defined'),

    /**
     * Code snippet showing the definition
     */
    codeSnippet: z.string().describe('Code snippet showing the definition'),
  }),

  /**
   * Export information - how/where the element is exported (if applicable)
   */
  exports: z
    .array(
      z.object({
        /**
         * File where the element is exported
         */
        file: z.string().describe('File where the element is exported'),

        /**
         * Line number where the element is exported
         */
        line: z.number().describe('Line number where the element is exported'),

        /**
         * Export type (default, named, re-export, etc.)
         */
        exportType: z.string().describe('Export type (default, named, re-export, etc.)'),
      }),
    )
    .optional()
    .describe('Export information if the element is exported'),

  /**
   * Import search - evidence of searching for imports of this element
   */
  importSearch: z.object({
    /**
     * Areas searched for imports
     */
    searchedIn: z.array(z.string()).describe('Areas searched for imports of this element'),

    /**
     * Verification that no imports were found
     */
    noImportsFound: z.boolean().describe('Verification that no imports were found'),

    /**
     * Search method used
     */
    searchMethod: z.string().describe('Search method used to look for imports'),
  }),

  /**
   * Reference search - evidence of searching for references to this element
   */
  referenceSearch: z.object({
    /**
     * Areas searched for references
     */
    searchedIn: z.array(z.string()).describe('Areas searched for references to this element'),

    /**
     * Verification that no references were found
     */
    noReferencesFound: z.boolean().describe('Verification that no references were found'),

    /**
     * Search method used
     */
    searchMethod: z.string().describe('Search method used to look for references'),
  }),

  /**
   * Edge cases considered
   */
  edgeCasesConsidered: z
    .array(
      z.object({
        /**
         * Edge case description
         */
        case: z.string().describe('Edge case description'),

        /**
         * How this edge case was verified
         */
        verification: z.string().describe('How this edge case was verified'),
      }),
    )
    .describe('Edge cases considered during analysis'),

  /**
   * Additional evidence
   */
  additionalEvidence: z
    .string()
    .optional()
    .describe('Additional evidence supporting this conclusion'),
});

/**
 * Schema for a single unused code element with trace evidence
 */
export const TracedUnusedElementSchema = z.object({
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
   * Evidence of why this element is unused
   */
  evidence: TraceEvidenceSchema.describe('Evidence of why this element is unused'),

  /**
   * Potential risks of removing this element
   */
  removalRisks: z.string().optional().describe('Potential risks of removing this element'),
});

/**
 * Schema for the code tracing unused code review result
 */
export const CodeTracingUnusedCodeReviewSchema = z.object({
  /**
   * Unused files
   */
  unusedFiles: z
    .array(
      TracedUnusedElementSchema.refine((val) => val.elementType === 'file', {
        message: 'Element must be a file',
      }),
    )
    .describe('Files that are never imported or used'),

  /**
   * Unused functions
   */
  unusedFunctions: z
    .array(
      TracedUnusedElementSchema.refine(
        (val) => ['function', 'hook'].includes(val.elementType as string),
        {
          message: 'Element must be a function or hook',
        },
      ),
    )
    .describe('Functions that are never called'),

  /**
   * Unused classes
   */
  unusedClasses: z
    .array(
      TracedUnusedElementSchema.refine(
        (val) => ['class', 'component'].includes(val.elementType as string),
        {
          message: 'Element must be a class or component',
        },
      ),
    )
    .describe('Classes that are never instantiated'),

  /**
   * Unused types and interfaces
   */
  unusedTypesAndInterfaces: z
    .array(
      TracedUnusedElementSchema.refine(
        (val) => ['interface', 'type', 'enum'].includes(val.elementType as string),
        {
          message: 'Element must be an interface, type, or enum',
        },
      ),
    )
    .describe('Types and interfaces that are never used'),

  /**
   * Dead code branches
   */
  deadCodeBranches: z
    .array(
      TracedUnusedElementSchema.refine((val) => val.elementType === 'dead-branch', {
        message: 'Element must be a dead branch',
      }),
    )
    .describe('Code branches that can never execute'),

  /**
   * Unused variables and imports
   */
  unusedVariablesAndImports: z
    .array(
      TracedUnusedElementSchema.refine(
        (val) =>
          ['variable', 'import', 'parameter', 'property', 'export'].includes(
            val.elementType as string,
          ),
        {
          message: 'Element must be a variable, import, parameter, property, or export',
        },
      ),
    )
    .describe('Variables and imports that are never used'),

  /**
   * Analysis methodology used
   */
  analysisMethodology: z
    .object({
      /**
       * Entry points considered
       */
      entryPoints: z.array(z.string()).describe('Entry points considered in the analysis'),

      /**
       * Module resolution strategy
       */
      moduleResolution: z.string().describe('Module resolution strategy used'),

      /**
       * Reference tracking approach
       */
      referenceTracking: z.string().describe('Reference tracking approach used'),

      /**
       * Limitations of the analysis
       */
      limitations: z.array(z.string()).describe('Limitations of the analysis'),
    })
    .describe('Analysis methodology used to detect unused code'),

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
 * Type for traced unused element
 */
export type TracedUnusedElement = z.infer<typeof TracedUnusedElementSchema>;

/**
 * Type for the code tracing unused code review result
 */
export type CodeTracingUnusedCodeReview = z.infer<typeof CodeTracingUnusedCodeReviewSchema>;

/**
 * LangChain parser for code tracing unused code review
 * Simplified to avoid TypeScript deep instantiation issues
 */
export const codeTracingUnusedCodeReviewParser = StructuredOutputParser.fromZodSchema(
  CodeTracingUnusedCodeReviewSchema as any,
);

/**
 * Get format instructions for the code tracing unused code review parser
 * @returns Format instructions string
 */
export function getCodeTracingUnusedCodeReviewFormatInstructions(): string {
  return codeTracingUnusedCodeReviewParser.getFormatInstructions();
}
