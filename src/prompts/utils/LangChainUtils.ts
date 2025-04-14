/**
 * @fileoverview Utility functions for working with LangChain.
 *
 * This module provides utility functions for creating and using LangChain
 * elements like prompt templates, chains, and prompt optimization.
 */

import { PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ReviewType, ReviewOptions } from '../../types/review';
import logger from '../../utils/logger';
import { z } from 'zod';

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
      inputVariables
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
    inputVariables: string[]
  ): FewShotPromptTemplate {
    return new FewShotPromptTemplate({
      prefix,
      examples,
      examplePrompt,
      suffix,
      inputVariables
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
          issues: z.array(z.object({
            title: z.string(),
            description: z.string(),
            severity: z.enum(['critical', 'high', 'medium', 'low']),
            line: z.number().optional(),
            suggestion: z.string()
          })),
          summary: z.string()
        });
        break;
        
      case 'security':
        schema = z.object({
          vulnerabilities: z.array(z.object({
            title: z.string(),
            description: z.string(),
            severity: z.enum(['critical', 'high', 'medium', 'low']),
            line: z.number().optional(),
            cwe: z.string().optional(),
            remediation: z.string()
          })),
          summary: z.string()
        });
        break;
        
      case 'performance':
        schema = z.object({
          issues: z.array(z.object({
            title: z.string(),
            description: z.string(),
            impact: z.enum(['high', 'medium', 'low']),
            line: z.number().optional(),
            suggestion: z.string()
          })),
          summary: z.string()
        });
        break;
        
      case 'architectural':
        schema = z.object({
          findings: z.array(z.object({
            title: z.string(),
            description: z.string(),
            category: z.enum(['design', 'structure', 'patterns', 'coupling', 'other']),
            suggestion: z.string()
          })),
          summary: z.string()
        });
        break;
        
      case 'consolidated':
        schema = z.object({
          quickFixes: z.array(z.object({
            title: z.string(),
            description: z.string(),
            severity: z.enum(['critical', 'high', 'medium', 'low']),
            line: z.number().optional(),
            suggestion: z.string()
          })).optional(),
          security: z.array(z.object({
            title: z.string(),
            description: z.string(),
            severity: z.enum(['critical', 'high', 'medium', 'low']),
            cwe: z.string().optional(),
            remediation: z.string()
          })).optional(),
          performance: z.array(z.object({
            title: z.string(),
            description: z.string(),
            impact: z.enum(['high', 'medium', 'low']),
            suggestion: z.string()
          })).optional(),
          architecture: z.array(z.object({
            title: z.string(),
            description: z.string(),
            category: z.string(),
            suggestion: z.string()
          })).optional(),
          summary: z.string()
        });
        break;
        
      default:
        // Default schema for any type
        schema = z.object({
          issues: z.array(z.object({
            title: z.string(),
            description: z.string(),
            suggestion: z.string().optional()
          })),
          summary: z.string()
        });
    }
    
    return StructuredOutputParser.fromZodSchema(schema);
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
    return matches.map(match => {
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
    
    return options.examples;
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
          review: 'This function lacks input validation. It should check if items is an array and if each item has a price property.'
        },
        {
          code: 'async function fetchData() {\n  const response = await fetch("/api/data");\n  const data = await response.json();\n  return data;\n}',
          review: 'This function doesn\'t handle errors. It should use try/catch to handle potential fetch or JSON parsing errors.'
        }
      ];
      
    case 'security':
      return [
        {
          code: 'function processUserInput(input) {\n  const query = `SELECT * FROM users WHERE name = "${input}"`;\n  return db.execute(query);\n}',
          review: 'SQL Injection vulnerability: User input is directly concatenated into SQL query. Use parameterized queries instead.'
        },
        {
          code: 'app.get("/user", (req, res) => {\n  const userId = req.query.id;\n  res.send(`User ID: ${userId}`);\n})',
          review: 'Cross-Site Scripting (XSS) vulnerability: User input is directly inserted into HTML response without sanitization.'
        }
      ];
      
    default:
      return [
        {
          code: 'const sampleCode = "example";\nconsole.log(sampleCode);',
          review: 'Simple code that logs a variable.'
        }
      ];
  }
}