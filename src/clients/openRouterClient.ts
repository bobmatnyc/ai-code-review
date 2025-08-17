/**
 * @fileoverview Client for interacting with the OpenRouter API.
 *
 * This module provides a client for interacting with OpenRouter's API, which gives
 * access to a variety of AI models from different providers. It handles API key
 * management, request formatting, response processing, rate limiting, error handling,
 * and cost estimation for code reviews.
 *
 * Key features:
 * - Support for various models through OpenRouter (Claude, GPT-4, etc.)
 * - Streaming and non-streaming responses
 * - Robust error handling and rate limit management
 * - Cost estimation for API usage
 * - Support for different review types
 */

import type { CostInfo, FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import { ApiError, TokenLimitError } from '../utils/apiErrorHandler';
import { getConfig } from '../utils/config';
import logger from '../utils/logger';
import type { ProjectDocs /* , addProjectDocsToPrompt */ } from '../utils/projectDocs'; // addProjectDocsToPrompt not used
import {
  isDebugMode,
  // generateDirectoryStructure, // Not used in this file
  validateOpenRouterApiKey,
} from './utils';
// import { getLanguageFromExtension } from './utils/languageDetection'; // Not used in this file
import {
  formatConsolidatedReviewPrompt,
  formatSingleFileReviewPrompt,
} from './utils/promptFormatter';
import { loadPromptTemplate } from './utils/promptLoader';
import { getCostInfoFromText } from './utils/tokenCounter';

// Track if we've initialized a model successfully
let modelInitialized = false;

/**
 * Determine appropriate max_tokens based on review type and context
 */
function getMaxTokensForReviewType(
  reviewType?: string,
  isConsolidation?: boolean,
): number | undefined {
  // For consolidation passes, we need unlimited tokens to avoid truncation
  if (isConsolidation) {
    return undefined; // No limit for consolidating multiple reviews
  }

  // For different review types, adjust token limits based on expected output size
  switch (reviewType) {
    case 'consolidated':
      return undefined; // No limit for consolidated reviews to avoid truncation
    case 'architectural':
      return 8000; // Architectural reviews can be detailed
    case 'security':
      return 8000; // Security reviews can be detailed
    case 'performance':
      return 8000; // Performance reviews can be detailed
    case 'quick-fixes':
      return 8000; // Quick fixes can be substantial for large codebases
    default:
      return 8000; // Default to higher limit for unknown types
  }
}

/**
 * Detect if response was truncated due to token limits
 */
function isResponseTruncated(content: string, finishReason?: string): boolean {
  if (finishReason === 'length' || finishReason === 'MAX_TOKENS') {
    return true;
  }

  // Check for common truncation patterns in JSON responses
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('```json')) {
    // Look for incomplete JSON structures
    if (!trimmed.endsWith('}') && !trimmed.endsWith('```')) {
      return true;
    }

    // Count braces to detect incomplete JSON
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      return true;
    }
  }

  return false;
}

// Helper function to check if this is the correct client for the selected model
function isOpenRouterModel(): {
  isCorrect: boolean;
  adapter: string;
  modelName: string;
} {
  // Get the model from configuration (CLI override or env)
  const selectedModel = getConfig().selectedModel || '';

  // Parse the model name
  const [adapter, modelName] = selectedModel.includes(':')
    ? selectedModel.split(':')
    : ['openrouter', selectedModel];

  return {
    isCorrect: adapter === 'openrouter',
    adapter,
    modelName,
  };
}

// This function was removed as it's no longer needed with the improved client selection logic

/**
 * Initialize the OpenRouter client
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
export async function initializeAnyOpenRouterModel(): Promise<boolean> {
  const { isCorrect, modelName } = isOpenRouterModel();

  // If this is not an OpenRouter model, just return true without initializing
  if (!isCorrect) {
    return true;
  }

  // If we've already initialized, return true
  if (modelInitialized) {
    return true;
  }

  // Use the imported dependencies

  // Get API key from environment variables
  const apiKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;

  // Validate the API key
  if (!validateOpenRouterApiKey(apiKey, isDebugMode())) {
    process.exit(1);
  }

  try {
    console.log(`Initializing OpenRouter model: ${modelName}...`);

    // Mark as initialized
    modelInitialized = true;
    console.log(`Successfully initialized OpenRouter model: ${modelName}`);
    return true;
  } catch (error) {
    console.error(`Error initializing OpenRouter model ${modelName}:`, error);
    return false;
  }
}

/**
 * Generate a code review using the OpenRouter API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenRouterReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions,
): Promise<ReviewResult> {
  try {
    // Initialize the model if we haven't already
    if (!modelInitialized) {
      await initializeAnyOpenRouterModel();
    }

    // Use the imported dependencies

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;

    let content: string;
    let cost: CostInfo | undefined;

    // Get the language from the file extension
    // const language = getLanguageFromExtension(filePath); // Currently unused

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

    // Format the prompt
    const prompt = formatSingleFileReviewPrompt(promptTemplate, fileContent, filePath, projectDocs);

    // For consolidation mode, use the writer model if specified, otherwise use the review model
    let modelName: string;
    if (options?.isConsolidation) {
      // During consolidation, the model is already set in the environment by consolidateReview.ts
      const consolidationModel = process.env.AI_CODE_REVIEW_MODEL || '';
      const [, model] = consolidationModel.includes(':')
        ? consolidationModel.split(':')
        : ['openrouter', consolidationModel];
      modelName = model;
      logger.debug(`[OpenRouter] Using consolidation model for single file: ${modelName}`);
    } else {
      // Regular review - use the configured model
      const result = isOpenRouterModel();
      modelName = result.modelName;
      logger.debug(`[OpenRouter] Using review model for single file: ${modelName}`);
    }

    try {
      console.log(`Generating review with OpenRouter ${modelName}...`);

      // Make the API request
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
          'X-Title': 'AI Code Review',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

IMPORTANT: Your response MUST be in the following JSON format:

{
  "summary": "A brief summary of the code review",
  "issues": [
    {
      "title": "Issue title",
      "priority": "high|medium|low",
      "type": "bug|security|performance|maintainability|readability|architecture|best-practice|documentation|testing|other",
      "filePath": "Path to the file",
      "lineNumbers": "Line number or range (e.g., 10 or 10-15)",
      "description": "Detailed description of the issue",
      "codeSnippet": "Relevant code snippet",
      "suggestedFix": "Suggested code fix",
      "impact": "Impact of the issue"
    }
  ],
  "recommendations": [
    "General recommendation 1",
    "General recommendation 2"
  ],
  "positiveAspects": [
    "Positive aspect 1",
    "Positive aspect 2"
  ]
}

Ensure your response is valid JSON. Do not include any text outside the JSON structure.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
          ...(getMaxTokensForReviewType(reviewType, options?.isConsolidation) && {
            max_tokens: getMaxTokensForReviewType(reviewType, options?.isConsolidation),
          }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check for token limit errors
        const errorMessage = JSON.stringify(errorData).toLowerCase();
        if (
          errorMessage.includes('token') &&
          (errorMessage.includes('limit') ||
            errorMessage.includes('exceed') ||
            errorMessage.includes('too long') ||
            errorMessage.includes('too many'))
        ) {
          // Extract token count from prompt if possible
          const { countTokens } = await import('../tokenizers');
          const tokenCount = countTokens(prompt, modelName);

          throw new TokenLimitError(
            `Token limit exceeded for model ${modelName}. Content has ${tokenCount.toLocaleString()} tokens. Consider using --multi-pass flag for large codebases.`,
            tokenCount,
            undefined,
            response.status,
            errorData,
          );
        }

        throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      // Enhanced logging for debugging empty content issue
      const finishReason = data.choices?.[0]?.finish_reason;
      const responseContent = data.choices?.[0]?.message?.content || '';
      const isTruncated = isResponseTruncated(responseContent, finishReason);

      logger.debug(`[OpenRouter] API Response structure:`, {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        firstChoiceExists: !!(data.choices && data.choices[0]),
        firstChoiceMessage: data.choices?.[0]?.message ? 'exists' : 'missing',
        contentExists: !!responseContent,
        contentLength: responseContent.length,
        contentPreview: responseContent.substring(0, 100) || 'N/A',
        finishReason: finishReason || 'unknown',
        isTruncated: isTruncated,
        maxTokensUsed:
          getMaxTokensForReviewType(reviewType, options?.isConsolidation) || 'unlimited',
        fullResponse: JSON.stringify(data).substring(0, 500) + '...',
      });

      if (data.choices && data.choices.length > 0) {
        content = data.choices[0].message.content;

        // Critical check for empty content
        if (!content || content.trim().length === 0) {
          logger.error(
            `[OpenRouter] CRITICAL: API returned successful response but content is empty!`,
          );
          logger.error(`[OpenRouter] Response details:`, {
            modelName,
            promptLength: prompt.length,
            responseStatus: response.status,
            responseHeaders: Object.fromEntries(response.headers.entries()),
            fullApiResponse: JSON.stringify(data, null, 2),
          });
          throw new Error(`OpenRouter API returned empty content for model ${modelName}`);
        }

        // Check for truncated responses
        if (isTruncated) {
          logger.warn(`[OpenRouter] WARNING: Response appears to be truncated!`);
          logger.warn(`[OpenRouter] Truncation details:`, {
            modelName,
            finishReason,
            contentLength: content.length,
            maxTokensRequested:
              getMaxTokensForReviewType(reviewType, options?.isConsolidation) || 'unlimited',
            reviewType,
            isConsolidation: options?.isConsolidation || false,
          });

          // For now, we'll continue with the truncated response but log it
          // In the future, we could implement retry logic with shorter prompts
        }

        console.log(`Successfully generated review with OpenRouter ${modelName}`);
      } else {
        logger.error(`[OpenRouter] Invalid response format:`, JSON.stringify(data, null, 2));
        throw new Error(`Invalid response format from OpenRouter ${modelName}`);
      }

      // Calculate cost information
      try {
        cost = getCostInfoFromText(prompt, content, `openrouter:${modelName}`);
      } catch (error) {
        logger.warn(
          `Failed to calculate cost information: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } catch (error) {
      // Re-throw TokenLimitError with additional context
      if (error instanceof TokenLimitError) {
        throw error;
      }

      throw new ApiError(
        `Failed to generate review with OpenRouter ${modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // Try to parse the response as JSON with robust error recovery
    let structuredData = null;
    try {
      // Try multiple strategies to extract JSON from the response
      const jsonExtractionStrategies = [
        // Strategy 1: Look for JSON in markdown code blocks
        () => {
          const patterns = [
            /```(?:json)?\s*([\s\S]*?)\s*```/,
            /```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)\s*```/,
          ];
          for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              const extracted = match[1].trim();
              if (extracted.startsWith('{') && extracted.endsWith('}')) {
                return extracted;
              }
            }
          }
          return null;
        },

        // Strategy 2: Find balanced JSON object
        () => {
          const startIdx = content.indexOf('{');
          if (startIdx === -1) return null;

          let depth = 0;
          let inString = false;
          let escapeNext = false;

          for (let i = startIdx; i < content.length; i++) {
            const char = content[i];

            if (escapeNext) {
              escapeNext = false;
              continue;
            }

            if (char === '\\') {
              escapeNext = true;
              continue;
            }

            if (char === '"' && !escapeNext) {
              inString = !inString;
              continue;
            }

            if (!inString) {
              if (char === '{') depth++;
              else if (char === '}') {
                depth--;
                if (depth === 0) {
                  return content.substring(startIdx, i + 1);
                }
              }
            }
          }

          // If we couldn't find balanced braces, try to fix unterminated strings
          if (inString) {
            // Add a closing quote and try to close the object
            return content.substring(startIdx) + '"}';
          }

          return null;
        },

        // Strategy 3: Use the content as-is
        () => content,
      ];

      let jsonContent = null;
      for (const strategy of jsonExtractionStrategies) {
        try {
          const extracted = strategy();
          if (extracted) {
            // Try to parse the extracted content
            structuredData = JSON.parse(extracted);

            // Validate that it has the expected structure
            if (structuredData && typeof structuredData === 'object') {
              jsonContent = extracted;
              logger.debug('Successfully extracted and parsed JSON');
              break;
            }
          }
        } catch (err) {
          // Continue to next strategy
          logger.debug(
            `JSON extraction strategy failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // If we successfully parsed JSON, validate its structure
      if (structuredData && !structuredData.summary && !Array.isArray(structuredData.issues)) {
        logger.warn('Response is valid JSON but does not have the expected structure');
        // Still keep the structured data as it might have partial information
      }
    } catch (parseError) {
      logger.warn(
        `Failed to parse response as JSON after all recovery attempts: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      // Keep the original response as content
      structuredData = null;
    }

    // Return the review result
    return {
      content,
      cost,
      modelUsed: `openrouter:${modelName}`,
      filePath,
      reviewType,
      timestamp: new Date().toISOString(),
      structuredData,
    };
  } catch (error) {
    logger.error(
      `Error generating review for ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

/**
 * Generate a consolidated review for multiple files
 * @param files Array of file information objects
 * @param projectName Name of the project
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenRouterConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions,
): Promise<ReviewResult> {
  try {
    // Initialize the model if we haven't already
    if (!modelInitialized) {
      await initializeAnyOpenRouterModel();
    }

    // Use the imported dependencies

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;

    let content: string;
    let cost: CostInfo | undefined;

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

    // Format the prompt
    const prompt = formatConsolidatedReviewPrompt(
      promptTemplate,
      projectName,
      files.map((file) => ({
        relativePath: file.relativePath || '',
        content: file.content,
        sizeInBytes: file.content.length,
      })),
      projectDocs,
    );

    // For consolidation mode, use the writer model if specified, otherwise use the review model
    let modelName: string;
    if (options?.isConsolidation) {
      // During consolidation, the model is already set in the environment by consolidateReview.ts
      const consolidationModel = process.env.AI_CODE_REVIEW_MODEL || '';
      const [, model] = consolidationModel.includes(':')
        ? consolidationModel.split(':')
        : ['openrouter', consolidationModel];
      modelName = model;
      logger.debug(`[OpenRouter] Using consolidation model: ${modelName}`);
    } else {
      // Regular review - use the configured model
      const result = isOpenRouterModel();
      modelName = result.modelName;
      logger.debug(`[OpenRouter] Using review model: ${modelName}`);
    }

    // Validate that we have a non-empty model name
    if (!modelName || modelName.trim() === '') {
      throw new Error(
        `Invalid or empty model name: '${modelName}'. Check your model configuration.`,
      );
    }

    try {
      console.log(`Generating consolidated review with OpenRouter ${modelName}...`);

      // Make the API request
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
          'X-Title': 'AI Code Review',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

IMPORTANT: Your response MUST be in the following JSON format:

{
  "summary": "A brief summary of the code review",
  "issues": [
    {
      "title": "Issue title",
      "priority": "high|medium|low",
      "type": "bug|security|performance|maintainability|readability|architecture|best-practice|documentation|testing|other",
      "filePath": "Path to the file",
      "lineNumbers": "Line number or range (e.g., 10 or 10-15)",
      "description": "Detailed description of the issue",
      "codeSnippet": "Relevant code snippet",
      "suggestedFix": "Suggested code fix",
      "impact": "Impact of the issue"
    }
  ],
  "recommendations": [
    "General recommendation 1",
    "General recommendation 2"
  ],
  "positiveAspects": [
    "Positive aspect 1",
    "Positive aspect 2"
  ]
}

Ensure your response is valid JSON. Do not include any text outside the JSON structure.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
          ...(getMaxTokensForReviewType(reviewType, options?.isConsolidation) && {
            max_tokens: getMaxTokensForReviewType(reviewType, options?.isConsolidation),
          }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check for token limit errors
        const errorMessage = JSON.stringify(errorData).toLowerCase();
        if (
          errorMessage.includes('token') &&
          (errorMessage.includes('limit') ||
            errorMessage.includes('exceed') ||
            errorMessage.includes('too long') ||
            errorMessage.includes('too many'))
        ) {
          // Extract token count from prompt if possible
          const { countTokens } = await import('../tokenizers');
          const tokenCount = countTokens(prompt, modelName);

          throw new TokenLimitError(
            `Token limit exceeded for model ${modelName}. Content has ${tokenCount.toLocaleString()} tokens. Consider using --multi-pass flag for large codebases.`,
            tokenCount,
            undefined,
            response.status,
            errorData,
          );
        }

        throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      // Enhanced logging for debugging empty content issue
      const finishReason = data.choices?.[0]?.finish_reason;
      const responseContent = data.choices?.[0]?.message?.content || '';
      const isTruncated = isResponseTruncated(responseContent, finishReason);

      logger.debug(`[OpenRouter] API Response structure:`, {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        firstChoiceExists: !!(data.choices && data.choices[0]),
        firstChoiceMessage: data.choices?.[0]?.message ? 'exists' : 'missing',
        contentExists: !!responseContent,
        contentLength: responseContent.length,
        contentPreview: responseContent.substring(0, 100) || 'N/A',
        finishReason: finishReason || 'unknown',
        isTruncated: isTruncated,
        maxTokensUsed:
          getMaxTokensForReviewType(reviewType, options?.isConsolidation) || 'unlimited',
        fullResponse: JSON.stringify(data).substring(0, 500) + '...',
      });

      if (data.choices && data.choices.length > 0) {
        content = data.choices[0].message.content;

        // Critical check for empty content
        if (!content || content.trim().length === 0) {
          logger.error(
            `[OpenRouter] CRITICAL: API returned successful response but content is empty!`,
          );
          logger.error(`[OpenRouter] Response details:`, {
            modelName,
            promptLength: prompt.length,
            responseStatus: response.status,
            responseHeaders: Object.fromEntries(response.headers.entries()),
            fullApiResponse: JSON.stringify(data, null, 2),
          });
          throw new Error(`OpenRouter API returned empty content for model ${modelName}`);
        }

        // Check for truncated responses
        if (isTruncated) {
          logger.warn(`[OpenRouter] WARNING: Response appears to be truncated!`);
          logger.warn(`[OpenRouter] Truncation details:`, {
            modelName,
            finishReason,
            contentLength: content.length,
            maxTokensRequested:
              getMaxTokensForReviewType(reviewType, options?.isConsolidation) || 'unlimited',
            reviewType,
            isConsolidation: options?.isConsolidation || false,
          });

          // For now, we'll continue with the truncated response but log it
          // In the future, we could implement retry logic with shorter prompts
        }

        console.log(`Successfully generated review with OpenRouter ${modelName}`);
      } else {
        logger.error(`[OpenRouter] Invalid response format:`, JSON.stringify(data, null, 2));
        throw new Error(`Invalid response format from OpenRouter ${modelName}`);
      }

      // Calculate cost information
      try {
        cost = getCostInfoFromText(prompt, content, `openrouter:${modelName}`);
      } catch (error) {
        logger.warn(
          `Failed to calculate cost information: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } catch (error) {
      throw new ApiError(
        `Failed to generate consolidated review with OpenRouter ${modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // Try to parse the response as JSON with robust error recovery
    let structuredData = null;
    try {
      // Try multiple strategies to extract JSON from the response
      const jsonExtractionStrategies = [
        // Strategy 1: Look for JSON in markdown code blocks
        () => {
          const patterns = [
            /```(?:json)?\s*([\s\S]*?)\s*```/,
            /```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)\s*```/,
          ];
          for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              const extracted = match[1].trim();
              if (extracted.startsWith('{') && extracted.endsWith('}')) {
                return extracted;
              }
            }
          }
          return null;
        },

        // Strategy 2: Find balanced JSON object
        () => {
          const startIdx = content.indexOf('{');
          if (startIdx === -1) return null;

          let depth = 0;
          let inString = false;
          let escapeNext = false;

          for (let i = startIdx; i < content.length; i++) {
            const char = content[i];

            if (escapeNext) {
              escapeNext = false;
              continue;
            }

            if (char === '\\') {
              escapeNext = true;
              continue;
            }

            if (char === '"' && !escapeNext) {
              inString = !inString;
              continue;
            }

            if (!inString) {
              if (char === '{') depth++;
              else if (char === '}') {
                depth--;
                if (depth === 0) {
                  return content.substring(startIdx, i + 1);
                }
              }
            }
          }

          // If we couldn't find balanced braces, try to fix unterminated strings
          if (inString) {
            // Add a closing quote and try to close the object
            return content.substring(startIdx) + '"}';
          }

          return null;
        },

        // Strategy 3: Use the content as-is
        () => content,
      ];

      let jsonContent = null;
      for (const strategy of jsonExtractionStrategies) {
        try {
          const extracted = strategy();
          if (extracted) {
            // Try to parse the extracted content
            structuredData = JSON.parse(extracted);

            // Validate that it has the expected structure
            if (structuredData && typeof structuredData === 'object') {
              jsonContent = extracted;
              logger.debug('Successfully extracted and parsed JSON');
              break;
            }
          }
        } catch (err) {
          // Continue to next strategy
          logger.debug(
            `JSON extraction strategy failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // If we successfully parsed JSON, validate its structure
      if (structuredData && !structuredData.summary && !Array.isArray(structuredData.issues)) {
        logger.warn('Response is valid JSON but does not have the expected structure');
        // Still keep the structured data as it might have partial information
      }
    } catch (parseError) {
      logger.warn(
        `Failed to parse response as JSON after all recovery attempts: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      // Keep the original response as content
      structuredData = null;
    }

    // Return the review result
    return {
      content,
      cost,
      modelUsed: `openrouter:${modelName}`,
      filePath: 'consolidated',
      reviewType,
      timestamp: new Date().toISOString(),
      structuredData,
    };
  } catch (error) {
    logger.error(
      `Error generating consolidated review: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}
