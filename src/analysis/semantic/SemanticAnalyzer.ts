/**
 * @fileoverview TreeSitter-based semantic analyzer for intelligent code chunking
 * 
 * This module provides the core semantic analysis engine that uses TreeSitter
 * to parse code into AST representations and extract meaningful structural
 * information for AI-guided chunking decisions.
 */

import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import Ruby from 'tree-sitter-ruby';
import PHP from 'tree-sitter-php';
import logger from '../../utils/logger';
import {
  SemanticAnalysis,
  SemanticAnalysisResult,
  SemanticAnalysisError,
  SemanticAnalysisConfig,
  Declaration,
  DeclarationType,
  ExportStatus,
  ImportRelationship,
  ImportType,
  ComplexityMetrics,
  ChunkingRecommendation,
  ChunkingStrategy,
  HalsteadMetrics
} from './types';
import { AiGuidedChunking } from './AiGuidedChunking';

/**
 * Language-specific TreeSitter parser configurations
 */
const LANGUAGE_PARSERS = {
  typescript: TypeScript.typescript,
  javascript: TypeScript.typescript, // Use TypeScript parser for JavaScript
  tsx: TypeScript.tsx,
  jsx: TypeScript.tsx, // Use TSX parser for JSX
  python: Python,
  ruby: Ruby,
  php: PHP
} as const;

/**
 * Default configuration for semantic analysis
 */
const DEFAULT_CONFIG: SemanticAnalysisConfig = {
  enabledLanguages: ['typescript', 'javascript', 'python', 'ruby'],
  complexityThreshold: 10,
  maxChunkSize: 500,
  includeDependencyAnalysis: true,
  includeHalsteadMetrics: false,
  customChunkingRules: []
};

/**
 * TreeSitter semantic analyzer engine
 */
export class SemanticAnalyzer {
  private parsers: Map<string, Parser> = new Map();
  private config: SemanticAnalysisConfig;
  private aiGuidedChunking: AiGuidedChunking;

  constructor(config: Partial<SemanticAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiGuidedChunking = new AiGuidedChunking();
    this.initializeParsers();
  }

  /**
   * Initialize TreeSitter parsers for supported languages
   */
  private initializeParsers(): void {
    for (const language of this.config.enabledLanguages) {
      if (language in LANGUAGE_PARSERS) {
        try {
          const languageGrammar = LANGUAGE_PARSERS[language as keyof typeof LANGUAGE_PARSERS];
          if (!languageGrammar) {
            logger.warn(`No grammar available for ${language}, skipping`);
            continue;
          }
          
          const parser = new Parser();
          parser.setLanguage(languageGrammar);
          this.parsers.set(language, parser);
          logger.debug(`Initialized TreeSitter parser for ${language}`);
        } catch (error) {
          logger.error(`Failed to initialize parser for ${language}:`, error);
          // Continue with other languages even if one fails
        }
      }
    }
  }

  /**
   * Perform semantic analysis on code content
   */
  public async analyzeCode(
    content: string, 
    filePath: string, 
    language?: string
  ): Promise<SemanticAnalysisResult> {
    const errors: SemanticAnalysisError[] = [];
    
    try {
      // Detect language if not provided
      const detectedLanguage = language || this.detectLanguage(filePath);
      
      if (!this.isLanguageSupported(detectedLanguage)) {
        errors.push({
          type: 'language_not_supported',
          message: `Language '${detectedLanguage}' is not supported for semantic analysis`
        });
        return { errors, success: false, fallbackUsed: true };
      }

      // Check file size limits (500KB limit to prevent TreeSitter issues)
      if (content.length > 500000) { 
        errors.push({
          type: 'file_too_large',
          message: 'File is too large for semantic analysis'
        });
        return { errors, success: false, fallbackUsed: true };
      }

      const parser = this.parsers.get(detectedLanguage);
      if (!parser) {
        errors.push({
          type: 'analysis_failed',
          message: `No parser available for language: ${detectedLanguage}`
        });
        return { errors, success: false, fallbackUsed: true };
      }

      // Parse the code
      let tree;
      try {
        tree = parser.parse(content);
      } catch (parseError) {
        // Handle TreeSitter-specific errors
        if (parseError instanceof Error && parseError.message.includes('Invalid argument')) {
          errors.push({
            type: 'file_too_large',
            message: 'File content is too complex or large for TreeSitter parsing'
          });
          return { errors, success: false, fallbackUsed: true };
        }
        throw parseError; // Re-throw other parsing errors
      }
      
      if (tree.rootNode.hasError) {
        errors.push({
          type: 'parse_error',
          message: 'TreeSitter encountered parsing errors'
        });
        // Continue with partial analysis
      }

      // Perform semantic analysis
      const analysis = await this.performAnalysis(
        tree.rootNode,
        content,
        filePath,
        detectedLanguage
      );

      return {
        analysis,
        errors,
        success: true,
        fallbackUsed: false
      };

    } catch (error) {
      const analysisError: SemanticAnalysisError = {
        type: 'analysis_failed',
        message: error instanceof Error ? error.message : 'Unknown analysis error',
        stack: error instanceof Error ? error.stack : undefined
      };
      
      logger.error('Semantic analysis failed:', error);
      return {
        errors: [analysisError],
        success: false,
        fallbackUsed: true
      };
    }
  }

  /**
   * Perform the core semantic analysis
   */
  private async performAnalysis(
    rootNode: Parser.SyntaxNode,
    content: string,
    filePath: string,
    language: string
  ): Promise<SemanticAnalysis> {
    const lines = content.split('\n');
    
    // Extract top-level declarations
    const declarations = this.extractDeclarations(rootNode, lines, language);
    
    // Build import graph
    const importGraph = this.extractImports(rootNode, lines, language);
    
    // Calculate complexity metrics
    const complexity = this.calculateComplexity(rootNode, content, declarations);
    
    // Generate chunking recommendation
    const suggestedChunkingStrategy = await this.generateChunkingRecommendation(
      declarations,
      importGraph,
      complexity,
      lines.length,
      filePath,
      language,
      'quick-fixes' // Default review type - could be passed as parameter
    );

    return {
      language,
      totalLines: lines.length,
      topLevelDeclarations: declarations,
      importGraph,
      complexity,
      suggestedChunkingStrategy,
      filePath,
      analyzedAt: new Date()
    };
  }

  /**
   * Extract declarations from the AST
   */
  private extractDeclarations(
    node: Parser.SyntaxNode, 
    lines: string[], 
    language: string
  ): Declaration[] {
    const declarations: Declaration[] = [];
    
    // Language-specific declaration extraction
    switch (language) {
      case 'typescript':
      case 'javascript':
        this.extractTSDeclarations(node, declarations, lines);
        break;
      case 'python':
        this.extractPythonDeclarations(node, declarations, lines);
        break;
      case 'ruby':
        this.extractRubyDeclarations(node, declarations, lines);
        break;
      case 'php':
        this.extractPHPDeclarations(node, declarations, lines);
        break;
    }
    
    return declarations;
  }

  /**
   * Extract TypeScript/JavaScript declarations
   */
  private extractTSDeclarations(
    node: Parser.SyntaxNode,
    declarations: Declaration[],
    lines: string[]
  ): void {
    // Only extract top-level declarations - methods will be handled as children
    const topLevelTypeMapping: Record<string, DeclarationType> = {
      'function_declaration': 'function',
      'class_declaration': 'class',
      'abstract_class_declaration': 'class',
      'interface_declaration': 'interface',
      'type_alias_declaration': 'type',
      'variable_declaration': 'const',
      'lexical_declaration': 'const',
      'enum_declaration': 'enum',
      'namespace_declaration': 'namespace'
      // Note: method_definition removed - handled by extractChildDeclarations
    };

    this.traverseNode(node, (child) => {
      if (child.type in topLevelTypeMapping) {
        const declaration = this.createDeclarationFromNode(
          child,
          topLevelTypeMapping[child.type],
          lines
        );
        if (declaration) {
          declarations.push(declaration);
        }
      }
    });
  }

  /**
   * Extract Python declarations
   */
  private extractPythonDeclarations(
    node: Parser.SyntaxNode,
    declarations: Declaration[],
    lines: string[]
  ): void {
    const typeMapping: Record<string, DeclarationType> = {
      'function_definition': 'function',
      'class_definition': 'class',
      'decorated_definition': 'function'
    };

    this.traverseNode(node, (child) => {
      if (child.type in typeMapping) {
        const declaration = this.createDeclarationFromNode(
          child,
          typeMapping[child.type],
          lines
        );
        if (declaration) {
          declarations.push(declaration);
        }
      }
    });
  }

  /**
   * Extract Ruby declarations
   */
  private extractRubyDeclarations(
    node: Parser.SyntaxNode,
    declarations: Declaration[],
    lines: string[]
  ): void {
    const typeMapping: Record<string, DeclarationType> = {
      'method': 'function',
      'class': 'class',
      'module': 'namespace'
    };

    this.traverseNode(node, (child) => {
      if (child.type in typeMapping) {
        const declaration = this.createDeclarationFromNode(
          child,
          typeMapping[child.type],
          lines
        );
        if (declaration) {
          declarations.push(declaration);
        }
      }
    });
  }

  /**
   * Extract PHP declarations
   */
  private extractPHPDeclarations(
    node: Parser.SyntaxNode,
    declarations: Declaration[],
    lines: string[]
  ): void {
    const typeMapping: Record<string, DeclarationType> = {
      'function_definition': 'function',
      'method_declaration': 'method',
      'class_declaration': 'class',
      'interface_declaration': 'interface'
    };

    this.traverseNode(node, (child) => {
      if (child.type in typeMapping) {
        const declaration = this.createDeclarationFromNode(
          child,
          typeMapping[child.type],
          lines
        );
        if (declaration) {
          declarations.push(declaration);
        }
      }
    });
  }

  /**
   * Create a Declaration object from an AST node
   */
  private createDeclarationFromNode(
    node: Parser.SyntaxNode,
    type: DeclarationType,
    lines: string[]
  ): Declaration | null {
    try {
      const name = this.extractNodeName(node) || 'anonymous';
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;
      
      return {
        type,
        name,
        startLine,
        endLine,
        dependencies: this.extractDependencies(node),
        cyclomaticComplexity: this.calculateNodeComplexity(node),
        exportStatus: this.determineExportStatus(node),
        documentation: this.extractDocumentation(node, lines),
        children: this.extractChildDeclarations(node, lines),
        modifiers: this.extractModifiers(node)
      };
    } catch (error) {
      logger.warn(`Failed to create declaration from node: ${error}`);
      return null;
    }
  }

  /**
   * Extract the name from an AST node based on node type
   */
  private extractNodeName(node: Parser.SyntaxNode): string | null {
    try {
      // For function declarations, look for identifier child
      if (node.type === 'function_declaration') {
        const nameNode = node.children.find(child => child.type === 'identifier');
        return nameNode ? nameNode.text : null;
      }
      
      // For class declarations (including abstract classes)
      if (node.type === 'class_declaration' || node.type === 'abstract_class_declaration') {
        const nameNode = node.children.find(child => child.type === 'type_identifier');
        return nameNode ? nameNode.text : null;
      }
      
      // For Python class declarations
      if (node.type === 'class_definition') {
        const nameNode = node.children.find(child => child.type === 'identifier');
        return nameNode ? nameNode.text : null;
      }
      
      // For Python function definitions
      if (node.type === 'function_definition') {
        const nameNode = node.children.find(child => child.type === 'identifier');
        return nameNode ? nameNode.text : null;
      }
      
      // For interface declarations
      if (node.type === 'interface_declaration') {
        const nameNode = node.children.find(child => child.type === 'type_identifier');
        return nameNode ? nameNode.text : null;
      }
      
      // For method definitions
      if (node.type === 'method_definition') {
        const nameNode = node.children.find(child => child.type === 'property_identifier');
        return nameNode ? nameNode.text : null;
      }
      
      // For variable/const declarations
      if (node.type === 'variable_declaration' || node.type === 'lexical_declaration') {
        // Look for variable_declarator child, then its identifier
        const declarator = node.children.find(child => child.type === 'variable_declarator');
        if (declarator) {
          const nameNode = declarator.children.find(child => child.type === 'identifier');
          return nameNode ? nameNode.text : null;
        }
      }
      
      // For enum declarations
      if (node.type === 'enum_declaration') {
        const nameNode = node.children.find(child => child.type === 'identifier');
        return nameNode ? nameNode.text : null;
      }
      
      // For type alias declarations
      if (node.type === 'type_alias_declaration') {
        const nameNode = node.children.find(child => child.type === 'type_identifier');
        return nameNode ? nameNode.text : null;
      }
      
      // For namespace declarations
      if (node.type === 'namespace_declaration') {
        const nameNode = node.children.find(child => child.type === 'identifier');
        return nameNode ? nameNode.text : null;
      }
      
      // Fallback: look for any identifier-like node
      const identifierTypes = ['identifier', 'type_identifier', 'property_identifier'];
      for (const child of node.children) {
        if (identifierTypes.includes(child.type)) {
          return child.text;
        }
      }
      
      return null;
    } catch (error) {
      logger.warn(`Failed to extract node name for ${node.type}:`, error);
      return null;
    }
  }

  /**
   * Extract dependencies from a node
   */
  private extractDependencies(node: Parser.SyntaxNode): string[] {
    const dependencies: Set<string> = new Set();
    
    this.traverseNode(node, (child) => {
      if (child.type === 'identifier' || child.type === 'type_identifier') {
        dependencies.add(child.text);
      }
    });
    
    return Array.from(dependencies);
  }

  /**
   * Calculate cyclomatic complexity for a node
   */
  private calculateNodeComplexity(node: Parser.SyntaxNode): number {
    let complexity = 1; // Base complexity
    
    const complexityNodes = [
      'if_statement', 'else_clause', 'switch_statement', 'case_clause',
      'while_statement', 'for_statement', 'for_in_statement',
      'try_statement', 'catch_clause', 'conditional_expression',
      'logical_and', 'logical_or'
    ];
    
    this.traverseNode(node, (child) => {
      if (complexityNodes.includes(child.type)) {
        complexity++;
      }
    });
    
    return complexity;
  }

  /**
   * Determine export status of a declaration
   */
  private determineExportStatus(node: Parser.SyntaxNode): ExportStatus {
    // Check if node or parent has export modifier
    let current: Parser.SyntaxNode | null = node;
    while (current) {
      if (current.type === 'export_statement' || 
          current.type === 'export_declaration' ||
          current.text.startsWith('export')) {
        return current.text.includes('default') ? 'default_export' : 'exported';
      }
      current = current.parent;
    }
    
    return 'internal';
  }

  /**
   * Extract documentation/comments for a node
   */
  private extractDocumentation(node: Parser.SyntaxNode, lines: string[]): string | undefined {
    const startLine = node.startPosition.row;
    
    // Look for comments in the lines before this declaration
    for (let i = Math.max(0, startLine - 3); i < startLine; i++) {
      const line = lines[i]?.trim();
      if (line?.startsWith('/**') || line?.startsWith('//') || line?.startsWith('#')) {
        return line;
      }
    }
    
    return undefined;
  }

  /**
   * Extract child declarations (e.g., methods in a class)
   */
  private extractChildDeclarations(node: Parser.SyntaxNode, lines: string[]): Declaration[] {
    const children: Declaration[] = [];
    
    // For class declarations (including abstract classes), look inside the class_body
    if (node.type === 'class_declaration' || node.type === 'abstract_class_declaration') {
      const classBody = node.children.find(child => child.type === 'class_body');
      if (classBody) {
        for (const child of classBody.children) {
          if (child.type === 'method_definition' || child.type === 'public_field_definition' || child.type === 'property_definition') {
            const childDecl = this.createDeclarationFromNode(child, 'method', lines);
            if (childDecl) {
              children.push(childDecl);
            }
          }
        }
      }
    } else if (node.type === 'class_definition') {
      // Python class support
      const classBody = node.children.find(child => child.type === 'block');
      if (classBody) {
        for (const child of classBody.children) {
          if (child.type === 'function_definition') {
            const childDecl = this.createDeclarationFromNode(child, 'method', lines);
            if (childDecl) {
              children.push(childDecl);
            }
          }
        }
      }
    } else {
      // For other node types, check direct children
      for (const child of node.children) {
        if (child.type === 'method_definition' || child.type === 'property_definition') {
          const childDecl = this.createDeclarationFromNode(child, 'method', lines);
          if (childDecl) {
            children.push(childDecl);
          }
        }
      }
    }
    
    return children;
  }

  /**
   * Extract modifiers from a node
   */
  private extractModifiers(node: Parser.SyntaxNode): string[] {
    const modifiers: string[] = [];
    const modifierTypes = ['public', 'private', 'protected', 'static', 'abstract', 'readonly'];
    
    // Check if this is an abstract class declaration
    if (node.type === 'abstract_class_declaration') {
      modifiers.push('abstract');
    }
    
    this.traverseNode(node, (child) => {
      if (modifierTypes.includes(child.type) || modifierTypes.includes(child.text)) {
        const modifier = child.text || child.type;
        if (!modifiers.includes(modifier)) {
          modifiers.push(modifier);
        }
      }
    });
    
    return modifiers;
  }

  /**
   * Extract import relationships
   */
  private extractImports(
    node: Parser.SyntaxNode, 
    lines: string[], 
    language: string
  ): ImportRelationship[] {
    const imports: ImportRelationship[] = [];
    
    this.traverseNode(node, (child) => {
      if (this.isImportNode(child, language)) {
        const importRel = this.createImportRelationship(child, lines);
        if (importRel) {
          imports.push(importRel);
        }
      }
    });
    
    return imports;
  }

  /**
   * Check if a node represents an import
   */
  private isImportNode(node: Parser.SyntaxNode, language: string): boolean {
    const importTypes: Record<string, string[]> = {
      typescript: ['import_statement', 'import_clause'],
      javascript: ['import_statement', 'import_clause'],
      python: ['import_statement', 'import_from_statement'],
      ruby: ['call'], // require statements
      php: ['include_expression', 'require_expression']
    };
    
    return importTypes[language]?.includes(node.type) || false;
  }

  /**
   * Create an ImportRelationship from a node
   */
  private createImportRelationship(
    node: Parser.SyntaxNode, 
    _lines: string[]
  ): ImportRelationship | null {
    try {
      return {
        imported: this.extractImportedName(node) || 'unknown',
        from: this.extractImportSource(node) || 'unknown',
        importType: this.determineImportType(node),
        line: node.startPosition.row + 1,
        isUsed: false // TODO: Implement usage analysis
      };
    } catch (error) {
      logger.warn(`Failed to create import relationship: ${error}`);
      return null;
    }
  }

  /**
   * Extract imported name from import node
   */
  private extractImportedName(node: Parser.SyntaxNode): string | null {
    // Implementation depends on language and import structure
    for (const child of node.children) {
      if (child.type === 'import_specifier' || child.type === 'identifier') {
        return child.text;
      }
    }
    return null;
  }

  /**
   * Extract import source from import node
   */
  private extractImportSource(node: Parser.SyntaxNode): string | null {
    for (const child of node.children) {
      if (child.type === 'string' || child.type === 'string_literal') {
        return child.text.replace(/['"]/g, '');
      }
    }
    return null;
  }

  /**
   * Determine the type of import
   */
  private determineImportType(node: Parser.SyntaxNode): ImportType {
    const text = node.text;
    
    if (text.includes('* as ')) return 'namespace';
    if (text.includes('import(')) return 'dynamic';
    if (text.includes('{')) return 'named';
    
    return 'default';
  }

  /**
   * Calculate complexity metrics for the entire file
   */
  private calculateComplexity(
    node: Parser.SyntaxNode, 
    content: string, 
    declarations: Declaration[]
  ): ComplexityMetrics {
    const lines = content.split('\n');
    const linesOfCode = lines.filter(line => 
      line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('#')
    ).length;
    
    let totalComplexity = 1; // Base complexity
    let maxNesting = 0;
    
    // Calculate complexity by traversing nodes
    const complexityNodes = [
      'if_statement', 'else_clause', 'switch_statement', 'case_clause',
      'while_statement', 'for_statement', 'for_in_statement', 'for_of_statement',
      'try_statement', 'catch_clause', 'conditional_expression',
      'logical_and', 'logical_or', 'function_declaration', 'method_definition'
    ];
    
    this.traverseNode(node, (child) => {
      if (complexityNodes.includes(child.type)) {
        totalComplexity++;
      }
    });
    
    // Calculate nesting depth
    maxNesting = this.calculateMaxNesting(node);
    
    const functionCount = declarations.filter(d => d.type === 'function').length;
    const classCount = declarations.filter(d => d.type === 'class').length;
    
    return {
      cyclomaticComplexity: totalComplexity,
      cognitiveComplexity: totalComplexity, // Simplified
      maxNestingDepth: maxNesting,
      functionCount,
      classCount,
      linesOfCode,
      totalDeclarations: declarations.length,
      halstead: this.config.includeHalsteadMetrics ? 
        this.calculateHalsteadMetrics(node) : undefined
    };
  }

  /**
   * Calculate maximum nesting depth
   */
  private calculateMaxNesting(node: Parser.SyntaxNode, currentDepth = 0): number {
    const nestingNodes = [
      'if_statement', 'while_statement', 'for_statement', 'for_in_statement',
      'try_statement', 'catch_clause', 'function_declaration', 'method_definition',
      'statement_block', 'block'
    ];
    
    let maxDepth = currentDepth;
    
    for (const child of node.children) {
      const childDepth = nestingNodes.includes(child.type) ? currentDepth + 1 : currentDepth;
      const childMaxDepth = this.calculateMaxNesting(child, childDepth);
      maxDepth = Math.max(maxDepth, childMaxDepth);
    }
    
    return maxDepth;
  }

  /**
   * Check if node represents a block structure
   */
  private isBlockNode(node: Parser.SyntaxNode): boolean {
    return ['block', 'function_body', 'class_body', 'if_statement'].includes(node.type);
  }

  /**
   * Check if node adds to complexity
   */
  private isComplexityNode(node: Parser.SyntaxNode): boolean {
    return [
      'if_statement', 'else_clause', 'switch_statement', 'case_clause',
      'while_statement', 'for_statement', 'try_statement', 'catch_clause'
    ].includes(node.type);
  }

  /**
   * Calculate Halstead complexity metrics
   */
  private calculateHalsteadMetrics(node: Parser.SyntaxNode): HalsteadMetrics {
    // Simplified implementation
    const operators = new Set<string>();
    const operands = new Set<string>();
    let totalOperators = 0;
    let totalOperands = 0;
    
    this.traverseNode(node, (child) => {
      if (this.isOperator(child)) {
        operators.add(child.text);
        totalOperators++;
      } else if (this.isOperand(child)) {
        operands.add(child.text);
        totalOperands++;
      }
    });
    
    const distinctOperators = operators.size;
    const distinctOperands = operands.size;
    const vocabulary = distinctOperators + distinctOperands;
    const length = totalOperators + totalOperands;
    const volume = length * Math.log2(vocabulary || 1);
    const difficulty = (distinctOperators / 2) * (totalOperands / (distinctOperands || 1));
    const effort = difficulty * volume;
    
    return {
      distinctOperators,
      distinctOperands,
      totalOperators,
      totalOperands,
      vocabulary,
      length,
      volume,
      difficulty,
      effort
    };
  }

  /**
   * Check if node is an operator
   */
  private isOperator(node: Parser.SyntaxNode): boolean {
    const operatorTypes = [
      'binary_expression', 'unary_expression', 'assignment_expression',
      '+', '-', '*', '/', '=', '==', '!=', '<', '>', '&&', '||'
    ];
    return operatorTypes.includes(node.type);
  }

  /**
   * Check if node is an operand
   */
  private isOperand(node: Parser.SyntaxNode): boolean {
    return ['identifier', 'number', 'string', 'boolean'].includes(node.type);
  }

  /**
   * Generate AI-guided chunking recommendation
   */
  private async generateChunkingRecommendation(
    declarations: Declaration[],
    imports: ImportRelationship[],
    complexity: ComplexityMetrics,
    totalLines: number,
    filePath: string,
    language: string,
    reviewType: string = 'quick-fixes'
  ): Promise<ChunkingRecommendation> {
    try {
      // Create a semantic analysis object for AI-guided chunking
      const analysisForChunking: SemanticAnalysis = {
        language,
        totalLines,
        topLevelDeclarations: declarations,
        importGraph: imports,
        complexity,
        suggestedChunkingStrategy: {
          strategy: 'individual',
          chunks: [],
          crossReferences: [],
          reasoning: '',
          estimatedTokens: 0,
          estimatedChunks: 0
        },
        filePath,
        analyzedAt: new Date()
      };

      // Use AI-guided chunking if available
      if (this.aiGuidedChunking.isAvailable()) {
        logger.debug('Using AI-guided chunking recommendation');
        return await this.aiGuidedChunking.generateChunkingRecommendation(
          analysisForChunking,
          reviewType
        );
      } else {
        logger.debug('AI-guided chunking not available, using rule-based fallback');
        return this.generateRuleBasedChunking(declarations, complexity, totalLines);
      }
    } catch (error) {
      logger.warn(`AI-guided chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.debug('Falling back to rule-based chunking');
      return this.generateRuleBasedChunking(declarations, complexity, totalLines);
    }
  }

  /**
   * Generate rule-based chunking recommendation as fallback
   */
  private generateRuleBasedChunking(
    declarations: Declaration[],
    complexity: ComplexityMetrics,
    totalLines: number
  ): ChunkingRecommendation {
    let strategy: ChunkingStrategy = 'individual';
    
    if (complexity.classCount > 0) {
      strategy = 'hierarchical';
    } else if (declarations.length > 10) {
      strategy = 'grouped';
    } else if (complexity.cyclomaticComplexity > 20) {
      strategy = 'functional';
    }
    
    // Estimate number of chunks based on strategy and code size
    let estimatedChunks = 1;
    if (strategy === 'hierarchical') {
      estimatedChunks = Math.max(1, complexity.classCount + complexity.functionCount);
    } else if (strategy === 'grouped') {
      estimatedChunks = Math.max(1, Math.ceil(declarations.length / 5));
    } else if (strategy === 'functional') {
      estimatedChunks = Math.max(1, complexity.functionCount);
    } else {
      estimatedChunks = Math.max(1, Math.ceil(totalLines / this.config.maxChunkSize));
    }

    return {
      strategy,
      chunks: [], // Will be generated by ChunkGenerator
      crossReferences: [], // Will be analyzed by ChunkGenerator
      reasoning: `Rule-based: Selected ${strategy} strategy based on ${declarations.length} declarations and complexity ${complexity.cyclomaticComplexity}`,
      estimatedTokens: totalLines * 4, // Rough estimate
      estimatedChunks
    };
  }

  /**
   * Traverse AST node recursively
   */
  private traverseNode(node: Parser.SyntaxNode, callback: (node: Parser.SyntaxNode) => void): void {
    callback(node);
    for (const child of node.children) {
      this.traverseNode(child, callback);
    }
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    const extensionMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'rb': 'ruby',
      'php': 'php'
    };
    
    return extensionMap[extension || ''] || 'unknown';
  }

  /**
   * Check if language is supported
   */
  private isLanguageSupported(language: string): boolean {
    return this.config.enabledLanguages.includes(language) && 
           this.parsers.has(language);
  }

  /**
   * Get list of supported languages
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SemanticAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
    // Reinitialize parsers if languages changed
    if (config.enabledLanguages) {
      this.parsers.clear();
      this.initializeParsers();
    }
  }
}

/**
 * Default semantic analyzer instance
 */
export const semanticAnalyzer = new SemanticAnalyzer();

/**
 * Convenience function for analyzing code
 */
export async function analyzeCodeSemantics(
  content: string,
  filePath: string,
  language?: string
): Promise<SemanticAnalysisResult> {
  return semanticAnalyzer.analyzeCode(content, filePath, language);
}