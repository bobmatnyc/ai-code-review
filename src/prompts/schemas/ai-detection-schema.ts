/**
 * @fileoverview Schema for AI detection analysis output.
 *
 * This module defines the structured schema for AI-generated code detection results,
 * ensuring consistent and parseable output from AI models.
 */

/**
 * Schema for AI detection analysis results
 */
export const aiDetectionSchema = {
  type: 'object',
  properties: {
    analysisType: {
      type: 'string',
      enum: ['ai-detection'],
      description: 'Type of analysis performed',
    },
    summary: {
      type: 'object',
      properties: {
        isAIGenerated: {
          type: 'boolean',
          description: 'Whether the code is determined to be AI-generated',
        },
        confidenceScore: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Overall confidence score from 0.0 to 1.0',
        },
        riskLevel: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Risk level assessment for candidate evaluation',
        },
        overallAssessment: {
          type: 'string',
          description: 'Brief overall assessment of the detection results',
        },
      },
      required: ['isAIGenerated', 'confidenceScore', 'riskLevel', 'overallAssessment'],
    },
    detectedPatterns: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Pattern identifier (e.g., H1.1, M5.3)',
          },
          name: {
            type: 'string',
            description: 'Human-readable pattern name',
          },
          category: {
            type: 'string',
            enum: ['git-history', 'documentation', 'structural', 'statistical', 'linguistic'],
            description: 'Category of pattern detected',
          },
          confidence: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'Confidence level for this pattern',
          },
          score: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Numerical confidence score for this pattern',
          },
          description: {
            type: 'string',
            description: 'Detailed description of what this pattern indicates',
          },
          evidence: {
            type: 'object',
            description: 'Supporting evidence for this pattern detection',
            properties: {
              dataPoints: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Key data points supporting this detection',
              },
              locations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      description: 'File path where pattern was detected',
                    },
                    line: {
                      type: 'number',
                      description: 'Line number (optional)',
                    },
                    context: {
                      type: 'string',
                      description: 'Additional context for this location',
                    },
                  },
                },
                description: 'Specific locations where pattern was detected',
              },
              metrics: {
                type: 'object',
                description: 'Quantitative metrics supporting the detection',
              },
            },
          },
          recommendation: {
            type: 'string',
            description: 'Specific recommendation for addressing this pattern',
          },
        },
        required: ['id', 'name', 'category', 'confidence', 'score', 'description'],
      },
      description: 'List of specific AI-generated patterns detected',
    },
    analysisBreakdown: {
      type: 'object',
      properties: {
        gitHistoryAnalysis: {
          type: 'object',
          properties: {
            analyzed: {
              type: 'boolean',
              description: 'Whether git history analysis was performed',
            },
            patternsFound: {
              type: 'number',
              description: 'Number of git-related patterns detected',
            },
            keyFindings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key findings from git history analysis',
            },
            commitAnalysis: {
              type: 'object',
              properties: {
                totalCommits: {
                  type: 'number',
                  description: 'Total number of commits analyzed',
                },
                suspiciousCommits: {
                  type: 'number',
                  description: 'Number of commits with suspicious patterns',
                },
                initialCommitSize: {
                  type: 'number',
                  description: 'Number of files in initial commit',
                },
              },
            },
          },
        },
        documentationAnalysis: {
          type: 'object',
          properties: {
            analyzed: {
              type: 'boolean',
              description: 'Whether documentation analysis was performed',
            },
            patternsFound: {
              type: 'number',
              description: 'Number of documentation-related patterns detected',
            },
            keyFindings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key findings from documentation analysis',
            },
            readmeAnalysis: {
              type: 'object',
              properties: {
                hasReadme: {
                  type: 'boolean',
                  description: 'Whether README file exists',
                },
                structureScore: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'README structure completeness score',
                },
                templateIndicators: {
                  type: 'number',
                  description: 'Number of template indicators found',
                },
              },
            },
            commentAnalysis: {
              type: 'object',
              properties: {
                averageDensity: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Average comment density across files',
                },
                uniformity: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Uniformity of comment patterns',
                },
              },
            },
          },
        },
        structuralAnalysis: {
          type: 'object',
          properties: {
            analyzed: {
              type: 'boolean',
              description: 'Whether structural analysis was performed',
            },
            patternsFound: {
              type: 'number',
              description: 'Number of structural patterns detected',
            },
            keyFindings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key findings from structural analysis',
            },
          },
        },
      },
      description: 'Detailed breakdown of analysis by category',
    },
    recommendations: {
      type: 'object',
      properties: {
        immediate: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                description: 'Recommended immediate action',
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'Priority level for this recommendation',
              },
              rationale: {
                type: 'string',
                description: 'Explanation for why this action is recommended',
              },
            },
            required: ['action', 'priority', 'rationale'],
          },
          description: 'Immediate actions to take based on detection results',
        },
        verification: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                description: 'Verification method to employ',
              },
              description: {
                type: 'string',
                description: 'Detailed description of verification approach',
              },
              expectedOutcome: {
                type: 'string',
                description: 'What to expect from this verification method',
              },
            },
            required: ['method', 'description'],
          },
          description: 'Methods to verify the authenticity of the code',
        },
        interview: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Suggested interview questions based on detected patterns',
        },
      },
      description: 'Actionable recommendations based on detection results',
    },
    metadata: {
      type: 'object',
      properties: {
        analysisTimestamp: {
          type: 'string',
          format: 'date-time',
          description: 'When the analysis was performed',
        },
        analyzersUsed: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'List of analyzers that were employed',
        },
        analysisTime: {
          type: 'number',
          description: 'Total time taken for analysis in milliseconds',
        },
        engineVersion: {
          type: 'string',
          description: 'Version of the AI detection engine used',
        },
        configurationUsed: {
          type: 'object',
          description: 'Configuration parameters used for detection',
        },
      },
      description: 'Metadata about the analysis process',
    },
  },
  required: [
    'analysisType',
    'summary',
    'detectedPatterns',
    'analysisBreakdown',
    'recommendations',
    'metadata',
  ],
  additionalProperties: false,
} as const;

/**
 * TypeScript type derived from the schema
 */
export type AIDetectionAnalysis = {
  analysisType: 'ai-detection';
  summary: {
    isAIGenerated: boolean;
    confidenceScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    overallAssessment: string;
  };
  detectedPatterns: Array<{
    id: string;
    name: string;
    category: 'git-history' | 'documentation' | 'structural' | 'statistical' | 'linguistic';
    confidence: 'high' | 'medium' | 'low';
    score: number;
    description: string;
    evidence?: {
      dataPoints?: string[];
      locations?: Array<{
        file: string;
        line?: number;
        context?: string;
      }>;
      metrics?: Record<string, any>;
    };
    recommendation?: string;
  }>;
  analysisBreakdown: {
    gitHistoryAnalysis?: {
      analyzed: boolean;
      patternsFound: number;
      keyFindings: string[];
      commitAnalysis?: {
        totalCommits: number;
        suspiciousCommits: number;
        initialCommitSize: number;
      };
    };
    documentationAnalysis?: {
      analyzed: boolean;
      patternsFound: number;
      keyFindings: string[];
      readmeAnalysis?: {
        hasReadme: boolean;
        structureScore: number;
        templateIndicators: number;
      };
      commentAnalysis?: {
        averageDensity: number;
        uniformity: number;
      };
    };
    structuralAnalysis?: {
      analyzed: boolean;
      patternsFound: number;
      keyFindings: string[];
    };
  };
  recommendations: {
    immediate: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      rationale: string;
    }>;
    verification: Array<{
      method: string;
      description: string;
      expectedOutcome?: string;
    }>;
    interview: string[];
  };
  metadata: {
    analysisTimestamp: string;
    analyzersUsed: string[];
    analysisTime: number;
    engineVersion: string;
    configurationUsed?: Record<string, any>;
  };
};
