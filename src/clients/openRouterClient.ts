/**
 * @fileoverview Client for interacting with the OpenRouter API.
 *
 * This module provides a client for interacting with OpenRouter's AI models.
 * It handles API key management, request formatting, response processing,
 * rate limiting, error handling, and cost estimation for code reviews.
 *
 * Key features:
 * - Support for various OpenRouter models
 * - Streaming and non-streaming responses
 * - Robust error handling and rate limit management
 * - Mock response generation for testing without an API key
 * - Cost estimation for API usage
 * - Support for different review types
 */

// Using native fetch API (Node.js 18+)
import { globalRateLimiter } from '../utils/rateLimiter';
import {
  ReviewType,
  ReviewResult,
  FileInfo,
  ReviewCost,
  ReviewOptions
} from '../types/review';
import { getCostInfo } from './utils/tokenCounter';
import { ProjectDocs } from '../utils/projectDocs';
import { loadPromptTemplate } from './utils/promptLoader';

// Import client utilities
import {
  validateOpenRouterApiKey,
  isDebugMode,
  formatSingleFileReviewPrompt,
  formatConsolidatedReviewPrompt
} from './utils';

// No need to import model maps as we're using a single model

// Get the model from environment variables
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || '';

// Parse the model name
const [adapter, modelName] = selectedModel.includes(':')
  ? selectedModel.split(':')
  : ['openrouter', selectedModel];

// Skip initialization if this is not the selected adapter
if (adapter !== 'openrouter') {
  // We'll handle this in the reviewCode.ts file
  // This allows multiple clients to coexist without errors
}

const preferredModel = modelName;

// Use only the specified model without fallbacks
const DEFAULT_OPENROUTER_MODEL = `openrouter-${preferredModel}`;

// Track if we've initialized a model successfully
let modelInitialized = false;
let currentModel: string | null = null;

// Get API key from environment variables
const apiKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;

/**
 * Initialize the OpenRouter client with the specified model
 * @param modelName Name of the model to use
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
async function initializeOpenRouterModel(modelName: string): Promise<boolean> {
  if (!apiKey) {
    console.error('No OpenRouter API key found.');
    console.error('Please add the following to your .env.local file:');
    console.error(
      '- AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here'
    );
    process.exit(1);
  }

  try {
    console.log(`Trying to initialize ${modelName}...`);

    // Extract the actual model name from the openrouter- prefix
    const actualModelName = modelName.startsWith('openrouter-')
      ? modelName.substring('openrouter-'.length)
      : modelName;

    // Make a simple test request to verify the model works
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
          'X-Title': 'AI Code Review Tool'
        },
        body: JSON.stringify({
          model: actualModelName,
          messages: [
            {
              role: 'user',
              content: 'Hello, are you available for a code review task?'
            }
          ],
          max_tokens: 50,
          temperature: 0.2,
          stream: false
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error initializing ${modelName}:`, errorData);
      return false;
    }

    const data = (await response.json()) as any;
    if (data.choices && data.choices.length > 0) {
      console.log(`Successfully initialized ${modelName}`);
      currentModel = modelName;
      modelInitialized = true;
      return true;
    }

    console.error(`Unexpected response format from ${modelName}`);
    return false;
  } catch (error) {
    console.error(`Error initializing ${modelName}:`, error);
    return false;
  }
}

/**
 * Try to initialize any available OpenRouter model
 * @param preferredModels Array of model names to try in order of preference
 * @returns Promise resolving to a boolean indicating if any model was initialized
 */
export async function initializeAnyOpenRouterModel(
  preferredModel: string = DEFAULT_OPENROUTER_MODEL
): Promise<boolean> {
  // If we've already initialized a model, return true
  if (modelInitialized && currentModel) {
    return true;
  }

  // Validate the API key
  if (!validateOpenRouterApiKey(apiKey, isDebugMode())) {
    process.exit(1);
  }

  // Try to initialize the specified model
  const success = await initializeOpenRouterModel(preferredModel);
  if (success) {
    return true;
  }

  console.error('Failed to initialize any OpenRouter model.');
  throw new Error(
    'No OpenRouter model could be initialized. Please check your API key and try again.'
  );
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
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize a model if we haven't already
    if (!modelInitialized) {
      await initializeAnyOpenRouterModel();
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

      // Use rate limiter to avoid hitting API limits
      await globalRateLimiter.acquire();

      try {
        // Extract the actual model name from the openrouter- prefix
        const actualModelName =
          currentModel && currentModel.startsWith('openrouter-')
            ? currentModel.substring('openrouter-'.length)
            : currentModel ||
              DEFAULT_OPENROUTER_MODEL.substring('openrouter-'.length);

        // Make the API request
        const response = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
              'X-Title': 'AI Code Review Tool'
            },
            body: JSON.stringify({
              model: actualModelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.2,
              stream: false
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
        }

        const data = (await response.json()) as any;

        // Extract the response content
        content = data.choices[0].message.content;

        // Calculate cost information
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const totalTokens = data.usage?.total_tokens || 0;

        // Estimate cost (this is approximate and depends on the model)
        const estimatedCost = getCostInfo(
          promptTokens,
          completionTokens,
          actualModelName
        );
        cost = {
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          totalTokens: totalTokens,
          estimatedCost: estimatedCost.cost,
          formattedCost: estimatedCost.formattedCost
        };

        // Add model information to the content
        content += `\n\n*Generated by Code Review Tool using OpenRouter (${actualModelName})*`;
      } finally {
        // Release the rate limiter
        globalRateLimiter.release();
      }
    }

    // Return the review result
    return {
      content,
      filePath,
      reviewType,
      timestamp: new Date().toISOString(),
      cost,
      modelUsed: currentModel
        ? currentModel.replace('openrouter-', 'openrouter:')
        : undefined
    };
  } catch (error) {
    console.error('Error generating review with OpenRouter:', error);
    throw error;
  }
}

/**
 * Generate a consolidated review for multiple files using OpenRouter
 * @param files Array of file information
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
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize a model if we haven't already
    if (!modelInitialized) {
      await initializeAnyOpenRouterModel();
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
        content:
          file.content.substring(0, 1000) +
          (file.content.length > 1000 ? '\n... (truncated)' : ''),
        sizeInBytes: file.content.length
      }));

      // Format the user prompt using the utility function
      const userPrompt = formatConsolidatedReviewPrompt(
        promptTemplate,
        projectName,
        fileInfos,
        projectDocs
      );

      // Use rate limiter to avoid hitting API limits
      await globalRateLimiter.acquire();

      try {
        // Extract the actual model name from the openrouter- prefix
        const actualModelName =
          currentModel && currentModel.startsWith('openrouter-')
            ? currentModel.substring('openrouter-'.length)
            : currentModel ||
              DEFAULT_OPENROUTER_MODEL.substring('openrouter-'.length);

        console.log(
          `Trying to generate consolidated review with ${actualModelName}...`
        );

        // Make the API request
        const response = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
              'X-Title': 'AI Code Review Tool'
            },
            body: JSON.stringify({
              model: actualModelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.2,
              stream: false
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
        }

        const data = (await response.json()) as any;

        // Extract the response content
        content = data.choices[0].message.content;

        // Calculate cost information
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const totalTokens = data.usage?.total_tokens || 0;

        // Estimate cost (this is approximate and depends on the model)
        const estimatedCost = getCostInfo(
          promptTokens,
          completionTokens,
          actualModelName
        );
        cost = {
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          totalTokens: totalTokens,
          estimatedCost: estimatedCost.cost,
          formattedCost: estimatedCost.formattedCost
        };

        console.log(
          `Successfully generated consolidated review with ${actualModelName}`
        );

        // Add model information to the content
        content += `\n\n*Generated by Code Review Tool using OpenRouter (${actualModelName})*`;
      } finally {
        // Release the rate limiter
        globalRateLimiter.release();
      }
    }

    // Return the review result
    return {
      content,
      filePath: `${projectName} (${files.length} files)`,
      reviewType,
      timestamp: new Date().toISOString(),
      cost,
      modelUsed: currentModel
        ? currentModel.replace('openrouter-', 'openrouter:')
        : undefined
    };
  } catch (error) {
    console.error(
      'Error generating consolidated review with OpenRouter:',
      error
    );
    throw error;
  }
}
