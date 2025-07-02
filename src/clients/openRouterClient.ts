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
import { ApiError } from '../utils/apiErrorHandler';
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
    // Retrieve the configured OpenRouter model name
    const { modelName } = isOpenRouterModel();

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
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        content = data.choices[0].message.content;
        console.log(`Successfully generated review with OpenRouter ${modelName}`);
      } else {
        throw new Error(`Invalid response format from OpenRouter ${modelName}`);
      }

      // Calculate cost information
      try {
        cost = getCostInfoFromText(prompt + content, `openrouter:${modelName}`);
      } catch (error) {
        logger.warn(
          `Failed to calculate cost information: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } catch (error) {
      throw new ApiError(
        `Failed to generate review with OpenRouter ${modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // Try to parse the response as JSON
    let structuredData = null;
    try {
      // First, check if the response is wrapped in a code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;

      // Check if the content is valid JSON
      structuredData = JSON.parse(jsonContent);

      // Validate that it has the expected structure
      if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
        logger.warn('Response is valid JSON but does not have the expected structure');
      }
    } catch (parseError) {
      logger.warn(
        `Response is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      // Keep the original response as content
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
    // Retrieve the configured OpenRouter model name
    const { modelName } = isOpenRouterModel();

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
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        content = data.choices[0].message.content;
        console.log(`Successfully generated review with OpenRouter ${modelName}`);
      } else {
        throw new Error(`Invalid response format from OpenRouter ${modelName}`);
      }

      // Calculate cost information
      try {
        cost = getCostInfoFromText(prompt + content, `openrouter:${modelName}`);
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

    // Try to parse the response as JSON
    let structuredData = null;
    try {
      // First, check if the response is wrapped in a code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;

      // Check if the content is valid JSON
      structuredData = JSON.parse(jsonContent);

      // Validate that it has the expected structure
      if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
        logger.warn('Response is valid JSON but does not have the expected structure');
      }
    } catch (parseError) {
      logger.warn(
        `Response is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      // Keep the original response as content
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
