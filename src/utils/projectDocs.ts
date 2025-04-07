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
export async function readProjectDocs(
  projectPath: string
): Promise<ProjectDocs> {
  const docs: ProjectDocs = {};

  // Check for context files specified in environment variable
  const contextFiles =
    process.env.AI_CODE_REVIEW_CONTEXT || process.env.CODE_REVIEW_CONTEXT;

  if (contextFiles) {
    // Parse comma-separated list of file paths
    const filePaths = contextFiles.split(',').map(p => p.trim());
    console.log(`Using custom context files: ${filePaths.join(', ')}`);

    // Read each specified file
    for (const filePath of filePaths) {
      const fullPath = path.join(projectPath, filePath);
      const fileName = path.basename(filePath);

      if (await fileExists(fullPath)) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          // Use the filename as the key (without extension)
          const key = path
            .basename(fileName, path.extname(fileName))
            .toLowerCase();
          docs[key as keyof ProjectDocs] = content;
        } catch (error) {
          console.warn(`Warning: Could not read ${filePath}:`, error);
        }
      } else {
        console.warn(`Warning: Context file ${filePath} does not exist`);
      }
    }
  } else {
    // Default to PROJECT.md if no context files are specified
    const defaultFile = { name: 'project', path: 'PROJECT.md' };
    const filePath = path.join(projectPath, defaultFile.path);

    if (await fileExists(filePath)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        docs[defaultFile.name as keyof ProjectDocs] = content;
      } catch (error) {
        console.warn(`Warning: Could not read ${defaultFile.path}:`, error);
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

  // Process each document in the docs object
  for (const [key, content] of Object.entries(docs)) {
    if (content) {
      // Format the section title based on the key
      const title = key.charAt(0).toUpperCase() + key.slice(1);
      result += `## ${title} Documentation (${key.toUpperCase()}.md):\n\n${content}\n\n`;
    }
  }

  return result ? `# Project Context\n\n${result}` : '';
}
