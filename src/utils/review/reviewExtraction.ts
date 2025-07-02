/**
 * @fileoverview Utilities for extracting and parsing code review results.
 *
 * This module provides functions for extracting actionable items from code review results,
 * including parsing sections by priority, identifying file locations, and extracting code snippets.
 */

import path from 'path';
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

  // Split the section into individual issues to reduce memory usage
  // Try different patterns to match issue blocks
  let issueBlocks: string[] = [];

  // Pattern 1: **Issue**: format
  const pattern1Blocks = sectionContent
    .split(/(?=\*\*Issue\*\*:)/)
    .filter((block) => block.trim().startsWith('**Issue**:'));
  if (pattern1Blocks.length > 0) {
    issueBlocks = pattern1Blocks;
  } else {
    // Pattern 2: 1. **Issue**: format (numbered list)
    const pattern2Blocks = sectionContent
      .split(/(?=\d+\.\s*\*\*Issue\*\*:)/)
      .filter((block) => block.trim().match(/^\d+\.\s*\*\*Issue\*\*/));
    if (pattern2Blocks.length > 0) {
      issueBlocks = pattern2Blocks;
    } else {
      // Pattern 3: ### Issue: format (heading)
      const pattern3Blocks = sectionContent
        .split(/(?=[#]{1,3}\s+Issue:)/)
        .filter((block) => block.trim().match(/^[#]{1,3}\s+Issue:/));
      if (pattern3Blocks.length > 0) {
        issueBlocks = pattern3Blocks;
      } else {
        // Pattern 4: **Finding**: format (security reviews)
        const pattern4Blocks = sectionContent
          .split(/(?=\*\*Finding\*\*:)/)
          .filter((block) => block.trim().startsWith('**Finding**:'));
        if (pattern4Blocks.length > 0) {
          issueBlocks = pattern4Blocks;
        } else {
          // Pattern 5: **Performance Issue**: format (performance reviews)
          const pattern5Blocks = sectionContent
            .split(/(?=\*\*Performance Issue\*\*:)/)
            .filter((block) => block.trim().startsWith('**Performance Issue**:'));
          if (pattern5Blocks.length > 0) {
            issueBlocks = pattern5Blocks;
          }
        }
      }
    }
  }

  for (const issueBlock of issueBlocks) {
    try {
      // Extract issue description using multiple patterns
      let issueDescription = '';
      let issueMatch = issueBlock.match(/\*\*Issue\*\*:([^*]+)/);
      if (!issueMatch) {
        // Try alternative patterns
        issueMatch = issueBlock.match(/\d+\.\s*\*\*Issue\*\*:([^*]+)/);
      }
      if (!issueMatch) {
        issueMatch = issueBlock.match(/[#]{1,3}\s+Issue:([^\n]+)/);
      }
      if (!issueMatch) {
        issueMatch = issueBlock.match(/\*\*Finding\*\*:([^*]+)/);
      }
      if (!issueMatch) {
        issueMatch = issueBlock.match(/\*\*Performance Issue\*\*:([^*]+)/);
      }
      if (!issueMatch) continue;
      issueDescription = issueMatch[1].trim();

      // Extract file path using multiple patterns
      let filePath = '';
      let fileMatch = issueBlock.match(/\*\*File\*\*:([^*]+)/);
      if (!fileMatch) {
        fileMatch = issueBlock.match(/\*\*Location\*\*:([^*]+)/);
      }
      if (!fileMatch) {
        fileMatch = issueBlock.match(/File:([^\n]+)/);
      }
      if (!fileMatch) {
        fileMatch = issueBlock.match(/Path:([^\n]+)/);
      }
      if (!fileMatch) {
        // Try to find any path-like string in the issue block
        const pathMatch = issueBlock.match(
          /(?:src|lib|test|app|components|utils|helpers|services|models|controllers|views|pages|api|config|public|assets|styles|css|js|ts|tsx|jsx)\/[\w\-./_]+\.(ts|js|tsx|jsx|json|css|scss|html|md)/,
        );
        if (pathMatch) {
          filePath = pathMatch[0].trim();
        } else {
          continue; // Skip if we can't find a file path
        }
      } else {
        filePath = fileMatch[1].trim();
      }
      // Remove any markdown formatting from the file path
      let cleanFilePath = filePath.replace(/`/g, '').replace(/\*/g, '').trim();

      // Extract the actual file path from common patterns
      const filePathMatch = cleanFilePath.match(/(?:src|\/)\S+\.(ts|js|tsx|jsx|json)/);
      if (filePathMatch) {
        cleanFilePath = filePathMatch[0];
      } else {
        // If we can't extract a clear file path, try to find the most likely path
        const possiblePaths = cleanFilePath
          .split(/[\s,()]/)
          .filter((part) => part.includes('/') || part.includes('.ts') || part.includes('.js'));

        if (possiblePaths.length > 0) {
          cleanFilePath = possiblePaths[0];
        }
      }

      // Resolve the full file path
      const fullFilePath = path.resolve(projectPath, cleanFilePath);

      // Extract location
      const locationMatch = issueBlock.match(/\*\*Location\*\*:([^*]+)/);
      const location = locationMatch ? locationMatch[1].trim() : '';

      // Extract code blocks with more flexible pattern matching
      // Match code blocks with or without language specifier
      const codeBlockMatches = issueBlock.match(/```(?:[a-zA-Z0-9_-]*)?\s*([\s\S]*?)```/g) || [];

      // If no code blocks found with triple backticks, try alternative formats
      let codeBlocks: string[] = [];

      if (codeBlockMatches.length > 0) {
        codeBlocks = codeBlockMatches.map((block: string) => {
          // Extract the content inside the code block
          const content = block.replace(/```(?:[a-zA-Z0-9_-]*)?\s*|```$/g, '');
          return content.trim();
        });
      } else {
        // Try to find code blocks with indentation (4 spaces or tab)
        const indentedCodeBlockMatch = issueBlock.match(
          /(?:^|\n)(?: {4}|\t)([^\n]+(?:\n(?: {4}|\t)[^\n]+)*)/g,
        );
        if (indentedCodeBlockMatch) {
          codeBlocks = indentedCodeBlockMatch.map((block: string) => {
            // Remove the indentation
            return block.replace(/(?:^|\n)(?: {4}|\t)/g, '\n').trim();
          });
        }

        // Try to find code blocks with 'Current code:' and 'Suggested code:' markers
        const currentCodeMatch = issueBlock.match(/Current code:([\s\S]*?)(?:Suggested code:|$)/i);
        const suggestedCodeMatch = issueBlock.match(/Suggested code:([\s\S]*?)(?:Impact:|$)/i);

        if (currentCodeMatch && currentCodeMatch[1].trim()) {
          codeBlocks.push(currentCodeMatch[1].trim());
        }

        if (suggestedCodeMatch && suggestedCodeMatch[1].trim()) {
          codeBlocks.push(suggestedCodeMatch[1].trim());
        }
      }

      // Create suggestion
      const suggestion: FixSuggestion = {
        priority,
        file: fullFilePath,
        description: issueDescription,
      };

      // If we have code blocks, assume the first is current code and second is suggested code
      if (codeBlocks.length >= 2) {
        suggestion.currentCode = codeBlocks[0];
        suggestion.suggestedCode = codeBlocks[1];
      } else if (codeBlocks.length === 1) {
        // If only one code block, assume it's the suggested code
        suggestion.suggestedCode = codeBlocks[0];
      }

      // Try to extract line numbers from location
      const lineNumberMatch = location.match(/lines? (\d+)(?:-(\d+))?/i);
      if (lineNumberMatch) {
        const startLine = parseInt(lineNumberMatch[1], 10);
        const endLine = lineNumberMatch[2] ? parseInt(lineNumberMatch[2], 10) : startLine;
        suggestion.lineNumbers = { start: startLine, end: endLine };
      }

      suggestions.push(suggestion);
    } catch (error) {
      logger.error('Error parsing suggestion:', error);
      // Continue with the next issue block
    }
  }

  return suggestions;
}
