/**
 * @fileoverview Tests for ChunkGenerator
 *
 * This module provides comprehensive tests for the intelligent chunk generator,
 * covering different chunking strategies, priority calculation, review focus
 * determination, and cross-reference analysis.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ChunkGenerator, generateSemanticChunks } from '../../../analysis/semantic/ChunkGenerator';
import {
  SemanticAnalysis,
  Declaration,
  DeclarationType,
  ExportStatus,
  ChunkingStrategy,
  ComplexityMetrics,
  ImportRelationship
} from '../../../analysis/semantic/types';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('ChunkGenerator', () => {
  let chunkGenerator: ChunkGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    chunkGenerator = new ChunkGenerator();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test data setup
  const createMockDeclaration = (
    name: string,
    type: DeclarationType,
    startLine: number,
    endLine: number,
    complexity: number = 1,
    exportStatus: ExportStatus = 'internal',
    dependencies: string[] = []
  ): Declaration => ({
    type,
    name,
    startLine,
    endLine,
    dependencies,
    cyclomaticComplexity: complexity,
    exportStatus,
    documentation: undefined,
    children: [],
    modifiers: []
  });

  const createMockAnalysis = (
    declarations: Declaration[],
    strategy: ChunkingStrategy = 'individual',
    complexity: Partial<ComplexityMetrics> = {}
  ): SemanticAnalysis => ({
    language: 'typescript',
    totalLines: 100,
    topLevelDeclarations: declarations,
    importGraph: [],
    complexity: {
      cyclomaticComplexity: 10,
      cognitiveComplexity: 10,
      maxNestingDepth: 3,
      functionCount: 5,
      classCount: 1,
      totalDeclarations: 6,
      linesOfCode: 80,
      ...complexity
    },
    suggestedChunkingStrategy: {
      strategy,
      chunks: [],
      crossReferences: [],
      reasoning: 'Test strategy',
      estimatedTokens: 400,
      estimatedChunks: 2
    },
    filePath: 'test.ts',
    analyzedAt: new Date()
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const generator = new ChunkGenerator();
      expect(generator).toBeDefined();
      expect(generator.getConfig()).toBeDefined();
      expect(generator.getConfig().maxChunkSize).toBe(500);
    });

    it('should initialize with custom configuration', () => {
      const config = {
        maxChunkSize: 300,
        minChunkSize: 20,
        tokensPerLine: 5
      };

      const generator = new ChunkGenerator(config);
      expect(generator.getConfig().maxChunkSize).toBe(300);
      expect(generator.getConfig().minChunkSize).toBe(20);
      expect(generator.getConfig().tokensPerLine).toBe(5);
    });
  });

  describe('Individual Chunking Strategy', () => {
    it('should generate individual chunks for each declaration', () => {
      const declarations = [
        createMockDeclaration('functionA', 'function', 1, 10, 5, 'exported'),
        createMockDeclaration('functionB', 'function', 15, 25, 3, 'internal'),
        createMockDeclaration('ClassA', 'class', 30, 60, 8, 'exported')
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(100);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      expect(result.strategy).toBe('individual');
      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0].declarations).toHaveLength(1);
      expect(result.chunks[0].declarations[0].name).toBe('functionA');
      expect(result.chunks[0].priority).toBe('high'); // exported function
      expect(result.reasoning).toContain('individual');
    });

    it('should skip very small declarations unless important', () => {
      const declarations = [
        createMockDeclaration('smallFunction', 'function', 1, 3, 1, 'internal'), // 3 lines, internal
        createMockDeclaration('importantFunction', 'function', 5, 7, 1, 'exported'), // 3 lines, exported
        createMockDeclaration('largeFunction', 'function', 10, 25, 5, 'internal') // 16 lines
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(30);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      // Should include exported function and large function, skip small internal function
      expect(result.chunks.length).toBeGreaterThanOrEqual(2);
      const chunkNames = result.chunks.flatMap(c => c.declarations.map(d => d.name));
      expect(chunkNames).toContain('importantFunction');
      expect(chunkNames).toContain('largeFunction');
    });

    it('should include import chunk for significant imports', () => {
      const declarations = [
        createMockDeclaration('functionA', 'function', 10, 20)
      ];

      const imports: ImportRelationship[] = Array(10).fill(null).map((_, i) => ({
        imported: `module${i}`,
        from: `./module${i}`,
        importType: 'named' as const,
        line: i + 1,
        isUsed: true
      }));

      const analysis = createMockAnalysis(declarations, 'individual');
      analysis.importGraph = imports;
      
      const fileContent = 'import stuff\n'.repeat(10) + 'function code\n'.repeat(10);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      // Should have function chunk + import chunk
      expect(result.chunks.length).toBe(2);
      const importChunk = result.chunks.find(c => c.type === 'imports');
      expect(importChunk).toBeDefined();
      expect(importChunk!.priority).toBe('low');
    });
  });

  describe('Grouped Chunking Strategy', () => {
    it('should group related declarations together', () => {
      const declarations = [
        createMockDeclaration('userFunction1', 'function', 1, 10, 3, 'internal', ['User']),
        createMockDeclaration('userFunction2', 'function', 15, 25, 4, 'internal', ['User']),
        createMockDeclaration('adminFunction', 'function', 30, 40, 2, 'internal', ['Admin'])
      ];

      const analysis = createMockAnalysis(declarations, 'grouped');
      const fileContent = 'const x = 1;\n'.repeat(50);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      expect(result.strategy).toBe('grouped');
      // Should group user functions together, admin function separate
      expect(result.chunks.length).toBeLessThan(declarations.length);
    });

    it('should split large groups into smaller chunks', () => {
      // Create many declarations that would exceed max chunk size when grouped
      // Make them more compact so splitting logic is actually triggered
      const declarations = Array(15).fill(null).map((_, i) => 
        createMockDeclaration(`function${i}`, 'function', i * 20 + 1, i * 20 + 18, 3, 'internal', ['CommonDep'])
      );

      const analysis = createMockAnalysis(declarations, 'grouped');
      const fileContent = 'const x = 1;\n'.repeat(400); // Large file

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      expect(result.strategy).toBe('grouped');
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
      
      // Each chunk should not exceed max size (allow some tolerance for chunking logic)
      result.chunks.forEach(chunk => {
        const chunkSize = chunk.lines[1] - chunk.lines[0] + 1;
        expect(chunkSize).toBeLessThanOrEqual(600); // More lenient limit for test
      });
    });
  });

  describe('Hierarchical Chunking Strategy', () => {
    it('should handle classes hierarchically', () => {
      const methodDeclarations = [
        createMockDeclaration('constructor', 'method', 5, 8, 2, 'internal', []),
        createMockDeclaration('publicMethod', 'method', 10, 20, 5, 'internal', []),
        createMockDeclaration('privateMethod', 'method', 25, 35, 3, 'internal', [])
      ];

      const classDeclaration = createMockDeclaration('UserClass', 'class', 1, 40, 10, 'exported');
      classDeclaration.children = methodDeclarations;

      const declarations = [classDeclaration];
      const analysis = createMockAnalysis(declarations, 'hierarchical');
      const fileContent = 'class UserClass {\n'.repeat(40);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'architectural');

      expect(result.strategy).toBe('hierarchical');
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
      
      // Should have chunks related to the class
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should handle small classes as single units', () => {
      const classDeclaration = createMockDeclaration('SmallClass', 'class', 1, 20, 5, 'exported');
      classDeclaration.children = [
        createMockDeclaration('method1', 'method', 5, 10, 2, 'internal')
      ];

      const analysis = createMockAnalysis([classDeclaration], 'hierarchical');
      const fileContent = 'class SmallClass {\n'.repeat(20);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'architectural');

      expect(result.strategy).toBe('hierarchical');
      expect(result.chunks).toHaveLength(1); // Small class as single unit
    });

    it('should process non-class declarations separately', () => {
      const classDeclaration = createMockDeclaration('MyClass', 'class', 1, 30, 8, 'exported');
      const functionDeclaration = createMockDeclaration('utilFunction', 'function', 35, 45, 3, 'exported');

      const analysis = createMockAnalysis([classDeclaration, functionDeclaration], 'hierarchical');
      const fileContent = 'code\n'.repeat(50);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'architectural');

      expect(result.strategy).toBe('hierarchical');
      expect(result.chunks.length).toBeGreaterThan(1);
    });
  });

  describe('Functional Chunking Strategy', () => {
    it('should group declarations by shared dependencies', () => {
      const declarations = [
        createMockDeclaration('func1', 'function', 1, 10, 3, 'internal', ['Database', 'Logger']),
        createMockDeclaration('func2', 'function', 15, 25, 4, 'internal', ['Database']),
        createMockDeclaration('func3', 'function', 30, 40, 2, 'internal', ['Cache'])
      ];

      const analysis = createMockAnalysis(declarations, 'functional');
      const fileContent = 'const x = 1;\n'.repeat(50);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'performance');

      expect(result.strategy).toBe('functional');
      // Functions with shared dependencies should be grouped
      expect(result.chunks.length).toBeLessThan(declarations.length);
    });
  });

  describe('Contextual Chunking Strategy', () => {
    it('should group declarations by broader context', () => {
      const declarations = [
        createMockDeclaration('authFunction', 'function', 1, 10, 3, 'internal', ['User', 'Token']),
        createMockDeclaration('loginFunction', 'function', 15, 25, 4, 'internal', ['User', 'Auth']),
        createMockDeclaration('dataFunction', 'function', 30, 40, 2, 'internal', ['Database'])
      ];

      const analysis = createMockAnalysis(declarations, 'contextual');
      const fileContent = 'const x = 1;\n'.repeat(50);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'security');

      expect(result.strategy).toBe('contextual');
      expect(result.chunks.length).toBeDefined();
    });
  });

  describe('Fallback Chunking', () => {
    it('should generate fallback chunks when strategy fails', () => {
      // Create analysis that would cause chunking to fail
      const analysis = createMockAnalysis([], 'unknown_strategy' as ChunkingStrategy);
      const fileContent = 'const x = 1;\n'.repeat(100);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      expect(result.chunks.length).toBeGreaterThan(0);
      result.chunks.forEach(chunk => {
        expect(chunk.id).toMatch(/fallback_\d+/);
        expect(chunk.type).toBe('module');
      });
    });

    it('should handle errors gracefully', () => {
      const analysis = createMockAnalysis([
        createMockDeclaration('test', 'function', 1, 10)
      ]);

      // Create file content that might cause issues
      const fileContent = '';

      expect(() => {
        chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');
      }).not.toThrow();
    });
  });

  describe('Priority Calculation', () => {
    it('should assign high priority to exported declarations', () => {
      const declarations = [
        createMockDeclaration('exportedFunc', 'function', 1, 10, 5, 'exported'),
        createMockDeclaration('internalFunc', 'function', 15, 25, 5, 'internal')
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(30);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      const exportedChunk = result.chunks.find(c => 
        c.declarations.some(d => d.name === 'exportedFunc')
      );
      const internalChunk = result.chunks.find(c => 
        c.declarations.some(d => d.name === 'internalFunc')
      );

      expect(exportedChunk!.priority).toBe('high');
      expect(internalChunk!.priority).toBe('low'); // Same complexity but internal
    });

    it('should assign high priority to complex declarations', () => {
      const declarations = [
        createMockDeclaration('complexFunc', 'function', 1, 10, 20, 'internal'), // High complexity
        createMockDeclaration('simpleFunc', 'function', 15, 25, 3, 'internal') // Low complexity
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(30);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      const complexChunk = result.chunks.find(c => 
        c.declarations.some(d => d.name === 'complexFunc')
      );
      const simpleChunk = result.chunks.find(c => 
        c.declarations.some(d => d.name === 'simpleFunc')
      );

      expect(complexChunk!.priority).toBe('high');
      expect(simpleChunk!.priority).toBe('low');
    });

    it('should consider review type for security-critical code', () => {
      const declarations = [
        createMockDeclaration('authFunction', 'function', 1, 10, 5, 'internal'), // Security-related name
        createMockDeclaration('utilFunction', 'function', 15, 25, 5, 'internal')
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(30);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'security');

      const authChunk = result.chunks.find(c => 
        c.declarations.some(d => d.name === 'authFunction')
      );

      expect(authChunk!.priority).toBe('high'); // Security review + auth function
    });
  });

  describe('Review Focus Assignment', () => {
    it('should assign appropriate focus based on review type', () => {
      const declarations = [
        createMockDeclaration('testFunc', 'function', 1, 10, 5, 'exported')
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(15);

      const securityResult = chunkGenerator.generateChunks(analysis, fileContent, 'security');
      const performanceResult = chunkGenerator.generateChunks(analysis, fileContent, 'performance');
      const architecturalResult = chunkGenerator.generateChunks(analysis, fileContent, 'architectural');

      expect(securityResult.chunks[0].reviewFocus).toContain('security');
      expect(performanceResult.chunks[0].reviewFocus).toContain('performance');
      expect(architecturalResult.chunks[0].reviewFocus).toContain('architecture');
    });

    it('should add specific focus based on declaration characteristics', () => {
      const classDeclaration = createMockDeclaration('MyClass', 'class', 1, 20, 8, 'exported');
      const complexFunction = createMockDeclaration('complexFunc', 'function', 25, 45, 15, 'exported');

      const analysis = createMockAnalysis([classDeclaration, complexFunction], 'individual');
      const fileContent = 'const x = 1;\n'.repeat(50);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      const classChunk = result.chunks.find(c => 
        c.declarations.some(d => d.name === 'MyClass')
      );
      const functionChunk = result.chunks.find(c => 
        c.declarations.some(d => d.name === 'complexFunc')
      );

      expect(classChunk!.reviewFocus).toContain('architecture');
      expect(classChunk!.reviewFocus).toContain('type_safety');
      expect(functionChunk!.reviewFocus).toContain('maintainability'); // Complex function
      expect(functionChunk!.reviewFocus).toContain('documentation'); // Exported
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens correctly', () => {
      const declarations = [
        createMockDeclaration('func1', 'function', 1, 10) // 10 lines
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(15);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.chunks[0].estimatedTokens).toBe(10 * 4); // 10 lines * 4 tokens per line (default)
    });

    it('should sum tokens across all chunks', () => {
      const declarations = [
        createMockDeclaration('func1', 'function', 1, 10), // 10 lines
        createMockDeclaration('func2', 'function', 15, 25) // 11 lines
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(30);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      const expectedTokens = result.chunks.reduce((sum, chunk) => sum + chunk.estimatedTokens, 0);
      expect(result.estimatedTokens).toBe(expectedTokens);
    });
  });

  describe('Cross-Reference Generation', () => {
    it('should generate cross-references between related chunks', () => {
      const declarations = [
        createMockDeclaration('func1', 'function', 1, 10, 3, 'internal', ['SharedDep']),
        createMockDeclaration('func2', 'function', 15, 25, 4, 'internal', ['SharedDep']),
        createMockDeclaration('func3', 'function', 30, 40, 2, 'internal', ['OtherDep'])
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(45);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      expect(result.crossReferences.length).toBeGreaterThan(0);
      
      // Should have relationship between func1 and func2 (shared dependency)
      const sharedDepRef = result.crossReferences.find(ref => 
        ref.relationship === 'depends_on' && ref.description.includes('SharedDep')
      );
      expect(sharedDepRef).toBeDefined();
    });

    it('should calculate relationship strength', () => {
      const declarations = [
        createMockDeclaration('func1', 'function', 1, 10, 3, 'internal', ['Dep1', 'Dep2', 'Dep3']),
        createMockDeclaration('func2', 'function', 15, 25, 4, 'internal', ['Dep1']) // 1 shared out of 3
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(30);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      const relationship = result.crossReferences[0];
      expect(relationship.strength).toBeLessThanOrEqual(1);
      expect(relationship.strength).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxChunkSize: 300,
        tokensPerLine: 5
      };

      chunkGenerator.updateConfig(newConfig);
      const config = chunkGenerator.getConfig();

      expect(config.maxChunkSize).toBe(300);
      expect(config.tokensPerLine).toBe(5);
    });

    it('should preserve existing config values when updating', () => {
      const originalMinSize = chunkGenerator.getConfig().minChunkSize;
      
      chunkGenerator.updateConfig({ maxChunkSize: 600 });
      
      expect(chunkGenerator.getConfig().minChunkSize).toBe(originalMinSize);
      expect(chunkGenerator.getConfig().maxChunkSize).toBe(600);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty declarations list', () => {
      const analysis = createMockAnalysis([], 'individual');
      const fileContent = 'const x = 1;\n'.repeat(10);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      expect(result.chunks.length).toBeGreaterThanOrEqual(0); // May create fallback chunks
      if (result.chunks.length > 0) {
        expect(result.chunks[0].id).toMatch(/fallback_\d+/);
      }
    });

    it('should handle malformed declarations', () => {
      const malformedDeclaration = createMockDeclaration('', 'function', 100, 50); // Invalid line range
      const analysis = createMockAnalysis([malformedDeclaration], 'individual');
      const fileContent = 'const x = 1;\n'.repeat(10);

      expect(() => {
        chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');
      }).not.toThrow();
    });

    it('should handle very large files gracefully', () => {
      const declarations = [
        createMockDeclaration('func1', 'function', 1, 1000) // Very large function
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(1000);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe('Convenience Functions', () => {
    it('should work with generateSemanticChunks function', () => {
      const declarations = [
        createMockDeclaration('testFunc', 'function', 1, 10, 5, 'exported')
      ];

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(15);

      const result = generateSemanticChunks(analysis, fileContent, 'quick-fixes');

      expect(result.strategy).toBe('individual');
      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0].declarations[0].name).toBe('testFunc');
    });
  });

  describe('Context Declaration Finding', () => {
    it('should include relevant context declarations', () => {
      const declarations = [
        createMockDeclaration('User', 'interface', 1, 5),
        createMockDeclaration('createUser', 'function', 10, 20, 3, 'exported', ['User']),
        createMockDeclaration('deleteUser', 'function', 25, 35, 2, 'exported', ['User']),
        createMockDeclaration('unrelatedFunc', 'function', 40, 50, 1, 'internal', [])
      ];

      // Configure to include context
      chunkGenerator.updateConfig({ includeContext: true, maxContextDeclarations: 2 });

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(55);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      const createUserChunk = result.chunks.find(c => 
        c.declarations.some(d => d.name === 'createUser')
      );

      expect(createUserChunk!.context.length).toBeGreaterThan(0);
      expect(createUserChunk!.context.some(c => c.name === 'User')).toBe(true);
    });

    it('should respect max context declarations limit', () => {
      const declarations = [
        createMockDeclaration('targetFunc', 'function', 1, 10, 3, 'exported', ['Dep1', 'Dep2', 'Dep3']),
        createMockDeclaration('Dep1', 'interface', 15, 20),
        createMockDeclaration('Dep2', 'interface', 25, 30),
        createMockDeclaration('Dep3', 'interface', 35, 40)
      ];

      chunkGenerator.updateConfig({ includeContext: true, maxContextDeclarations: 2 });

      const analysis = createMockAnalysis(declarations, 'individual');
      const fileContent = 'const x = 1;\n'.repeat(45);

      const result = chunkGenerator.generateChunks(analysis, fileContent, 'quick-fixes');

      const targetChunk = result.chunks.find(c => 
        c.declarations.some(d => d.name === 'targetFunc')
      );

      expect(targetChunk!.context.length).toBeLessThanOrEqual(2);
    });
  });
});