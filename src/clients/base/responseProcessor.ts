/**
 * @fileoverview Common response processing and error handling for AI API clients.
 * 
 * This module provides shared functionality for processing API responses,
 * extracting structured data, handling errors, and standardizing output formats
 * across different AI providers.
 */

import { ReviewResult, CostInfo, ReviewType } from '../../types/review';
import { StructuredReview } from '../../types/structuredReview';
import { AIJsonResponse } from '../../types/apiResponses';
import { ApiError } from '../../utils/apiErrorHandler';
import logger from '../../utils/logger';
import { getCostInfoFromText } from '../utils/tokenCounter';
import configManager from '../../utils/configManager';

/**
 * Attempt to recover JSON from malformed responses using various strategies
 * @param content The malformed response content
 * @returns Parsed StructuredReview object or null if recovery fails
 */
function attemptJsonRecovery(content: string): StructuredReview | null {
  const strategies = [
    // Strategy 1: Remove leading language identifiers (e.g., "typescript\n{...}")
    (text: string) => {
      const match = text.match(/^(?:typescript|javascript|json|ts|js)\s*\n?\s*({[\s\S]*})$/i);
      return match ? match[1] : null;
    },

    // Strategy 2: Extract JSON from mixed content (find first complete JSON object)
    (text: string) => {
      const match = text.match(/({[\s\S]*?})\s*$/);
      return match ? match[1] : null;
    },

    // Strategy 3: Look for JSON between quotes (e.g., "typescript\n{...}")
    (text: string) => {
      const match = text.match(/"[^"]*"\s*\n?\s*({[\s\S]*})/);
      return match ? match[1] : null;
    },

    // Strategy 4: Remove everything before the first opening brace
    (text: string) => {
      const braceIndex = text.indexOf('{');
      if (braceIndex === -1) return null;
      return text.substring(braceIndex);
    },

    // Strategy 5: Try to extract from code blocks with language prefixes
    (text: string) => {
      const match = text.match(/```(?:json|typescript|javascript)?\s*([^`]+)\s*```/i);
      if (!match) return null;
      const blockContent = match[1].trim();
      // Remove language identifier if it's at the start
      const cleanContent = blockContent.replace(/^(?:typescript|javascript|json|ts|js)\s*\n?/i, '');
      return cleanContent.startsWith('{') ? cleanContent : null;
    }
  ];

  for (const strategy of strategies) {
    try {
      const extracted = strategy(content.trim());
      if (extracted) {
        const parsed = JSON.parse(extracted) as StructuredReview;
        // Basic validation
        if (typeof parsed === 'object' && parsed !== null) {
          logger.debug('Successfully recovered JSON using recovery strategy');
          return parsed;
        }
      }
    } catch (error) {
      // Continue to next strategy
      continue;
    }
  }

  return null;
}

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
    jsonBlockMatch = content.match(/```(?:json)\s*([\s\S]*?)\s*```/) || null;
    
    // If no explicit JSON block, look for any code block (with any language marker or none)
    // that contains what looks like JSON content (starting with { and ending with })
    if (!jsonBlockMatch) {
      anyCodeBlockMatch = content.match(/```(?:[\w]*)?[\s\n]*([\s\S]*?)[\s\n]*```/) || null;
      
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

    // Try additional recovery strategies for common malformed response patterns
    try {
      const recoveredJson = attemptJsonRecovery(content);
      if (recoveredJson) {
        logger.info('Successfully recovered JSON from malformed response');
        return recoveredJson;
      }
    } catch (recoveryError) {
      logger.debug('JSON recovery attempt failed:', recoveryError);
    }

    // Check for common patterns that might be causing issues
    if (content.includes('```typescript') || content.includes('```ts')) {
      logger.info('Content contains TypeScript code blocks that may be causing parsing issues');
    }

    if (content.includes('```json')) {
      logger.info('Content contains JSON code blocks that could not be parsed properly');
    }

    // Check for language identifier patterns that might indicate Gemini response issues
    if (content.match(/^(?:typescript|javascript|json|ts|js)\s*\n/i)) {
      logger.info('Content starts with language identifier, which may indicate a Gemini response formatting issue');
    }

    // Check for quoted language identifiers
    if (content.match(/"(?:typescript|javascript|json|ts|js)"/i)) {
      logger.info('Content contains quoted language identifiers, which may indicate a parsing issue');
    }
    
    // In debug mode, log additional details to help diagnose the issue
    if (configManager.getApplicationConfig().logLevel.value === 'debug') {
      const snippet = content.length > 200 ? 
        content.substring(0, 100) + '...' + content.substring(content.length - 100) : 
        content;
      logger.debug(`Content snippet causing JSON parse error: ${snippet}`);
      
      // Also log if we found code blocks but couldn't parse the content
      if (jsonBlockMatch) {
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          logger.debug(`Found JSON code block but content couldn't be parsed as JSON: ${jsonBlockMatch[1].substring(0, 100)}`);
        }
      } else if (anyCodeBlockMatch) {
        if (anyCodeBlockMatch && anyCodeBlockMatch[1]) {
          logger.debug(`Found non-JSON code block but content couldn't be parsed as JSON: ${anyCodeBlockMatch[1].substring(0, 100)}`);
        }
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
 * @param options Optional review options to determine expected output format
 * @returns Standardized review result
 */
export function createStandardReviewResult(
  content: string,
  prompt: string,
  modelName: string,
  filePath: string,
  reviewType: ReviewType,
  options?: { interactive?: boolean; output?: string }
): ReviewResult {
  // Only attempt to extract structured data if we expect JSON output
  const expectsJsonOutput = options?.interactive === true || options?.output === 'json';

  // Extract structured data only when appropriate
  const structuredData = expectsJsonOutput ? extractStructuredData(content) : undefined;
  
  // Calculate cost information
  let cost: CostInfo | undefined;
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
 * @param context Additional context for debugging
 * @returns Wrapped ApiError
 */
export function handleApiError(
  error: unknown,
  operation: string,
  modelName: string,
  context?: {
    endpoint?: string;
    statusCode?: number;
    requestId?: string;
    filePath?: string;
    additionalInfo?: Record<string, any>;
  }
): ApiError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Build detailed error message with context
  let formattedError = `Failed to ${operation} with ${modelName}`;
  
  if (context) {
    const contextParts: string[] = [];
    
    if (context.endpoint) {
      contextParts.push(`Endpoint: ${context.endpoint}`);
    }
    
    if (context.statusCode) {
      contextParts.push(`Status: ${context.statusCode}`);
    }
    
    if (context.requestId) {
      contextParts.push(`Request ID: ${context.requestId}`);
    }
    
    if (context.filePath) {
      contextParts.push(`File: ${context.filePath}`);
    }
    
    if (context.additionalInfo) {
      Object.entries(context.additionalInfo).forEach(([key, value]) => {
        contextParts.push(`${key}: ${value}`);
      });
    }
    
    if (contextParts.length > 0) {
      formattedError += `\n  Context: ${contextParts.join(', ')}`;
    }
  }
  
  formattedError += `\n  Error: ${errorMessage}`;
  
  logger.error(formattedError);
  
  // Log stack trace in debug mode
  if (error instanceof Error && error.stack && configManager.getApplicationConfig().logLevel.value === 'debug') {
    logger.debug(`Stack trace: ${error.stack}`);
  }
  
  if (error instanceof ApiError) {
    return error;
  }
  
  return new ApiError(formattedError);
}