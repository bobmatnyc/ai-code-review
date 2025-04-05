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

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
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
  const highPrioritySection = extractSection(reviewContent, '### 🟥 High Priority', '### 🟧 Medium Priority');
  if (highPrioritySection) {
    const highPrioritySuggestions = await parseSuggestions(highPrioritySection, FixPriority.HIGH, projectPath);
    suggestions.push(...highPrioritySuggestions);
  }

  // Extract medium priority issues
  const mediumPrioritySection = extractSection(reviewContent, '### 🟧 Medium Priority', '### 🟩 Low Priority');
  if (mediumPrioritySection) {
    const mediumPrioritySuggestions = await parseSuggestions(mediumPrioritySection, FixPriority.MEDIUM, projectPath);
    suggestions.push(...mediumPrioritySuggestions);
  }

  // Extract low priority issues
  const lowPrioritySection = extractSection(reviewContent, '### 🟩 Low Priority', '---');
  if (lowPrioritySection) {
    const lowPrioritySuggestions = await parseSuggestions(lowPrioritySection, FixPriority.LOW, projectPath);
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
function extractSection(content: string, startMarker: string, endMarker: string): string | null {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return null;

  const endIndex = content.indexOf(endMarker, startIndex);
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
  const issueBlocks = sectionContent.split(/(?=\*\*Issue\*\*:)/).filter(block => block.trim().startsWith('**Issue**:'));

  for (const issueBlock of issueBlocks) {
    try {
      // Extract issue description
      const issueMatch = issueBlock.match(/\*\*Issue\*\*:([^\*]+)/);
      if (!issueMatch) continue;
      const issueDescription = issueMatch[1].trim();

      // Extract file path
      const fileMatch = issueBlock.match(/\*\*File\*\*:([^\*]+)/);
      if (!fileMatch) continue;

      const filePath = fileMatch[1].trim();
      // Remove any markdown formatting from the file path
      let cleanFilePath = filePath.replace(/`/g, '').replace(/\*/g, '').trim();

      // Extract the actual file path from common patterns
      const filePathMatch = cleanFilePath.match(/(?:src|\/)\S+\.(ts|js|tsx|jsx|json)/);
      if (filePathMatch) {
        cleanFilePath = filePathMatch[0];
      } else {
        // If we can't extract a clear file path, try to find the most likely path
        const possiblePaths = cleanFilePath.split(/[\s,()]/).filter(part =>
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

      // Extract code blocks
      const codeBlockMatches = issueBlock.match(/```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)```/g) || [];
      const codeBlocks = codeBlockMatches.map(block => {
        // Extract the content inside the code block
        const content = block.replace(/```(?:typescript|javascript|ts|js)?\s*|```$/g, '');
        return content.trim();
      });

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
      console.error('Error parsing suggestion:', error);
      // Continue with the next issue block
    }
  }

  return suggestions;
}

/**
 * Apply a fix suggestion to a file
 * @param suggestion The fix suggestion to apply
 * @returns Boolean indicating if the fix was applied successfully
 */
async function applyFixToFile(suggestion: FixSuggestion): Promise<boolean> {
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
  const highPrioritySuggestions = await extractFixSuggestions(reviewContent, projectPath, FixPriority.HIGH);
  totalSuggestions += highPrioritySuggestions.length;

  if (highPrioritySuggestions.length > 0) {
    console.log(`Found ${highPrioritySuggestions.length} high priority issues.`);

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
      console.log('Skipping high priority fixes as auto-implementation is disabled.');
    }
  } else {
    console.log('No high priority issues found.');
  }

  // Process medium priority suggestions
  console.log('\nExtracting medium priority issues...');
  const mediumPrioritySuggestions = await extractFixSuggestions(reviewContent, projectPath, FixPriority.MEDIUM);
  totalSuggestions += mediumPrioritySuggestions.length;

  if (mediumPrioritySuggestions.length > 0) {
    console.log(`Found ${mediumPrioritySuggestions.length} medium priority issues.`);

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

        const shouldImplement = await promptForConfirmation('Implement this fix?');
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
  const lowPrioritySuggestions = await extractFixSuggestions(reviewContent, projectPath, FixPriority.LOW);
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

        const shouldImplement = await promptForConfirmation('Implement this fix?');
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
