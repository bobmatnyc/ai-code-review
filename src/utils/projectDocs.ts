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
  projectPath: string,
  contextFiles?: string
): Promise<ProjectDocs> {
  const docs: ProjectDocs = {};

  // If context files are specified, read them
  if (contextFiles) {
    const files = contextFiles.split(',').map(f => f.trim());

    for (const file of files) {
      // Skip empty file names
      if (!file) continue;

      // Determine the key based on the file name
      let key: keyof ProjectDocs;
      if (file.toLowerCase().includes('readme')) {
        key = 'readme';
      } else if (file.toLowerCase().includes('project')) {
        key = 'project';
      } else if (file.toLowerCase().includes('progress')) {
        key = 'progress';
      } else {
        // Default to project for other files
        key = 'project';
      }

      // Read the file
      const filePath = path.join(projectPath, file);
      if (await fileExists(filePath)) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          docs[key] = content;
        } catch (error) {
          console.warn(`Warning: Could not read ${file}:`, error);
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

/**
 * Add project documentation to a prompt
 * @param prompt The prompt to add documentation to
 * @param docs Project documentation object
 * @returns The prompt with documentation added
 */
export function addProjectDocsToPrompt(prompt: string, docs: ProjectDocs): string {
  const docsText = formatProjectDocs(docs);
  if (docsText) {
    // Try to replace a placeholder if it exists
    if (prompt.includes('{{PROJECT_DOCS}}')) {
      return prompt.replace('{{PROJECT_DOCS}}', docsText);
    } else {
      // Otherwise, append to the end
      return `${prompt}\n\n${docsText}`;
    }
  }
  return prompt;
}
