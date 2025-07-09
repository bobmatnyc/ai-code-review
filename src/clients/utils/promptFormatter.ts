/**
 * @fileoverview Utilities for formatting prompts for AI models.
 *
 * This module provides functions for formatting prompts for different AI models,
 * including handling code blocks, project context, and review instructions.
 */

import path from 'node:path';
import type { FileInfo } from '../../types/review';
import { formatProjectDocs, type ProjectDocs } from '../../utils/projectDocs';
import { getLanguageFromExtension } from '../utils/languageDetection';
import { generateDirectoryStructure } from './directoryStructure';

/**
 * Format a code block with the appropriate language
 * @param fileContent The content of the file
 * @param filePath The path to the file
 * @returns The formatted code block
 */
export function formatCodeBlock(fileContent: string, filePath: string): string {
  // Get the file extension and language
  const fileExtension = path.extname(filePath).slice(1);
  const language = getLanguageFromExtension(fileExtension);

  // Format the code block with language
  return `\`\`\`${language}\n${fileContent}\n\`\`\``;
}

/**
 * Format a single file review prompt
 * @param promptTemplate The prompt template
 * @param fileContent The content of the file
 * @param filePath The path to the file
 * @param projectDocs Optional project documentation
 * @returns The formatted prompt
 */
export function formatSingleFileReviewPrompt(
  promptTemplate: string,
  fileContent: string,
  filePath: string,
  projectDocs?: ProjectDocs | null,
): string {
  // Format the code block
  const codeBlock = formatCodeBlock(fileContent, filePath);

  // Format project documentation if available
  const projectContext = projectDocs ? formatProjectDocs(projectDocs) : '';

  // Prepare the user prompt
  return `${promptTemplate}

${projectContext ? `## Project Context\n${projectContext}\n\n` : ''}## File to Review: ${filePath}

${codeBlock}

Please review this code and provide feedback according to the instructions. DO NOT REPEAT THE INSTRUCTIONS. DO NOT ASK FOR CODE TO REVIEW. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.`;
}

/**
 * Format a consolidated review prompt
 * @param promptTemplate The prompt template
 * @param projectName The name of the project
 * @param files Array of file information
 * @param projectDocs Optional project documentation
 * @returns The formatted prompt
 */
export function formatConsolidatedReviewPrompt(
  promptTemplate: string,
  projectName: string,
  files: Array<{ relativePath?: string; content: string; sizeInBytes: number }>,
  projectDocs?: ProjectDocs | null,
): string {
  // Format project documentation if available
  const projectContext = projectDocs ? formatProjectDocs(projectDocs) : '';

  // Convert the file array to FileInfo format for the directory structure generator
  const fileInfos: FileInfo[] = files.map((file) => ({
    path: file.relativePath || file.sizeInBytes.toString(), // Use sizeInBytes as fallback for path
    relativePath: file.relativePath,
    content: file.content,
  }));

  // Create a project structure summary using the utility function
  const directoryStructure = generateDirectoryStructure(fileInfos);

  // Prepare file summaries
  const fileSummaries = files
    .map((file) => `- ${file.relativePath || 'unnamed file'} (${file.sizeInBytes} bytes)`)
    .join('\n');

  // Prepare the user prompt
  return `${promptTemplate}

${projectContext ? `## Project Context\n${projectContext}\n\n` : ''}## Project: ${projectName}

## Directory Structure
\`\`\`
${directoryStructure}
\`\`\`

## File Summaries
${fileSummaries}

Please review this codebase and provide feedback according to the instructions. DO NOT REPEAT THE INSTRUCTIONS. DO NOT ASK FOR CODE TO REVIEW. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.`;
}
