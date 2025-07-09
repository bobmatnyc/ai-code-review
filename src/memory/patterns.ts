/**
 * Code Review Memory Patterns
 * 
 * Predefined memory patterns for common code review scenarios.
 * These patterns help establish consistent memory storage for the ai-code-review project.
 */

import { MemorySchemas } from './schemas';
import type { CodeReviewMemoryEntry } from './types';

/**
 * Collection of predefined memory patterns for code review operations
 */
export class CodeReviewMemoryPatterns {

  /**
   * TypeScript-specific patterns for the ai-code-review project
   */
  static getTypeScriptPatterns(): Array<Omit<CodeReviewMemoryEntry, 'id'>> {
    return [
      // Type Safety Patterns
      MemorySchemas.createPatternMemory({
        pattern: 'Strict Type Checking',
        description: 'Use strict TypeScript configuration with no any types',
        language: 'typescript',
        complexity: 'medium',
        useCase: 'Ensure type safety in large TypeScript projects',
        example: `// Bad
function processData(data: any) { ... }

// Good
function processData<T extends Record<string, unknown>>(data: T): ProcessedData<T> { ... }`,
        references: [
          'TypeScript Handbook - Strict Mode',
          'ai-code-review project standards'
        ]
      }),

      // Error Handling Patterns
      MemorySchemas.createPatternMemory({
        pattern: 'Result Type Pattern',
        description: 'Use Result types for better error handling instead of throwing exceptions',
        language: 'typescript',
        complexity: 'high',
        useCase: 'API clients and operations that can fail',
        example: `type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

async function apiCall(): Promise<Result<Data>> {
  try {
    const data = await fetch('/api');
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}`,
        references: ['Functional Error Handling in TypeScript']
      }),

      // Performance Patterns
      MemorySchemas.createPerformanceMemory({
        optimization: 'Lazy Loading with Dynamic Imports',
        impact: 'high',
        language: 'typescript',
        framework: 'node.js',
        description: 'Use dynamic imports to reduce initial bundle size and improve startup performance',
        implementation: `// Instead of static imports
const ClientFactory = () => import('./clients/factory/clientFactory');

// Use lazy loading for large dependencies
async function getClient() {
  const { clientFactory } = await import('./clients/factory/clientFactory');
  return clientFactory.create();
}`,
        complexity: 'moderate',
        metrics: {
          before: 'Initial bundle: 2.5MB, startup: 1200ms',
          after: 'Initial bundle: 800KB, startup: 400ms',
          improvement: '70% faster startup, 68% smaller initial bundle'
        }
      })
    ];
  }

  /**
   * Common error patterns for code review
   */
  static getCommonErrorPatterns(): Array<Omit<CodeReviewMemoryEntry, 'id'>> {
    return [
      // Security Errors
      MemorySchemas.createSecurityMemory({
        vulnerability: 'Command Injection',
        cvssScore: 8.5,
        category: 'injection',
        language: 'typescript',
        framework: 'node.js',
        description: 'Executing shell commands with unsanitized user input',
        mitigation: 'Use parameterized commands or sanitize inputs before execution',
        codePattern: `// Vulnerable
exec(\`git clone \${userRepo}\`);

// Safe
const sanitizedRepo = sanitizeGitUrl(userRepo);
execFile('git', ['clone', sanitizedRepo]);`,
        references: [
          'OWASP Command Injection',
          'Node.js Security Best Practices'
        ]
      }),

      // Performance Errors
      MemorySchemas.createErrorMemory({
        errorType: 'Memory Leak in Event Listeners',
        description: 'Event listeners not properly cleaned up causing memory leaks',
        severity: 'medium',
        language: 'typescript',
        solution: 'Always remove event listeners in cleanup functions',
        prevention: 'Use AbortController or cleanup patterns',
        codeExample: `// Problematic
process.on('SIGINT', handler);

// Better
const controller = new AbortController();
process.on('SIGINT', handler, { signal: controller.signal });
// Later: controller.abort();`,
        relatedErrors: ['Memory Leaks', 'Resource Management']
      }),

      // Logic Errors
      MemorySchemas.createErrorMemory({
        errorType: 'Race Condition in Async Operations',
        description: 'Concurrent async operations causing inconsistent state',
        severity: 'high',
        language: 'typescript',
        solution: 'Use proper synchronization mechanisms or sequential processing',
        prevention: 'Use mutex, semaphore, or queue patterns for critical sections',
        codeExample: `// Problematic
async function updateCounter() {
  const current = await getCounter();
  await setCounter(current + 1);
}

// Better
const mutex = new Mutex();
async function updateCounter() {
  await mutex.acquire();
  try {
    const current = await getCounter();
    await setCounter(current + 1);
  } finally {
    mutex.release();
  }
}`,
        relatedErrors: ['Concurrency Issues', 'State Management']
      })
    ];
  }

  /**
   * Team-specific patterns for the ai-code-review project
   */
  static getTeamPatterns(): Array<Omit<CodeReviewMemoryEntry, 'id'>> {
    return [
      // Code Style
      MemorySchemas.createTeamMemory({
        teamId: 'ai-code-review',
        convention: 'Biome Formatting Standard',
        description: 'Use Biome for consistent code formatting across the project',
        category: 'style',
        language: 'typescript',
        enforcement: 'strict',
        examples: [
          'Run `pnpm run lint:fix` before committing',
          'Configure editor to format on save with Biome',
          'Use Biome configuration in biome.json'
        ]
      }),

      // Testing Standards
      MemorySchemas.createTeamMemory({
        teamId: 'ai-code-review',
        convention: 'Vitest Testing Standard',
        description: 'All new features must include comprehensive Vitest tests',
        category: 'testing',
        language: 'typescript',
        enforcement: 'strict',
        examples: [
          'Unit tests for all public methods',
          'Integration tests for API endpoints',
          'Performance tests for high-load operations',
          'Minimum 80% test coverage required'
        ],
        exceptions: [
          'Legacy code during migration period',
          'Simple configuration files'
        ]
      }),

      // Architecture Standards
      MemorySchemas.createTeamMemory({
        teamId: 'ai-code-review',
        convention: 'Clean Architecture Patterns',
        description: 'Follow clean architecture with clear separation of concerns',
        category: 'architecture',
        enforcement: 'recommended',
        examples: [
          'Core business logic in /core directory',
          'External dependencies in /clients directory',
          'Data types in /types directory',
          'Utilities in /utils directory'
        ]
      })
    ];
  }

  /**
   * Project-specific metrics patterns for ai-code-review
   */
  static getProjectPatterns(): Array<Omit<CodeReviewMemoryEntry, 'id'>> {
    return [
      MemorySchemas.createProjectMemory({
        projectId: 'ai-code-review',
        metric: 'Test Coverage',
        value: 85,
        unit: '%',
        trend: 'improving',
        context: 'Increased test coverage with comprehensive Vitest test suite',
        timestamp: new Date(),
        reviewStrategy: 'comprehensive',
        impact: 'Reduced production bugs by 40%'
      }),

      MemorySchemas.createProjectMemory({
        projectId: 'ai-code-review',
        metric: 'Build Performance',
        value: 45,
        unit: 'seconds',
        trend: 'improving',
        context: 'Optimized TypeScript compilation and reduced bundle size',
        timestamp: new Date(),
        reviewStrategy: 'performance',
        impact: 'Faster CI/CD pipeline execution'
      }),

      MemorySchemas.createWorkflowMemory({
        workflowId: 'wf_initial_deployment',
        strategy: 'comprehensive',
        filesReviewed: 150,
        issuesFound: 23,
        issuesFixed: 21,
        duration: 45000,
        language: 'typescript',
        projectId: 'ai-code-review',
        reviewer: 'ai',
        outcome: 'approved',
        feedback: 'High code quality with minor issues addressed'
      })
    ];
  }

  /**
   * High-activity test patterns for performance validation
   */
  static getHighActivityTestPatterns(): Array<Omit<CodeReviewMemoryEntry, 'id'>> {
    const patterns: Array<Omit<CodeReviewMemoryEntry, 'id'>> = [];

    // Generate test patterns for concurrent operations
    for (let i = 0; i < 50; i++) {
      const categories = ['PATTERN', 'ERROR', 'TEAM', 'PROJECT'] as const;
      const category = categories[i % 4];

      switch (category) {
        case 'PATTERN':
          patterns.push(MemorySchemas.createPatternMemory({
            pattern: `High Activity Test Pattern ${i}`,
            description: `Test pattern for high-activity performance validation - iteration ${i}`,
            language: 'typescript',
            complexity: 'low',
            useCase: 'Performance testing and validation'
          }));
          break;

        case 'ERROR':
          patterns.push(MemorySchemas.createErrorMemory({
            errorType: `Test Error Pattern ${i}`,
            description: `Test error for high-activity performance validation - iteration ${i}`,
            severity: 'low',
            language: 'typescript',
            solution: 'This is a test error pattern',
            prevention: 'Used for performance testing only'
          }));
          break;

        case 'TEAM':
          patterns.push(MemorySchemas.createTeamMemory({
            teamId: 'test-team',
            convention: `Test Convention ${i}`,
            description: `Test team convention for performance validation - iteration ${i}`,
            category: 'style',
            enforcement: 'optional'
          }));
          break;

        case 'PROJECT':
          patterns.push(MemorySchemas.createProjectMemory({
            projectId: 'ai-code-review-test',
            metric: `Test Metric ${i}`,
            value: i * 10,
            trend: 'stable',
            context: `Test metric for performance validation - iteration ${i}`,
            timestamp: new Date()
          }));
          break;
      }
    }

    return patterns;
  }

  /**
   * Get all predefined patterns for initial memory population
   */
  static getAllPatterns(): Array<Omit<CodeReviewMemoryEntry, 'id'>> {
    return [
      ...this.getTypeScriptPatterns(),
      ...this.getCommonErrorPatterns(),
      ...this.getTeamPatterns(),
      ...this.getProjectPatterns()
    ];
  }

  /**
   * Get patterns specific to ai-code-review project configuration
   */
  static getProjectSpecificPatterns(): Array<Omit<CodeReviewMemoryEntry, 'id'>> {
    return [
      // Biome Integration
      MemorySchemas.createPatternMemory({
        pattern: 'Biome Linting Integration',
        description: 'Modern toolchain using Biome for linting and formatting',
        language: 'typescript',
        framework: 'biome',
        complexity: 'low',
        useCase: 'Consistent code style and fast linting',
        example: `// package.json scripts
{
  "lint": "biome check src/ --diagnostic-level=error",
  "lint:fix": "biome check src/ --write",
  "format": "biome format src/ --write"
}`,
        references: ['Biome Documentation', 'ai-code-review toolchain']
      }),

      // Vitest Configuration
      MemorySchemas.createPatternMemory({
        pattern: 'Vitest Testing Setup',
        description: 'Modern testing framework configuration for TypeScript projects',
        language: 'typescript',
        framework: 'vitest',
        complexity: 'medium',
        useCase: 'Fast unit and integration testing',
        example: `// vitest.config.mjs
export default {
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
}`,
        references: ['Vitest Documentation', 'ai-code-review testing setup']
      }),

      // Memory System Integration
      MemorySchemas.createPatternMemory({
        pattern: 'Memory System Integration',
        description: 'Integration of mem0AI memory system for code review learning',
        language: 'typescript',
        complexity: 'high',
        useCase: 'Persistent learning and pattern recognition in code reviews',
        example: `// Memory integration
const memory = new ClaudePMMemory(config);
await memory.storeMemory('PATTERN', patternContent, metadata);
const results = await memory.searchMemories({ query: 'typescript performance' });`,
        references: ['ClaudePMMemory documentation', 'MEM-001/MEM-002 implementation']
      })
    ];
  }
}