/**
 * @fileoverview Schema definition for extract patterns reviews that analyze code patterns and architecture.
 *
 * This module defines the TypeScript interfaces and Zod schemas for the extract patterns review schema
 * that focuses on extracting detailed patterns, architectural decisions, and design principles.
 */

import { z } from 'zod';

/**
 * Complexity levels for various metrics
 */
export const ComplexityLevel = z.enum(['Low', 'Medium', 'High', 'Very High']);
export type ComplexityLevel = z.infer<typeof ComplexityLevel>;

/**
 * Maturity levels for project aspects
 */
export const MaturityLevel = z.enum(['Early', 'Developing', 'Mature', 'Advanced']);
export type MaturityLevel = z.infer<typeof MaturityLevel>;

/**
 * Confidence levels for assessments
 */
export const ConfidenceLevel = z.enum(['Low', 'Medium', 'High']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

/**
 * Technology information with version
 */
export const TechnologySchema = z.object({
  name: z.string().describe('Technology name'),
  version: z.string().optional().describe('Version if available'),
  purpose: z.string().describe('Purpose or role in the project'),
  configurationNotes: z.string().optional().describe('Notable configuration details'),
});

export type Technology = z.infer<typeof TechnologySchema>;

/**
 * Code metrics and quantitative analysis
 */
export const CodeMetricsSchema = z.object({
  averageFunctionLength: z.number().describe('Average lines per function'),
  averageFileLength: z.number().describe('Average lines per file'),
  totalFiles: z.number().describe('Total number of source files'),
  totalLinesOfCode: z.number().describe('Total lines of code'),
  complexityDistribution: z.object({
    simple: z.number().describe('Percentage of simple functions/classes'),
    moderate: z.number().describe('Percentage of moderate complexity'),
    complex: z.number().describe('Percentage of complex functions/classes'),
  }),
  testCoverage: z.number().optional().describe('Test coverage percentage if available'),
});

export type CodeMetrics = z.infer<typeof CodeMetricsSchema>;

/**
 * Architectural pattern analysis
 */
export const ArchitecturalPatternSchema = z.object({
  patternName: z.string().describe('Name of the design pattern'),
  usage: z
    .enum(['Primary', 'Secondary', 'Occasional'])
    .describe('How extensively the pattern is used'),
  implementation: z.string().describe('How the pattern is implemented'),
  examples: z.array(z.string()).describe('Specific examples or file locations'),
  effectiveness: z
    .enum(['Excellent', 'Good', 'Adequate', 'Poor'])
    .describe('How well the pattern is implemented'),
});

export type ArchitecturalPattern = z.infer<typeof ArchitecturalPatternSchema>;

/**
 * Code style and convention analysis
 */
export const CodeStyleSchema = z.object({
  namingConventions: z.object({
    variables: z.string().describe('Variable naming pattern'),
    functions: z.string().describe('Function naming pattern'),
    classes: z.string().describe('Class naming pattern'),
    files: z.string().describe('File naming pattern'),
    consistency: ConfidenceLevel.describe('Consistency level of naming'),
  }),
  organizationPatterns: z.object({
    fileStructure: z.string().describe('How files are organized'),
    moduleStructure: z.string().describe('How modules are structured'),
    importExportStyle: z.string().describe('Import/export patterns used'),
  }),
  documentationStyle: z.object({
    inlineComments: z.string().describe('Inline comment style and frequency'),
    functionDocumentation: z.string().describe('Function documentation approach'),
    apiDocumentation: z.string().describe('API documentation style'),
  }),
});

export type CodeStyle = z.infer<typeof CodeStyleSchema>;

/**
 * Testing strategy analysis
 */
export const TestingStrategySchema = z.object({
  testTypes: z.array(z.string()).describe('Types of tests present (unit, integration, e2e)'),
  testOrganization: z.string().describe('How tests are organized'),
  mockingStrategy: z.string().describe('Approach to mocking and test doubles'),
  testNaming: z.string().describe('Test naming conventions'),
  coverageApproach: z.string().describe('What gets tested and testing philosophy'),
  testUtilities: z.array(z.string()).describe('Shared test helpers and utilities'),
});

export type TestingStrategy = z.infer<typeof TestingStrategySchema>;

/**
 * Technology stack analysis
 */
export const TechnologyStackSchema = z.object({
  coreLanguages: z.array(TechnologySchema).describe('Primary programming languages'),
  frameworks: z.array(TechnologySchema).describe('Frameworks and libraries'),
  buildTools: z.array(TechnologySchema).describe('Build and bundling tools'),
  developmentTools: z
    .array(TechnologySchema)
    .describe('Development tools (linters, formatters, etc.)'),
  testingTools: z.array(TechnologySchema).describe('Testing frameworks and tools'),
  deploymentTools: z.array(TechnologySchema).optional().describe('Deployment and CI/CD tools'),
});

export type TechnologyStack = z.infer<typeof TechnologyStackSchema>;

/**
 * Project overview and characteristics
 */
export const ProjectOverviewSchema = z.object({
  purpose: z.string().describe('What the project does and its domain'),
  scale: z.object({
    size: z.enum(['Small', 'Medium', 'Large', 'Enterprise']).describe('Project size'),
    complexity: ComplexityLevel.describe('Overall complexity level'),
    maturity: MaturityLevel.describe('Development maturity level'),
  }),
  architecture: z.object({
    style: z.string().describe('Overall architectural style'),
    layering: z.string().describe('How the application is layered'),
    modularity: z.string().describe('Approach to modularity and separation'),
  }),
});

export type ProjectOverview = z.infer<typeof ProjectOverviewSchema>;

/**
 * Main extract patterns review schema
 */
export const ExtractPatternsReviewSchema = z.object({
  version: z.literal('1.0').describe('Schema version'),
  timestamp: z.string().describe('ISO 8601 timestamp'),
  projectName: z.string().describe('Name of the analyzed project'),

  // Core analysis sections
  projectOverview: ProjectOverviewSchema,
  technologyStack: TechnologyStackSchema,
  codeMetrics: CodeMetricsSchema,
  architecturalPatterns: z.array(ArchitecturalPatternSchema),
  codeStyle: CodeStyleSchema,
  testingStrategy: TestingStrategySchema,

  // Exemplar characteristics
  exemplarCharacteristics: z.object({
    strengths: z.array(z.string()).describe('What makes this codebase exemplary'),
    patternsToEmulate: z.array(z.string()).describe('Specific patterns worth copying'),
    lessonsLearned: z.array(z.string()).describe('Key insights for similar projects'),
  }),

  // Replication guide
  replicationGuide: z.object({
    setupRequirements: z.array(z.string()).describe("What's needed to start a similar project"),
    keyDecisions: z.array(z.string()).describe('Critical architectural and tooling decisions'),
    implementationOrder: z
      .array(z.string())
      .describe('Suggested order for implementing similar patterns'),
    commonPitfalls: z.array(z.string()).describe('Potential issues to avoid'),
  }),

  // Summary
  summary: z
    .string()
    .describe("2-3 sentence summary of the project's architectural approach and key patterns"),
});

export type ExtractPatternsReview = z.infer<typeof ExtractPatternsReviewSchema>;

/**
 * Root object for the extract patterns review schema
 */
export const ExtractPatternsReviewRootSchema = z.object({
  patterns: ExtractPatternsReviewSchema,
});

export type ExtractPatternsReviewRoot = z.infer<typeof ExtractPatternsReviewRootSchema>;

/**
 * Get the schema as a string for inclusion in prompts
 */
export function getExtractPatternsSchemaAsString(): string {
  return `{
  "patterns": {
    "version": "1.0",
    "timestamp": "2025-06-28T12:00:00Z",
    "projectName": "example-typescript-cli",

    "projectOverview": {
      "purpose": "TypeScript CLI tool for automated code reviews using multiple AI providers",
      "scale": {
        "size": "Medium",
        "complexity": "Medium",
        "maturity": "Mature"
      },
      "architecture": {
        "style": "Modular CLI with strategy pattern",
        "layering": "CLI -> Core -> Strategies -> Clients",
        "modularity": "Feature-based modules with clear separation of concerns"
      }
    },

    "technologyStack": {
      "coreLanguages": [
        {
          "name": "TypeScript",
          "version": "5.0+",
          "purpose": "Primary language for type safety and developer experience"
        }
      ],
      "frameworks": [
        {
          "name": "Node.js",
          "version": "18+",
          "purpose": "Runtime environment"
        }
      ],
      "buildTools": [
        {
          "name": "pnpm",
          "purpose": "Package management with workspace support"
        }
      ]
    },

    "codeMetrics": {
      "averageFunctionLength": 15,
      "averageFileLength": 120,
      "totalFiles": 45,
      "totalLinesOfCode": 5400,
      "complexityDistribution": {
        "simple": 70,
        "moderate": 25,
        "complex": 5
      }
    },

    "architecturalPatterns": [
      {
        "patternName": "Strategy Pattern",
        "usage": "Primary",
        "implementation": "Different review strategies implementing common interface",
        "examples": ["ArchitecturalReviewStrategy", "SecurityReviewStrategy"],
        "effectiveness": "Excellent"
      }
    ],

    "exemplarCharacteristics": {
      "strengths": [
        "Clear separation of concerns",
        "Comprehensive TypeScript usage",
        "Modular architecture"
      ],
      "patternsToEmulate": [
        "Strategy pattern for extensible functionality",
        "Factory pattern for client creation"
      ],
      "lessonsLearned": [
        "TypeScript strict mode enables better code quality",
        "Modular design supports easy testing and extension"
      ]
    }
  }
}`;
}

/**
 * Get schema instructions for extract patterns reviews
 */
export function getExtractPatternsSchemaInstructions(): string {
  return `
IMPORTANT: For extract patterns reviews, you MUST format your response as a valid JSON object following this exact schema:

${getExtractPatternsSchemaAsString()}

Guidelines for filling the schema:

1. **Project Overview**:
   - Provide clear, concise description of what the project does
   - Assess scale realistically based on file count and complexity
   - Identify the primary architectural style and approach

2. **Technology Stack**:
   - Include versions when available in package.json or similar
   - Explain the purpose/role of each technology
   - Note any interesting configuration choices

3. **Code Metrics**:
   - Provide realistic estimates based on actual code analysis
   - Calculate averages across the codebase
   - Assess complexity distribution fairly

4. **Architectural Patterns**:
   - Identify specific design patterns in use
   - Provide concrete examples with file/class names
   - Assess how well patterns are implemented

5. **Code Style**:
   - Document actual naming conventions observed
   - Describe file and module organization patterns
   - Note documentation approaches and consistency

6. **Testing Strategy**:
   - Identify what types of tests are present
   - Document testing patterns and utilities
   - Assess coverage approach and philosophy

7. **Exemplar Characteristics**:
   - Focus on what makes this codebase worth studying
   - Identify specific patterns that could be replicated
   - Extract actionable lessons for similar projects

Your response must be valid JSON that can be parsed programmatically. Do not include any text outside of the JSON structure.
`;
}

/**
 * Export schema for use in other modules
 */
export const extractPatternsReviewSchema = ExtractPatternsReviewRootSchema;
