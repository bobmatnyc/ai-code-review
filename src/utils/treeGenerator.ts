/**
 * @fileoverview Utility to generate tree structure from file paths
 *
 * This module provides functions to convert a list of file paths into a
 * hierarchical tree structure for display in a markdown file.
 */

// import path from 'path'; // Not used in this file
import logger from './logger';

/**
 * Node in the file tree structure
 */
interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
  path?: string;
}

/**
 * Create a new tree node
 * @param name Name of the node
 * @param isFile Whether this node represents a file
 * @param filePath Full path of the file (for files only)
 * @returns A new tree node
 */
function createNode(name: string, isFile = false, filePath?: string): TreeNode {
  return {
    name,
    children: new Map<string, TreeNode>(),
    isFile,
    path: filePath,
  };
}

/**
 * Build a tree structure from a list of file paths
 * @param filePaths Array of file paths (relative or absolute)
 * @returns Root node of the tree
 */
function buildTree(filePaths: string[]): TreeNode {
  // Create the root node
  const root: TreeNode = createNode('root');

  // Add each file to the tree
  for (const filePath of filePaths) {
    // Split the path into components
    const parts = filePath.split(/[\\/]/);

    // Start at the root
    let currentNode = root;

    // Traverse the path components
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue; // Skip empty parts

      const isFile = i === parts.length - 1;

      // If this node doesn't exist yet, create it
      if (!currentNode.children.has(part)) {
        currentNode.children.set(part, createNode(part, isFile, isFile ? filePath : undefined));
      } else if (isFile) {
        // If it exists but is a directory and we're adding a file with the same name
        const existingNode = currentNode.children.get(part)!;
        if (!existingNode.isFile) {
          // This is a special case where a directory has the same name as a file
          // Create a special file node with a unique name
          currentNode.children.set(`${part} (file)`, createNode(part, true, filePath));
          continue;
        }
      }

      // Move to the next node
      currentNode = currentNode.children.get(part)!;
    }
  }

  return root;
}

/**
 * Generate a markdown representation of the tree
 * @param node The current tree node
 * @param indent Current indentation level
 * @param isLast Whether this is the last child of its parent
 * @param prefix Prefix for the current line
 * @returns Markdown string representing the tree
 */
function generateMarkdownTree(node: TreeNode, indent = '', isLast = true, prefix = ''): string {
  if (node.name === 'root') {
    // Root node is special - process its children directly
    let result = '';
    const children = Array.from(node.children.entries());

    for (let i = 0; i < children.length; i++) {
      const [, childNode] = children[i];
      const isLastChild = i === children.length - 1;
      result += generateMarkdownTree(childNode, '', isLastChild, '');
    }

    return result;
  }

  // Current node indicator
  const nodeIndicator = isLast ? '└── ' : '├── ';

  // Generate this node's line
  let result = `${indent}${prefix}${nodeIndicator}${node.name}\n`;

  // Generate child node prefix
  const childPrefix = isLast ? '    ' : '│   ';

  // Process children
  const children = Array.from(node.children.entries()).sort(([nameA], [nameB]) => {
    // Directories first, then files
    const nodeA = node.children.get(nameA)!;
    const nodeB = node.children.get(nameB)!;
    if (nodeA.isFile && !nodeB.isFile) return 1;
    if (!nodeA.isFile && nodeB.isFile) return -1;
    return nameA.localeCompare(nameB);
  });

  for (let i = 0; i < children.length; i++) {
    const [, childNode] = children[i];
    const isLastChild = i === children.length - 1;
    result += generateMarkdownTree(childNode, `${indent}${prefix}${childPrefix}`, isLastChild, '');
  }

  return result;
}

/**
 * Generate a markdown tree representation of file paths
 * @param filePaths Array of file paths
 * @returns Markdown string representing the tree structure
 */
export function generateFileTree(filePaths: string[]): string {
  try {
    // Sort file paths to ensure consistent output
    const sortedPaths = [...filePaths].sort();

    // Build the tree structure
    const root = buildTree(sortedPaths);

    // Generate the markdown
    return `\`\`\`\n${generateMarkdownTree(root)}\`\`\``;
  } catch (error) {
    logger.error(`Error generating file tree: ${error}`);
    return filePaths.map((file) => `- \`${file}\``).join('\n');
  }
}
