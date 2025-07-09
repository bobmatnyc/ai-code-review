/**
 * Memory Schemas for Code Review Operations
 *
 * Enterprise memory schemas (MEM-002) implementing structured patterns
 * for storing and retrieving code review knowledge.
 */

import type { CodeReviewMemoryEntry } from './types';

/**
 * Schema definitions for different memory categories
 */
export class MemorySchemas {
  /**
   * PATTERN Memory Schema
   *
   * Stores code review best practices, common patterns, and architectural decisions
   */
  static createPatternMemory(data: {
    pattern: string;
    description: string;
    language: string;
    framework?: string;
    complexity: 'low' | 'medium' | 'high';
    useCase: string;
    example?: string;
    references?: string[];
  }): Omit<CodeReviewMemoryEntry, 'id'> {
    return {
      category: 'PATTERN',
      content: `Code Pattern: ${data.pattern}

Description: ${data.description}

Language: ${data.language}
${data.framework ? `Framework: ${data.framework}` : ''}
Complexity: ${data.complexity}
Use Case: ${data.useCase}

${data.example ? `Example:\n${data.example}` : ''}

${data.references ? `References:\n${data.references.join('\n')}` : ''}`,
      metadata: {
        language: data.language,
        tags: [
          'pattern',
          data.language,
          data.complexity,
          ...(data.framework ? [data.framework] : []),
        ],
        confidence: 0.9,
        createdAt: new Date(),
      },
    };
  }

  /**
   * ERROR Memory Schema
   *
   * Stores bug patterns, security vulnerabilities, and common mistakes
   */
  static createErrorMemory(data: {
    errorType: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    language: string;
    framework?: string;
    solution: string;
    prevention: string;
    codeExample?: string;
    relatedErrors?: string[];
  }): Omit<CodeReviewMemoryEntry, 'id'> {
    return {
      category: 'ERROR',
      content: `Error Pattern: ${data.errorType}

Description: ${data.description}

Severity: ${data.severity}
Language: ${data.language}
${data.framework ? `Framework: ${data.framework}` : ''}

Solution: ${data.solution}

Prevention: ${data.prevention}

${data.codeExample ? `Code Example:\n${data.codeExample}` : ''}

${data.relatedErrors ? `Related Errors:\n${data.relatedErrors.join('\n')}` : ''}`,
      metadata: {
        language: data.language,
        tags: [
          'error',
          data.errorType,
          data.severity,
          data.language,
          ...(data.framework ? [data.framework] : []),
        ],
        confidence: 0.95,
        createdAt: new Date(),
      },
    };
  }

  /**
   * TEAM Memory Schema
   *
   * Stores team-specific review standards, coding conventions, and preferences
   */
  static createTeamMemory(data: {
    teamId: string;
    convention: string;
    description: string;
    category: 'style' | 'architecture' | 'testing' | 'security' | 'performance';
    language?: string;
    enforcement: 'strict' | 'recommended' | 'optional';
    examples?: string[];
    exceptions?: string[];
  }): Omit<CodeReviewMemoryEntry, 'id'> {
    return {
      category: 'TEAM',
      content: `Team Convention: ${data.convention}

Team: ${data.teamId}
Category: ${data.category}
${data.language ? `Language: ${data.language}` : ''}
Enforcement: ${data.enforcement}

Description: ${data.description}

${data.examples ? `Examples:\n${data.examples.join('\n\n')}` : ''}

${data.exceptions ? `Exceptions:\n${data.exceptions.join('\n')}` : ''}`,
      metadata: {
        language: data.language,
        tags: [
          'team',
          data.teamId,
          data.category,
          data.enforcement,
          ...(data.language ? [data.language] : []),
        ],
        confidence: 0.8,
        createdAt: new Date(),
      },
    };
  }

  /**
   * PROJECT Memory Schema
   *
   * Stores project-specific metrics, review history, and improvement tracking
   */
  static createProjectMemory(data: {
    projectId: string;
    metric: string;
    value: string | number;
    unit?: string;
    trend: 'improving' | 'stable' | 'declining';
    context: string;
    timestamp: Date;
    reviewStrategy?: string;
    impact?: string;
  }): Omit<CodeReviewMemoryEntry, 'id'> {
    return {
      category: 'PROJECT',
      content: `Project Metric: ${data.metric}

Project: ${data.projectId}
Value: ${data.value}${data.unit ? ` ${data.unit}` : ''}
Trend: ${data.trend}
Timestamp: ${data.timestamp.toISOString()}

Context: ${data.context}

${data.reviewStrategy ? `Review Strategy: ${data.reviewStrategy}` : ''}
${data.impact ? `Impact: ${data.impact}` : ''}`,
      metadata: {
        projectId: data.projectId,
        strategy: data.reviewStrategy,
        tags: [
          'project',
          data.projectId,
          data.metric,
          data.trend,
          ...(data.reviewStrategy ? [data.reviewStrategy] : []),
        ],
        confidence: 0.85,
        createdAt: new Date(),
      },
    };
  }

  /**
   * Code Review Workflow Memory Schema
   *
   * Specialized schema for storing complete code review workflows and their outcomes
   */
  static createWorkflowMemory(data: {
    workflowId: string;
    strategy: string;
    filesReviewed: number;
    issuesFound: number;
    issuesFixed: number;
    duration: number;
    language: string;
    projectId: string;
    reviewer: 'ai' | 'human' | 'hybrid';
    outcome: 'approved' | 'rejected' | 'needs-changes';
    feedback?: string;
  }): Omit<CodeReviewMemoryEntry, 'id'> {
    return {
      category: 'PROJECT',
      content: `Code Review Workflow: ${data.workflowId}

Strategy: ${data.strategy}
Reviewer: ${data.reviewer}
Outcome: ${data.outcome}

Metrics:
- Files Reviewed: ${data.filesReviewed}
- Issues Found: ${data.issuesFound}
- Issues Fixed: ${data.issuesFixed}
- Duration: ${data.duration}ms

Language: ${data.language}
Project: ${data.projectId}

${data.feedback ? `Feedback: ${data.feedback}` : ''}`,
      metadata: {
        projectId: data.projectId,
        language: data.language,
        strategy: data.strategy,
        tags: ['workflow', data.strategy, data.reviewer, data.outcome, data.language],
        confidence: 0.9,
        createdAt: new Date(),
      },
    };
  }

  /**
   * Security Finding Memory Schema
   *
   * Specialized schema for security-related findings and recommendations
   */
  static createSecurityMemory(data: {
    vulnerability: string;
    cvssScore?: number;
    category: 'injection' | 'auth' | 'crypto' | 'xss' | 'csrf' | 'other';
    language: string;
    framework?: string;
    description: string;
    mitigation: string;
    codePattern?: string;
    references?: string[];
  }): Omit<CodeReviewMemoryEntry, 'id'> {
    return {
      category: 'ERROR',
      content: `Security Vulnerability: ${data.vulnerability}

Category: ${data.category}
${data.cvssScore ? `CVSS Score: ${data.cvssScore}` : ''}
Language: ${data.language}
${data.framework ? `Framework: ${data.framework}` : ''}

Description: ${data.description}

Mitigation: ${data.mitigation}

${data.codePattern ? `Code Pattern:\n${data.codePattern}` : ''}

${data.references ? `References:\n${data.references.join('\n')}` : ''}`,
      metadata: {
        language: data.language,
        tags: [
          'security',
          data.category,
          data.vulnerability,
          data.language,
          ...(data.framework ? [data.framework] : []),
          ...(data.cvssScore ? [`cvss-${Math.floor(data.cvssScore)}`] : []),
        ],
        confidence: data.cvssScore ? Math.min(data.cvssScore / 10, 1) : 0.8,
        createdAt: new Date(),
      },
    };
  }

  /**
   * Performance Optimization Memory Schema
   *
   * Stores performance-related findings and optimization recommendations
   */
  static createPerformanceMemory(data: {
    optimization: string;
    impact: 'low' | 'medium' | 'high';
    language: string;
    framework?: string;
    description: string;
    implementation: string;
    metrics?: {
      before: string;
      after: string;
      improvement: string;
    };
    complexity: 'simple' | 'moderate' | 'complex';
  }): Omit<CodeReviewMemoryEntry, 'id'> {
    return {
      category: 'PATTERN',
      content: `Performance Optimization: ${data.optimization}

Impact: ${data.impact}
Complexity: ${data.complexity}
Language: ${data.language}
${data.framework ? `Framework: ${data.framework}` : ''}

Description: ${data.description}

Implementation: ${data.implementation}

${
  data.metrics
    ? `Performance Metrics:
Before: ${data.metrics.before}
After: ${data.metrics.after}
Improvement: ${data.metrics.improvement}`
    : ''
}`,
      metadata: {
        language: data.language,
        tags: [
          'performance',
          data.optimization,
          data.impact,
          data.complexity,
          data.language,
          ...(data.framework ? [data.framework] : []),
        ],
        confidence: 0.85,
        createdAt: new Date(),
      },
    };
  }

  /**
   * Validate memory entry against schema
   *
   * @param entry - Memory entry to validate
   * @returns Validation result with any errors
   */
  static validateMemoryEntry(entry: CodeReviewMemoryEntry): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!entry.content || entry.content.trim().length === 0) {
      errors.push('Content is required and cannot be empty');
    }

    if (!['PATTERN', 'ERROR', 'TEAM', 'PROJECT'].includes(entry.category)) {
      errors.push('Category must be one of: PATTERN, ERROR, TEAM, PROJECT');
    }

    // Metadata validation
    if (!entry.metadata) {
      errors.push('Metadata is required');
    } else {
      if (!entry.metadata.createdAt) {
        errors.push('Metadata must include createdAt timestamp');
      }

      if (entry.metadata.confidence !== undefined) {
        if (entry.metadata.confidence < 0 || entry.metadata.confidence > 1) {
          errors.push('Confidence score must be between 0 and 1');
        }
      }

      if (entry.metadata.tags && !Array.isArray(entry.metadata.tags)) {
        errors.push('Tags must be an array of strings');
      }
    }

    // Content length validation
    if (entry.content.length > 10000) {
      errors.push('Content exceeds maximum length of 10,000 characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract structured data from memory content
   *
   * @param entry - Memory entry to parse
   * @returns Parsed structured data
   */
  static parseMemoryContent(entry: CodeReviewMemoryEntry): Record<string, any> {
    const lines = entry.content.split('\n');
    const data: Record<string, any> = {};

    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.includes(':') && !line.startsWith(' ') && !line.startsWith('\t')) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          data[currentSection] = currentContent.join('\n').trim();
        }

        // Start new section
        const [key, ...value] = line.split(':');
        currentSection = key.trim().toLowerCase().replace(/\s+/g, '_');
        currentContent = value.length > 0 ? [value.join(':').trim()] : [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save final section
    if (currentSection && currentContent.length > 0) {
      data[currentSection] = currentContent.join('\n').trim();
    }

    return data;
  }
}
