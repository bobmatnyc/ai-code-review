/**
 * @fileoverview Intelligent chunk generator for semantic code analysis
 *
 * This module generates optimal code chunks based on semantic analysis results,
 * implementing AI-guided chunking strategies that understand code structure
 * and relationships for more effective code review.
 */

import logger from '../../utils/logger';
import type {
  ChunkingRecommendation,
  ChunkRelationship,
  CodeChunk,
  Declaration,
  DeclarationType,
  ImportRelationship,
  ReviewFocus,
  ReviewPriority,
  ReviewUnit,
  SemanticAnalysis,
} from './types';

/**
 * Configuration for chunk generation
 */
export interface ChunkGeneratorConfig {
  /** Maximum lines per chunk */
  maxChunkSize: number;
  /** Minimum lines per chunk */
  minChunkSize: number;
  /** Whether to include context declarations */
  includeContext: boolean;
  /** Maximum context declarations per chunk */
  maxContextDeclarations: number;
  /** Token estimation factor (tokens per line) */
  tokensPerLine: number;
  /** Complexity threshold for high priority */
  highComplexityThreshold: number;
  /** Complexity threshold for medium priority */
  mediumComplexityThreshold: number;
}

/**
 * Default configuration for chunk generation
 */
const DEFAULT_CONFIG: ChunkGeneratorConfig = {
  maxChunkSize: 500,
  minChunkSize: 10,
  includeContext: true,
  maxContextDeclarations: 5,
  tokensPerLine: 4,
  highComplexityThreshold: 15,
  mediumComplexityThreshold: 8,
};

/**
 * Intelligent chunk generator for semantic code analysis
 */
export class ChunkGenerator {
  private config: ChunkGeneratorConfig;

  constructor(config: Partial<ChunkGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate intelligent code chunks from semantic analysis
   */
  public generateChunks(
    analysis: SemanticAnalysis,
    fileContent: string,
    reviewType = 'quick-fixes',
  ): ChunkingRecommendation {
    logger.debug(
      `Generating chunks for ${analysis.filePath} using ${analysis.suggestedChunkingStrategy.strategy} strategy`,
    );

    const lines = fileContent.split('\n');
    const chunks: CodeChunk[] = [];
    const crossReferences: ChunkRelationship[] = [];

    try {
      // Generate chunks based on the recommended strategy
      switch (analysis.suggestedChunkingStrategy.strategy) {
        case 'individual':
          this.generateIndividualChunks(analysis, lines, chunks, reviewType);
          break;
        case 'grouped':
          this.generateGroupedChunks(analysis, lines, chunks, reviewType);
          break;
        case 'hierarchical':
          this.generateHierarchicalChunks(analysis, lines, chunks, reviewType);
          break;
        case 'functional':
          this.generateFunctionalChunks(analysis, lines, chunks, reviewType);
          break;
        case 'contextual':
          this.generateContextualChunks(analysis, lines, chunks, reviewType);
          break;
        default:
          this.generateFallbackChunks(analysis, lines, chunks, reviewType);
      }

      // Generate cross-references between chunks
      this.generateCrossReferences(chunks, analysis, crossReferences);

      // Estimate total tokens
      const estimatedTokens = chunks.reduce((total, chunk) => total + chunk.estimatedTokens, 0);

      return {
        strategy: analysis.suggestedChunkingStrategy.strategy,
        chunks,
        crossReferences,
        reasoning: this.generateReasoningExplanation(analysis, chunks),
        estimatedTokens,
        estimatedChunks: chunks.length,
      };
    } catch (error) {
      logger.error(`Failed to generate chunks: ${error}`);
      // Fallback to simple line-based chunking
      return this.generateFallbackRecommendation(analysis, lines, reviewType);
    }
  }

  /**
   * Generate individual chunks (each declaration separately)
   */
  private generateIndividualChunks(
    analysis: SemanticAnalysis,
    lines: string[],
    chunks: CodeChunk[],
    reviewType: string,
  ): void {
    let chunkId = 1;

    for (const declaration of analysis.topLevelDeclarations) {
      // Skip very small declarations unless they're important
      const declarationSize = declaration.endLine - declaration.startLine + 1;
      if (declarationSize < this.config.minChunkSize && !this.isImportantDeclaration(declaration)) {
        continue;
      }

      const chunk = this.createChunkFromDeclaration(
        declaration,
        `chunk_${chunkId++}`,
        lines,
        analysis,
        reviewType,
      );

      if (chunk) {
        chunks.push(chunk);
      }
    }

    // Handle imports separately if significant
    if (analysis.importGraph.length > 5) {
      const importChunk = this.createImportChunk(
        analysis.importGraph,
        `chunk_${chunkId++}`,
        reviewType,
      );
      if (importChunk) {
        chunks.push(importChunk);
      }
    }
  }

  /**
   * Generate grouped chunks (related declarations together)
   */
  private generateGroupedChunks(
    analysis: SemanticAnalysis,
    lines: string[],
    chunks: CodeChunk[],
    reviewType: string,
  ): void {
    const groups = this.groupRelatedDeclarations(analysis.topLevelDeclarations);
    let chunkId = 1;

    for (const group of groups) {
      const groupSize = group.reduce((size, decl) => size + (decl.endLine - decl.startLine + 1), 0);

      if (groupSize <= this.config.maxChunkSize) {
        // Group fits in one chunk
        const chunk = this.createChunkFromDeclarations(
          group,
          `group_${chunkId++}`,
          lines,
          analysis,
          reviewType,
        );
        if (chunk) {
          chunks.push(chunk);
        }
      } else {
        // Split large groups
        this.splitLargeGroup(group, lines, chunks, analysis, reviewType, chunkId);
        chunkId += group.length;
      }
    }
  }

  /**
   * Generate hierarchical chunks (classes with methods)
   */
  private generateHierarchicalChunks(
    analysis: SemanticAnalysis,
    lines: string[],
    chunks: CodeChunk[],
    reviewType: string,
  ): void {
    let chunkId = 1;

    // Separate classes from other declarations
    const classes = analysis.topLevelDeclarations.filter((d) => d.type === 'class');
    const nonClasses = analysis.topLevelDeclarations.filter((d) => d.type !== 'class');

    // Process classes hierarchically
    for (const classDecl of classes) {
      const classSize = classDecl.endLine - classDecl.startLine + 1;

      if (classSize <= this.config.maxChunkSize) {
        // Small class: review as a unit
        const chunk = this.createChunkFromDeclaration(
          classDecl,
          `class_${chunkId++}`,
          lines,
          analysis,
          reviewType,
        );
        if (chunk) {
          chunks.push(chunk);
        }
      } else {
        // Large class: break into logical sections
        this.createClassHierarchyChunks(classDecl, lines, chunks, analysis, reviewType, chunkId);
        chunkId += (classDecl.children?.length || 0) + 1;
      }
    }

    // Process non-class declarations
    if (nonClasses.length > 0) {
      this.generateGroupedChunks(
        { ...analysis, topLevelDeclarations: nonClasses },
        lines,
        chunks,
        reviewType,
      );
    }
  }

  /**
   * Generate functional chunks (by shared dependencies)
   */
  private generateFunctionalChunks(
    analysis: SemanticAnalysis,
    lines: string[],
    chunks: CodeChunk[],
    reviewType: string,
  ): void {
    const functionalGroups = this.groupByDependencies(analysis.topLevelDeclarations);
    let chunkId = 1;

    for (const group of functionalGroups) {
      const chunk = this.createChunkFromDeclarations(
        group,
        `functional_${chunkId++}`,
        lines,
        analysis,
        reviewType,
      );
      if (chunk) {
        chunks.push(chunk);
      }
    }
  }

  /**
   * Generate contextual chunks (by shared context)
   */
  private generateContextualChunks(
    analysis: SemanticAnalysis,
    lines: string[],
    chunks: CodeChunk[],
    reviewType: string,
  ): void {
    // Similar to functional but considers broader context
    const contextGroups = this.groupByContext(analysis.topLevelDeclarations, analysis.importGraph);
    let chunkId = 1;

    for (const group of contextGroups) {
      const chunk = this.createChunkFromDeclarations(
        group,
        `context_${chunkId++}`,
        lines,
        analysis,
        reviewType,
      );
      if (chunk) {
        chunks.push(chunk);
      }
    }
  }

  /**
   * Generate fallback chunks when semantic analysis fails
   */
  private generateFallbackChunks(
    _analysis: SemanticAnalysis,
    lines: string[],
    chunks: CodeChunk[],
    reviewType: string,
  ): void {
    // Simple line-based chunking as fallback
    const chunkSize = Math.min(this.config.maxChunkSize, Math.max(50, lines.length / 4));
    let chunkId = 1;

    for (let i = 0; i < lines.length; i += chunkSize) {
      const endLine = Math.min(i + chunkSize, lines.length);

      const chunk: CodeChunk = {
        id: `fallback_${chunkId++}`,
        type: 'module',
        lines: [i + 1, endLine],
        declarations: [],
        context: [],
        priority: 'medium',
        reviewFocus: this.getReviewFocusForType(reviewType),
        estimatedTokens: (endLine - i) * this.config.tokensPerLine,
        dependencies: [],
      };

      chunks.push(chunk);
    }
  }

  /**
   * Create a chunk from a single declaration
   */
  private createChunkFromDeclaration(
    declaration: Declaration,
    id: string,
    _lines: string[],
    analysis: SemanticAnalysis,
    reviewType: string,
  ): CodeChunk | null {
    try {
      const context = this.config.includeContext
        ? this.findContextDeclarations(declaration, analysis.topLevelDeclarations)
        : [];

      return {
        id,
        type: this.mapDeclarationToReviewUnit(declaration.type),
        lines: [declaration.startLine, declaration.endLine],
        declarations: [declaration],
        context,
        priority: this.calculatePriority(declaration, reviewType),
        reviewFocus: this.getReviewFocusForDeclaration(declaration, reviewType),
        estimatedTokens: this.estimateTokens(declaration.startLine, declaration.endLine),
        dependencies: declaration.dependencies,
      };
    } catch (error) {
      logger.warn(`Failed to create chunk from declaration ${declaration.name}: ${error}`);
      return null;
    }
  }

  /**
   * Create a chunk from multiple declarations
   */
  private createChunkFromDeclarations(
    declarations: Declaration[],
    id: string,
    _lines: string[],
    analysis: SemanticAnalysis,
    reviewType: string,
  ): CodeChunk | null {
    if (declarations.length === 0) return null;

    try {
      const startLine = Math.min(...declarations.map((d) => d.startLine));
      const endLine = Math.max(...declarations.map((d) => d.endLine));

      const allDependencies = new Set<string>();
      declarations.forEach((d) => d.dependencies.forEach((dep) => allDependencies.add(dep)));

      const context = this.config.includeContext
        ? this.findContextDeclarations(declarations[0], analysis.topLevelDeclarations)
        : [];

      return {
        id,
        type: this.determineGroupReviewUnit(declarations),
        lines: [startLine, endLine],
        declarations,
        context,
        priority: this.calculateGroupPriority(declarations, reviewType),
        reviewFocus: this.getReviewFocusForDeclarations(declarations, reviewType),
        estimatedTokens: this.estimateTokens(startLine, endLine),
        dependencies: Array.from(allDependencies),
      };
    } catch (error) {
      logger.warn(`Failed to create chunk from declarations: ${error}`);
      return null;
    }
  }

  /**
   * Create class hierarchy chunks
   */
  private createClassHierarchyChunks(
    classDecl: Declaration,
    lines: string[],
    chunks: CodeChunk[],
    analysis: SemanticAnalysis,
    reviewType: string,
    baseId: number,
  ): void {
    // Create chunk for class declaration itself
    const classHeaderChunk = this.createClassHeaderChunk(
      classDecl,
      `class_header_${baseId}`,
      reviewType,
    );
    if (classHeaderChunk) {
      chunks.push(classHeaderChunk);
    }

    // Create chunks for methods/properties
    if (classDecl.children) {
      const methodGroups = this.groupClassMethods(classDecl.children);

      for (let i = 0; i < methodGroups.length; i++) {
        const methodChunk = this.createChunkFromDeclarations(
          methodGroups[i],
          `class_methods_${baseId}_${i + 1}`,
          lines,
          analysis,
          reviewType,
        );
        if (methodChunk) {
          chunks.push(methodChunk);
        }
      }
    }
  }

  /**
   * Create class header chunk (class declaration without methods)
   */
  private createClassHeaderChunk(
    classDecl: Declaration,
    id: string,
    reviewType: string,
  ): CodeChunk | null {
    // Find the end of class declaration (before first method)
    const firstMethodLine = classDecl.children?.[0]?.startLine || classDecl.endLine;
    const headerEndLine = Math.max(classDecl.startLine + 5, firstMethodLine - 1);

    return {
      id,
      type: 'class',
      lines: [classDecl.startLine, headerEndLine],
      declarations: [{ ...classDecl, children: [] }],
      context: [],
      priority: this.calculatePriority(classDecl, reviewType),
      reviewFocus: ['architecture', 'type_safety'],
      estimatedTokens: this.estimateTokens(classDecl.startLine, headerEndLine),
      dependencies: classDecl.dependencies,
    };
  }

  /**
   * Create import chunk for significant import statements
   */
  private createImportChunk(
    imports: ImportRelationship[],
    id: string,
    _reviewType: string,
  ): CodeChunk | null {
    if (imports.length === 0) return null;

    const startLine = Math.min(...imports.map((i) => i.line));
    const endLine = Math.max(...imports.map((i) => i.line));

    return {
      id,
      type: 'imports',
      lines: [startLine, endLine],
      declarations: [],
      context: [],
      priority: 'low',
      reviewFocus: ['architecture', 'maintainability'],
      estimatedTokens: this.estimateTokens(startLine, endLine),
      dependencies: imports.map((i) => i.from),
    };
  }

  /**
   * Group related declarations based on naming and dependencies
   */
  private groupRelatedDeclarations(declarations: Declaration[]): Declaration[][] {
    const groups: Declaration[][] = [];
    const used = new Set<Declaration>();

    for (const declaration of declarations) {
      if (used.has(declaration)) continue;

      const group = [declaration];
      used.add(declaration);

      // Find related declarations
      for (const other of declarations) {
        if (used.has(other)) continue;

        if (this.areDeclarationsRelated(declaration, other)) {
          group.push(other);
          used.add(other);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two declarations are related
   */
  private areDeclarationsRelated(decl1: Declaration, decl2: Declaration): boolean {
    // Same type
    if (decl1.type === decl2.type) return true;

    // Shared dependencies
    const sharedDeps = decl1.dependencies.filter((dep) => decl2.dependencies.includes(dep));
    if (sharedDeps.length > 0) return true;

    // Similar naming
    if (this.haveSimilarNames(decl1.name, decl2.name)) return true;

    // Adjacent in code
    if (
      Math.abs(decl1.startLine - decl2.endLine) < 5 ||
      Math.abs(decl2.startLine - decl1.endLine) < 5
    )
      return true;

    return false;
  }

  /**
   * Group declarations by shared dependencies
   */
  private groupByDependencies(declarations: Declaration[]): Declaration[][] {
    const dependencyMap = new Map<string, Declaration[]>();

    for (const declaration of declarations) {
      for (const dependency of declaration.dependencies) {
        if (!dependencyMap.has(dependency)) {
          dependencyMap.set(dependency, []);
        }
        dependencyMap.get(dependency)?.push(declaration);
      }
    }

    // Convert dependency groups to declaration groups
    const groups: Declaration[][] = [];
    const processed = new Set<Declaration>();

    for (const [, declarations] of dependencyMap) {
      if (declarations.length > 1) {
        const unprocessed = declarations.filter((d) => !processed.has(d));
        if (unprocessed.length > 0) {
          groups.push(unprocessed);
          unprocessed.forEach((d) => processed.add(d));
        }
      }
    }

    // Add remaining individual declarations
    const remaining = declarations.filter((d) => !processed.has(d));
    remaining.forEach((d) => groups.push([d]));

    return groups;
  }

  /**
   * Group declarations by broader context
   */
  private groupByContext(
    declarations: Declaration[],
    _imports: ImportRelationship[],
  ): Declaration[][] {
    // Implementation similar to groupByDependencies but considers imports and broader context
    return this.groupByDependencies(declarations);
  }

  /**
   * Group class methods intelligently
   */
  private groupClassMethods(methods: Declaration[]): Declaration[][] {
    const groups: Declaration[][] = [];
    const publicMethods = methods.filter((m) => !m.modifiers?.includes('private'));
    const privateMethods = methods.filter((m) => m.modifiers?.includes('private'));

    // Group public methods
    if (publicMethods.length > 0) {
      groups.push(publicMethods);
    }

    // Group private methods
    if (privateMethods.length > 0) {
      groups.push(privateMethods);
    }

    return groups;
  }

  /**
   * Split large groups into smaller chunks
   */
  private splitLargeGroup(
    group: Declaration[],
    lines: string[],
    chunks: CodeChunk[],
    analysis: SemanticAnalysis,
    reviewType: string,
    baseId: number,
  ): void {
    let currentGroup: Declaration[] = [];
    let currentSize = 0;

    for (const declaration of group) {
      const declSize = declaration.endLine - declaration.startLine + 1;

      if (currentSize + declSize > this.config.maxChunkSize && currentGroup.length > 0) {
        // Create chunk from current group
        const chunk = this.createChunkFromDeclarations(
          currentGroup,
          `split_${baseId}_${chunks.length + 1}`,
          lines,
          analysis,
          reviewType,
        );
        if (chunk) {
          chunks.push(chunk);
        }

        currentGroup = [declaration];
        currentSize = declSize;
      } else {
        currentGroup.push(declaration);
        currentSize += declSize;
      }
    }

    // Add remaining group
    if (currentGroup.length > 0) {
      const chunk = this.createChunkFromDeclarations(
        currentGroup,
        `split_${baseId}_${chunks.length + 1}`,
        lines,
        analysis,
        reviewType,
      );
      if (chunk) {
        chunks.push(chunk);
      }
    }
  }

  /**
   * Find context declarations for a given declaration
   */
  private findContextDeclarations(
    declaration: Declaration,
    allDeclarations: Declaration[],
  ): Declaration[] {
    const context: Declaration[] = [];
    let added = 0;

    for (const other of allDeclarations) {
      if (other === declaration || added >= this.config.maxContextDeclarations) continue;

      // Add if it's a dependency
      if (declaration.dependencies.includes(other.name)) {
        context.push(other);
        added++;
      }
    }

    return context;
  }

  /**
   * Generate cross-references between chunks
   */
  private generateCrossReferences(
    chunks: CodeChunk[],
    _analysis: SemanticAnalysis,
    crossReferences: ChunkRelationship[],
  ): void {
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const relationship = this.analyzeChunkRelationship(chunks[i], chunks[j]);
        if (relationship) {
          crossReferences.push(relationship);
        }
      }
    }
  }

  /**
   * Analyze relationship between two chunks
   */
  private analyzeChunkRelationship(chunk1: CodeChunk, chunk2: CodeChunk): ChunkRelationship | null {
    // Check for dependencies
    const sharedDeps = chunk1.dependencies.filter((dep) => chunk2.dependencies.includes(dep));
    if (sharedDeps.length > 0) {
      return {
        from: chunk1.id,
        to: chunk2.id,
        relationship: 'depends_on',
        strength: sharedDeps.length / Math.max(chunk1.dependencies.length, 1),
        description: `Shares dependencies: ${sharedDeps.join(', ')}`,
      };
    }

    // Check for declaration relationships
    for (const decl1 of chunk1.declarations) {
      for (const decl2 of chunk2.declarations) {
        if (decl1.dependencies.includes(decl2.name)) {
          return {
            from: chunk1.id,
            to: chunk2.id,
            relationship: 'depends_on',
            strength: 0.8,
            description: `${decl1.name} depends on ${decl2.name}`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Map declaration type to review unit
   */
  private mapDeclarationToReviewUnit(type: DeclarationType): ReviewUnit {
    const mapping: Record<DeclarationType, ReviewUnit> = {
      function: 'function',
      method: 'function',
      class: 'class',
      interface: 'interface',
      type: 'type_definitions',
      const: 'module',
      let: 'module',
      var: 'module',
      enum: 'type_definitions',
      namespace: 'module',
      property: 'module',
      import: 'imports',
      export: 'exports',
    };

    return mapping[type] || 'module';
  }

  /**
   * Determine review unit for a group of declarations
   */
  private determineGroupReviewUnit(declarations: Declaration[]): ReviewUnit {
    // If all declarations are the same type, use that type's review unit
    const types = new Set(declarations.map((d) => d.type));
    if (types.size === 1) {
      return this.mapDeclarationToReviewUnit(declarations[0].type);
    }

    // Mixed types - determine the most appropriate unit
    if (declarations.some((d) => d.type === 'class')) return 'class';
    if (declarations.some((d) => d.type === 'function')) return 'function';
    if (declarations.some((d) => d.type === 'interface')) return 'interface';

    return 'module';
  }

  /**
   * Calculate priority for a declaration
   */
  private calculatePriority(declaration: Declaration, reviewType: string): ReviewPriority {
    const complexity = declaration.cyclomaticComplexity || 1;

    // High priority for complex or exported declarations
    if (
      complexity >= this.config.highComplexityThreshold ||
      declaration.exportStatus === 'exported' ||
      declaration.exportStatus === 'default_export'
    ) {
      return 'high';
    }

    // Medium priority for moderately complex declarations
    if (complexity >= this.config.mediumComplexityThreshold) {
      return 'medium';
    }

    // Consider review type
    if (reviewType === 'security' && this.isSecurityCritical(declaration)) {
      return 'high';
    }

    return 'low';
  }

  /**
   * Calculate priority for a group of declarations
   */
  private calculateGroupPriority(declarations: Declaration[], reviewType: string): ReviewPriority {
    const priorities = declarations.map((d) => this.calculatePriority(d, reviewType));

    if (priorities.some((p) => p === 'high')) return 'high';
    if (priorities.some((p) => p === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Get review focus for a declaration
   */
  private getReviewFocusForDeclaration(
    declaration: Declaration,
    reviewType: string,
  ): ReviewFocus[] {
    const focus: ReviewFocus[] = this.getReviewFocusForType(reviewType);

    // Add specific focuses based on declaration characteristics
    if (declaration.type === 'class') {
      focus.push('architecture', 'type_safety');
    }

    if (declaration.cyclomaticComplexity && declaration.cyclomaticComplexity > 10) {
      focus.push('maintainability');
    }

    if (declaration.exportStatus !== 'internal') {
      focus.push('documentation');
    }

    return [...new Set(focus)]; // Remove duplicates
  }

  /**
   * Get review focus for multiple declarations
   */
  private getReviewFocusForDeclarations(
    declarations: Declaration[],
    reviewType: string,
  ): ReviewFocus[] {
    const allFocus = declarations.flatMap((d) => this.getReviewFocusForDeclaration(d, reviewType));
    return [...new Set(allFocus)];
  }

  /**
   * Get review focus based on review type
   */
  private getReviewFocusForType(reviewType: string): ReviewFocus[] {
    const focusMapping: Record<string, ReviewFocus[]> = {
      'quick-fixes': ['maintainability', 'performance'],
      architectural: ['architecture', 'type_safety', 'maintainability'],
      security: ['security', 'error_handling'],
      performance: ['performance', 'architecture'],
      'unused-code': ['maintainability', 'architecture'],
    };

    return focusMapping[reviewType] || ['maintainability'];
  }

  /**
   * Estimate token count for a line range
   */
  private estimateTokens(startLine: number, endLine: number): number {
    return (endLine - startLine + 1) * this.config.tokensPerLine;
  }

  /**
   * Check if declaration is important (shouldn't be skipped even if small)
   */
  private isImportantDeclaration(declaration: Declaration): boolean {
    return (
      declaration.exportStatus !== 'internal' ||
      declaration.type === 'class' ||
      declaration.type === 'interface' ||
      (declaration.cyclomaticComplexity || 0) > 5
    );
  }

  /**
   * Check if declaration is security critical
   */
  private isSecurityCritical(declaration: Declaration): boolean {
    const securityKeywords = ['auth', 'login', 'password', 'token', 'security', 'crypto', 'hash'];
    const name = declaration.name.toLowerCase();

    return securityKeywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Check if two names are similar
   */
  private haveSimilarNames(name1: string, name2: string): boolean {
    // Simple similarity check - could be improved with more sophisticated algorithms
    const commonPrefix = this.getCommonPrefix(name1.toLowerCase(), name2.toLowerCase());
    return commonPrefix.length >= 3;
  }

  /**
   * Get common prefix of two strings
   */
  private getCommonPrefix(str1: string, str2: string): string {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return str1.substring(0, i);
  }

  /**
   * Generate reasoning explanation for chunking decisions
   */
  private generateReasoningExplanation(analysis: SemanticAnalysis, chunks: CodeChunk[]): string {
    const reasons = [];

    reasons.push(
      `Generated ${chunks.length} chunks using ${analysis.suggestedChunkingStrategy.strategy} strategy`,
    );

    if (analysis.complexity.cyclomaticComplexity > 20) {
      reasons.push(
        'High complexity detected, used semantic chunking to preserve function boundaries',
      );
    }

    if (analysis.topLevelDeclarations.some((d) => d.type === 'class')) {
      reasons.push('Classes detected, used hierarchical chunking to group related methods');
    }

    const highPriorityChunks = chunks.filter((c) => c.priority === 'high').length;
    if (highPriorityChunks > 0) {
      reasons.push(`${highPriorityChunks} high-priority chunks identified for focused review`);
    }

    return reasons.join('. ');
  }

  /**
   * Generate fallback recommendation when chunking fails
   */
  private generateFallbackRecommendation(
    _analysis: SemanticAnalysis,
    lines: string[],
    reviewType: string,
  ): ChunkingRecommendation {
    logger.warn('Generating fallback chunking recommendation due to semantic analysis failure');

    const chunks: CodeChunk[] = [];
    const chunkSize = Math.min(this.config.maxChunkSize, Math.max(50, lines.length / 4));
    let chunkId = 1;

    for (let i = 0; i < lines.length; i += chunkSize) {
      const endLine = Math.min(i + chunkSize, lines.length);

      const chunk: CodeChunk = {
        id: `fallback_${chunkId++}`,
        type: 'module',
        lines: [i + 1, endLine],
        declarations: [],
        context: [],
        priority: 'medium',
        reviewFocus: this.getReviewFocusForType(reviewType),
        estimatedTokens: (endLine - i) * this.config.tokensPerLine,
        dependencies: [],
      };

      chunks.push(chunk);
    }

    return {
      strategy: 'individual',
      chunks,
      crossReferences: [],
      reasoning: 'Used fallback line-based chunking due to semantic analysis failure',
      estimatedTokens: lines.length * this.config.tokensPerLine,
      estimatedChunks: chunks.length,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ChunkGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ChunkGeneratorConfig {
    return { ...this.config };
  }
}

/**
 * Default chunk generator instance
 */
export const chunkGenerator = new ChunkGenerator();

/**
 * Convenience function for generating chunks
 */
export function generateSemanticChunks(
  analysis: SemanticAnalysis,
  fileContent: string,
  reviewType = 'quick-fixes',
): ChunkingRecommendation {
  return chunkGenerator.generateChunks(analysis, fileContent, reviewType);
}
