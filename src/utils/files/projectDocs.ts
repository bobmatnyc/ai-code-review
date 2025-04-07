/**
 * @fileoverview Utilities for reading and processing project documentation.
 *
 * This module provides functionality for reading and processing project documentation
 * files like README.md, PROJECT.md, and PROGRESS.md. These files provide important
 * context for code reviews, helping the AI model understand the project's purpose,
 * structure, and current state.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileExists } from './fileSystem';
import logger from '../logger';

/**
 * Project documentation interface
 */
export interface ProjectDocs {
  readme?: string;
  project?: string;
  progress?: string;
  contributing?: string;
  architecture?: string;
  custom?: Record<string, string>;
}

/**
 * Maximum size for documentation files (in characters)
 * This helps prevent token limit issues
 */
const MAX_DOC_SIZE = 50000;

/**
 * Read a documentation file if it exists
 * @param filePath File path
 * @returns File content or undefined if the file doesn't exist
 */
async function readDocFile(filePath: string): Promise<string | undefined> {
  try {
    if (await fileExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Truncate if too large
      if (content.length > MAX_DOC_SIZE) {
        logger.warn(`Documentation file ${filePath} is too large, truncating to ${MAX_DOC_SIZE} characters.`);
        return content.substring(0, MAX_DOC_SIZE) + '\n\n[Content truncated due to size]';
      }
      
      return content;
    }
  } catch (error) {
    logger.warn(`Error reading documentation file ${filePath}:`, error);
  }
  
  return undefined;
}

/**
 * Read project documentation files
 * @param projectDir Project directory
 * @returns Project documentation
 */
export async function readProjectDocs(projectDir: string): Promise<ProjectDocs> {
  const docs: ProjectDocs = {
    custom: {}
  };
  
  // Read standard documentation files
  docs.readme = await readDocFile(path.join(projectDir, 'README.md'));
  docs.project = await readDocFile(path.join(projectDir, 'PROJECT.md'));
  docs.progress = await readDocFile(path.join(projectDir, 'PROGRESS.md'));
  docs.contributing = await readDocFile(path.join(projectDir, 'CONTRIBUTING.md'));
  docs.architecture = await readDocFile(path.join(projectDir, 'ARCHITECTURE.md'));
  
  // Read custom documentation files from the docs directory
  try {
    const docsDir = path.join(projectDir, 'docs');
    if (await fileExists(docsDir)) {
      const files = await fs.readdir(docsDir);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(docsDir, file);
          const content = await readDocFile(filePath);
          
          if (content) {
            docs.custom![file] = content;
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Error reading docs directory:', error);
  }
  
  return docs;
}

/**
 * Format project documentation for inclusion in prompts
 * @param docs Project documentation
 * @returns Formatted documentation string
 */
export function formatProjectDocs(docs: ProjectDocs): string {
  const sections: string[] = [];
  
  if (docs.readme) {
    sections.push('# README.md\n\n' + docs.readme);
  }
  
  if (docs.project) {
    sections.push('# PROJECT.md\n\n' + docs.project);
  }
  
  if (docs.architecture) {
    sections.push('# ARCHITECTURE.md\n\n' + docs.architecture);
  }
  
  if (docs.progress) {
    sections.push('# PROGRESS.md\n\n' + docs.progress);
  }
  
  if (docs.contributing) {
    sections.push('# CONTRIBUTING.md\n\n' + docs.contributing);
  }
  
  // Add custom documentation files
  if (docs.custom) {
    for (const [file, content] of Object.entries(docs.custom)) {
      sections.push(`# docs/${file}\n\n${content}`);
    }
  }
  
  if (sections.length === 0) {
    return '';
  }
  
  return '## Project Documentation\n\n' + sections.join('\n\n---\n\n');
}
