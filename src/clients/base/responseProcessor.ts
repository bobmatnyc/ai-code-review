/**
 * @fileoverview Common response processing and error handling for AI API clients.
 * 
 * This module provides shared functionality for processing API responses,
 * extracting structured data, handling errors, and standardizing output formats
 * across different AI providers.
 */

import { ReviewResult, ReviewCost, ReviewType } from '../../types/review';
import { ApiError } from '../../utils/apiErrorHandler';
import logger from '../../utils/logger';
import { getCostInfoFromText } from '../utils/tokenCounter';

/**
 * Process API response content and extract structured data if possible
 * @param content The API response content
 * @returns Structured data object or null if not valid JSON
 */
export function extractStructuredData(content: string): any | null {
  try {
    // Check if the response is wrapped in a code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonContent = jsonMatch ? jsonMatch[1] : content;

    // Parse the JSON content
    const structuredData = JSON.parse(jsonContent);

    // Validate basic structure
    if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
      logger.warn('Response is valid JSON but does not have the expected structure');
    }

    return structuredData;
  } catch (parseError) {
    logger.warn(
      `Response is not valid JSON: ${
        parseError instanceof Error ? parseError.message : String(parseError)
      }`
    );
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
    structuredData
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