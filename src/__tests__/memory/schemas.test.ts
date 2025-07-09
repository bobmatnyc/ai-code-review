/**
 * Memory Schemas Test Suite
 * 
 * Tests for enterprise memory schemas (MEM-002) to ensure
 * proper structure and validation of memory entries.
 */

import { describe, it, expect } from 'vitest';
import { MemorySchemas } from '../../memory/schemas';
import type { CodeReviewMemoryEntry } from '../../memory/types';

describe('MemorySchemas', () => {
  describe('createPatternMemory', () => {
    it('should create a valid PATTERN memory entry', () => {
      const patternData = {
        pattern: 'Repository Pattern',
        description: 'Encapsulate data access logic',
        language: 'typescript',
        framework: 'node.js',
        complexity: 'medium' as const,
        useCase: 'Data layer abstraction',
        example: 'class UserRepository { async findById(id: string) { ... } }',
        references: ['Clean Architecture', 'DDD Patterns']
      };

      const memory = MemorySchemas.createPatternMemory(patternData);

      expect(memory.category).toBe('PATTERN');
      expect(memory.content).toContain('Repository Pattern');
      expect(memory.content).toContain('typescript');
      expect(memory.content).toContain('medium');
      expect(memory.metadata.language).toBe('typescript');
      expect(memory.metadata.tags).toContain('pattern');
      expect(memory.metadata.tags).toContain('typescript');
      expect(memory.metadata.tags).toContain('medium');
      expect(memory.metadata.confidence).toBe(0.9);
    });

    it('should handle pattern memory without optional fields', () => {
      const patternData = {
        pattern: 'Simple Pattern',
        description: 'Basic pattern description',
        language: 'typescript',
        complexity: 'low' as const,
        useCase: 'Simple use case'
      };

      const memory = MemorySchemas.createPatternMemory(patternData);

      expect(memory.category).toBe('PATTERN');
      expect(memory.content).toContain('Simple Pattern');
      expect(memory.content).not.toContain('Framework:');
      expect(memory.content).not.toContain('Example:');
      expect(memory.metadata.tags).not.toContain('undefined');
    });
  });

  describe('createErrorMemory', () => {
    it('should create a valid ERROR memory entry', () => {
      const errorData = {
        errorType: 'SQL Injection',
        description: 'Unsanitized input in SQL queries',
        severity: 'critical' as const,
        language: 'typescript',
        framework: 'typeorm',
        solution: 'Use parameterized queries',
        prevention: 'Input validation and ORM usage',
        codeExample: 'query(`SELECT * FROM users WHERE id = ${userInput}`) // BAD',
        relatedErrors: ['Command Injection', 'XSS']
      };

      const memory = MemorySchemas.createErrorMemory(errorData);

      expect(memory.category).toBe('ERROR');
      expect(memory.content).toContain('SQL Injection');
      expect(memory.content).toContain('critical');
      expect(memory.content).toContain('parameterized queries');
      expect(memory.metadata.tags).toContain('error');
      expect(memory.metadata.tags).toContain('SQL Injection');
      expect(memory.metadata.tags).toContain('critical');
      expect(memory.metadata.confidence).toBe(0.95);
    });
  });

  describe('createTeamMemory', () => {
    it('should create a valid TEAM memory entry', () => {
      const teamData = {
        teamId: 'frontend-team',
        convention: 'React Hooks Usage',
        description: 'Prefer functional components with hooks',
        category: 'architecture' as const,
        language: 'typescript',
        enforcement: 'strict' as const,
        examples: ['Use useState for state management', 'Custom hooks for reusable logic'],
        exceptions: ['Legacy class components during migration']
      };

      const memory = MemorySchemas.createTeamMemory(teamData);

      expect(memory.category).toBe('TEAM');
      expect(memory.content).toContain('React Hooks Usage');
      expect(memory.content).toContain('frontend-team');
      expect(memory.content).toContain('strict');
      expect(memory.metadata.tags).toContain('team');
      expect(memory.metadata.tags).toContain('frontend-team');
      expect(memory.metadata.tags).toContain('architecture');
      expect(memory.metadata.confidence).toBe(0.8);
    });
  });

  describe('createProjectMemory', () => {
    it('should create a valid PROJECT memory entry', () => {
      const projectData = {
        projectId: 'ai-code-review',
        metric: 'Code Coverage',
        value: 85,
        unit: '%',
        trend: 'improving' as const,
        context: 'Increased test coverage with Vitest migration',
        timestamp: new Date('2025-01-01'),
        reviewStrategy: 'comprehensive',
        impact: 'Reduced production bugs'
      };

      const memory = MemorySchemas.createProjectMemory(projectData);

      expect(memory.category).toBe('PROJECT');
      expect(memory.content).toContain('Code Coverage');
      expect(memory.content).toContain('ai-code-review');
      expect(memory.content).toContain('85 %');
      expect(memory.content).toContain('improving');
      expect(memory.metadata.projectId).toBe('ai-code-review');
      expect(memory.metadata.strategy).toBe('comprehensive');
      expect(memory.metadata.tags).toContain('project');
      expect(memory.metadata.tags).toContain('ai-code-review');
      expect(memory.metadata.confidence).toBe(0.85);
    });
  });

  describe('createWorkflowMemory', () => {
    it('should create a valid workflow memory entry', () => {
      const workflowData = {
        workflowId: 'wf_123',
        strategy: 'security',
        filesReviewed: 25,
        issuesFound: 5,
        issuesFixed: 4,
        duration: 30000,
        language: 'typescript',
        projectId: 'ai-code-review',
        reviewer: 'ai' as const,
        outcome: 'needs-changes' as const,
        feedback: 'Found security vulnerabilities that need attention'
      };

      const memory = MemorySchemas.createWorkflowMemory(workflowData);

      expect(memory.category).toBe('PROJECT');
      expect(memory.content).toContain('wf_123');
      expect(memory.content).toContain('security');
      expect(memory.content).toContain('Files Reviewed: 25');
      expect(memory.content).toContain('Issues Found: 5');
      expect(memory.content).toContain('needs-changes');
      expect(memory.metadata.strategy).toBe('security');
      expect(memory.metadata.tags).toContain('workflow');
      expect(memory.metadata.tags).toContain('ai');
    });
  });

  describe('createSecurityMemory', () => {
    it('should create a valid security memory entry', () => {
      const securityData = {
        vulnerability: 'Cross-Site Scripting (XSS)',
        cvssScore: 7.5,
        category: 'xss' as const,
        language: 'typescript',
        framework: 'react',
        description: 'User input rendered without sanitization',
        mitigation: 'Use proper HTML escaping and CSP headers',
        codePattern: 'dangerouslySetInnerHTML={{ __html: userInput }}',
        references: ['OWASP XSS Prevention', 'React Security Guide']
      };

      const memory = MemorySchemas.createSecurityMemory(securityData);

      expect(memory.category).toBe('ERROR');
      expect(memory.content).toContain('Cross-Site Scripting (XSS)');
      expect(memory.content).toContain('CVSS Score: 7.5');
      expect(memory.content).toContain('xss');
      expect(memory.content).toContain('dangerouslySetInnerHTML');
      expect(memory.metadata.tags).toContain('security');
      expect(memory.metadata.tags).toContain('xss');
      expect(memory.metadata.tags).toContain('cvss-7');
      expect(memory.metadata.confidence).toBe(0.75); // cvssScore / 10
    });

    it('should handle security memory without CVSS score', () => {
      const securityData = {
        vulnerability: 'Weak Random Number Generation',
        category: 'crypto' as const,
        language: 'typescript',
        description: 'Using Math.random() for security-sensitive operations',
        mitigation: 'Use crypto.randomBytes() for cryptographic randomness'
      };

      const memory = MemorySchemas.createSecurityMemory(securityData);

      expect(memory.content).not.toContain('CVSS Score:');
      expect(memory.metadata.confidence).toBe(0.8); // default
      expect(memory.metadata.tags).not.toContain('cvss-');
    });
  });

  describe('createPerformanceMemory', () => {
    it('should create a valid performance memory entry', () => {
      const performanceData = {
        optimization: 'Database Query Optimization',
        impact: 'high' as const,
        language: 'typescript',
        framework: 'typeorm',
        description: 'Optimize N+1 query problems with eager loading',
        implementation: 'Use relations and joins to fetch related data',
        metrics: {
          before: '500ms average query time',
          after: '50ms average query time',
          improvement: '90% faster'
        },
        complexity: 'moderate' as const
      };

      const memory = MemorySchemas.createPerformanceMemory(performanceData);

      expect(memory.category).toBe('PATTERN');
      expect(memory.content).toContain('Database Query Optimization');
      expect(memory.content).toContain('high');
      expect(memory.content).toContain('moderate');
      expect(memory.content).toContain('500ms average query time');
      expect(memory.content).toContain('90% faster');
      expect(memory.metadata.tags).toContain('performance');
      expect(memory.metadata.tags).toContain('high');
      expect(memory.metadata.confidence).toBe(0.85);
    });
  });

  describe('validateMemoryEntry', () => {
    it('should validate a correct memory entry', () => {
      const validEntry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: 'Test content that is valid',
        metadata: {
          createdAt: new Date(),
          confidence: 0.8,
          tags: ['test', 'validation'],
          language: 'typescript'
        }
      };

      const validation = MemorySchemas.validateMemoryEntry(validEntry);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject entry with empty content', () => {
      const invalidEntry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: '',
        metadata: {
          createdAt: new Date()
        }
      };

      const validation = MemorySchemas.validateMemoryEntry(invalidEntry);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Content is required and cannot be empty');
    });

    it('should reject entry with invalid category', () => {
      const invalidEntry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'INVALID' as any,
        content: 'Test content',
        metadata: {
          createdAt: new Date()
        }
      };

      const validation = MemorySchemas.validateMemoryEntry(invalidEntry);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Category must be one of: PATTERN, ERROR, TEAM, PROJECT');
    });

    it('should reject entry with invalid confidence score', () => {
      const invalidEntry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: 'Test content',
        metadata: {
          createdAt: new Date(),
          confidence: 1.5 // Invalid: > 1
        }
      };

      const validation = MemorySchemas.validateMemoryEntry(invalidEntry);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Confidence score must be between 0 and 1');
    });

    it('should reject entry with missing metadata', () => {
      const invalidEntry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: 'Test content',
        metadata: undefined as any
      };

      const validation = MemorySchemas.validateMemoryEntry(invalidEntry);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Metadata is required');
    });

    it('should reject entry with missing createdAt', () => {
      const invalidEntry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: 'Test content',
        metadata: {
          confidence: 0.8
        } as any
      };

      const validation = MemorySchemas.validateMemoryEntry(invalidEntry);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Metadata must include createdAt timestamp');
    });

    it('should reject entry with content too long', () => {
      const invalidEntry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: 'x'.repeat(10001), // Exceeds 10,000 character limit
        metadata: {
          createdAt: new Date()
        }
      };

      const validation = MemorySchemas.validateMemoryEntry(invalidEntry);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Content exceeds maximum length of 10,000 characters');
    });

    it('should reject entry with invalid tags format', () => {
      const invalidEntry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: 'Test content',
        metadata: {
          createdAt: new Date(),
          tags: 'invalid-tags-format' as any // Should be array
        }
      };

      const validation = MemorySchemas.validateMemoryEntry(invalidEntry);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Tags must be an array of strings');
    });
  });

  describe('parseMemoryContent', () => {
    it('should parse structured memory content', () => {
      const entry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: `Pattern Name: Repository Pattern

Description: Encapsulate data access logic
Language: TypeScript
Framework: Node.js

Example:
class UserRepository {
  async findById(id: string) {
    return this.db.users.findOne({ id });
  }
}

References:
- Clean Architecture
- Domain-Driven Design`,
        metadata: {
          createdAt: new Date()
        }
      };

      const parsed = MemorySchemas.parseMemoryContent(entry);

      expect(parsed.pattern_name).toBe('Repository Pattern');
      expect(parsed.description).toBe('Encapsulate data access logic');
      expect(parsed.language).toBe('TypeScript');
      expect(parsed.framework).toBe('Node.js');
      expect(parsed.example).toContain('class UserRepository');
      expect(parsed.references).toContain('Clean Architecture');
    });

    it('should handle content with no structured sections', () => {
      const entry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: 'This is just plain text content with no structured sections.',
        metadata: {
          createdAt: new Date()
        }
      };

      const parsed = MemorySchemas.parseMemoryContent(entry);

      expect(Object.keys(parsed)).toHaveLength(0);
    });

    it('should handle malformed structured content', () => {
      const entry: CodeReviewMemoryEntry = {
        id: 'test-id',
        category: 'PATTERN',
        content: `Pattern Name Repository Pattern
Description: Missing colon on first line
Language: TypeScript`,
        metadata: {
          createdAt: new Date()
        }
      };

      const parsed = MemorySchemas.parseMemoryContent(entry);

      expect(parsed.description).toBe('Missing colon on first line');
      expect(parsed.language).toBe('TypeScript');
      expect(parsed.pattern_name).toBeUndefined(); // First line malformed
    });
  });
});