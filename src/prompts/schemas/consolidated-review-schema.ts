/**
 * @fileoverview Schema definition for consolidated code reviews with grading.
 *
 * This module defines the TypeScript interfaces and Zod schemas for the consolidated code review schema
 * that includes comprehensive grading across multiple files. The schema is designed to provide
 * a holistic assessment of the entire codebase with detailed grading categories.
 */

import { z } from 'zod';

/**
 * Grade levels following academic grading scale
 */
export const GradeLevel = z.enum([
  'A+',
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'D+',
  'D',
  'D-',
  'F',
]);

export type GradeLevel = z.infer<typeof GradeLevel>;

/**
 * Grading categories for comprehensive assessment
 */
export const GradeCategoriesSchema = z.object({
  functionality: GradeLevel,
  codeQuality: GradeLevel,
  documentation: GradeLevel,
  testing: GradeLevel,
  maintainability: GradeLevel,
  security: GradeLevel,
  performance: GradeLevel,
});

export type GradeCategories = z.infer<typeof GradeCategoriesSchema>;

/**
 * Issue priority levels
 */
export const IssuePriority = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type IssuePriority = z.infer<typeof IssuePriority>;

/**
 * A single issue identified in the consolidated review
 */
export const ConsolidatedIssueSchema = z.object({
  id: z.string().describe('Unique identifier for the issue'),
  priority: IssuePriority,
  title: z.string().describe('Brief title describing the issue'),
  description: z.string().describe('Detailed description of the issue'),
  files: z.array(z.string()).describe('Files affected by this issue'),
  recommendation: z.string().describe('Recommended fix or improvement'),
  impact: z.string().describe('Impact of fixing this issue'),
});

export type ConsolidatedIssue = z.infer<typeof ConsolidatedIssueSchema>;

/**
 * Strength identified in the codebase
 */
export const StrengthSchema = z.object({
  title: z.string().describe('Brief title of the strength'),
  description: z.string().describe('Detailed description'),
  files: z.array(z.string()).optional().describe('Examples of files demonstrating this strength'),
});

export type Strength = z.infer<typeof StrengthSchema>;

/**
 * Architectural insight or pattern
 */
export const ArchitecturalInsightSchema = z.object({
  title: z.string().describe('Title of the architectural insight'),
  description: z.string().describe('Detailed explanation'),
  recommendation: z.string().optional().describe('Recommended improvements'),
  relatedFiles: z.array(z.string()).optional().describe('Files related to this insight'),
});

export type ArchitecturalInsight = z.infer<typeof ArchitecturalInsightSchema>;

/**
 * Main consolidated review schema
 */
export const ConsolidatedReviewSchema = z.object({
  version: z.literal('1.0').describe('Schema version'),
  timestamp: z.string().describe('ISO 8601 timestamp'),
  projectName: z.string().describe('Name of the reviewed project'),
  filesReviewed: z.number().describe('Total number of files reviewed'),

  // Overall assessment
  executiveSummary: z.string().describe('Executive summary of the review'),
  overallGrade: GradeLevel.describe('Overall grade for the codebase'),
  gradeRationale: z.string().describe('Explanation for the overall grade'),

  // Detailed grading
  gradeCategories: GradeCategoriesSchema.describe('Grades by category'),
  categoryRationale: z
    .object({
      functionality: z.string(),
      codeQuality: z.string(),
      documentation: z.string(),
      testing: z.string(),
      maintainability: z.string(),
      security: z.string(),
      performance: z.string(),
    })
    .describe('Rationale for each category grade'),

  // Issues by priority
  issues: z.object({
    high: z.array(ConsolidatedIssueSchema).describe('High priority issues'),
    medium: z.array(ConsolidatedIssueSchema).describe('Medium priority issues'),
    low: z.array(ConsolidatedIssueSchema).describe('Low priority issues'),
  }),

  // Positive aspects
  strengths: z.array(StrengthSchema).describe('Strengths identified in the codebase'),

  // Architectural insights
  architecturalInsights: z
    .array(ArchitecturalInsightSchema)
    .optional()
    .describe('Architectural patterns and insights'),

  // Summary statistics
  summary: z.object({
    totalIssues: z.number(),
    highPriorityIssues: z.number(),
    mediumPriorityIssues: z.number(),
    lowPriorityIssues: z.number(),
    totalStrengths: z.number(),
  }),

  // Recommendations
  recommendations: z.object({
    immediate: z.array(z.string()).describe('Actions to take immediately'),
    shortTerm: z.array(z.string()).describe('Actions for the next sprint/iteration'),
    longTerm: z.array(z.string()).describe('Strategic improvements'),
  }),
});

export type ConsolidatedReview = z.infer<typeof ConsolidatedReviewSchema>;

/**
 * Root object for the consolidated review schema
 */
export const ConsolidatedReviewRootSchema = z.object({
  review: ConsolidatedReviewSchema,
});

export type ConsolidatedReviewRoot = z.infer<typeof ConsolidatedReviewRootSchema>;

/**
 * Get the schema as a string for inclusion in prompts
 */
export function getConsolidatedSchemaAsString(): string {
  return `{
  "review": {
    "version": "1.0",
    "timestamp": "2024-04-06T12:00:00Z",
    "projectName": "my-project",
    "filesReviewed": 150,
    
    "executiveSummary": "This codebase demonstrates solid engineering practices with room for improvement in testing and documentation...",
    "overallGrade": "B+",
    "gradeRationale": "The code is well-structured and functional, but lacks comprehensive testing and documentation...",
    
    "gradeCategories": {
      "functionality": "A-",
      "codeQuality": "B+",
      "documentation": "C+",
      "testing": "C",
      "maintainability": "B",
      "security": "B+",
      "performance": "B"
    },
    
    "categoryRationale": {
      "functionality": "All features work as expected with minimal bugs...",
      "codeQuality": "Code follows consistent patterns but has some complexity issues...",
      "documentation": "Basic documentation exists but lacks comprehensive API docs...",
      "testing": "Test coverage is below 60% with missing edge cases...",
      "maintainability": "Good module structure but some tight coupling exists...",
      "security": "Good security practices with minor input validation gaps...",
      "performance": "Generally performant with some optimization opportunities..."
    },
    
    "issues": {
      "high": [
        {
          "id": "ISSUE-001",
          "priority": "HIGH",
          "title": "Missing input validation in API endpoints",
          "description": "Several API endpoints lack proper input validation...",
          "files": ["src/api/users.ts", "src/api/products.ts"],
          "recommendation": "Implement comprehensive input validation using Zod or similar...",
          "impact": "Prevents potential security vulnerabilities and improves API reliability"
        }
      ],
      "medium": [...],
      "low": [...]
    },
    
    "strengths": [
      {
        "title": "Well-structured component architecture",
        "description": "The React components follow a clear and consistent structure...",
        "files": ["src/components/", "src/features/"]
      }
    ],
    
    "architecturalInsights": [
      {
        "title": "Effective use of dependency injection",
        "description": "The service layer uses dependency injection well...",
        "recommendation": "Consider extending this pattern to the data layer",
        "relatedFiles": ["src/services/", "src/core/"]
      }
    ],
    
    "summary": {
      "totalIssues": 45,
      "highPriorityIssues": 5,
      "mediumPriorityIssues": 15,
      "lowPriorityIssues": 25,
      "totalStrengths": 8
    },
    
    "recommendations": {
      "immediate": [
        "Add input validation to all API endpoints",
        "Fix the critical security vulnerability in authentication"
      ],
      "shortTerm": [
        "Increase test coverage to at least 80%",
        "Add comprehensive API documentation"
      ],
      "longTerm": [
        "Refactor the monolithic services into microservices",
        "Implement performance monitoring and optimization"
      ]
    }
  }
}`;
}

/**
 * Get schema instructions for consolidated reviews
 */
export function getConsolidatedSchemaInstructions(): string {
  return `
IMPORTANT: For consolidated reviews, you MUST format your response as a valid JSON object following this exact schema:

${getConsolidatedSchemaAsString()}

Guidelines for filling the schema:

1. **Grading System**:
   - Use standard academic grades: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F
   - A+ to A-: Exceptional code with minimal issues
   - B+ to B-: Good code with some minor improvements needed
   - C+ to C-: Average code with several issues that should be addressed
   - D+ to D-: Problematic code with significant issues requiring attention
   - F: Critical issues that make the code unsuitable for production

2. **Grade Categories**:
   - functionality: How well the code performs its intended purpose
   - codeQuality: Cleanliness, readability, and adherence to best practices
   - documentation: Quality and completeness of documentation
   - testing: Test coverage and quality
   - maintainability: How easy it is to modify and extend the code
   - security: Security practices and vulnerability prevention
   - performance: Efficiency and optimization

3. **Issues**:
   - Group issues by priority (HIGH, MEDIUM, LOW)
   - Each issue must have a unique ID
   - Include specific files affected by each issue
   - Provide actionable recommendations

4. **Executive Summary**:
   - Provide a high-level overview suitable for stakeholders
   - Include the most critical findings and overall assessment

5. **Recommendations**:
   - immediate: Critical fixes needed now
   - shortTerm: Important improvements for the next sprint
   - longTerm: Strategic enhancements for future consideration

Your response must be valid JSON that can be parsed programmatically. Do not include any text outside of the JSON structure.
`;
}

/**
 * Export schema for use in other modules
 */
export const consolidatedReviewSchema = ConsolidatedReviewRootSchema;
