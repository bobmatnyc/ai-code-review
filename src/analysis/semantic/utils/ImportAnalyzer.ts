/**
 * @fileoverview Import analysis utilities for semantic analysis
 *
 * This module provides functions to extract and analyze import relationships
 * from AST nodes for different programming languages.
 */

import type Parser from 'tree-sitter';
import logger from '../../../utils/logger';
import type { ImportRelationship, ImportType } from '../types';
import { traverseNode } from './NodeAnalyzer';

/**
 * Extract import relationships
 * @param node AST node
 * @param lines Source code lines
 * @param language Programming language
 * @returns Array of import relationships
 */
export function extractImports(
  node: Parser.SyntaxNode,
  lines: string[],
  language: string,
): ImportRelationship[] {
  const imports: ImportRelationship[] = [];

  traverseNode(node, (child) => {
    if (isImportNode(child, language)) {
      const importRel = createImportRelationship(child, lines);
      if (importRel) {
        imports.push(importRel);
      }
    }
  });

  return imports;
}

/**
 * Check if a node represents an import
 * @param node AST node
 * @param language Programming language
 * @returns Whether the node is an import
 */
export function isImportNode(node: Parser.SyntaxNode, language: string): boolean {
  const importTypes: Record<string, string[]> = {
    typescript: ['import_statement', 'import_clause'],
    javascript: ['import_statement', 'import_clause'],
    python: ['import_statement', 'import_from_statement'],
    ruby: ['call'], // require statements
    php: ['include_expression', 'require_expression'],
  };

  return importTypes[language]?.includes(node.type) || false;
}

/**
 * Create an ImportRelationship from a node
 * @param node AST node
 * @param lines Source code lines
 * @returns Import relationship or null if creation fails
 */
export function createImportRelationship(
  node: Parser.SyntaxNode,
  _lines: string[],
): ImportRelationship | null {
  try {
    return {
      imported: extractImportedName(node) || 'unknown',
      from: extractImportSource(node) || 'unknown',
      importType: determineImportType(node),
      line: node.startPosition.row + 1,
      isUsed: false, // TODO: Implement usage analysis
    };
  } catch (error) {
    logger.warn(`Failed to create import relationship: ${error}`);
    return null;
  }
}

/**
 * Extract imported name from import node
 * @param node AST node
 * @returns Imported name or null if not found
 */
export function extractImportedName(node: Parser.SyntaxNode): string | null {
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
 * @param node AST node
 * @returns Import source or null if not found
 */
export function extractImportSource(node: Parser.SyntaxNode): string | null {
  for (const child of node.children) {
    if (child.type === 'string' || child.type === 'string_literal') {
      return child.text.replace(/['"]/g, '');
    }
  }
  return null;
}

/**
 * Determine the type of import
 * @param node AST node
 * @returns Import type
 */
export function determineImportType(node: Parser.SyntaxNode): ImportType {
  const text = node.text;

  if (text.includes('* as ')) return 'namespace';
  if (text.includes('import(')) return 'dynamic';
  if (text.includes('{')) return 'named';

  return 'default';
}
