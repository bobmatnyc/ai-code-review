/**
 * @fileoverview Utilities for reading and processing project documentation.
 *
 * This module provides functionality for reading and processing project documentation
 * files like README.md, PROJECT.md, and PROGRESS.md. These files provide important
 * context for code reviews, helping the AI model understand the project's purpose,
 * structure, and current state.
 *
 * Key responsibilities:
 * - Reading documentation files from the project directory
 * - Formatting documentation content for inclusion in review prompts
 * - Handling missing documentation files gracefully
 * - Providing a consistent interface for accessing project documentation
 * - Limiting documentation size to prevent token limit issues
 *
 * Including project documentation in reviews significantly improves the quality and
 * relevance of AI-generated code reviews by providing essential context about the
 * project's goals, architecture, and development status.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileExists } from './fileSystem';

/**
 * Project documentation files to include in the context
 */
export interface ProjectDocs {
  /**
   * Content of README.md
   */
  readme?: string;

  /**
   * Content of PROJECT.md
   */
  project?: string;

  /**
   * Content of PROGRESS.md
   */
  progress?: string;
}

/**
 * Read project documentation files from the project root
 * @param projectPath Path to the project root
 * @returns Promise resolving to an object containing the documentation content
 */
export async function readProjectDocs(projectPath: string): Promise<ProjectDocs> {
  const docs: ProjectDocs = {};

  // Only include PROJECT.md for context
  const docFiles = [
    { name: 'project', path: 'PROJECT.md' }
  ];

  // Read each file if it exists
  for (const doc of docFiles) {
    const filePath = path.join(projectPath, doc.path);
    if (await fileExists(filePath)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        docs[doc.name as keyof ProjectDocs] = content;
      } catch (error) {
        console.warn(`Warning: Could not read ${doc.path}:`, error);
      }
    }
  }

  return docs;
}

/**
 * Format project documentation as a string for inclusion in the prompt
 * @param docs Project documentation object
 * @returns Formatted documentation string
 */
export function formatProjectDocs(docs: ProjectDocs): string {
  let result = '';

  if (docs.project) {
    result += `## Project Documentation (PROJECT.md):\n\n${docs.project}\n\n`;
  }

  return result ? `# Project Context\n\n${result}` : '';
}
