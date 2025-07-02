/**
 * @fileoverview Complexity analysis utilities for semantic analysis
 *
 * This module provides functions to calculate various complexity metrics
 * for code, including cyclomatic complexity, nesting depth, and Halstead metrics.
 */

import type Parser from 'tree-sitter';
import type { ComplexityMetrics, Declaration, HalsteadMetrics } from '../types';
import { isOperand, isOperator, traverseNode } from './NodeAnalyzer';

/**
 * Calculate complexity metrics for the entire file
 * @param node Root AST node
 * @param content Source code content
 * @param declarations Extracted declarations
 * @param includeHalsteadMetrics Whether to include Halstead metrics
 * @returns Complexity metrics
 */
export function calculateComplexity(
  node: Parser.SyntaxNode,
  content: string,
  declarations: Declaration[],
  includeHalsteadMetrics = false,
): ComplexityMetrics {
  const lines = content.split('\n');
  const linesOfCode = lines.filter(
    (line) => line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('#'),
  ).length;

  let totalComplexity = 1; // Base complexity
  let maxNesting = 0;

  // Calculate complexity by traversing nodes
  const complexityNodes = [
    'if_statement',
    'else_clause',
    'switch_statement',
    'case_clause',
    'while_statement',
    'for_statement',
    'for_in_statement',
    'for_of_statement',
    'try_statement',
    'catch_clause',
    'conditional_expression',
    'logical_and',
    'logical_or',
    'function_declaration',
    'method_definition',
  ];

  traverseNode(node, (child) => {
    if (complexityNodes.includes(child.type)) {
      totalComplexity++;
    }
  });

  // Calculate nesting depth
  maxNesting = calculateMaxNesting(node);

  const functionCount = declarations.filter((d) => d.type === 'function').length;
  const classCount = declarations.filter((d) => d.type === 'class').length;

  return {
    cyclomaticComplexity: totalComplexity,
    cognitiveComplexity: totalComplexity, // Simplified
    maxNestingDepth: maxNesting,
    functionCount,
    classCount,
    linesOfCode,
    totalDeclarations: declarations.length,
    halstead: includeHalsteadMetrics ? calculateHalsteadMetrics(node) : undefined,
  };
}

/**
 * Calculate maximum nesting depth
 * @param node AST node
 * @param currentDepth Current nesting depth
 * @returns Maximum nesting depth
 */
export function calculateMaxNesting(node: Parser.SyntaxNode, currentDepth = 0): number {
  const nestingNodes = [
    'if_statement',
    'while_statement',
    'for_statement',
    'for_in_statement',
    'try_statement',
    'catch_clause',
    'function_declaration',
    'method_definition',
    'statement_block',
    'block',
  ];

  let maxDepth = currentDepth;

  for (const child of node.children) {
    const childDepth = nestingNodes.includes(child.type) ? currentDepth + 1 : currentDepth;
    const childMaxDepth = calculateMaxNesting(child, childDepth);
    maxDepth = Math.max(maxDepth, childMaxDepth);
  }

  return maxDepth;
}

/**
 * Calculate Halstead complexity metrics
 * @param node AST node
 * @returns Halstead metrics
 */
export function calculateHalsteadMetrics(node: Parser.SyntaxNode): HalsteadMetrics {
  // Simplified implementation
  const operators = new Set<string>();
  const operands = new Set<string>();
  let totalOperators = 0;
  let totalOperands = 0;

  traverseNode(node, (child) => {
    if (isOperator(child)) {
      operators.add(child.text);
      totalOperators++;
    } else if (isOperand(child)) {
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
    effort,
  };
}
