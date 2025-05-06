/**
 * @fileoverview Utilities for parsing and acting on code review results.
 *
 * This module provides functions for parsing code review results and automatically
 * implementing suggested fixes based on priority levels. It can extract code snippets,
 * identify file locations, and apply changes to the codebase.
 *
 * Key responsibilities:
 * - Parsing review results to extract actionable items
 * - Categorizing fixes by priority (high, medium, low)
 * - Implementing high priority fixes automatically
 * - Prompting for confirmation on medium and low priority fixes
 * - Tracking changes made to files
 * - Providing summary reports of actions taken
 */

import fs from 'fs/promises';
import path from 'path';
import { fileExists, readFile, writeFile } from './fileSystem';
import readline from 'readline';
import { parseReviewJson, displayStructuredReview } from './parsing/reviewParser';
import logger from './logger';

/**
 * Priority levels for code review fixes
 */
export enum FixPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Structure representing a code fix suggestion
 */
interface FixSuggestion {
  priority: FixPriority;
  file: string;
  description: string;
  currentCode?: string;
  suggestedCode?: string;
  lineNumbers?: { start: number; end: number };
}

/**
 * Create a readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt the user for confirmation
 * @param message Message to display to the user
 * @returns Promise resolving to boolean indicating user's response
 */
async function promptForConfirmation(message: string): Promise<boolean> {
  const rl = createReadlineInterface();

  return new Promise(resolve => {
    rl.question(`${message} (y/n): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

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
  priorityLevel?: FixPriority
): Promise<FixSuggestion[]> {
  const suggestions: FixSuggestion[] = [];

  // If a specific priority level is requested, only extract that level
  if (priorityLevel) {
    let section: string | null = null;

    switch (priorityLevel) {
      case FixPriority.HIGH:
        section = extractSection(
          reviewContent,
          '### 🟥 High Priority',
          '### 🟧 Medium Priority'
        );
        break;
      case FixPriority.MEDIUM:
        section = extractSection(
          reviewContent,
          '### 🟧 Medium Priority',
          '### 🟩 Low Priority'
        );
        break;
      case FixPriority.LOW:
        section = extractSection(reviewContent, '### 🟩 Low Priority', '---');
        break;
    }

    if (section) {
      const prioritySuggestions = await parseSuggestions(
        section,
        priorityLevel,
        projectPath
      );
      suggestions.push(...prioritySuggestions);
    }

    return suggestions;
  }

  // Otherwise, extract all priority levels
  // Extract high priority issues
  const highPrioritySection = extractSection(
    reviewContent,
    '### 🟥 High Priority',
    '### 🟧 Medium Priority'
  );
  if (highPrioritySection) {
    const highPrioritySuggestions = await parseSuggestions(
      highPrioritySection,
      FixPriority.HIGH,
      projectPath
    );
    suggestions.push(...highPrioritySuggestions);
  }

  // Extract medium priority issues
  const mediumPrioritySection = extractSection(
    reviewContent,
    '### 🟧 Medium Priority',
    '### 🟩 Low Priority'
  );
  if (mediumPrioritySection) {
    const mediumPrioritySuggestions = await parseSuggestions(
      mediumPrioritySection,
      FixPriority.MEDIUM,
      projectPath
    );
    suggestions.push(...mediumPrioritySuggestions);
  }

  // Extract low priority issues
  const lowPrioritySection = extractSection(
    reviewContent,
    '### 🟩 Low Priority',
    '---'
  );
  if (lowPrioritySection) {
    const lowPrioritySuggestions = await parseSuggestions(
      lowPrioritySection,
      FixPriority.LOW,
      projectPath
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
function extractSection(
  content: string,
  startMarker: string,
  endMarker: string
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
        const regex = new RegExp(
          `[#]{1,3}\s*(?:🟥|🟧|🟩)?\s*${priorityLevel}\s*priority`,
          'i'
        );
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
      const nextHeadingMatch = content
        .substring(startIndex)
        .match(/\n[#]{1,3}\s/);
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
async function parseSuggestions(
  sectionContent: string,
  priority: FixPriority,
  projectPath: string
): Promise<FixSuggestion[]> {
  const suggestions: FixSuggestion[] = [];

  // Split the section into individual issues to reduce memory usage
  // Try different patterns to match issue blocks
  let issueBlocks: string[] = [];

  // Pattern 1: **Issue**: format
  const pattern1Blocks = sectionContent
    .split(/(?=\*\*Issue\*\*:)/)
    .filter(block => block.trim().startsWith('**Issue**:'));
  if (pattern1Blocks.length > 0) {
    issueBlocks = pattern1Blocks;
  } else {
    // Pattern 2: 1. **Issue**: format (numbered list)
    const pattern2Blocks = sectionContent
      .split(/(?=\d+\.\s*\*\*Issue\*\*:)/)
      .filter(block => block.trim().match(/^\d+\.\s*\*\*Issue\*\*/));
    if (pattern2Blocks.length > 0) {
      issueBlocks = pattern2Blocks;
    } else {
      // Pattern 3: ### Issue: format (heading)
      const pattern3Blocks = sectionContent
        .split(/(?=[#]{1,3}\s+Issue:)/)
        .filter(block => block.trim().match(/^[#]{1,3}\s+Issue:/));
      if (pattern3Blocks.length > 0) {
        issueBlocks = pattern3Blocks;
      } else {
        // Pattern 4: **Finding**: format (security reviews)
        const pattern4Blocks = sectionContent
          .split(/(?=\*\*Finding\*\*:)/)
          .filter(block => block.trim().startsWith('**Finding**:'));
        if (pattern4Blocks.length > 0) {
          issueBlocks = pattern4Blocks;
        } else {
          // Pattern 5: **Performance Issue**: format (performance reviews)
          const pattern5Blocks = sectionContent
            .split(/(?=\*\*Performance Issue\*\*:)/)
            .filter(block => block.trim().startsWith('**Performance Issue**:'));
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
      let issueMatch = issueBlock.match(/\*\*Issue\*\*:([^\*]+)/);
      if (!issueMatch) {
        // Try alternative patterns
        issueMatch = issueBlock.match(/\d+\.\s*\*\*Issue\*\*:([^\*]+)/);
      }
      if (!issueMatch) {
        issueMatch = issueBlock.match(/[#]{1,3}\s+Issue:([^\n]+)/);
      }
      if (!issueMatch) {
        issueMatch = issueBlock.match(/\*\*Finding\*\*:([^\*]+)/);
      }
      if (!issueMatch) {
        issueMatch = issueBlock.match(/\*\*Performance Issue\*\*:([^\*]+)/);
      }
      if (!issueMatch) continue;
      issueDescription = issueMatch[1].trim();

      // Extract file path using multiple patterns
      let filePath = '';
      let fileMatch = issueBlock.match(/\*\*File\*\*:([^\*]+)/);
      if (!fileMatch) {
        fileMatch = issueBlock.match(/\*\*Location\*\*:([^\*]+)/);
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
          /(?:src|lib|test|app|components|utils|helpers|services|models|controllers|views|pages|api|config|public|assets|styles|css|js|ts|tsx|jsx)\/[\w\-\.\/_]+\.(ts|js|tsx|jsx|json|css|scss|html|md)/
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
      const filePathMatch = cleanFilePath.match(
        /(?:src|\/)\S+\.(ts|js|tsx|jsx|json)/
      );
      if (filePathMatch) {
        cleanFilePath = filePathMatch[0];
      } else {
        // If we can't extract a clear file path, try to find the most likely path
        const possiblePaths = cleanFilePath
          .split(/[\s,()]/)
          .filter(
            part =>
              part.includes('/') || part.includes('.ts') || part.includes('.js')
          );

        if (possiblePaths.length > 0) {
          cleanFilePath = possiblePaths[0];
        }
      }

      // Resolve the full file path
      const fullFilePath = path.resolve(projectPath, cleanFilePath);

      // Extract location
      const locationMatch = issueBlock.match(/\*\*Location\*\*:([^\*]+)/);
      const location = locationMatch ? locationMatch[1].trim() : '';

      // Extract code blocks with more flexible pattern matching
      // Match code blocks with or without language specifier
      const codeBlockMatches =
        issueBlock.match(/```(?:[a-zA-Z0-9_\-]*)?\s*([\s\S]*?)```/g) || [];

      // If no code blocks found with triple backticks, try alternative formats
      let codeBlocks: string[] = [];

      if (codeBlockMatches.length > 0) {
        codeBlocks = codeBlockMatches.map((block: string) => {
          // Extract the content inside the code block
          const content = block.replace(/```(?:[a-zA-Z0-9_\-]*)?\s*|```$/g, '');
          return content.trim();
        });
      } else {
        // Try to find code blocks with indentation (4 spaces or tab)
        const indentedCodeBlockMatch = issueBlock.match(
          /(?:^|\n)(?: {4}|\t)([^\n]+(?:\n(?: {4}|\t)[^\n]+)*)/g
        );
        if (indentedCodeBlockMatch) {
          codeBlocks = indentedCodeBlockMatch.map((block: string) => {
            // Remove the indentation
            return block.replace(/(?:^|\n)(?: {4}|\t)/g, '\n').trim();
          });
        }

        // Try to find code blocks with 'Current code:' and 'Suggested code:' markers
        const currentCodeMatch = issueBlock.match(
          /Current code:([\s\S]*?)(?:Suggested code:|$)/i
        );
        const suggestedCodeMatch = issueBlock.match(
          /Suggested code:([\s\S]*?)(?:Impact:|$)/i
        );

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
        description: issueDescription
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
        const endLine = lineNumberMatch[2]
          ? parseInt(lineNumberMatch[2], 10)
          : startLine;
        suggestion.lineNumbers = { start: startLine, end: endLine };
      }

      suggestions.push(suggestion);
    } catch (error) {
      console.error('Error parsing suggestion:', error);
      // Continue with the next issue block
    }
  }

  return suggestions;
}

/**
 * This function is a placeholder for future functionality.
 * Currently, the AI code review tool does not automatically apply fixes.
 * It only provides suggestions that developers must review and implement manually.
 *
 * @param suggestion The fix suggestion to apply
 * @returns Always returns false as automatic fixes are not supported
 */
async function applyFixToFile(suggestion: FixSuggestion): Promise<boolean> {
  console.log(`\n⚠️ Automatic fixes are not supported.`);
  console.log(
    `The AI code review tool only provides suggestions that you must implement manually.`
  );
  console.log(`Review the suggested fix and apply it yourself if appropriate.`);

  if (suggestion.suggestedCode) {
    console.log(`\nSuggested code:`);
    console.log('```');
    console.log(suggestion.suggestedCode);
    console.log('```');
  }

  return false;
  /* Original implementation removed as automatic fixes are not supported
  try {
    // Clean up the file path to handle common issues
    let filePath = suggestion.file;

    // If the file path contains parentheses or other text, try to extract the actual path
    if (filePath.includes('(') || filePath.includes(',')) {
      const match = filePath.match(/(?:src|\/)\S+\.(ts|js|tsx|jsx|json)/);
      if (match) {
        filePath = match[0];
        // Resolve the path again
        filePath = path.resolve(path.dirname(suggestion.file), filePath);
      }
    }

    // Check if file exists
    if (!(await fileExists(filePath))) {
      console.error(`File not found: ${filePath}`);
      return false;
    }

    // Read file content
    const fileContent = await readFile(filePath);

    // If we have current code and suggested code, replace the current code with suggested code
    if (suggestion.currentCode && suggestion.suggestedCode) {
      // Simple string replacement
      if (fileContent.includes(suggestion.currentCode)) {
        const newContent = fileContent.replace(suggestion.currentCode, suggestion.suggestedCode);
        await writeFile(filePath, newContent);
        return true;
      }

      // Try with normalized whitespace
      const normalizedCurrentCode = suggestion.currentCode.replace(/\s+/g, ' ').trim();
      const normalizedFileContent = fileContent.replace(/\s+/g, ' ').trim();

      if (normalizedFileContent.includes(normalizedCurrentCode)) {
        // Find the actual position in the original content
        const startPos = fileContent.indexOf(suggestion.currentCode.split('\n')[0]);
        if (startPos !== -1) {
          // Find the end of the block to replace
          const endPos = startPos + suggestion.currentCode.length;
          const newContent = fileContent.substring(0, startPos) +
                            suggestion.suggestedCode +
                            fileContent.substring(endPos);
          await writeFile(filePath, newContent);
          return true;
        }
      }

      // If simple replacement fails, try line-based replacement if we have line numbers
      if (suggestion.lineNumbers) {
        const lines = fileContent.split('\n');
        const { start, end } = suggestion.lineNumbers;

        // Ensure line numbers are valid
        if (start > 0 && end <= lines.length) {
          // Extract the lines to replace (0-indexed array, but line numbers are 1-indexed)
          const linesToReplace = lines.slice(start - 1, end).join('\n');

          // If the extracted lines match the current code (approximately), replace them
          if (linesToReplace.trim() === suggestion.currentCode.trim() ||
              linesToReplace.replace(/\s+/g, ' ').trim() === normalizedCurrentCode) {
            const newLines = [...lines];
            // Replace the lines with the suggested code
            newLines.splice(start - 1, end - start + 1, ...suggestion.suggestedCode.split('\n'));
            await writeFile(filePath, newLines.join('\n'));
            return true;
          }
        }
      }

      console.warn(`Could not find the exact code to replace in ${filePath}`);
      return false;
    }

    // If we only have suggested code but no current code, we can't reliably apply the fix
    if (suggestion.suggestedCode && !suggestion.currentCode) {
      console.warn(`Cannot apply fix to ${filePath} without knowing what code to replace`);
      return false;
    }

    return false;
  } catch (error) {
    console.error(`Error applying fix to ${suggestion.file}:`, error);
    return false;
  }
  */
}

/**
 * Display a concise summary of fix suggestions without prompting for interaction
 * @param suggestions Array of fix suggestions
 * @param priority Priority level of the suggestions
 */
function displayFixSuggestions(
  suggestions: FixSuggestion[],
  priority: FixPriority
): void {
  if (suggestions.length === 0) {
    return;
  }

  const priorityColor = {
    [FixPriority.HIGH]: '\x1b[31m', // Red
    [FixPriority.MEDIUM]: '\x1b[33m', // Yellow
    [FixPriority.LOW]: '\x1b[32m' // Green
  };

  const priorityEmoji = {
    [FixPriority.HIGH]: '🟥',
    [FixPriority.MEDIUM]: '🟧',
    [FixPriority.LOW]: '🟩'
  };

  const priorityLabel = {
    [FixPriority.HIGH]: 'HIGH',
    [FixPriority.MEDIUM]: 'MEDIUM',
    [FixPriority.LOW]: 'LOW'
  };

  console.log(
    `\n${priorityColor[priority]}${priorityEmoji[priority]} ${priorityLabel[priority]} PRIORITY ISSUES (${suggestions.length})\x1b[0m`
  );

  suggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.description}`);
    console.log(`   File: ${suggestion.file}`);
    if (suggestion.lineNumbers) {
      console.log(
        `   Lines: ${suggestion.lineNumbers.start}-${suggestion.lineNumbers.end}`
      );
    }
  });
}

/**
 * Display detailed information about a specific fix suggestion
 * @param suggestion The fix suggestion to display
 * @param index Index of the suggestion in its priority group
 * @param priority Priority level of the suggestion
 */
function displayDetailedFixSuggestion(
  suggestion: FixSuggestion,
  index: number,
  priority: FixPriority
): void {
  const priorityColor = {
    [FixPriority.HIGH]: '\x1b[31m', // Red
    [FixPriority.MEDIUM]: '\x1b[33m', // Yellow
    [FixPriority.LOW]: '\x1b[32m' // Green
  };

  const priorityEmoji = {
    [FixPriority.HIGH]: '🟥',
    [FixPriority.MEDIUM]: '🟧',
    [FixPriority.LOW]: '🟩'
  };

  const priorityLabel = {
    [FixPriority.HIGH]: 'HIGH',
    [FixPriority.MEDIUM]: 'MEDIUM',
    [FixPriority.LOW]: 'LOW'
  };

  console.log(
    `\n${priorityColor[priority]}${priorityEmoji[priority]} ${priorityLabel[priority]} PRIORITY ISSUE #${index + 1}\x1b[0m`
  );
  console.log(`Description: ${suggestion.description}`);
  console.log(`File: ${suggestion.file}`);
  if (suggestion.lineNumbers) {
    console.log(
      `Lines: ${suggestion.lineNumbers.start}-${suggestion.lineNumbers.end}`
    );
  }

  if (suggestion.currentCode && suggestion.suggestedCode) {
    console.log('\nCurrent code:');
    console.log('```');
    console.log(suggestion.currentCode);
    console.log('```');

    console.log('\nSuggested code:');
    console.log('```');
    console.log(suggestion.suggestedCode);
    console.log('```');
  }
}

/**
 * Process review results in non-interactive mode, just displaying recommendations
 * @param reviewContent Content of the review
 * @param projectPath Base path of the project
 * @param priorityFilter Optional filter to show only specific priority issues (h, m, l, or a for all)
 * @returns Summary of suggestions found
 */
export async function displayReviewResults(
  reviewContent: string,
  projectPath: string,
  priorityFilter?: 'h' | 'm' | 'l' | 'a'
): Promise<{
  highPrioritySuggestions: FixSuggestion[];
  mediumPrioritySuggestions: FixSuggestion[];
  lowPrioritySuggestions: FixSuggestion[];
  totalSuggestions: number;
}> {
  // First try to parse the review content as structured JSON
  const parsedReview = parseReviewJson(reviewContent);

  if (parsedReview) {
    // If we have a structured review, display it using the structured format
    displayStructuredReview(parsedReview);

    // Convert the structured review to FixSuggestion format for compatibility
    const highPrioritySuggestions: FixSuggestion[] = [];
    const mediumPrioritySuggestions: FixSuggestion[] = [];
    const lowPrioritySuggestions: FixSuggestion[] = [];

    // Process each file and issue
    parsedReview.review.files.forEach(file => {
      file.issues.forEach(issue => {
        const suggestion: FixSuggestion = {
          priority:
            issue.priority === 'HIGH'
              ? FixPriority.HIGH
              : issue.priority === 'MEDIUM'
                ? FixPriority.MEDIUM
                : FixPriority.LOW,
          file: file.filePath,
          description: issue.description,
          currentCode: issue.currentCode,
          suggestedCode: issue.suggestedCode,
          lineNumbers: issue.location
            ? {
                start: issue.location.startLine,
                end: issue.location.endLine
              }
            : undefined
        };

        // Add to the appropriate array based on priority
        if (suggestion.priority === FixPriority.HIGH) {
          highPrioritySuggestions.push(suggestion);
        } else if (suggestion.priority === FixPriority.MEDIUM) {
          mediumPrioritySuggestions.push(suggestion);
        } else {
          lowPrioritySuggestions.push(suggestion);
        }
      });
    });

    const totalSuggestions =
      highPrioritySuggestions.length +
      mediumPrioritySuggestions.length +
      lowPrioritySuggestions.length;

    return {
      highPrioritySuggestions,
      mediumPrioritySuggestions,
      lowPrioritySuggestions,
      totalSuggestions
    };
  } else {
    // Fall back to the original extraction method if parsing fails
    logger.info(
      'Using legacy format for review results (no structured schema detected)'
    );

    // Extract all suggestions
    const highPrioritySuggestions = await extractFixSuggestions(
      reviewContent,
      projectPath,
      FixPriority.HIGH
    );
    const mediumPrioritySuggestions = await extractFixSuggestions(
      reviewContent,
      projectPath,
      FixPriority.MEDIUM
    );
    const lowPrioritySuggestions = await extractFixSuggestions(
      reviewContent,
      projectPath,
      FixPriority.LOW
    );

    const totalSuggestions =
      highPrioritySuggestions.length +
      mediumPrioritySuggestions.length +
      lowPrioritySuggestions.length;

    // Display summary of all suggestions
    logger.info('\n=== CODE REVIEW RECOMMENDATIONS ===');
    logger.info(`Total issues found: ${totalSuggestions}`);
    logger.info(`🟥 High priority: ${highPrioritySuggestions.length}`);
    logger.info(`🟧 Medium priority: ${mediumPrioritySuggestions.length}`);
    logger.info(`🟩 Low priority: ${lowPrioritySuggestions.length}`);

    // Display instructions for interactive mode
    logger.info(
      '\nShowing ALL issues by default. To filter by priority, use these options:'
    );
    logger.info('  (h) High priority issues only');
    logger.info('  (m) Medium priority issues only');
    logger.info('  (l) Low priority issues only');
    logger.info('  (a) All issues (default)');
    logger.info('\nExample: ai-code-review src --interactive h');

    // Display suggestions based on priority filter
    // If no filter is provided, show all issues by default
    if (!priorityFilter || priorityFilter.toLowerCase() === 'a') {
      // Show all issues
      displayFixSuggestions(highPrioritySuggestions, FixPriority.HIGH);
      displayFixSuggestions(mediumPrioritySuggestions, FixPriority.MEDIUM);
      displayFixSuggestions(lowPrioritySuggestions, FixPriority.LOW);
    } else {
      // Show issues based on the specified filter
      switch (priorityFilter.toLowerCase()) {
        case 'h':
          displayFixSuggestions(highPrioritySuggestions, FixPriority.HIGH);
          break;
        case 'm':
          displayFixSuggestions(mediumPrioritySuggestions, FixPriority.MEDIUM);
          break;
        case 'l':
          displayFixSuggestions(lowPrioritySuggestions, FixPriority.LOW);
          break;
        default:
          logger.warn('Invalid priority filter. Use h, m, l, or a.');
          // Show all issues if the filter is invalid
          displayFixSuggestions(highPrioritySuggestions, FixPriority.HIGH);
          displayFixSuggestions(mediumPrioritySuggestions, FixPriority.MEDIUM);
          displayFixSuggestions(lowPrioritySuggestions, FixPriority.LOW);
      }
    }

    return {
      highPrioritySuggestions,
      mediumPrioritySuggestions,
      lowPrioritySuggestions,
      totalSuggestions
    };
  }
}

/**
 * Process review results and implement fixes
 * @param reviewContent Content of the review
 * @param projectPath Base path of the project
 * @param autoImplementHighPriority Whether to automatically implement high priority fixes
 * @param promptForMediumLow Whether to prompt for confirmation on medium and low priority fixes
 * @returns Summary of actions taken
 */
export async function processReviewResults(
  reviewContent: string,
  projectPath: string,
  autoImplementHighPriority: boolean = true,
  promptForMediumLow: boolean = true
): Promise<{
  highPriorityFixed: number;
  mediumPriorityFixed: number;
  lowPriorityFixed: number;
  totalSuggestions: number;
}> {
  // Initialize counters
  let highPriorityFixed = 0;
  let mediumPriorityFixed = 0;
  let lowPriorityFixed = 0;
  let totalSuggestions = 0;

  // Process high priority suggestions
  console.log('\nExtracting high priority issues...');
  const highPrioritySuggestions = await extractFixSuggestions(
    reviewContent,
    projectPath,
    FixPriority.HIGH
  );
  totalSuggestions += highPrioritySuggestions.length;

  if (highPrioritySuggestions.length > 0) {
    console.log(
      `Found ${highPrioritySuggestions.length} high priority issues.`
    );

    if (autoImplementHighPriority) {
      console.log('Automatically implementing high priority fixes...');

      for (const suggestion of highPrioritySuggestions) {
        console.log(`\nImplementing fix for: ${suggestion.description}`);
        console.log(`File: ${suggestion.file}`);

        const success = await applyFixToFile(suggestion);
        if (success) {
          console.log('✅ Fix applied successfully.');
          highPriorityFixed++;
        } else {
          console.log('❌ Could not apply fix automatically.');
        }
      }
    } else {
      console.log(
        'Skipping high priority fixes as auto-implementation is disabled.'
      );
    }
  } else {
    console.log('No high priority issues found.');
  }

  // Process medium priority suggestions
  console.log('\nExtracting medium priority issues...');
  const mediumPrioritySuggestions = await extractFixSuggestions(
    reviewContent,
    projectPath,
    FixPriority.MEDIUM
  );
  totalSuggestions += mediumPrioritySuggestions.length;

  if (mediumPrioritySuggestions.length > 0) {
    console.log(
      `Found ${mediumPrioritySuggestions.length} medium priority issues.`
    );

    if (promptForMediumLow) {
      for (const suggestion of mediumPrioritySuggestions) {
        console.log(`\nMedium priority issue: ${suggestion.description}`);
        console.log(`File: ${suggestion.file}`);

        if (suggestion.currentCode && suggestion.suggestedCode) {
          console.log('\nCurrent code:');
          console.log('```');
          console.log(suggestion.currentCode);
          console.log('```');

          console.log('\nSuggested code:');
          console.log('```');
          console.log(suggestion.suggestedCode);
          console.log('```');
        }

        const shouldImplement = await promptForConfirmation(
          'Implement this fix?'
        );
        if (shouldImplement) {
          const success = await applyFixToFile(suggestion);
          if (success) {
            console.log('✅ Fix applied successfully.');
            mediumPriorityFixed++;
          } else {
            console.log('❌ Could not apply fix automatically.');
          }
        } else {
          console.log('Skipping this fix.');
        }
      }
    } else {
      console.log('Skipping medium priority fixes as prompting is disabled.');
    }
  } else {
    console.log('No medium priority issues found.');
  }

  // Process low priority suggestions
  console.log('\nExtracting low priority issues...');
  const lowPrioritySuggestions = await extractFixSuggestions(
    reviewContent,
    projectPath,
    FixPriority.LOW
  );
  totalSuggestions += lowPrioritySuggestions.length;

  if (lowPrioritySuggestions.length > 0) {
    console.log(`Found ${lowPrioritySuggestions.length} low priority issues.`);

    if (promptForMediumLow) {
      for (const suggestion of lowPrioritySuggestions) {
        console.log(`\nLow priority issue: ${suggestion.description}`);
        console.log(`File: ${suggestion.file}`);

        if (suggestion.currentCode && suggestion.suggestedCode) {
          console.log('\nCurrent code:');
          console.log('```');
          console.log(suggestion.currentCode);
          console.log('```');

          console.log('\nSuggested code:');
          console.log('```');
          console.log(suggestion.suggestedCode);
          console.log('```');
        }

        const shouldImplement = await promptForConfirmation(
          'Implement this fix?'
        );
        if (shouldImplement) {
          const success = await applyFixToFile(suggestion);
          if (success) {
            console.log('✅ Fix applied successfully.');
            lowPriorityFixed++;
          } else {
            console.log('❌ Could not apply fix automatically.');
          }
        } else {
          console.log('Skipping this fix.');
        }
      }
    } else {
      console.log('Skipping low priority fixes as prompting is disabled.');
    }
  } else {
    console.log('No low priority issues found.');
  }

  // Return summary
  return {
    highPriorityFixed,
    mediumPriorityFixed,
    lowPriorityFixed,
    totalSuggestions
  };
}
