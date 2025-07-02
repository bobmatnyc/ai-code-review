/**
 * @fileoverview Declaration extraction utilities for semantic analysis
 *
 * This module provides functions to extract declarations from AST nodes
 * for different programming languages.
 */

import type Parser from 'tree-sitter';
import logger from '../../../utils/logger';
import type { Declaration, DeclarationType } from '../types';
import {
  calculateNodeComplexity,
  determineExportStatus,
  extractDependencies,
  extractDocumentation,
  extractModifiers,
  extractNodeName,
  traverseNode,
} from './NodeAnalyzer';

/**
 * Extract declarations from the AST
 * @param node Root AST node
 * @param lines Source code lines
 * @param language Programming language
 * @returns Array of declarations
 */
export function extractDeclarations(
  node: Parser.SyntaxNode,
  lines: string[],
  language: string,
): Declaration[] {
  const declarations: Declaration[] = [];

  // Language-specific declaration extraction
  switch (language) {
    case 'typescript':
    case 'javascript':
      extractTSDeclarations(node, declarations, lines);
      break;
    case 'python':
      extractPythonDeclarations(node, declarations, lines);
      break;
    case 'ruby':
      extractRubyDeclarations(node, declarations, lines);
      break;
    case 'php':
      extractPHPDeclarations(node, declarations, lines);
      break;
  }

  return declarations;
}

/**
 * Extract TypeScript/JavaScript declarations
 * @param node AST node
 * @param declarations Array to populate with declarations
 * @param lines Source code lines
 */
export function extractTSDeclarations(
  node: Parser.SyntaxNode,
  declarations: Declaration[],
  lines: string[],
): void {
  // Only extract top-level declarations - methods will be handled as children
  const topLevelTypeMapping: Record<string, DeclarationType> = {
    function_declaration: 'function',
    class_declaration: 'class',
    abstract_class_declaration: 'class',
    interface_declaration: 'interface',
    type_alias_declaration: 'type',
    variable_declaration: 'const',
    lexical_declaration: 'const',
    enum_declaration: 'enum',
    namespace_declaration: 'namespace',
    // Note: method_definition removed - handled by extractChildDeclarations
  };

  traverseNode(node, (child) => {
    if (child.type in topLevelTypeMapping) {
      const declaration = createDeclarationFromNode(child, topLevelTypeMapping[child.type], lines);
      if (declaration) {
        declarations.push(declaration);
      }
    }
  });
}

/**
 * Extract Python declarations
 * @param node AST node
 * @param declarations Array to populate with declarations
 * @param lines Source code lines
 */
export function extractPythonDeclarations(
  node: Parser.SyntaxNode,
  declarations: Declaration[],
  lines: string[],
): void {
  const typeMapping: Record<string, DeclarationType> = {
    function_definition: 'function',
    class_definition: 'class',
    decorated_definition: 'function',
  };

  traverseNode(node, (child) => {
    if (child.type in typeMapping) {
      const declaration = createDeclarationFromNode(child, typeMapping[child.type], lines);
      if (declaration) {
        declarations.push(declaration);
      }
    }
  });
}

/**
 * Extract Ruby declarations
 * @param node AST node
 * @param declarations Array to populate with declarations
 * @param lines Source code lines
 */
export function extractRubyDeclarations(
  node: Parser.SyntaxNode,
  declarations: Declaration[],
  lines: string[],
): void {
  const typeMapping: Record<string, DeclarationType> = {
    method: 'function',
    class: 'class',
    module: 'namespace',
  };

  traverseNode(node, (child) => {
    if (child.type in typeMapping) {
      const declaration = createDeclarationFromNode(child, typeMapping[child.type], lines);
      if (declaration) {
        declarations.push(declaration);
      }
    }
  });
}

/**
 * Extract PHP declarations
 * @param node AST node
 * @param declarations Array to populate with declarations
 * @param lines Source code lines
 */
export function extractPHPDeclarations(
  node: Parser.SyntaxNode,
  declarations: Declaration[],
  lines: string[],
): void {
  const typeMapping: Record<string, DeclarationType> = {
    function_definition: 'function',
    method_declaration: 'method',
    class_declaration: 'class',
    interface_declaration: 'interface',
  };

  traverseNode(node, (child) => {
    if (child.type in typeMapping) {
      const declaration = createDeclarationFromNode(child, typeMapping[child.type], lines);
      if (declaration) {
        declarations.push(declaration);
      }
    }
  });
}

/**
 * Create a Declaration object from an AST node
 * @param node AST node
 * @param type Declaration type
 * @param lines Source code lines
 * @returns Declaration object or null if creation fails
 */
export function createDeclarationFromNode(
  node: Parser.SyntaxNode,
  type: DeclarationType,
  lines: string[],
): Declaration | null {
  try {
    const name = extractNodeName(node) || 'anonymous';
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;

    return {
      type,
      name,
      startLine,
      endLine,
      dependencies: extractDependencies(node),
      cyclomaticComplexity: calculateNodeComplexity(node),
      exportStatus: determineExportStatus(node),
      documentation: extractDocumentation(node, lines),
      children: extractChildDeclarations(node, lines),
      modifiers: extractModifiers(node),
    };
  } catch (error) {
    logger.warn(`Failed to create declaration from node: ${error}`);
    return null;
  }
}

/**
 * Extract child declarations (e.g., methods in a class)
 * @param node AST node
 * @param lines Source code lines
 * @returns Array of child declarations
 */
export function extractChildDeclarations(node: Parser.SyntaxNode, lines: string[]): Declaration[] {
  const children: Declaration[] = [];

  // For class declarations (including abstract classes), look inside the class_body
  if (node.type === 'class_declaration' || node.type === 'abstract_class_declaration') {
    const classBody = node.children.find((child) => child.type === 'class_body');
    if (classBody) {
      for (const child of classBody.children) {
        if (
          child.type === 'method_definition' ||
          child.type === 'public_field_definition' ||
          child.type === 'property_definition'
        ) {
          const childDecl = createDeclarationFromNode(child, 'method', lines);
          if (childDecl) {
            children.push(childDecl);
          }
        }
      }
    }
  } else if (node.type === 'class_definition') {
    // Python class support
    const classBody = node.children.find((child) => child.type === 'block');
    if (classBody) {
      for (const child of classBody.children) {
        if (child.type === 'function_definition') {
          const childDecl = createDeclarationFromNode(child, 'method', lines);
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
        const childDecl = createDeclarationFromNode(child, 'method', lines);
        if (childDecl) {
          children.push(childDecl);
        }
      }
    }
  }

  return children;
}
