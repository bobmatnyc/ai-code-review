/**
 * @fileoverview Type definitions for the structured code review schema.
 * 
 * This module defines the TypeScript interfaces for the structured code review schema
 * used in interactive mode. The schema is designed to be both human-readable and
 * machine-parseable, making it easy for AI tools to process and act on the review results.
 */

/**
 * Priority level for code review issues
 */
export enum IssuePriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Location of an issue in the code
 */
export interface IssueLocation {
  startLine: number;
  endLine: number;
}

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

/**
 * Review results for a single file
 */
export interface FileReview {
  filePath: string;
  issues: ReviewIssue[];
}

/**
 * Summary statistics for the code review
 */
export interface ReviewSummary {
  highPriorityIssues: number;
  mediumPriorityIssues: number;
  lowPriorityIssues: number;
  totalIssues: number;
}

/**
 * Complete code review results
 */
export interface CodeReview {
  version: string;
  timestamp: string;
  files: FileReview[];
  summary: ReviewSummary;
}

/**
 * Root object for the code review schema
 */
export interface ReviewSchema {
  review: CodeReview;
}

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
