/**
 * @fileoverview Utility functions for working with LangChain.
 *
 * This module provides utility functions for creating and using LangChain
 * elements like prompt templates, chains, and prompt optimization.
 */

import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
// import logger from '../../utils/logger';
import { z } from 'zod';
import type { ReviewOptions, ReviewType } from '../../types/review';

/**
 * Class for LangChain utilities
 */
export class LangChainUtils {
  /**
   * Create a basic prompt template
   * @param template Template string
   * @param inputVariables Input variables in the template
   * @returns LangChain prompt template
   */
  static createPromptTemplate(template: string, inputVariables: string[]): PromptTemplate {
    return new PromptTemplate({
      template,
      inputVariables,
    });
  }

  /**
   * Create a few-shot prompt template
   * @param prefix The prefix for the prompt
   * @param examples Array of example objects
   * @param examplePrompt Template for formatting examples
   * @param suffix The suffix for the prompt
   * @param inputVariables Variables for the overall template
   * @returns Few-shot prompt template
   */
  static createFewShotTemplate(
    prefix: string,
    examples: Record<string, string>[],
    examplePrompt: PromptTemplate,
    suffix: string,
    inputVariables: string[],
  ): FewShotPromptTemplate {
    return new FewShotPromptTemplate({
      prefix,
      examples,
      examplePrompt,
      suffix,
      inputVariables,
    });
  }

  /**
   * Create a structured output parser for review results
   * @param reviewType Type of review
   * @returns Structured output parser
   */
  static createReviewOutputParser(reviewType: ReviewType) {
    let schema;

    switch (reviewType) {
      case 'quick-fixes':
        schema = z.object({
          issues: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
              severity: z.enum(['critical', 'high', 'medium', 'low']),
              line: z.number().optional(),
              suggestion: z.string(),
            }),
          ),
          summary: z.string(),
        });
        break;

      case 'security':
        schema = z.object({
          vulnerabilities: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
              severity: z.enum(['critical', 'high', 'medium', 'low']),
              line: z.number().optional(),
              cwe: z.string().optional(),
              remediation: z.string(),
            }),
          ),
          summary: z.string(),
        });
        break;

      case 'performance':
        schema = z.object({
          issues: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
              impact: z.enum(['high', 'medium', 'low']),
              line: z.number().optional(),
              suggestion: z.string(),
            }),
          ),
          summary: z.string(),
        });
        break;

      case 'architectural':
        schema = z.object({
          findings: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
              category: z.enum(['design', 'structure', 'patterns', 'coupling', 'other']),
              suggestion: z.string(),
            }),
          ),
          summary: z.string(),
        });
        break;

      case 'consolidated':
        schema = z.object({
          quickFixes: z
            .array(
              z.object({
                title: z.string(),
                description: z.string(),
                severity: z.enum(['critical', 'high', 'medium', 'low']),
                line: z.number().optional(),
                suggestion: z.string(),
              }),
            )
            .optional(),
          security: z
            .array(
              z.object({
                title: z.string(),
                description: z.string(),
                severity: z.enum(['critical', 'high', 'medium', 'low']),
                cwe: z.string().optional(),
                remediation: z.string(),
              }),
            )
            .optional(),
          performance: z
            .array(
              z.object({
                title: z.string(),
                description: z.string(),
                impact: z.enum(['high', 'medium', 'low']),
                suggestion: z.string(),
              }),
            )
            .optional(),
          architecture: z
            .array(
              z.object({
                title: z.string(),
                description: z.string(),
                category: z.string(),
                suggestion: z.string(),
              }),
            )
            .optional(),
          summary: z.string(),
        });
        break;

      case 'unused-code': {
        // Define the evidence schema for traced unused elements
        const traceEvidenceSchema = z.object({
          definition: z.object({
            file: z.string().describe('File where the element is defined'),
            line: z.number().describe('Line number where the element is defined'),
            codeSnippet: z.string().describe('Code snippet showing the definition'),
          }),
          exports: z
            .array(
              z.object({
                file: z.string().describe('File where the element is exported'),
                line: z.number().describe('Line number where the element is exported'),
                exportType: z.string().describe('Export type (default, named, re-export, etc.)'),
              }),
            )
            .optional(),
          importSearch: z.object({
            searchedIn: z.array(z.string()).describe('Areas searched for imports'),
            noImportsFound: z.boolean().describe('Verification that no imports were found'),
            searchMethod: z.string().describe('Search method used to look for imports'),
          }),
          referenceSearch: z.object({
            searchedIn: z.array(z.string()).describe('Areas searched for references'),
            noReferencesFound: z.boolean().describe('Verification that no references were found'),
            searchMethod: z.string().describe('Search method used to look for references'),
          }),
          edgeCasesConsidered: z.array(
            z.object({
              case: z.string().describe('Edge case description'),
              verification: z.string().describe('How this edge case was verified'),
            }),
          ),
          additionalEvidence: z.string().optional().describe('Additional evidence'),
        });

        // Define the traced unused element schema
        const tracedUnusedElementSchema = z.object({
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
          name: z.string().describe('Name of the unused code element'),
          filePath: z.string().describe('File path containing the unused element'),
          location: z.object({
            startLine: z.number().describe('Starting line number'),
            endLine: z.number().optional().describe('Ending line number'),
          }),
          codeSnippet: z.string().describe('Code snippet showing the unused element'),
          confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level'),
          confidenceReason: z.string().describe('Explanation for the confidence level'),
          evidence: traceEvidenceSchema.describe('Evidence of why this element is unused'),
          removalRisks: z.string().optional().describe('Potential risks of removing this element'),
        });

        // Define the code tracing review schema
        schema = z.object({
          // Different categories of unused code
          unusedFiles: z
            .array(tracedUnusedElementSchema)
            .describe('Files that are never imported or used'),
          unusedFunctions: z
            .array(tracedUnusedElementSchema)
            .describe('Functions that are never called'),
          unusedClasses: z
            .array(tracedUnusedElementSchema)
            .describe('Classes that are never instantiated'),
          unusedTypesAndInterfaces: z
            .array(tracedUnusedElementSchema)
            .describe('Types and interfaces that are never used'),
          deadCodeBranches: z
            .array(tracedUnusedElementSchema)
            .describe('Code branches that can never execute'),
          unusedVariablesAndImports: z
            .array(tracedUnusedElementSchema)
            .describe('Variables and imports that are never used'),

          // Analysis methodology
          analysisMethodology: z.object({
            entryPoints: z.array(z.string()).describe('Entry points considered in the analysis'),
            moduleResolution: z.string().describe('Module resolution strategy used'),
            referenceTracking: z.string().describe('Reference tracking approach used'),
            limitations: z.array(z.string()).describe('Limitations of the analysis'),
          }),

          // Summary statistics
          summary: z.object({
            totalUnusedElements: z.number().describe('Total number of unused elements found'),
            highConfidenceCount: z.number().describe('Number of high-confidence findings'),
            filesWithUnusedCode: z.number().describe('Number of files containing unused code'),
            potentialCodeReduction: z
              .string()
              .describe('Estimated percentage of code that could be removed'),
          }),
        });
        break;
      }

      default:
        // Default schema for any type
        schema = z.object({
          issues: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
              suggestion: z.string().optional(),
            }),
          ),
          summary: z.string(),
        });
    }

    return StructuredOutputParser.fromZodSchema(schema as any);
  }

  /**
   * Extract template variables from a prompt string
   * @param template Template string
   * @returns Array of variable names
   */
  static extractVariables(template: string): string[] {
    // Extract variables using regex
    // Matches patterns like {{VARIABLE_NAME}} or {VARIABLE_NAME}
    const matches = template.match(/{{(\w+)}}|{(\w+)}/g) || [];

    // Extract variable names from matches
    return matches.map((match) => {
      // Remove {{ and }} or { and }
      return match.replace(/{{|}}/g, '').replace(/{|}/g, '');
    });
  }

  /**
   * Create examples for few-shot prompting from review options
   * @param options Review options
   * @returns Array of examples
   */
  static createExamples(options: ReviewOptions): Record<string, string>[] {
    // Default examples if none provided
    if (!options.examples || options.examples.length === 0) {
      return getLangChainDefaultExamples(options.type || 'quick-fixes');
    }

    // Convert Record<string, unknown>[] to Record<string, string>[]
    return options.examples.map((example) => {
      const stringExample: Record<string, string> = {};
      Object.entries(example).forEach(([key, value]) => {
        stringExample[key] = String(value);
      });
      return stringExample;
    });
  }
}

/**
 * Get default examples for a specific review type
 * @param reviewType Type of review
 * @returns Array of default examples
 */
function getLangChainDefaultExamples(reviewType: ReviewType): Record<string, string>[] {
  switch (reviewType) {
    case 'quick-fixes':
      return [
        {
          code: 'function calculateTotal(items) {\n  let total = 0;\n  for (let i = 0; i < items.length; i++) {\n    total += items[i].price;\n  }\n  return total;\n}',
          review:
            'This function lacks input validation. It should check if items is an array and if each item has a price property.',
        },
        {
          code: 'async function fetchData() {\n  const response = await fetch("/api/data");\n  const data = await response.json();\n  return data;\n}',
          review:
            "This function doesn't handle errors. It should use try/catch to handle potential fetch or JSON parsing errors.",
        },
      ];

    case 'security':
      return [
        {
          code: 'function processUserInput(input) {\n  const query = `SELECT * FROM users WHERE name = "${input}"`;\n  return db.execute(query);\n}',
          review:
            'SQL Injection vulnerability: User input is directly concatenated into SQL query. Use parameterized queries instead.',
        },
        {
          code: 'app.get("/user", (req, res) => {\n  const userId = req.query.id;\n  res.send(`User ID: ${userId}`);\n})',
          review:
            'Cross-Site Scripting (XSS) vulnerability: User input is directly inserted into HTML response without sanitization.',
        },
      ];

    case 'unused-code':
      return [
        {
          code: `// src/utils/helpers.ts\nexport function formatDate(date: Date): string {\n  return date.toISOString().split('T')[0];\n}\n\nexport function calculateAge(birthDate: Date): number {\n  const today = new Date();\n  let age = today.getFullYear() - birthDate.getFullYear();\n  return age;\n}\n\n// src/utils/index.ts\nexport { formatDate } from './helpers';\n\n// src/components/Profile.tsx\nimport { formatDate } from '../utils';`,
          analysis: `The \`calculateAge\` function in src/utils/helpers.ts is unused:
1. It's defined and exported in helpers.ts
2. However, it's not re-exported in the utils/index.ts barrel file
3. I searched the entire codebase and found no direct imports from './helpers'
4. Only formatDate is imported via the barrel file in Profile.tsx
5. No dynamic imports or requires use this function
6. No references to this function name exist in string literals or comments that would indicate dynamic usage
7. HIGH confidence: This function can be safely removed as it's not referenced anywhere in the codebase.`,
        },
        {
          code: `// src/types/common.ts\nexport interface UserConfig {\n  id: string;\n  preferences: Record<string, unknown>;\n}\n\nexport interface AdminConfig extends UserConfig {\n  permissions: string[];\n}\n\n// Usage across files\nimport { AdminConfig } from './types/common';\n\nfunction setupAdmin(config: AdminConfig) {\n  // Implementation\n}`,
          analysis: `The \`UserConfig\` interface is actively used:
1. It's defined and exported in types/common.ts
2. While there are no direct imports of UserConfig
3. It's extended by AdminConfig which is imported and used
4. The interface forms part of the type hierarchy
5. LOW confidence: Cannot be removed as it's indirectly used via inheritance`,
        },
      ];

    default:
      return [
        {
          code: 'const sampleCode = "example";\nconsole.log(sampleCode);',
          review: 'Simple code that logs a variable.',
        },
      ];
  }
}
