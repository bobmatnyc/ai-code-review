/**
 * @fileoverview Schema definition for evaluation reviews that assess developer skill and AI assistance.
 *
 * This module defines the TypeScript interfaces and Zod schemas for the evaluation review schema
 * that focuses on assessing developer skill level, AI assistance likelihood, and professional maturity.
 */

import { z } from 'zod';

/**
 * Skill level assessment levels
 */
export const SkillLevel = z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']);
export type SkillLevel = z.infer<typeof SkillLevel>;

/**
 * AI assistance likelihood levels
 */
export const AIAssistanceLevel = z.enum(['Minimal', 'Low', 'Medium', 'High']);
export type AIAssistanceLevel = z.infer<typeof AIAssistanceLevel>;

/**
 * Professional maturity levels
 */
export const ProfessionalMaturity = z.enum(['Junior', 'Mid-level', 'Senior', 'Lead']);
export type ProfessionalMaturity = z.infer<typeof ProfessionalMaturity>;

/**
 * Confidence levels for assessments
 */
export const ConfidenceLevel = z.enum(['Low', 'Medium', 'High']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

/**
 * Working environment assessment
 */
export const WorkingEnvironment = z.enum([
  'Individual project',
  'Team collaboration',
  'Enterprise',
]);
export type WorkingEnvironment = z.infer<typeof WorkingEnvironment>;

/**
 * Time constraint assessment
 */
export const TimeConstraints = z.enum(['Rushed', 'Balanced', 'Thorough']);
export type TimeConstraints = z.infer<typeof TimeConstraints>;

/**
 * Experience domain assessment
 */
export const ExperienceDomain = z.enum(['Learning', 'Applying known patterns', 'Innovating']);
export type ExperienceDomain = z.infer<typeof ExperienceDomain>;

/**
 * Skill level assessment with evidence
 */
export const SkillAssessmentSchema = z.object({
  level: SkillLevel,
  confidence: ConfidenceLevel,
  keyEvidence: z
    .array(z.string())
    .describe('Specific examples from the code that support this assessment'),
  notablePatterns: z
    .array(z.string())
    .describe('Notable patterns or decisions that indicate skill level'),
});

export type SkillAssessment = z.infer<typeof SkillAssessmentSchema>;

/**
 * AI assistance assessment with evidence
 */
export const AIAssistanceAssessmentSchema = z.object({
  likelihood: AIAssistanceLevel,
  confidence: ConfidenceLevel,
  supportingIndicators: z.array(z.string()).describe('Specific patterns suggesting AI involvement'),
  evidenceAgainst: z.array(z.string()).optional().describe('Evidence against AI assistance'),
});

export type AIAssistanceAssessment = z.infer<typeof AIAssistanceAssessmentSchema>;

/**
 * Professional maturity assessment
 */
export const ProfessionalMaturityAssessmentSchema = z.object({
  level: ProfessionalMaturity,
  confidence: ConfidenceLevel,
  decisionMakingQuality: z
    .array(z.string())
    .describe('Assessment of architectural and implementation choices'),
  productionReadinessEvidence: z
    .array(z.string())
    .describe('Evidence of production readiness and maintainability focus'),
});

export type ProfessionalMaturityAssessment = z.infer<typeof ProfessionalMaturityAssessmentSchema>;

/**
 * Development context assessment
 */
export const DevelopmentContextSchema = z.object({
  workingEnvironment: WorkingEnvironment,
  timeConstraints: TimeConstraints,
  experienceDomain: ExperienceDomain,
  reasoning: z.string().describe('Reasoning for these assessments'),
});

export type DevelopmentContext = z.infer<typeof DevelopmentContextSchema>;

/**
 * Notable observations
 */
export const NotableObservationsSchema = z.object({
  uniqueStrengths: z.array(z.string()).describe('Unique strengths or approaches observed'),
  interestingDecisions: z.array(z.string()).describe('Interesting decisions or trade-offs made'),
  expertiseAreas: z
    .array(z.string())
    .describe('Areas where the developer shows particular expertise or growth'),
});

export type NotableObservations = z.infer<typeof NotableObservationsSchema>;

/**
 * Main evaluation review schema
 */
export const EvaluationReviewSchema = z.object({
  version: z.literal('1.0').describe('Schema version'),
  timestamp: z.string().describe('ISO 8601 timestamp'),
  projectName: z.string().describe('Name of the reviewed project'),
  filesEvaluated: z.number().describe('Total number of files evaluated'),

  // Core assessments
  skillAssessment: SkillAssessmentSchema,
  aiAssistanceAssessment: AIAssistanceAssessmentSchema,
  professionalMaturityAssessment: ProfessionalMaturityAssessmentSchema,

  // Context and observations
  developmentContext: DevelopmentContextSchema,
  notableObservations: NotableObservationsSchema,

  // Overall profile
  overallProfile: z
    .string()
    .describe(
      "2-3 sentence summary of the developer's likely background, experience level, and development approach",
    ),

  // Language-specific insights
  languageSpecificInsights: z
    .object({
      language: z.string().describe('Primary language assessed'),
      skillMarkers: z.array(z.string()).describe('Language-specific skill indicators'),
      aiPatterns: z.array(z.string()).describe('Language-specific AI assistance patterns'),
      professionalPractices: z
        .array(z.string())
        .describe('Professional practices specific to this language'),
    })
    .optional(),
});

export type EvaluationReview = z.infer<typeof EvaluationReviewSchema>;

/**
 * Root object for the evaluation review schema
 */
export const EvaluationReviewRootSchema = z.object({
  evaluation: EvaluationReviewSchema,
});

export type EvaluationReviewRoot = z.infer<typeof EvaluationReviewRootSchema>;

/**
 * Get the schema as a string for inclusion in prompts
 */
export function getEvaluationSchemaAsString(): string {
  return `{
  "evaluation": {
    "version": "1.0",
    "timestamp": "2024-04-06T12:00:00Z",
    "projectName": "example-project",
    "filesEvaluated": 25,
    
    "skillAssessment": {
      "level": "Intermediate",
      "confidence": "High",
      "keyEvidence": [
        "Proper use of TypeScript interfaces and generics",
        "Implementation of async/await patterns with error handling",
        "Modular code organization with clear separation of concerns"
      ],
      "notablePatterns": [
        "Consistent use of functional programming patterns",
        "Appropriate abstraction levels for the problem domain"
      ]
    },
    
    "aiAssistanceAssessment": {
      "likelihood": "Low",
      "confidence": "Medium",
      "supportingIndicators": [
        "Some overly verbose JSDoc comments on simple functions"
      ],
      "evidenceAgainst": [
        "Consistent personal coding style throughout",
        "Context-aware optimizations and shortcuts",
        "Natural, domain-specific variable naming"
      ]
    },
    
    "professionalMaturityAssessment": {
      "level": "Mid-level",
      "confidence": "High",
      "decisionMakingQuality": [
        "Appropriate use of existing libraries vs custom solutions",
        "Good balance between performance and readability",
        "Comprehensive error handling strategy"
      ],
      "productionReadinessEvidence": [
        "Proper environment configuration management",
        "Security considerations in data handling",
        "Logging and monitoring setup"
      ]
    },
    
    "developmentContext": {
      "workingEnvironment": "Team collaboration",
      "timeConstraints": "Balanced",
      "experienceDomain": "Applying known patterns",
      "reasoning": "Code shows consistency with team standards and thoughtful implementation without rush indicators"
    },
    
    "notableObservations": {
      "uniqueStrengths": [
        "Excellent TypeScript type safety practices",
        "Creative use of functional composition patterns"
      ],
      "interestingDecisions": [
        "Custom validation layer instead of using existing libraries",
        "Performance optimization in data processing loops"
      ],
      "expertiseAreas": [
        "Frontend state management",
        "API design and implementation"
      ]
    },
    
    "overallProfile": "This developer appears to be a mid-level professional with solid TypeScript experience and good architectural instincts. The code suggests someone working in a collaborative environment with established standards, showing growth toward senior-level decision making.",
    
    "languageSpecificInsights": {
      "language": "TypeScript",
      "skillMarkers": [
        "Advanced type system usage with utility types",
        "Proper async/await error handling patterns",
        "Effective use of TypeScript configuration"
      ],
      "aiPatterns": [
        "Minimal AI-generated boilerplate detected",
        "Natural TypeScript idioms throughout"
      ],
      "professionalPractices": [
        "Comprehensive type safety without any usage",
        "Proper module organization and exports",
        "Integration with modern build tooling"
      ]
    }
  }
}`;
}

/**
 * Get schema instructions for evaluation reviews
 */
export function getEvaluationSchemaInstructions(): string {
  return `
IMPORTANT: For evaluation reviews, you MUST format your response as a valid JSON object following this exact schema:

${getEvaluationSchemaAsString()}

Guidelines for filling the schema:

1. **Skill Level Assessment**:
   - Beginner: Basic syntax, simple structure, minimal error handling
   - Intermediate: Proper language features, some patterns, adequate organization
   - Advanced: Sophisticated patterns, comprehensive error handling, performance optimization
   - Expert: Deep language mastery, custom abstractions, architectural leadership

2. **AI Assistance Likelihood**:
   - Minimal: Clearly human-written with personal style
   - Low: Mostly human with possible minor AI assistance
   - Medium: Mixed indicators, unclear origin
   - High: Strong indicators of AI-generated or heavily AI-assisted code

3. **Professional Maturity**:
   - Junior: Learning-focused, basic practices
   - Mid-level: Solid practices, good decision-making
   - Senior: Advanced practices, architectural thinking
   - Lead: Strategic thinking, team/system leadership

4. **Evidence Requirements**:
   - Provide specific examples from the code for all assessments
   - Reference actual patterns, naming conventions, or architectural decisions
   - Be concrete rather than generic in observations

5. **Confidence Levels**:
   - High: Clear, strong evidence supporting the assessment
   - Medium: Some evidence but with ambiguity
   - Low: Limited evidence or conflicting indicators

Your response must be valid JSON that can be parsed programmatically. Do not include any text outside of the JSON structure.
`;
}

/**
 * Export schema for use in other modules
 */
export const evaluationReviewSchema = EvaluationReviewRootSchema;
