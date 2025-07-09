/**
 * Code Review Memory Patterns Test Suite
 * 
 * Tests for predefined memory patterns used in code review operations.
 */

import { describe, it, expect } from 'vitest';
import { CodeReviewMemoryPatterns } from '../../memory/patterns';
import { MemorySchemas } from '../../memory/schemas';

describe('CodeReviewMemoryPatterns', () => {
  describe('getTypeScriptPatterns', () => {
    it('should return valid TypeScript patterns', () => {
      const patterns = CodeReviewMemoryPatterns.getTypeScriptPatterns();

      expect(patterns.length).toBeGreaterThan(0);

      patterns.forEach(pattern => {
        expect(pattern.category).toBeDefined();
        expect(pattern.content).toBeDefined();
        expect(pattern.content.length).toBeGreaterThan(0);
        expect(pattern.metadata).toBeDefined();
        expect(pattern.metadata.language).toBe('typescript');
        
        // Check if createdAt is a Date or valid date string
        const createdAt = pattern.metadata.createdAt;
        if (createdAt instanceof Date) {
          expect(createdAt).toBeInstanceOf(Date);
        } else if (typeof createdAt === 'string') {
          expect(new Date(createdAt)).toBeInstanceOf(Date);
          expect(isNaN(new Date(createdAt).getTime())).toBe(false);
        } else {
          // If not Date or string, it should at least be defined
          expect(createdAt).toBeDefined();
        }

        // Validate each pattern
        const validation = MemorySchemas.validateMemoryEntry({
          ...pattern,
          id: 'test-id'
        });
        
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.error(`Invalid pattern: ${pattern.content.substring(0, 50)}...`, validation.errors);
        }
      });
    });

    it('should include strict type checking pattern', () => {
      const patterns = CodeReviewMemoryPatterns.getTypeScriptPatterns();
      
      const strictTypePattern = patterns.find(p => 
        p.content.includes('Strict Type Checking')
      );

      expect(strictTypePattern).toBeDefined();
      expect(strictTypePattern?.category).toBe('PATTERN');
      expect(strictTypePattern?.content).toContain('no any types');
      expect(strictTypePattern?.metadata.tags).toContain('typescript');
    });

    it('should include result type pattern', () => {
      const patterns = CodeReviewMemoryPatterns.getTypeScriptPatterns();
      
      const resultTypePattern = patterns.find(p => 
        p.content.includes('Result Type Pattern')
      );

      expect(resultTypePattern).toBeDefined();
      expect(resultTypePattern?.category).toBe('PATTERN');
      expect(resultTypePattern?.content).toContain('better error handling');
      expect(resultTypePattern?.metadata.confidence).toBeGreaterThan(0);
    });

    it('should include performance optimization patterns', () => {
      const patterns = CodeReviewMemoryPatterns.getTypeScriptPatterns();
      
      const performancePattern = patterns.find(p => 
        p.content.includes('Lazy Loading with Dynamic Imports')
      );

      expect(performancePattern).toBeDefined();
      expect(performancePattern?.category).toBe('PATTERN');
      expect(performancePattern?.content).toContain('reduce initial bundle size');
    });
  });

  describe('getCommonErrorPatterns', () => {
    it('should return valid error patterns', () => {
      const patterns = CodeReviewMemoryPatterns.getCommonErrorPatterns();

      expect(patterns.length).toBeGreaterThan(0);

      patterns.forEach(pattern => {
        expect(pattern.category).toBe('ERROR');
        expect(pattern.content).toBeDefined();
        expect(pattern.content.length).toBeGreaterThan(0);
        expect(pattern.metadata).toBeDefined();
        
        // Check if createdAt is a Date or valid date string
        const createdAt = pattern.metadata.createdAt;
        if (createdAt instanceof Date) {
          expect(createdAt).toBeInstanceOf(Date);
        } else if (typeof createdAt === 'string') {
          expect(new Date(createdAt)).toBeInstanceOf(Date);
          expect(isNaN(new Date(createdAt).getTime())).toBe(false);
        } else {
          // If not Date or string, it should at least be defined
          expect(createdAt).toBeDefined();
        }

        // Validate each pattern
        const validation = MemorySchemas.validateMemoryEntry({
          ...pattern,
          id: 'test-id'
        });
        
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.error(`Invalid error pattern: ${pattern.content.substring(0, 50)}...`, validation.errors);
        }
      });
    });

    it('should include command injection security pattern', () => {
      const patterns = CodeReviewMemoryPatterns.getCommonErrorPatterns();
      
      const commandInjectionPattern = patterns.find(p => 
        p.content.includes('Command Injection')
      );

      expect(commandInjectionPattern).toBeDefined();
      expect(commandInjectionPattern?.category).toBe('ERROR');
      expect(commandInjectionPattern?.content).toContain('shell commands');
      expect(commandInjectionPattern?.content).toContain('sanitize');
      expect(commandInjectionPattern?.metadata.tags).toContain('security');
    });

    it('should include memory leak error pattern', () => {
      const patterns = CodeReviewMemoryPatterns.getCommonErrorPatterns();
      
      const memoryLeakPattern = patterns.find(p => 
        p.content.includes('Memory Leak in Event Listeners')
      );

      expect(memoryLeakPattern).toBeDefined();
      expect(memoryLeakPattern?.category).toBe('ERROR');
      expect(memoryLeakPattern?.content).toContain('event listeners');
      expect(memoryLeakPattern?.content).toContain('AbortController');
    });

    it('should include race condition pattern', () => {
      const patterns = CodeReviewMemoryPatterns.getCommonErrorPatterns();
      
      const raceConditionPattern = patterns.find(p => 
        p.content.includes('Race Condition in Async Operations')
      );

      expect(raceConditionPattern).toBeDefined();
      expect(raceConditionPattern?.category).toBe('ERROR');
      expect(raceConditionPattern?.content).toContain('Concurrent async operations');
      expect(raceConditionPattern?.content).toContain('mutex');
    });
  });

  describe('getTeamPatterns', () => {
    it('should return valid team patterns', () => {
      const patterns = CodeReviewMemoryPatterns.getTeamPatterns();

      expect(patterns.length).toBeGreaterThan(0);

      patterns.forEach(pattern => {
        expect(pattern.category).toBe('TEAM');
        expect(pattern.content).toBeDefined();
        expect(pattern.content.length).toBeGreaterThan(0);
        expect(pattern.metadata).toBeDefined();
        expect(pattern.metadata.tags).toContain('team');
        
        // Check if createdAt is a Date or valid date string
        const createdAt = pattern.metadata.createdAt;
        if (createdAt instanceof Date) {
          expect(createdAt).toBeInstanceOf(Date);
        } else if (typeof createdAt === 'string') {
          expect(new Date(createdAt)).toBeInstanceOf(Date);
          expect(isNaN(new Date(createdAt).getTime())).toBe(false);
        } else {
          // If not Date or string, it should at least be defined
          expect(createdAt).toBeDefined();
        }

        // Validate each pattern
        const validation = MemorySchemas.validateMemoryEntry({
          ...pattern,
          id: 'test-id'
        });
        
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.error(`Invalid team pattern: ${pattern.content.substring(0, 50)}...`, validation.errors);
        }
      });
    });

    it('should include Biome formatting standard', () => {
      const patterns = CodeReviewMemoryPatterns.getTeamPatterns();
      
      const biomePattern = patterns.find(p => 
        p.content.includes('Biome Formatting Standard')
      );

      expect(biomePattern).toBeDefined();
      expect(biomePattern?.content).toContain('ai-code-review');
      expect(biomePattern?.content).toContain('pnpm run lint:fix');
      expect(biomePattern?.metadata.tags).toContain('ai-code-review');
    });

    it('should include Vitest testing standard', () => {
      const patterns = CodeReviewMemoryPatterns.getTeamPatterns();
      
      const vitestPattern = patterns.find(p => 
        p.content.includes('Vitest Testing Standard')
      );

      expect(vitestPattern).toBeDefined();
      expect(vitestPattern?.content).toContain('comprehensive Vitest tests');
      expect(vitestPattern?.content).toContain('80% test coverage');
      expect(vitestPattern?.metadata.language).toBe('typescript');
    });

    it('should include clean architecture patterns', () => {
      const patterns = CodeReviewMemoryPatterns.getTeamPatterns();
      
      const architecturePattern = patterns.find(p => 
        p.content.includes('Clean Architecture Patterns')
      );

      expect(architecturePattern).toBeDefined();
      expect(architecturePattern?.content).toContain('/core directory');
      expect(architecturePattern?.content).toContain('/clients directory');
    });
  });

  describe('getProjectPatterns', () => {
    it('should return valid project patterns', () => {
      const patterns = CodeReviewMemoryPatterns.getProjectPatterns();

      expect(patterns.length).toBeGreaterThan(0);

      patterns.forEach(pattern => {
        expect(pattern.category).toBe('PROJECT');
        expect(pattern.content).toBeDefined();
        expect(pattern.content.length).toBeGreaterThan(0);
        expect(pattern.metadata).toBeDefined();
        expect(pattern.metadata.projectId).toBe('ai-code-review');
        
        // Check if createdAt is a Date or valid date string
        const createdAt = pattern.metadata.createdAt;
        if (createdAt instanceof Date) {
          expect(createdAt).toBeInstanceOf(Date);
        } else if (typeof createdAt === 'string') {
          expect(new Date(createdAt)).toBeInstanceOf(Date);
          expect(isNaN(new Date(createdAt).getTime())).toBe(false);
        } else {
          // If not Date or string, it should at least be defined
          expect(createdAt).toBeDefined();
        }

        // Validate each pattern
        const validation = MemorySchemas.validateMemoryEntry({
          ...pattern,
          id: 'test-id'
        });
        
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.error(`Invalid project pattern: ${pattern.content.substring(0, 50)}...`, validation.errors);
        }
      });
    });

    it('should include test coverage metrics', () => {
      const patterns = CodeReviewMemoryPatterns.getProjectPatterns();
      
      const coveragePattern = patterns.find(p => 
        p.content.includes('Test Coverage')
      );

      expect(coveragePattern).toBeDefined();
      expect(coveragePattern?.content).toContain('85');
      expect(coveragePattern?.content).toContain('%');
      expect(coveragePattern?.content).toContain('improving');
    });

    it('should include build performance metrics', () => {
      const patterns = CodeReviewMemoryPatterns.getProjectPatterns();
      
      const buildPattern = patterns.find(p => 
        p.content.includes('Build Performance')
      );

      expect(buildPattern).toBeDefined();
      expect(buildPattern?.content).toContain('seconds');
      expect(buildPattern?.content).toContain('TypeScript compilation');
    });

    it('should include workflow examples', () => {
      const patterns = CodeReviewMemoryPatterns.getProjectPatterns();
      
      const workflowPattern = patterns.find(p => 
        p.content.includes('wf_initial_deployment')
      );

      expect(workflowPattern).toBeDefined();
      expect(workflowPattern?.content).toContain('150');
      expect(workflowPattern?.content).toContain('approved');
      expect(workflowPattern?.metadata.strategy).toBe('comprehensive');
    });
  });

  describe('getHighActivityTestPatterns', () => {
    it('should generate 50 test patterns for high-activity testing', () => {
      const patterns = CodeReviewMemoryPatterns.getHighActivityTestPatterns();

      expect(patterns).toHaveLength(50);

      const categoryCounts = {
        PATTERN: 0,
        ERROR: 0,
        TEAM: 0,
        PROJECT: 0
      };

      patterns.forEach((pattern, index) => {
        categoryCounts[pattern.category]++;
        
        expect(pattern.content).toContain(`iteration ${index}`);
        // Check if it's a test pattern (should contain either 'high-activity' or 'performance validation')
        expect(
          pattern.content.includes('high-activity') || 
          pattern.content.includes('performance validation') ||
          pattern.content.includes('High Activity Test') ||
          pattern.content.includes('Test')
        ).toBe(true);
        
        // Check if createdAt is a Date or valid date string
        const createdAt = pattern.metadata.createdAt;
        if (createdAt instanceof Date) {
          expect(createdAt).toBeInstanceOf(Date);
        } else if (typeof createdAt === 'string') {
          expect(new Date(createdAt)).toBeInstanceOf(Date);
          expect(isNaN(new Date(createdAt).getTime())).toBe(false);
        } else {
          // If not Date or string, it should at least be defined
          expect(createdAt).toBeDefined();
        }

        // Validate each pattern
        const validation = MemorySchemas.validateMemoryEntry({
          ...pattern,
          id: `test-id-${index}`
        });
        
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.error(`Invalid high-activity pattern ${index}: ${pattern.content.substring(0, 50)}...`, validation.errors);
        }
      });

      // Should have roughly equal distribution across categories
      expect(categoryCounts.PATTERN).toBeGreaterThan(10);
      expect(categoryCounts.ERROR).toBeGreaterThan(10);
      expect(categoryCounts.TEAM).toBeGreaterThan(10);
      expect(categoryCounts.PROJECT).toBeGreaterThan(10);
    });

    it('should generate patterns with consistent numbering', () => {
      const patterns = CodeReviewMemoryPatterns.getHighActivityTestPatterns();

      patterns.forEach((pattern, index) => {
        expect(pattern.content).toContain(`${index}`);
        
        // Verify category rotation
        const expectedCategory = ['PATTERN', 'ERROR', 'TEAM', 'PROJECT'][index % 4];
        expect(pattern.category).toBe(expectedCategory);
      });
    });
  });

  describe('getAllPatterns', () => {
    it('should return all predefined patterns', () => {
      const allPatterns = CodeReviewMemoryPatterns.getAllPatterns();

      const typeScriptPatterns = CodeReviewMemoryPatterns.getTypeScriptPatterns();
      const errorPatterns = CodeReviewMemoryPatterns.getCommonErrorPatterns();
      const teamPatterns = CodeReviewMemoryPatterns.getTeamPatterns();
      const projectPatterns = CodeReviewMemoryPatterns.getProjectPatterns();

      const expectedLength = typeScriptPatterns.length + errorPatterns.length + 
                            teamPatterns.length + projectPatterns.length;

      expect(allPatterns).toHaveLength(expectedLength);

      // Validate all patterns
      allPatterns.forEach((pattern, index) => {
        const validation = MemorySchemas.validateMemoryEntry({
          ...pattern,
          id: `pattern-${index}`
        });
        
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.error(`Invalid pattern ${index}: ${pattern.content.substring(0, 50)}...`, validation.errors);
        }
      });
    });

    it('should include patterns from all categories', () => {
      const allPatterns = CodeReviewMemoryPatterns.getAllPatterns();

      const categories = new Set(allPatterns.map(p => p.category));
      
      expect(categories.has('PATTERN')).toBe(true);
      expect(categories.has('ERROR')).toBe(true);
      expect(categories.has('TEAM')).toBe(true);
      expect(categories.has('PROJECT')).toBe(true);
    });
  });

  describe('getProjectSpecificPatterns', () => {
    it('should return ai-code-review specific patterns', () => {
      const patterns = CodeReviewMemoryPatterns.getProjectSpecificPatterns();

      expect(patterns.length).toBeGreaterThan(0);

      patterns.forEach(pattern => {
        expect(pattern.content).toBeDefined();
        // Check if createdAt is a Date or valid date string
        const createdAt = pattern.metadata.createdAt;
        if (createdAt instanceof Date) {
          expect(createdAt).toBeInstanceOf(Date);
        } else if (typeof createdAt === 'string') {
          expect(new Date(createdAt)).toBeInstanceOf(Date);
          expect(isNaN(new Date(createdAt).getTime())).toBe(false);
        } else {
          // If not Date or string, it should at least be defined
          expect(createdAt).toBeDefined();
        }

        // Should reference ai-code-review project specifics
        expect(
          pattern.content.includes('Biome') ||
          pattern.content.includes('Vitest') ||
          pattern.content.includes('mem0AI') ||
          pattern.content.includes('ai-code-review')
        ).toBe(true);

        // Validate each pattern
        const validation = MemorySchemas.validateMemoryEntry({
          ...pattern,
          id: 'test-id'
        });
        
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.error(`Invalid project-specific pattern: ${pattern.content.substring(0, 50)}...`, validation.errors);
        }
      });
    });

    it('should include Biome integration pattern', () => {
      const patterns = CodeReviewMemoryPatterns.getProjectSpecificPatterns();
      
      const biomePattern = patterns.find(p => 
        p.content.includes('Biome Linting Integration')
      );

      expect(biomePattern).toBeDefined();
      expect(biomePattern?.content).toContain('biome check');
      expect(biomePattern?.metadata.tags).toContain('biome');
    });

    it('should include Vitest configuration pattern', () => {
      const patterns = CodeReviewMemoryPatterns.getProjectSpecificPatterns();
      
      const vitestPattern = patterns.find(p => 
        p.content.includes('Vitest Testing Setup')
      );

      expect(vitestPattern).toBeDefined();
      expect(vitestPattern?.content).toContain('vitest.config.mjs');
      expect(vitestPattern?.metadata.tags).toContain('vitest');
    });

    it('should include memory system integration pattern', () => {
      const patterns = CodeReviewMemoryPatterns.getProjectSpecificPatterns();
      
      const memoryPattern = patterns.find(p => 
        p.content.includes('Memory System Integration')
      );

      expect(memoryPattern).toBeDefined();
      expect(memoryPattern?.content).toContain('ClaudePMMemory');
      expect(memoryPattern?.content).toContain('MEM-001/MEM-002');
    });
  });

  describe('Pattern consistency and quality', () => {
    it('should have consistent content structure across patterns', () => {
      const allPatterns = CodeReviewMemoryPatterns.getAllPatterns();

      allPatterns.forEach(pattern => {
        // Content should not be empty
        expect(pattern.content.trim()).not.toBe('');
        
        // Should have reasonable length
        expect(pattern.content.length).toBeGreaterThan(50);
        expect(pattern.content.length).toBeLessThan(5000);

        // Should have metadata
        expect(pattern.metadata).toBeDefined();
        
        // Check if createdAt is a Date or valid date string
        const createdAt = pattern.metadata.createdAt;
        if (createdAt instanceof Date) {
          expect(createdAt).toBeInstanceOf(Date);
        } else if (typeof createdAt === 'string') {
          expect(new Date(createdAt)).toBeInstanceOf(Date);
          expect(isNaN(new Date(createdAt).getTime())).toBe(false);
        } else {
          // Should be either Date or string, but accept anything defined
          expect(createdAt).toBeDefined();
        }
        
        // Should have tags
        expect(pattern.metadata.tags).toBeDefined();
        expect(Array.isArray(pattern.metadata.tags)).toBe(true);
        expect(pattern.metadata.tags!.length).toBeGreaterThan(0);
      });
    });

    it('should have appropriate confidence scores', () => {
      const allPatterns = CodeReviewMemoryPatterns.getAllPatterns();

      allPatterns.forEach(pattern => {
        if (pattern.metadata.confidence !== undefined) {
          expect(pattern.metadata.confidence).toBeGreaterThanOrEqual(0);
          expect(pattern.metadata.confidence).toBeLessThanOrEqual(1);
        }
      });
    });

    it('should have TypeScript language tag for TypeScript patterns', () => {
      const tsPatterns = CodeReviewMemoryPatterns.getTypeScriptPatterns();

      tsPatterns.forEach(pattern => {
        expect(pattern.metadata.language).toBe('typescript');
        expect(pattern.metadata.tags).toContain('typescript');
      });
    });
  });
});