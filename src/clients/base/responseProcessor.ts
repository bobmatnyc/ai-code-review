/**
 * @fileoverview Common response processing and error handling for AI API clients.
 * 
 * This module provides shared functionality for processing API responses,
 * extracting structured data, handling errors, and standardizing output formats
 * across different AI providers.
 */

import { ReviewResult, ReviewCost, ReviewType } from '../../types/review';
import { StructuredReview } from '../../types/structuredReview';
import { AIJsonResponse } from '../../types/apiResponses';
import { ApiError } from '../../utils/apiErrorHandler';
import logger from '../../utils/logger';
import { getCostInfoFromText } from '../utils/tokenCounter';

/**
 * Process API response content and extract structured data if possible
 * @param content The API response content
 * @returns Structured data object or null if not valid JSON
 */
export function extractStructuredData(content: string): StructuredReview | undefined {
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
    
    // Enhanced regex to handle various language markers, especially typescript
    jsonBlockMatch = content.match(/```(?:json)\s*([\s\S]*?)\s*```/);
    
    // If no explicit JSON block, look for any code block (with any language marker or none)
    // that contains what looks like JSON content (starting with { and ending with })
    if (!jsonBlockMatch) {
      anyCodeBlockMatch = content.match(/```(?:[\w]*)?[\s\n]*([\s\S]*?)[\s\n]*```/);
      
      // Additional check for typescript blocks specifically
      if (anyCodeBlockMatch && content.includes('```typescript')) {
        logger.debug('Detected typescript code block, will check if it contains valid JSON');
      }
    }
    
    let jsonContent = '';
    
    if (jsonBlockMatch) {
      // If we have a JSON code block, use its content
      jsonContent = jsonBlockMatch[1] || '';
      logger.debug('Found JSON code block, extracting content');
    } else if (anyCodeBlockMatch) {
      // If we have any other code block, use its content but check if it starts with {
      const blockContent = (anyCodeBlockMatch[1] || '').trim();
      
      // Special handling for TypeScript blocks that might contain JSON objects
      if (content.includes('```typescript') || content.includes('```ts')) {
        logger.debug('Analyzing TypeScript code block for JSON content');
        
        // Check if the TypeScript block contains a JSON object literal
        if (blockContent.includes('{') && blockContent.includes('}')) {
          // Look for a properly formatted object within the TypeScript code
          const objectMatch = blockContent.match(/(\{[\s\S]*\})/);
          if (objectMatch && objectMatch[1]) {
            const potentialJson = objectMatch[1].trim();
            try {
              // Try to verify it's parsable JSON
              JSON.parse(potentialJson);
              jsonContent = potentialJson;
              logger.debug('Successfully extracted JSON object from TypeScript code block');
            } catch (parseError) {
              // Not valid JSON, continue with regular processing
              logger.debug('TypeScript block contains object syntax but not valid JSON');
              if (blockContent.startsWith('{') && blockContent.endsWith('}')) {
                jsonContent = blockContent;
                logger.debug('Using TypeScript block content for potential parsing');
              } else {
                logger.debug('TypeScript code block is not JSON-compatible, falling back to raw content');
                jsonContent = content;
              }
            }
          } else {
            logger.debug('No valid object literal found in TypeScript code block');
            jsonContent = content;
          }
        } else {
          logger.debug('TypeScript code block doesn\'t contain object literals, falling back to raw content');
          jsonContent = content;
        }
      } else if (blockContent.startsWith('{') && blockContent.endsWith('}')) {
        // For non-TypeScript blocks, check if the content looks like JSON
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
    const parsedData = JSON.parse(jsonContent) as AIJsonResponse | StructuredReview;

    // Attempt to determine which format we have (AIJsonResponse or direct StructuredReview)
    if ('review' in parsedData) {
      // We have an AIJsonResponse, convert it to StructuredReview
      const aiResponse = parsedData as AIJsonResponse;
      
      if (!aiResponse.review) {
        logger.warn('Response is valid JSON but missing "review" property');
        return undefined;
      }
      
      // Convert the AIJsonResponse format to StructuredReview format
      const review: StructuredReview = {
        summary: aiResponse.review.summary ? 
          typeof aiResponse.review.summary === 'string' ? 
            aiResponse.review.summary : 
            JSON.stringify(aiResponse.review.summary) : 
          'No summary provided',
        issues: []
      };
      
      // Process issues if available
      if (aiResponse.review.files && Array.isArray(aiResponse.review.files)) {
        // Collect issues from all files
        aiResponse.review.files.forEach(file => {
          if (file.issues && Array.isArray(file.issues)) {
            file.issues.forEach(issue => {
              if (issue.id && issue.description) {
                review.issues.push({
                  title: issue.id,
                  description: issue.description,
                  priority: mapPriority(issue.priority),
                  type: 'other',
                  filePath: file.filePath || '',
                  lineNumbers: issue.location && (issue.location.startLine || issue.location.endLine) ? 
                    `${issue.location.startLine || ''}-${issue.location.endLine || ''}` : 
                    undefined,
                  codeSnippet: issue.currentCode,
                  suggestedFix: issue.suggestedCode,
                  impact: issue.explanation
                });
              }
            });
          }
        });
      }
      
      // Add recommendations and positive aspects if available
      if (aiResponse.review.recommendations) {
        review.recommendations = aiResponse.review.recommendations;
      }
      
      if (aiResponse.review.positiveAspects) {
        review.positiveAspects = aiResponse.review.positiveAspects;
      }
      
      return review;
    } else {
      // We assume it's already a StructuredReview format
      const structuredData = parsedData as StructuredReview;
      
      // Validate basic structure
      if (typeof structuredData.summary === 'undefined' || !Array.isArray(structuredData.issues)) {
        logger.warn('Response is valid JSON but does not have the expected StructuredReview structure');
        return undefined;
      }
      
      return structuredData;
    }
  } catch (parseError) {
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    logger.warn(`Response is not valid JSON: ${errorMsg}`);
    
    // Always provide basic info regardless of log level
    const contentPreview = content.substring(0, 50).replace(/\n/g, ' ');
    logger.info(`JSON parse error with content starting with: "${contentPreview}..."`);
    
    // Check for common patterns that might be causing issues
    if (content.includes('```typescript') || content.includes('```ts')) {
      logger.info('Content contains TypeScript code blocks that may be causing parsing issues');
    }
    
    if (content.includes('```json')) {
      logger.info('Content contains JSON code blocks that could not be parsed properly');
    }
    
    // In debug mode, log additional details to help diagnose the issue
    if (process.env.AI_CODE_REVIEW_LOG_LEVEL?.toLowerCase() === 'debug') {
      const snippet = content.length > 200 ? 
        content.substring(0, 100) + '...' + content.substring(content.length - 100) : 
        content;
      logger.debug(`Content snippet causing JSON parse error: ${snippet}`);
      
      // Also log if we found code blocks but couldn't parse the content
      if (jsonBlockMatch) {
        logger.debug(`Found JSON code block but content couldn't be parsed as JSON: ${jsonBlockMatch[1]?.substring(0, 100)}`);
      } else if (anyCodeBlockMatch) {
        logger.debug(`Found non-JSON code block but content couldn't be parsed as JSON: ${anyCodeBlockMatch[1]?.substring(0, 100)}`);
      }
    }
    
    // Try to create a basic structured response as a fallback
    try {
      // If we can't parse JSON but have a content string, create a simple summary
      return {
        summary: "AI generated a response that couldn't be parsed as structured data",
        issues: [{
          title: "Response format issue",
          description: "The response couldn't be parsed into structured format. Please see the full text for details.",
          priority: "medium",
          type: "other",
          filePath: "unknown" // Required field in ReviewIssue
        }]
      };
    } catch (fallbackError) {
      logger.debug('Failed to create fallback structured response');
      return undefined;
    }
  }
}

/**
 * Map priority string to IssuePriority type
 * @param priority String priority value (may be undefined or in different case)
 * @returns Normalized IssuePriority value
 */
function mapPriority(priority: string | undefined): 'high' | 'medium' | 'low' {
  if (!priority) return 'medium';
  
  const normalizedPriority = priority.toLowerCase();
  
  if (normalizedPriority.includes('high')) return 'high';
  if (normalizedPriority.includes('low')) return 'low';
  
  return 'medium';
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