/**
 * @fileoverview Utilities for extracting and parsing code review results.
 *
 * This module provides functions for extracting actionable items from code review results,
 * including parsing sections by priority, identifying file locations, and extracting code snippets.
 */

import path from 'node:path';
import logger from '../logger';
import { FixPriority, type FixSuggestion } from './types';

/**
 * Extract fix suggestions from review content
 * @param reviewContent The content of the review
 * @param projectPath Base path of the project
 * @param priorityLevel Optional priority level to extract (if not provided, extracts all)
 * @returns Array of fix suggestions
 */
export async function extractFixSuggestions(
  reviewContent: string,
  projectPath: string,
  priorityLevel?: FixPriority,
): Promise<FixSuggestion[]> {
  const suggestions: FixSuggestion[] = [];

  // If a specific priority level is requested, only extract that level
  if (priorityLevel) {
    let section: string | null = null;

    switch (priorityLevel) {
      case FixPriority.HIGH:
        section = extractSection(reviewContent, '### 🟥 High Priority', '### 🟧 Medium Priority');
        break;
      case FixPriority.MEDIUM:
        section = extractSection(reviewContent, '### 🟧 Medium Priority', '### 🟩 Low Priority');
        break;
      case FixPriority.LOW:
        section = extractSection(reviewContent, '### 🟩 Low Priority', '---');
        break;
    }

    if (section) {
      const prioritySuggestions = await parseSuggestions(section, priorityLevel, projectPath);
      suggestions.push(...prioritySuggestions);
    }

    return suggestions;
  }

  // Otherwise, extract all priority levels
  // Extract high priority issues
  const highPrioritySection = extractSection(
    reviewContent,
    '### 🟥 High Priority',
    '### 🟧 Medium Priority',
  );
  if (highPrioritySection) {
    const highPrioritySuggestions = await parseSuggestions(
      highPrioritySection,
      FixPriority.HIGH,
      projectPath,
    );
    suggestions.push(...highPrioritySuggestions);
  }

  // Extract medium priority issues
  const mediumPrioritySection = extractSection(
    reviewContent,
    '### 🟧 Medium Priority',
    '### 🟩 Low Priority',
  );
  if (mediumPrioritySection) {
    const mediumPrioritySuggestions = await parseSuggestions(
      mediumPrioritySection,
      FixPriority.MEDIUM,
      projectPath,
    );
    suggestions.push(...mediumPrioritySuggestions);
  }

  // Extract low priority issues
  const lowPrioritySection = extractSection(reviewContent, '### 🟩 Low Priority', '---');
  if (lowPrioritySection) {
    const lowPrioritySuggestions = await parseSuggestions(
      lowPrioritySection,
      FixPriority.LOW,
      projectPath,
    );
    suggestions.push(...lowPrioritySuggestions);
  }

  return suggestions;
}

/**
 * Extract a section from the review content
 * @param content Full review content
 * @param startMarker Start marker for the section
 * @param endMarker End marker for the section
 * @returns The extracted section or null if not found
 */
export function extractSection(
  content: string,
  startMarker: string,
  endMarker: string,
): string | null {
  // Try exact match first
  let startIndex = content.indexOf(startMarker);

  // If exact match fails, try more flexible matching
  if (startIndex === -1) {
    // Try without emoji
    const startMarkerNoEmoji = startMarker.replace(/🟥|🟧|🟩/g, '').trim();
    startIndex = content.indexOf(startMarkerNoEmoji);

    // Try with different heading levels (## or # instead of ###)
    if (startIndex === -1) {
      const startMarkerAltHeading = startMarker.replace('###', '##');
      startIndex = content.indexOf(startMarkerAltHeading);
    }

    if (startIndex === -1) {
      const startMarkerAltHeading2 = startMarker.replace('###', '#');
      startIndex = content.indexOf(startMarkerAltHeading2);
    }

    // Try with case-insensitive match for priority level
    if (startIndex === -1) {
      const priorityLevel = startMarker.includes('High')
        ? 'high'
        : startMarker.includes('Medium')
          ? 'medium'
          : startMarker.includes('Low')
            ? 'low'
            : '';

      if (priorityLevel) {
        const regex = new RegExp(`[#]{1,3}\\s*(?:🟥|🟧|🟩)?\\s*${priorityLevel}\\s*priority`, 'i');
        const match = content.match(regex);
        if (match && match.index !== undefined) {
          startIndex = match.index;
        }
      }
    }
  }

  if (startIndex === -1) return null;

  // Try exact match for end marker
  let endIndex = content.indexOf(endMarker, startIndex);

  // If exact match fails, try more flexible matching for end marker
  if (endIndex === -1) {
    // Try without emoji
    const endMarkerNoEmoji = endMarker.replace(/🟥|🟧|🟩/g, '').trim();
    endIndex = content.indexOf(endMarkerNoEmoji, startIndex);

    // Try with different heading levels
    if (endIndex === -1) {
      const endMarkerAltHeading = endMarker.replace('###', '##');
      endIndex = content.indexOf(endMarkerAltHeading, startIndex);
    }

    if (endIndex === -1) {
      const endMarkerAltHeading2 = endMarker.replace('###', '#');
      endIndex = content.indexOf(endMarkerAltHeading2, startIndex);
    }

    // If we still can't find the end marker, look for the next heading
    if (endIndex === -1) {
      const nextHeadingMatch = content.substring(startIndex).match(/\n[#]{1,3}\s/);
      if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
        endIndex = startIndex + nextHeadingMatch.index;
      }
    }
  }

  if (endIndex === -1) return content.substring(startIndex);

  return content.substring(startIndex, endIndex);
}

/**
 * Split section content into issue blocks using multiple pattern strategies
 * @param sectionContent Content to split
 * @returns Array of issue blocks
 */
function splitIntoIssueBlocks(sectionContent: string): string[] {
  // Define patterns to try in order of preference
  const patterns = [
    {
      // Pattern 1: **Issue**: format
      regex: /(?=\*\*Issue\*\*:)/,
      filter: (block: string) => block.trim().startsWith('**Issue**:'),
    },
    {
      // Pattern 2: 1. **Issue**: format (numbered list)
      regex: /(?=\d+\.\s*\*\*Issue\*\*:)/,
      filter: (block: string) => /^\d+\.\s*\*\*Issue\*\*/.test(block.trim()),
    },
    {
      // Pattern 3: ### Issue: format (heading)
      regex: /(?=[#]{1,3}\s+Issue:)/,
      filter: (block: string) => /^[#]{1,3}\s+Issue:/.test(block.trim()),
    },
    {
      // Pattern 4: **Finding**: format (security reviews)
      regex: /(?=\*\*Finding\*\*:)/,
      filter: (block: string) => block.trim().startsWith('**Finding**:'),
    },
    {
      // Pattern 5: **Performance Issue**: format (performance reviews)
      regex: /(?=\*\*Performance Issue\*\*:)/,
      filter: (block: string) => block.trim().startsWith('**Performance Issue**:'),
    },
  ];

  for (const pattern of patterns) {
    const blocks = sectionContent.split(pattern.regex).filter(pattern.filter);
    if (blocks.length > 0) {
      return blocks;
    }
  }

  return [];
}

/**
 * Extract issue description from an issue block
 * @param issueBlock Issue block content
 * @returns Issue description or empty string if not found
 */
function extractIssueDescription(issueBlock: string): string {
  const patterns = [
    /\*\*Issue\*\*:([^*]+)/,
    /\d+\.\s*\*\*Issue\*\*:([^*]+)/,
    /[#]{1,3}\s+Issue:([^\n]+)/,
    /\*\*Finding\*\*:([^*]+)/,
    /\*\*Performance Issue\*\*:([^*]+)/,
  ];

  for (const pattern of patterns) {
    const match = issueBlock.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extract and clean file path from an issue block
 * @param issueBlock Issue block content
 * @returns Cleaned file path or empty string if not found
 */
function extractFilePath(issueBlock: string): string {
  // Try explicit file/location markers first
  const markerPatterns = [
    /\*\*File\*\*:([^*]+)/,
    /\*\*Location\*\*:([^*]+)/,
    /File:([^\n]+)/,
    /Path:([^\n]+)/,
  ];

  for (const pattern of markerPatterns) {
    const match = issueBlock.match(pattern);
    if (match) {
      return cleanFilePath(match[1].trim());
    }
  }

  // Try to find any path-like string in the issue block
  const pathPattern =
    /(?:src|lib|test|app|components|utils|helpers|services|models|controllers|views|pages|api|config|public|assets|styles|css|js|ts|tsx|jsx)\/[\w\-./_]+\.(ts|js|tsx|jsx|json|css|scss|html|md)/;
  const pathMatch = issueBlock.match(pathPattern);

  return pathMatch ? pathMatch[0].trim() : '';
}

/**
 * Clean and normalize a file path string
 * @param filePath Raw file path string
 * @returns Cleaned file path
 */
function cleanFilePath(filePath: string): string {
  // Remove markdown formatting
  const cleaned = filePath.replace(/`/g, '').replace(/\*/g, '').trim();

  // Extract actual file path from common patterns
  const filePathMatch = cleaned.match(/(?:src|\/)\S+\.(ts|js|tsx|jsx|json)/);
  if (filePathMatch) {
    return filePathMatch[0];
  }

  // Try to find the most likely path
  const possiblePaths = cleaned
    .split(/[\s,()]/)
    .filter((part) => part.includes('/') || part.includes('.ts') || part.includes('.js'));

  return possiblePaths.length > 0 ? possiblePaths[0] : cleaned;
}

/**
 * Extract code blocks from an issue block
 * @param issueBlock Issue block content
 * @returns Array of code block strings
 */
function extractCodeBlocks(issueBlock: string): string[] {
  // Try triple backtick code blocks first
  const codeBlockMatches = issueBlock.match(/```(?:[a-zA-Z0-9_-]*)?\s*([\s\S]*?)```/g);

  if (codeBlockMatches && codeBlockMatches.length > 0) {
    return codeBlockMatches.map((block: string) => {
      const content = block.replace(/```(?:[a-zA-Z0-9_-]*)?\s*|```$/g, '');
      return content.trim();
    });
  }

  // Try indented code blocks (4 spaces or tab)
  const indentedCodeBlockMatch = issueBlock.match(
    /(?:^|\n)(?: {4}|\t)([^\n]+(?:\n(?: {4}|\t)[^\n]+)*)/g,
  );
  if (indentedCodeBlockMatch) {
    return indentedCodeBlockMatch.map((block: string) => {
      return block.replace(/(?:^|\n)(?: {4}|\t)/g, '\n').trim();
    });
  }

  // Try 'Current code:' and 'Suggested code:' markers
  const codeBlocks: string[] = [];
  const currentCodeMatch = issueBlock.match(/Current code:([\s\S]*?)(?:Suggested code:|$)/i);
  const suggestedCodeMatch = issueBlock.match(/Suggested code:([\s\S]*?)(?:Impact:|$)/i);

  if (currentCodeMatch?.[1].trim()) {
    codeBlocks.push(currentCodeMatch[1].trim());
  }
  if (suggestedCodeMatch?.[1].trim()) {
    codeBlocks.push(suggestedCodeMatch[1].trim());
  }

  return codeBlocks;
}

/**
 * Extract line numbers from location string
 * @param location Location string
 * @returns Line number range or undefined
 */
function extractLineNumbers(location: string): { start: number; end: number } | undefined {
  const lineNumberMatch = location.match(/lines? (\d+)(?:-(\d+))?/i);
  if (!lineNumberMatch) {
    return undefined;
  }

  const startLine = parseInt(lineNumberMatch[1], 10);
  const endLine = lineNumberMatch[2] ? parseInt(lineNumberMatch[2], 10) : startLine;

  return { start: startLine, end: endLine };
}

/**
 * Parse a single issue block into a FixSuggestion
 * @param issueBlock Issue block content
 * @param priority Priority level
 * @param projectPath Base path of the project
 * @returns FixSuggestion or null if parsing fails
 */
function parseIssueBlock(
  issueBlock: string,
  priority: FixPriority,
  projectPath: string,
): FixSuggestion | null {
  // Extract issue description
  const issueDescription = extractIssueDescription(issueBlock);
  if (!issueDescription) {
    return null;
  }

  // Extract file path
  const filePath = extractFilePath(issueBlock);
  if (!filePath) {
    return null;
  }

  // Resolve the full file path
  const fullFilePath = path.resolve(projectPath, filePath);

  // Extract location
  const locationMatch = issueBlock.match(/\*\*Location\*\*:([^*]+)/);
  const location = locationMatch ? locationMatch[1].trim() : '';

  // Extract code blocks
  const codeBlocks = extractCodeBlocks(issueBlock);

  // Create suggestion
  const suggestion: FixSuggestion = {
    priority,
    file: fullFilePath,
    description: issueDescription,
  };

  // Add code blocks if available
  if (codeBlocks.length >= 2) {
    suggestion.currentCode = codeBlocks[0];
    suggestion.suggestedCode = codeBlocks[1];
  } else if (codeBlocks.length === 1) {
    suggestion.suggestedCode = codeBlocks[0];
  }

  // Add line numbers if available
  const lineNumbers = extractLineNumbers(location);
  if (lineNumbers) {
    suggestion.lineNumbers = lineNumbers;
  }

  return suggestion;
}

/**
 * Parse suggestions from a section of the review
 * @param sectionContent Content of the section
 * @param priority Priority level of the suggestions
 * @param projectPath Base path of the project
 * @returns Array of fix suggestions
 */
export async function parseSuggestions(
  sectionContent: string,
  priority: FixPriority,
  projectPath: string,
): Promise<FixSuggestion[]> {
  const suggestions: FixSuggestion[] = [];
  const issueBlocks = splitIntoIssueBlocks(sectionContent);

  for (const issueBlock of issueBlocks) {
    try {
      const suggestion = parseIssueBlock(issueBlock, priority, projectPath);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    } catch (error) {
      logger.error('Error parsing suggestion:', error);
      // Continue with the next issue block
    }
  }

  return suggestions;
}
