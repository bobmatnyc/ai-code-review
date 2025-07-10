/**
 * @fileoverview Schema definition for coding test assessments.
 *
 * This module defines the TypeScript interfaces and Zod schemas for coding test
 * assessments that evaluate candidate submissions against assignment requirements.
 */

import { z } from 'zod';

/**
 * Assessment types for coding tests
 */
export const AssessmentType = z.enum([
  'coding-challenge',
  'take-home',
  'live-coding',
  'code-review',
]);
export type AssessmentType = z.infer<typeof AssessmentType>;

/**
 * Difficulty levels for coding tests
 */
export const DifficultyLevel = z.enum(['junior', 'mid', 'senior', 'lead', 'architect']);
export type DifficultyLevel = z.infer<typeof DifficultyLevel>;

/**
 * Scoring systems for coding tests
 */
export const ScoringSystem = z.enum(['numeric', 'letter', 'pass-fail', 'custom']);
export type ScoringSystem = z.infer<typeof ScoringSystem>;

/**
 * Feedback detail levels
 */
export const FeedbackLevel = z.enum(['basic', 'detailed', 'comprehensive']);
export type FeedbackLevel = z.infer<typeof FeedbackLevel>;

/**
 * Pass/fail status
 */
export const PassFailStatus = z.enum(['pass', 'fail']);
export type PassFailStatus = z.infer<typeof PassFailStatus>;

/**
 * Individual criterion assessment
 */
export const CriterionAssessmentSchema = z.object({
  score: z.number().min(0).describe('Score achieved for this criterion'),
  maxScore: z.number().min(0).describe('Maximum possible score for this criterion'),
  percentage: z.number().min(0).max(100).describe('Percentage score for this criterion'),
  weight: z.number().min(0).max(100).describe('Weight of this criterion in overall assessment'),
  assessment: z.string().describe('Detailed assessment of this criterion'),
  strengths: z.array(z.string()).describe('Specific strengths observed'),
  weaknesses: z.array(z.string()).describe('Areas for improvement'),
  examples: z
    .array(
      z.object({
        type: z.enum(['good', 'bad', 'improvement']),
        description: z.string(),
        code: z.string().optional(),
        file: z.string().optional(),
        line: z.number().optional(),
      }),
    )
    .optional()
    .describe('Code examples supporting the assessment'),
});

export type CriterionAssessment = z.infer<typeof CriterionAssessmentSchema>;

/**
 * Overall score breakdown
 */
export const ScoreBreakdownSchema = z.object({
  total: z.number().min(0).describe('Total score achieved'),
  maxScore: z.number().min(0).describe('Maximum possible score'),
  percentage: z.number().min(0).max(100).describe('Overall percentage score'),
  status: PassFailStatus.describe('Overall pass/fail status'),
  passingThreshold: z.number().min(0).max(100).describe('Threshold for passing'),

  // Individual criteria scores
  correctness: CriterionAssessmentSchema.optional(),
  codeQuality: CriterionAssessmentSchema.optional(),
  architecture: CriterionAssessmentSchema.optional(),
  performance: CriterionAssessmentSchema.optional(),
  testing: CriterionAssessmentSchema.optional(),
  documentation: CriterionAssessmentSchema.optional(),
  errorHandling: CriterionAssessmentSchema.optional(),
  security: CriterionAssessmentSchema.optional(),
});

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

/**
 * Assignment information
 */
export const AssignmentInfoSchema = z.object({
  title: z.string().optional().describe('Assignment title'),
  description: z.string().optional().describe('Assignment description'),
  requirements: z.array(z.string()).optional().describe('Assignment requirements'),
  type: AssessmentType.describe('Type of assessment'),
  difficulty: DifficultyLevel.describe('Difficulty level'),
  timeLimit: z.number().optional().describe('Time limit in minutes'),
  actualTime: z.number().optional().describe('Actual time taken in minutes'),
});

export type AssignmentInfo = z.infer<typeof AssignmentInfoSchema>;

/**
 * Technical analysis metrics
 */
export const TechnicalAnalysisSchema = z.object({
  languageDetected: z.string().describe('Primary programming language detected'),
  frameworkDetected: z.string().optional().describe('Framework detected'),
  linesOfCode: z.number().min(0).describe('Total lines of code'),
  filesAnalyzed: z.number().min(0).describe('Number of files analyzed'),
  testCoverage: z.number().min(0).max(100).optional().describe('Test coverage percentage'),
  eslintIssues: z.number().min(0).optional().describe('Number of ESLint issues'),
  securityIssues: z.number().min(0).optional().describe('Number of security issues'),
  performanceScore: z.number().min(0).max(100).optional().describe('Performance score'),
  complexityMetrics: z
    .object({
      cyclomaticComplexity: z.number().optional(),
      maintainabilityIndex: z.number().optional(),
      cognitiveComplexity: z.number().optional(),
    })
    .optional(),
});

export type TechnicalAnalysis = z.infer<typeof TechnicalAnalysisSchema>;

/**
 * Recommendation categories
 */
export const RecommendationSchema = z.object({
  priority: z.enum(['high', 'medium', 'low']).describe('Priority level'),
  category: z
    .enum([
      'correctness',
      'code-quality',
      'architecture',
      'performance',
      'testing',
      'documentation',
      'security',
    ])
    .describe('Category of recommendation'),
  description: z.string().describe('Detailed description of the recommendation'),
  impact: z.string().describe('Expected impact of implementing this recommendation'),
  resources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        type: z.enum(['documentation', 'tutorial', 'article', 'tool', 'library']).optional(),
      }),
    )
    .optional()
    .describe('Learning resources related to this recommendation'),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Candidate evaluation summary
 */
export const CandidateEvaluationSchema = z.object({
  overallSummary: z.string().describe('Overall assessment summary'),
  hiringRecommendation: z
    .enum(['strongly-recommend', 'recommend', 'conditional', 'not-recommend'])
    .describe('Hiring recommendation'),
  skillLevel: z
    .enum(['junior', 'mid', 'senior', 'lead', 'architect'])
    .describe('Assessed skill level'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Confidence in assessment'),
  keyStrengths: z.array(z.string()).describe('Key strengths identified'),
  keyWeaknesses: z.array(z.string()).describe('Key weaknesses identified'),
  developmentAreas: z.array(z.string()).describe('Areas for professional development'),
});

export type CandidateEvaluation = z.infer<typeof CandidateEvaluationSchema>;

/**
 * Main coding test assessment schema
 */
export const CodingTestAssessmentSchema = z.object({
  version: z.literal('1.0').describe('Schema version'),
  timestamp: z.string().describe('ISO 8601 timestamp'),
  candidateId: z.string().optional().describe('Candidate identifier'),

  // Assessment metadata
  assignment: AssignmentInfoSchema,
  toolVersion: z.string().describe('Version of the assessment tool'),

  // Core assessment
  score: ScoreBreakdownSchema,
  evaluation: CandidateEvaluationSchema,

  // Technical analysis
  technicalAnalysis: TechnicalAnalysisSchema,

  // Feedback and recommendations
  feedback: z.object({
    level: FeedbackLevel.describe('Level of feedback provided'),
    overallFeedback: z.string().describe('Overall feedback summary'),
    detailedFeedback: z.string().describe('Detailed feedback with specific examples'),
    recommendations: z
      .array(RecommendationSchema)
      .describe('Specific recommendations for improvement'),
  }),

  // Additional context
  assessmentContext: z.object({
    reviewType: z.literal('coding-test'),
    model: z.string().optional().describe('AI model used for assessment'),
    duration: z.number().optional().describe('Assessment duration in seconds'),
    constraints: z
      .object({
        allowedLibraries: z.array(z.string()).optional(),
        forbiddenPatterns: z.array(z.string()).optional(),
        targetLanguage: z.string().optional(),
        framework: z.string().optional(),
      })
      .optional(),
  }),
});

export type CodingTestAssessment = z.infer<typeof CodingTestAssessmentSchema>;

/**
 * Root object for coding test assessment
 */
export const CodingTestAssessmentRootSchema = z.object({
  codingTestAssessment: CodingTestAssessmentSchema,
});

export type CodingTestAssessmentRoot = z.infer<typeof CodingTestAssessmentRootSchema>;

/**
 * Get the schema as a string for inclusion in prompts
 */
export function getCodingTestSchemaAsString(): string {
  return `{
  "codingTestAssessment": {
    "version": "1.0",
    "timestamp": "2024-07-09T12:00:00Z",
    "candidateId": "candidate-123",
    
    "assignment": {
      "title": "E-commerce API Development",
      "description": "Build a RESTful API for an e-commerce platform with user authentication, product catalog, and order management",
      "requirements": [
        "Implement user authentication with JWT",
        "Create product catalog with CRUD operations",
        "Add shopping cart functionality",
        "Include order management system"
      ],
      "type": "take-home",
      "difficulty": "senior",
      "timeLimit": 240,
      "actualTime": 180
    },
    
    "toolVersion": "4.3.1",
    
    "score": {
      "total": 78,
      "maxScore": 100,
      "percentage": 78,
      "status": "pass",
      "passingThreshold": 70,
      
      "correctness": {
        "score": 25,
        "maxScore": 30,
        "percentage": 83.3,
        "weight": 30,
        "assessment": "Most functional requirements implemented correctly",
        "strengths": [
          "All API endpoints implemented and working",
          "Proper HTTP status codes used",
          "Request validation implemented"
        ],
        "weaknesses": [
          "Missing pagination in product listing",
          "Error handling could be more robust"
        ],
        "examples": [
          {
            "type": "good",
            "description": "Proper input validation",
            "code": "const { error } = userSchema.validate(req.body);",
            "file": "routes/users.js",
            "line": 25
          }
        ]
      },
      
      "codeQuality": {
        "score": 20,
        "maxScore": 25,
        "percentage": 80,
        "weight": 25,
        "assessment": "Good code structure with room for improvement",
        "strengths": [
          "Consistent naming conventions",
          "Proper separation of concerns",
          "Good use of TypeScript types"
        ],
        "weaknesses": [
          "Some functions are too long",
          "Missing JSDoc comments",
          "Could benefit from more abstraction"
        ]
      }
    },
    
    "evaluation": {
      "overallSummary": "Strong technical solution with solid implementation of core requirements. Code quality is good but could be enhanced with better documentation and more modular design.",
      "hiringRecommendation": "recommend",
      "skillLevel": "senior",
      "confidence": "high",
      "keyStrengths": [
        "Strong understanding of API design principles",
        "Good error handling practices",
        "Appropriate use of authentication patterns"
      ],
      "keyWeaknesses": [
        "Documentation could be more comprehensive",
        "Some code duplication in validation logic",
        "Limited test coverage"
      ],
      "developmentAreas": [
        "API documentation and specification",
        "Test-driven development practices",
        "Performance optimization techniques"
      ]
    },
    
    "technicalAnalysis": {
      "languageDetected": "typescript",
      "frameworkDetected": "express",
      "linesOfCode": 1250,
      "filesAnalyzed": 15,
      "testCoverage": 65,
      "eslintIssues": 3,
      "securityIssues": 0,
      "performanceScore": 85,
      "complexityMetrics": {
        "cyclomaticComplexity": 4.2,
        "maintainabilityIndex": 72,
        "cognitiveComplexity": 3.8
      }
    },
    
    "feedback": {
      "level": "comprehensive",
      "overallFeedback": "Your solution demonstrates strong technical competence with a solid understanding of API development principles. The code is well-structured and follows many best practices.",
      "detailedFeedback": "The implementation shows good separation of concerns with clear routing, middleware, and data access layers. Authentication is properly implemented using JWT tokens. However, there are opportunities for improvement in documentation and test coverage.",
      "recommendations": [
        {
          "priority": "high",
          "category": "documentation",
          "description": "Add comprehensive API documentation using OpenAPI/Swagger specification",
          "impact": "Improved maintainability and developer experience",
          "resources": [
            {
              "title": "OpenAPI Specification",
              "url": "https://swagger.io/specification/",
              "type": "documentation"
            }
          ]
        },
        {
          "priority": "medium",
          "category": "testing",
          "description": "Increase test coverage with integration tests for API endpoints",
          "impact": "Better reliability and confidence in deployments",
          "resources": [
            {
              "title": "Testing Node.js Applications",
              "url": "https://nodejs.org/en/docs/guides/testing/",
              "type": "tutorial"
            }
          ]
        }
      ]
    },
    
    "assessmentContext": {
      "reviewType": "coding-test",
      "model": "claude-3-sonnet",
      "duration": 120,
      "constraints": {
        "allowedLibraries": ["express", "joi", "jsonwebtoken"],
        "forbiddenPatterns": ["eval", "Function"],
        "targetLanguage": "typescript",
        "framework": "express"
      }
    }
  }
}`;
}

/**
 * Get schema instructions for coding test assessments
 */
export function getCodingTestSchemaInstructions(): string {
  return `
IMPORTANT: For coding test assessments, you MUST format your response as a valid JSON object following this exact schema:

${getCodingTestSchemaAsString()}

Guidelines for filling the schema:

1. **Score Calculation**:
   - Calculate individual criterion scores based on the defined weights
   - Ensure the total score is the sum of all criterion scores
   - Determine pass/fail status based on the passing threshold

2. **Assessment Quality**:
   - Provide specific examples from the code to support assessments
   - Include both positive and negative examples where relevant
   - Reference actual file names and line numbers when possible

3. **Candidate Evaluation**:
   - Base hiring recommendation on overall performance and role requirements
   - Assess skill level based on code sophistication and best practices
   - Provide actionable feedback for improvement

4. **Technical Analysis**:
   - Include measurable metrics where possible
   - Report actual findings, not assumptions
   - Provide realistic complexity and performance assessments

5. **Recommendations**:
   - Prioritize recommendations based on impact and feasibility
   - Include specific, actionable advice
   - Provide relevant learning resources

Your response must be valid JSON that can be parsed programmatically. Do not include any text outside of the JSON structure.
`;
}

/**
 * Export schema for use in other modules
 */
export const codingTestAssessmentSchema = CodingTestAssessmentRootSchema;
