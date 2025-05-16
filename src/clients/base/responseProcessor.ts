/**
 * @fileoverview Common response processing and error handling for AI API clients.
 * 
 * This module provides shared functionality for processing API responses,
 * extracting structured data, handling errors, and standardizing output formats
 * across different AI providers.
 */

import { ReviewResult, ReviewCost, ReviewType } from '../../types/review';
import { StructuredReview } from '../../types/structuredReview';
import { ApiError } from '../../utils/apiErrorHandler';
import logger from '../../utils/logger';
import { getCostInfoFromText } from '../utils/tokenCounter';

/**
 * Process API response content and extract structured data if possible
 * @param content The API response content
 * @returns Structured data object or null if not valid JSON
 */
export function extractStructuredData(content: string): unknown | null {
  // Declare these outside try block so they're accessible in catch block
  let jsonBlockMatch: RegExpMatchArray | null = null;
  let anyCodeBlockMatch: RegExpMatchArray | null = null;
  
  try {
    // Check if the response is wrapped in any code block with improved language marker handling
    // Handle various formats:
    // 1. ```json {...}```
    // 2. ```typescript {...}``` or other language markers
    // 3. ```{...}```
    // 4. Plain JSON without code blocks
    
    // First try to find code blocks with JSON content
    jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    
    // If no JSON block, look for any code block (could have typescript or other language marker)
    anyCodeBlockMatch = !jsonBlockMatch ? content.match(/```(?:[\w]*)?[\s\n]*([\s\S]*?)[\s\n]*```/) : null;
    
    let jsonContent = '';
    
    if (jsonBlockMatch) {
      // If we have a JSON code block, use its content
      jsonContent = jsonBlockMatch[1];
      logger.debug('Found JSON code block, extracting content');
    } else if (anyCodeBlockMatch) {
      // If we have any other code block, use its content but check if it starts with {
      const blockContent = anyCodeBlockMatch[1].trim();
      if (blockContent.startsWith('{') && blockContent.endsWith('}')) {
        jsonContent = blockContent;
        logger.debug('Found code block with JSON-like content, attempting to parse');
      } else {
        // If the code block doesn't look like JSON, use the raw content
        logger.debug('Code block found but doesn\'t appear to be JSON, falling back to raw content');
        jsonContent = content;
      }
    } else {
      // No code block, use the raw content
      jsonContent = content;
      logger.debug('No code blocks found, attempting to parse raw content');
    }

    // Parse the JSON content
    const structuredData = JSON.parse(jsonContent);

    // Validate basic structure
    if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
      logger.warn('Response is valid JSON but does not have the expected structure');
    }

    return structuredData;
  } catch (parseError) {
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    logger.warn(`Response is not valid JSON: ${errorMsg}`);
    
    // In debug mode, log additional details to help diagnose the issue
    if (process.env.AI_CODE_REVIEW_LOG_LEVEL?.toLowerCase() === 'debug') {
      const snippet = content.length > 200 ? 
        content.substring(0, 100) + '...' + content.substring(content.length - 100) : 
        content;
      logger.debug(`Content snippet causing JSON parse error: ${snippet}`);
      
      // Also log if we found code blocks but couldn't parse the content
      if (jsonBlockMatch || anyCodeBlockMatch) {
        logger.debug(`Found code blocks but content couldn't be parsed as JSON`);
      }
    }
    
    return null;
  }
}

/**
 * Create a standardized review result object
 * @param content The review content
 * @param prompt The original prompt (for cost calculation)
 * @param modelName The full model name
 * @param filePath The file path or identifier
 * @param reviewType The review type
 * @returns Standardized review result
 */
export function createStandardReviewResult(
  content: string,
  prompt: string,
  modelName: string,
  filePath: string,
  reviewType: ReviewType
): ReviewResult {
  // Extract structured data
  const structuredData = extractStructuredData(content);
  
  // Calculate cost information
  let cost: ReviewCost | undefined;
  try {
    cost = getCostInfoFromText(prompt, content, modelName);
  } catch (error) {
    logger.warn(
      `Failed to calculate cost information: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  
  // Return standardized review result
  return {
    content,
    cost,
    modelUsed: modelName,
    filePath,
    reviewType,
    timestamp: new Date().toISOString(),
    structuredData: structuredData as StructuredReview | undefined
  };
}

/**
 * Handle API errors with standardized logging and wrapping
 * @param error The original error
 * @param operation Description of the operation that failed
 * @param modelName The model being used
 * @returns Wrapped ApiError
 */
export function handleApiError(
  error: unknown,
  operation: string,
  modelName: string
): ApiError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const formattedError = `Failed to ${operation} with ${modelName}: ${errorMessage}`;
  
  logger.error(formattedError);
  
  if (error instanceof ApiError) {
    return error;
  }
  
  return new ApiError(formattedError);
}