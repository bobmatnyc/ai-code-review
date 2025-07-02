/**
 * @fileoverview Type definitions for the structured code review schema.
 *
 * This module defines the TypeScript interfaces and Zod schemas for the structured code review schema
 * used in interactive mode. The schema is designed to be both human-readable and
 * machine-parseable, making it easy for AI tools to process and act on the review results.
 */

import { z } from 'zod';

/**
 * Priority level for code review issues
 */
export enum IssuePriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// Zod schema for issue priority
export const issuePrioritySchema = z.nativeEnum(IssuePriority);

/**
 * Location of an issue in the code
 */
export interface IssueLocation {
  startLine: number;
  endLine: number;
}

// Zod schema for issue location
export const issueLocationSchema = z.object({
  startLine: z.number(),
  endLine: z.number(),
});

/**
 * A single issue identified in the code review
 */
export interface ReviewIssue {
  id: string;
  priority: IssuePriority;
  description: string;
  location: IssueLocation;
  currentCode: string;
  suggestedCode: string;
  explanation: string;
}

// Zod schema for review issue
export const reviewIssueSchema = z.object({
  id: z.string(),
  priority: issuePrioritySchema,
  description: z.string(),
  location: issueLocationSchema,
  currentCode: z.string(),
  suggestedCode: z.string(),
  explanation: z.string(),
});

/**
 * Review results for a single file
 */
export interface FileReview {
  filePath: string;
  issues: ReviewIssue[];
}

// Zod schema for file review
export const fileReviewSchema = z.object({
  filePath: z.string(),
  issues: z.array(reviewIssueSchema),
});

/**
 * Summary statistics for the code review
 */
export interface ReviewSummary {
  highPriorityIssues: number;
  mediumPriorityIssues: number;
  lowPriorityIssues: number;
  totalIssues: number;
}

// Zod schema for review summary
export const reviewSummarySchema = z.object({
  highPriorityIssues: z.number(),
  mediumPriorityIssues: z.number(),
  lowPriorityIssues: z.number(),
  totalIssues: z.number(),
});

/**
 * Complete code review results
 */
export interface CodeReview {
  version: string;
  timestamp: string;
  files: FileReview[];
  summary: ReviewSummary;
}

// Zod schema for code review
export const codeReviewSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  files: z.array(fileReviewSchema),
  summary: reviewSummarySchema,
});

/**
 * Root object for the code review schema
 */
export interface ReviewSchema {
  review: CodeReview;
}

// Zod schema for review schema
export const reviewSchema = z.object({
  review: codeReviewSchema,
});

/**
 * Get the schema as a string for inclusion in prompts
 */
export function getSchemaAsString(): string {
  return `
{
  "review": {
    "version": "1.0",
    "timestamp": "2024-04-06T12:00:00Z",
    "files": [
      {
        "filePath": "path/to/file.ts",
        "issues": [
          {
            "id": "ISSUE-1",
            "priority": "HIGH", // One of: HIGH, MEDIUM, LOW
            "description": "Description of the issue",
            "location": {
              "startLine": 10,
              "endLine": 15
            },
            "currentCode": "function example() {\\n  // Problematic code here\\n}",
            "suggestedCode": "function example() {\\n  // Improved code here\\n}",
            "explanation": "Detailed explanation of why this change is recommended"
          }
        ]
      }
    ],
    "summary": {
      "highPriorityIssues": 1,
      "mediumPriorityIssues": 2,
      "lowPriorityIssues": 3,
      "totalIssues": 6
    }
  }
}
`;
}

/**
 * Get schema instructions for inclusion in prompts
 */
export function getSchemaInstructions(): string {
  return `
IMPORTANT: In interactive mode, you MUST format your response as a valid JSON object following this exact schema:

${getSchemaAsString()}

Guidelines for filling the schema:
1. Each issue must have a unique ID (e.g., "ISSUE-1", "ISSUE-2")
2. Priority must be one of: "HIGH", "MEDIUM", "LOW"
3. Location should include the start and end line numbers of the affected code
4. Current code should be the exact code snippet that needs to be changed
5. Suggested code should be the improved version of the code
6. Explanation should provide a detailed rationale for the suggested change
7. The summary should accurately count the number of issues by priority

Your response must be valid JSON that can be parsed programmatically. Do not include any text outside of the JSON structure.
`;
}
