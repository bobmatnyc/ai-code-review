/**
 * @fileoverview Utilities for parsing structured review output.
 *
 * This module provides functions for parsing and processing structured review output
 * in interactive mode. It handles JSON parsing, validation, and extraction of review
 * information from the AI's response.
 */

// import { z } from 'zod'; // Not currently used
import {
  ReviewSchema,
  ReviewIssue,
  IssuePriority,
  reviewSchema
} from '../types/reviewSchema';
import logger from './logger';

/**
 * Parse a JSON string into a ReviewSchema object
 * @param jsonString The JSON string to parse
 * @returns The parsed ReviewSchema object or null if parsing fails
 */
export function parseReviewJson(jsonString: string): ReviewSchema | null {
  try {
    // Step 1: First attempt to parse as direct JSON if the string is already properly formatted
    // This should be the fast path for models that correctly return structured JSON
    if (jsonString.trim().startsWith('{') && jsonString.trim().endsWith('}')) {
      try {
        // Try to parse directly first - this is the ideal case and should work with the
        // updated model instructions that request structured JSON
        const directJson = JSON.parse(jsonString);
        
        // Validate using Zod schema
        const directValidation = reviewSchema.safeParse(directJson);
        if (directValidation.success) {
          logger.debug('Successfully parsed direct JSON response');
          return directValidation.data;
        } else if (directJson.review) {
          // Basic validation passed
          logger.debug('Direct JSON has review property but failed schema validation, using fallback');
          return directJson as ReviewSchema;
        }
      } catch (e) {
        // If direct parsing fails, continue with the extraction approaches
        logger.debug('Direct parsing failed, attempting extraction patterns');
      }
    }
    
    // Step 2: If direct parsing fails, try various extraction patterns
    // Try to extract JSON from the response with improved language marker handling
    // Handle various formats:
    // 1. ```json {...}```
    // 2. ```typescript {...}``` or other language markers
    // 3. ```{...}```
    // 4. Plain JSON outside code blocks
    
    // First try to find code blocks with JSON content
    const jsonBlockMatch = jsonString.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    
    // If no JSON block, look for any code block (could have typescript or other language marker)
    const anyCodeBlockMatch = !jsonBlockMatch ? 
      jsonString.match(/```(?:[\w]*)?[\s\n]*({[\s\S]*?})[\s\n]*```/) : null;
      
    // Check for code blocks with language markers that aren't proper JSON
    const languageBlockRegex = /```(typescript|javascript|js|ts|jsx|tsx|java|python|ruby|go|rust|c|cpp|csharp|php)\s*([\s\S]*?)\s*```/;
    const languageBlockMatch = !jsonBlockMatch && !anyCodeBlockMatch ?
      jsonString.match(languageBlockRegex) : null;
    
    if (languageBlockMatch) {
      // Don't treat language-specific code blocks as JSON - log a warning
      const language = languageBlockMatch[1];
      logger.warn(`Found ${language} code block but not valid JSON. Skipping JSON parsing attempt for this block.`);
      // Return early with null to avoid trying to parse code as JSON
      return null;
    }

    // If no code block match at all, try other patterns for JSON outside code blocks
    // First look for review patterns - the most likely structure
    const reviewJsonPattern = /({[\s\S]*?"review"[\s\S]*?})/;
    const reviewJsonMatch = jsonString.match(reviewJsonPattern);
    
    // Then fall back to any JSON-like patterns
    const anyJsonPattern = /({[\s\S]*?})/;
    const anyJsonMatch = !reviewJsonMatch ? jsonString.match(anyJsonPattern) : null;

    // Determine which match to use
    let jsonContent = jsonString; // default to full string
    
    if (jsonBlockMatch) {
      logger.debug('Found JSON code block, extracting content');
      jsonContent = jsonBlockMatch[1];
    } else if (anyCodeBlockMatch) {
      logger.debug('Found code block with JSON-like content, attempting to parse');
      jsonContent = anyCodeBlockMatch[1];
    } else if (reviewJsonMatch) {
      logger.debug('Found review JSON content outside code blocks');
      jsonContent = reviewJsonMatch[1];
    } else if (anyJsonMatch) {
      logger.debug('Found generic JSON-like content');
      jsonContent = anyJsonMatch[1];
    } else {
      logger.debug('No JSON content patterns found, attempting to parse raw content');
    }

    // Clean up the content - remove comments that might be in the JSON
    // Remove both single-line and inline comments
    jsonContent = jsonContent
      .replace(/\/\/.*?(?=\n|$)/g, '') // Remove inline comments (// style)
      .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/,\s*}/g, '}') // Fix trailing commas that might appear after removing comments
      .replace(/,\s*]/g, ']'); // Fix trailing commas in arrays
      
    // Additional cleanup for specific JSON parsing issues
    jsonContent = jsonContent
      .replace(/([{,])\s*"(\w+)":\s*"([^"]*)",\s*\/\/.*?(?=\n|$)/g, '$1"$2":"$3",') // Clean inline comments after values
      .replace(/([{,])\s*"(\w+)":\s*(\d+),\s*\/\/.*?(?=\n|$)/g, '$1"$2":$3,'); // Clean inline comments after numeric values
    
    // Parse the JSON
    const parsedJson = JSON.parse(jsonContent);

    // Validate using Zod schema
    const validationResult = reviewSchema.safeParse(parsedJson);

    if (validationResult.success) {
      logger.debug('Successfully validated review JSON with Zod schema');
      return validationResult.data;
    } else {
      logger.warn(
        'Failed to validate review JSON schema:',
        validationResult.error.errors
      );

      // Fallback to basic validation if the schema doesn't match exactly
      // This helps with backward compatibility
      if (parsedJson.review) {
        logger.warn('Using fallback validation for review JSON');
        return parsedJson as ReviewSchema;
      }

      return null;
    }
  } catch (error) {
    logger.error('Error parsing review JSON:', error);
    return null;
  }
}

/**
 * Extract the review content from a string that might contain JSON
 * @param content The content to extract from
 * @returns The extracted review content
 */
export function extractReviewContent(content: string): string {
  // Try to find JSON in the content
  const parsedReview = parseReviewJson(content);

  if (parsedReview) {
    // If we successfully parsed the JSON, return it formatted
    return JSON.stringify(parsedReview, null, 2);
  }

  // Otherwise, return the original content
  return content;
}

/**
 * Format an issue for display in the console
 * @param issue The issue to format
 * @param filePath Path to the file containing the issue
 * @param fileIndex Index of the file
 * @param issueIndex Index of the issue
 * @returns Formatted issue string
 */
export function formatIssueForDisplay(
  issue: ReviewIssue,
  filePath: string,
  fileIndex: number,
  issueIndex: number
): string {
  const priorityColors: Record<IssuePriority, string> = {
    [IssuePriority.HIGH]: '\x1b[31m', // Red
    [IssuePriority.MEDIUM]: '\x1b[33m', // Yellow
    [IssuePriority.LOW]: '\x1b[32m' // Green
  };

  const priorityColor =
    priorityColors[issue.priority as IssuePriority] || '\x1b[37m'; // Default to white
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';

  let output = `\n${bold}Issue ${fileIndex + 1}.${issueIndex + 1}: ${priorityColor}[${issue.priority}]${reset}${bold} ${issue.id}${reset}\n`;
  output += `${bold}Description:${reset} ${issue.description}\n`;
  output += `${bold}File:${reset} ${filePath}\n`;
  output += `${bold}Location:${reset} Lines ${issue.location.startLine}-${issue.location.endLine}\n\n`;

  output += `${bold}Current Code:${reset}\n`;
  output += '```\n';
  output += issue.currentCode;
  output += '\n```\n\n';

  output += `${bold}Suggested Code:${reset}\n`;
  output += '```\n';
  output += issue.suggestedCode;
  output += '\n```\n\n';

  if (issue.explanation) {
    output += `${bold}Explanation:${reset}\n`;
    output += issue.explanation;
    output += '\n\n';
  }

  return output;
}

/**
 * Display a structured review in the console
 * @param parsedReview The parsed review object
 */
export function displayStructuredReview(parsedReview: ReviewSchema): void {
  const { review } = parsedReview;

  logger.info('\n=== Structured Code Review Results ===\n');

  // Display files one by one
  review.files.forEach((file, fileIndex) => {
    logger.info(`\n${'-'.repeat(80)}`);
    logger.info(`File ${fileIndex + 1}: ${file.filePath}`);
    logger.info(`${'-'.repeat(80)}`);

    if (file.issues.length === 0) {
      logger.info('No issues found in this file.');
      return;
    }

    // Display issues for this file
    file.issues.forEach((issue, issueIndex) => {
      const formattedIssue = formatIssueForDisplay(
        issue,
        file.filePath,
        fileIndex,
        issueIndex
      );
      logger.info(formattedIssue);
    });
  });

  // Display summary
  logger.info(`\n${'-'.repeat(80)}`);
  logger.info('Summary:');
  logger.info(`${'-'.repeat(80)}`);
  logger.info(`High Priority Issues: ${review.summary.highPriorityIssues}`);
  logger.info(`Medium Priority Issues: ${review.summary.mediumPriorityIssues}`);
  logger.info(`Low Priority Issues: ${review.summary.lowPriorityIssues}`);
  logger.info(`Total Issues: ${review.summary.totalIssues}`);
}
