/**
 * @fileoverview Client for interacting with the Anthropic API.
 *
 * This module provides a client for interacting with Anthropic's Claude models.
 * It handles API key management, request formatting, response processing,
 * rate limiting, error handling, and cost estimation for code reviews.
 *
 * Key features:
 * - Support for various Claude models (Claude 3 Opus, Sonnet, Haiku)
 * - Streaming and non-streaming responses
 * - Robust error handling and rate limit management
 * - Mock response generation for testing without an API key
 * - Cost estimation for API usage
 * - Support for different review types
 */

import fetch from 'node-fetch';
import {
  ReviewType,
  ReviewResult,
  FileInfo,
  ReviewCost,
  ReviewOptions
} from '../types/review';
import { getCostInfoFromText } from './utils/tokenCounter';
import { ProjectDocs } from '../utils/projectDocs';
import { loadPromptTemplate } from './utils/promptLoader';
import { ApiError, logApiError, handleFetchResponse, safeJsonParse } from '../utils/apiErrorHandler';
import logger from '../utils/logger';

// Import client utilities
import {
  validateAnthropicApiKey,
  isDebugMode,
  formatSingleFileReviewPrompt,
  formatConsolidatedReviewPrompt
} from './utils';

// Get the model from environment variables
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || '';

// Parse the model name
const [adapter, modelName] = selectedModel.includes(':')
  ? selectedModel.split(':')
  : ['anthropic', selectedModel];

// Skip initialization if this is not the selected adapter
if (adapter !== 'anthropic') {
  // We'll handle this in the reviewCode.ts file
  // This allows multiple clients to coexist without errors
}

// Get API key from environment variables
const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

// Track if we've initialized a model successfully
let modelInitialized = false;

/**
 * Initialize the Anthropic client with the specified model
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
async function initializeAnthropicModel(): Promise<boolean> {
  if (!apiKey) {
    console.error('No Anthropic API key found.');
    console.error('Please add the following to your .env.local file:');
    console.error(
      '- AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here'
    );
    process.exit(1);
  }

  try {
    console.log(`Initializing Anthropic model: ${modelName}...`);

    // Make a simple test request to verify the model works
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: 'Hello, are you available for a code review task?'
          }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        `Error initializing Anthropic model ${modelName}:`,
        errorData
      );
      return false;
    }

    const data = (await response.json()) as any;
    if (data.content && data.content.length > 0) {
      console.log(`Successfully initialized Anthropic model: ${modelName}`);
      modelInitialized = true;
      return true;
    }

    console.error(
      `Unexpected response format from Anthropic model ${modelName}`
    );
    return false;
  } catch (error) {
    console.error(`Error initializing Anthropic model ${modelName}:`, error);
    return false;
  }
}

/**
 * Try to initialize the Anthropic model
 * @returns Promise resolving to a boolean indicating if the model was initialized
 */
export async function initializeAnthropicClient(): Promise<boolean> {
  // If we've already initialized a model, return true
  if (modelInitialized) {
    return true;
  }

  // Validate the API key
  if (!validateAnthropicApiKey(apiKey, isDebugMode())) {
    process.exit(1);
  }

  // Try to initialize the model
  const success = await initializeAnthropicModel();
  if (success) {
    return true;
  }

  console.error(`Failed to initialize Anthropic model: ${modelName}`);
  process.exit(1);
}

/**
 * Generate a code review using the Anthropic API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateAnthropicReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize the model if we haven't already
    if (!modelInitialized) {
      await initializeAnthropicClient();
    }

    let content: string;
    let cost: ReviewCost | undefined;
    // No mock responses are used

    {
      // Load the appropriate prompt template
      const promptTemplate = await loadPromptTemplate(reviewType, options);

      // Prepare the system prompt
      const systemPrompt = `You are an expert code reviewer.`;

      // Format the user prompt using the utility function
      const userPrompt = formatSingleFileReviewPrompt(
        promptTemplate,
        fileContent,
        filePath,
        projectDocs
      );

      try {
        console.log(`Generating review with Anthropic ${modelName}...`);

        try {
          // Make the API request
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey || '',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: modelName,
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
              temperature: 0.2,
              max_tokens: 4000
            })
          });

          // Handle response errors
          await handleFetchResponse(response, 'Anthropic');

          // Parse the response safely
          interface AnthropicResponse {
            content: Array<{text: string}>;
          }

          const data = await safeJsonParse<AnthropicResponse>(response, 'Anthropic');

          if (data.content && data.content.length > 0) {
            content = data.content[0].text;
            logger.info(`Successfully generated review with Anthropic ${modelName}`);
          } else {
            throw new ApiError(`Invalid response format from Anthropic ${modelName}`);
          }
        } catch (apiError) {
          logApiError(apiError, {
            operation: 'generateReview',
            apiName: 'Anthropic',
          });
          throw apiError;
        }

        // Calculate cost information
        cost = getCostInfoFromText(userPrompt, content, modelName);
      } catch (error) {
        logger.error(
          `Error generating review with Anthropic ${modelName}: ${error instanceof Error ? error.message : String(error)}`
        );

        if (error instanceof ApiError) {
          throw error; // Already has context
        } else {
          throw new ApiError(`Failed to generate review with Anthropic ${modelName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return {
      filePath: filePath,
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      modelUsed: `anthropic:${modelName}`
    };
  } catch (error) {
    logger.error(`Error generating review for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof ApiError) {
      throw error; // Already has context
    } else {
      throw new ApiError(`Failed to generate review for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Generate a consolidated review for multiple files
 * @param files Array of file information objects
 * @param projectName Name of the project being reviewed
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateAnthropicConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize the model if we haven't already
    if (!modelInitialized) {
      await initializeAnthropicClient();
    }

    let content: string;
    let cost: ReviewCost | undefined;
    // No mock responses are used

    {
      // Load the appropriate prompt template
      const promptTemplate = await loadPromptTemplate(reviewType, options);

      // Prepare the system prompt
      const systemPrompt = `You are an expert code reviewer.`;

      // Prepare file summaries for the consolidated review
      const fileInfos = files.map(file => ({
        relativePath: file.relativePath,
        content: file.content.substring(0, 1000) + (file.content.length > 1000 ? '\n... (truncated)' : ''),
        sizeInBytes: file.content.length
      }));

      // Format the user prompt using the utility function
      const userPrompt = formatConsolidatedReviewPrompt(
        promptTemplate,
        projectName,
        fileInfos,
        projectDocs
      );

      try {
        console.log(
          `Generating consolidated review with Anthropic ${modelName}...`
        );

        // Make the API request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey || '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: modelName,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            temperature: 0.2,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Anthropic API error: ${JSON.stringify(errorData)}`);
        }

        const data = (await response.json()) as any;
        if (data.content && data.content.length > 0) {
          content = data.content[0].text;
          console.log(
            `Successfully generated review with Anthropic ${modelName}`
          );
        } else {
          throw new Error(
            `Invalid response format from Anthropic ${modelName}`
          );
        }

        // Calculate cost information
        cost = getCostInfoFromText(userPrompt, content, modelName);
      } catch (error) {
        console.error(
          `Error generating review with Anthropic ${modelName}:`,
          error
        );
        throw error;
      }
    }

    return {
      filePath: `${reviewType}`,
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      modelUsed: `anthropic:${modelName}`
    };
  } catch (error) {
    console.error('Error generating consolidated review:', error);
    throw error;
  }
}
