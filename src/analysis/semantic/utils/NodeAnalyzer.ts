/**
 * @fileoverview Node analysis utilities for semantic analysis
 *
 * This module provides functions to analyze AST nodes, extract information,
 * and determine node properties.
 */

import type Parser from 'tree-sitter';
import logger from '../../../utils/logger';
import type { ExportStatus } from '../types';

/**
 * Extract the name from an AST node based on node type
 * @param node AST node
 * @returns Node name or null if not found
 */
export function extractNodeName(node: Parser.SyntaxNode): string | null {
  try {
    // For function declarations, look for identifier child
    if (node.type === 'function_declaration') {
      const nameNode = node.children.find((child) => child.type === 'identifier');
      return nameNode ? nameNode.text : null;
    }

    // For class declarations (including abstract classes)
    if (node.type === 'class_declaration' || node.type === 'abstract_class_declaration') {
      const nameNode = node.children.find((child) => child.type === 'type_identifier');
      return nameNode ? nameNode.text : null;
    }

    // For Python class declarations
    if (node.type === 'class_definition') {
      const nameNode = node.children.find((child) => child.type === 'identifier');
      return nameNode ? nameNode.text : null;
    }

    // For Python function definitions
    if (node.type === 'function_definition') {
      const nameNode = node.children.find((child) => child.type === 'identifier');
      return nameNode ? nameNode.text : null;
    }

    // For interface declarations
    if (node.type === 'interface_declaration') {
      const nameNode = node.children.find((child) => child.type === 'type_identifier');
      return nameNode ? nameNode.text : null;
    }

    // For method definitions
    if (node.type === 'method_definition') {
      const nameNode = node.children.find((child) => child.type === 'property_identifier');
      return nameNode ? nameNode.text : null;
    }

    // For variable/const declarations
    if (node.type === 'variable_declaration' || node.type === 'lexical_declaration') {
      // Look for variable_declarator child, then its identifier
      const declarator = node.children.find((child) => child.type === 'variable_declarator');
      if (declarator) {
        const nameNode = declarator.children.find((child) => child.type === 'identifier');
        return nameNode ? nameNode.text : null;
      }
    }

    // For enum declarations
    if (node.type === 'enum_declaration') {
      const nameNode = node.children.find((child) => child.type === 'identifier');
      return nameNode ? nameNode.text : null;
    }

    // For type alias declarations
    if (node.type === 'type_alias_declaration') {
      const nameNode = node.children.find((child) => child.type === 'type_identifier');
      return nameNode ? nameNode.text : null;
    }

    // For namespace declarations
    if (node.type === 'namespace_declaration') {
      const nameNode = node.children.find((child) => child.type === 'identifier');
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
 * @param node AST node
 * @returns Array of dependency names
 */
export function extractDependencies(node: Parser.SyntaxNode): string[] {
  const dependencies: Set<string> = new Set();

  traverseNode(node, (child) => {
    if (child.type === 'identifier' || child.type === 'type_identifier') {
      dependencies.add(child.text);
    }
  });

  return Array.from(dependencies);
}

/**
 * Calculate cyclomatic complexity for a node
 * @param node AST node
 * @returns Cyclomatic complexity value
 */
export function calculateNodeComplexity(node: Parser.SyntaxNode): number {
  let complexity = 1; // Base complexity

  const complexityNodes = [
    'if_statement',
    'else_clause',
    'switch_statement',
    'case_clause',
    'while_statement',
    'for_statement',
    'for_in_statement',
    'try_statement',
    'catch_clause',
    'conditional_expression',
    'logical_and',
    'logical_or',
  ];

  traverseNode(node, (child) => {
    if (complexityNodes.includes(child.type)) {
      complexity++;
    }
  });

  return complexity;
}

/**
 * Determine export status of a declaration
 * @param node AST node
 * @returns Export status
 */
export function determineExportStatus(node: Parser.SyntaxNode): ExportStatus {
  // Check if node or parent has export modifier
  let current: Parser.SyntaxNode | null = node;
  while (current) {
    if (
      current.type === 'export_statement' ||
      current.type === 'export_declaration' ||
      current.text.startsWith('export')
    ) {
      return current.text.includes('default') ? 'default_export' : 'exported';
    }
    current = current.parent;
  }

  return 'internal';
}

/**
 * Extract documentation/comments for a node
 * @param node AST node
 * @param lines Source code lines
 * @returns Documentation string or undefined
 */
export function extractDocumentation(node: Parser.SyntaxNode, lines: string[]): string | undefined {
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
 * Extract modifiers from a node
 * @param node AST node
 * @returns Array of modifier strings
 */
export function extractModifiers(node: Parser.SyntaxNode): string[] {
  const modifiers: string[] = [];
  const modifierTypes = ['public', 'private', 'protected', 'static', 'abstract', 'readonly'];

  // Check if this is an abstract class declaration
  if (node.type === 'abstract_class_declaration') {
    modifiers.push('abstract');
  }

  traverseNode(node, (child) => {
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
 * Check if node is an operator
 * @param node AST node
 * @returns Whether the node is an operator
 */
export function isOperator(node: Parser.SyntaxNode): boolean {
  const operatorTypes = [
    'binary_expression',
    'unary_expression',
    'assignment_expression',
    '+',
    '-',
    '*',
    '/',
    '=',
    '==',
    '!=',
    '<',
    '>',
    '&&',
    '||',
  ];
  return operatorTypes.includes(node.type);
}

/**
 * Check if node is an operand
 * @param node AST node
 * @returns Whether the node is an operand
 */
export function isOperand(node: Parser.SyntaxNode): boolean {
  return ['identifier', 'number', 'string', 'boolean'].includes(node.type);
}

/**
 * Check if node represents a block structure
 * @param node AST node
 * @returns Whether the node is a block
 */
export function isBlockNode(node: Parser.SyntaxNode): boolean {
  return ['block', 'function_body', 'class_body', 'if_statement'].includes(node.type);
}

/**
 * Check if node adds to complexity
 * @param node AST node
 * @returns Whether the node adds to complexity
 */
export function isComplexityNode(node: Parser.SyntaxNode): boolean {
  return [
    'if_statement',
    'else_clause',
    'switch_statement',
    'case_clause',
    'while_statement',
    'for_statement',
    'try_statement',
    'catch_clause',
  ].includes(node.type);
}

/**
 * Traverse AST node recursively
 * @param node AST node
 * @param callback Function to call for each node
 */
export function traverseNode(
  node: Parser.SyntaxNode,
  callback: (node: Parser.SyntaxNode) => void,
): void {
  callback(node);
  for (const child of node.children) {
    traverseNode(child, callback);
  }
}
