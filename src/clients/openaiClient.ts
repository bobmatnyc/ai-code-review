/**
 * @fileoverview Client for interacting with the OpenAI API.
 *
 * This module provides a client for interacting with OpenAI's models.
 * It handles API key management, request formatting, response processing,
 * rate limiting, error handling, and cost estimation for code reviews.
 *
 * Key features:
 * - Support for various OpenAI models (GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo)
 * - Streaming and non-streaming responses
 * - Robust error handling and rate limit management
 * - Cost estimation for API usage
 * - Support for different review types
 */

import fetch from 'node-fetch';
import { globalRateLimiter } from '../utils/rateLimiter';
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
import { StreamHandler } from '../utils/streamHandler';

// Import client utilities
import {
  validateOpenAIApiKey,
  isDebugMode,
  formatSingleFileReviewPrompt,
  formatConsolidatedReviewPrompt
} from './utils';

// Get the model from environment variables
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || '';

// Parse the model name
const [adapter, modelName] = selectedModel.includes(':')
  ? selectedModel.split(':')
  : ['openai', selectedModel];

// Skip initialization if this is not the selected adapter
if (adapter !== 'openai') {
  // We'll handle this in the reviewCode.ts file
  // This allows multiple clients to coexist without errors
}

// Use only the specified model without fallbacks
const DEFAULT_OPENAI_MODEL = `openai-${modelName}`;

// Track if we've initialized a model successfully
let modelInitialized = false;
let currentModel: string | null = null;

// Get API key from environment variables
const apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;

/**
 * Initialize the OpenAI model
 * @param model The model to initialize
 * @returns Promise resolving to a boolean indicating if the model was initialized
 */
export async function initializeOpenAIModel(model: string): Promise<boolean> {
  // If we've already initialized this model, return true
  if (modelInitialized && currentModel === model) {
    return true;
  }

  // Validate the API key
  if (!validateOpenAIApiKey(apiKey, isDebugMode())) {
    process.exit(1);
  }

  try {
    // Extract the actual model name from the openai- prefix
    const actualModelName = model.startsWith('openai-')
      ? model.substring('openai-'.length)
      : model;

    // Test the API connection
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: actualModelName,
        messages: [{ role: 'user', content: 'Hello, are you working?' }],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error initializing OpenAI model: ${errorText}`);
      return false;
    }

    // If we get here, the model is working
    console.log(`Successfully initialized OpenAI model: ${actualModelName}`);
    modelInitialized = true;
    currentModel = model;
    return true;
  } catch (error) {
    console.error(`Error initializing OpenAI model: ${error}`);
    return false;
  }
}

/**
 * Initialize any available OpenAI model
 * @param preferredModel The preferred model to try
 * @returns Promise resolving to a boolean indicating if any model was initialized
 */
export async function initializeAnyOpenAIModel(
  preferredModel: string = DEFAULT_OPENAI_MODEL
): Promise<boolean> {
  // If we've already initialized a model, return true
  if (modelInitialized && currentModel) {
    return true;
  }

  // Validate the API key
  if (!validateOpenAIApiKey(apiKey, isDebugMode())) {
    process.exit(1);
  }

  // Try to initialize the specified model
  const success = await initializeOpenAIModel(preferredModel);
  if (success) {
    return true;
  }

  console.error('Failed to initialize any OpenAI model.');
  throw new Error(
    'No OpenAI model could be initialized. Please check your API key and try again.'
  );
}

/**
 * Generate a code review using the OpenAI API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenAIReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize a model if we haven't already
    if (!modelInitialized) {
      await initializeAnyOpenAIModel();
    }

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

    // Format the user prompt using the utility function
    const userPrompt = formatSingleFileReviewPrompt(
      promptTemplate,
      fileContent,
      filePath,
      projectDocs
    );

    // Initialize variables
    let content: string;
    let cost: ReviewCost | undefined;
    // No mock responses are used
    let modelUsed = 'unknown';

    try {
      // Extract the actual model name from the openai- prefix
      const actualModelName =
        currentModel && currentModel.startsWith('openai-')
          ? currentModel.substring('openai-'.length)
          : currentModel || DEFAULT_OPENAI_MODEL.substring('openai-'.length);

      // Check if we should use streaming mode
      const isInteractive = options?.interactive === true;

      if (isInteractive) {
        // Create a stream handler
        const streamHandler = new StreamHandler(reviewType, 'OpenAI');

        // Use streaming mode
        await globalRateLimiter.acquire();

        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: actualModelName,
              messages: [
                { role: 'system', content: 'You are an expert code reviewer.' },
                { role: 'user', content: userPrompt }
              ],
              stream: true,
              temperature: 0.2,
              max_tokens: 4096
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, response: ${errorText}`
          );
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        // Process the stream using a simpler approach with async iterators
        let buffer = '';

        // Convert the response to text and process it line by line
        const text = await response.text();
        const lines = text.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.substring(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                streamHandler.handleChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }

        // Complete the stream and get the full content
        content = streamHandler.complete();
        modelUsed = actualModelName;
      } else {
        // Use regular mode
        await globalRateLimiter.acquire();

        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: actualModelName,
              messages: [
                { role: 'system', content: 'You are an expert code reviewer.' },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.2,
              max_tokens: 4096
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, response: ${errorText}`
          );
        }

        const data = await response.json();
        content = data.choices[0]?.message?.content || '';
        modelUsed = actualModelName;
      }
    } catch (error: any) {
      console.error(`Failed to generate review: ${error.message || error}`);
      throw error;
    }

    // Calculate cost information
    cost = getCostInfoFromText(userPrompt, content, modelUsed);

    return {
      filePath,
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      modelUsed
    };
  } catch (error) {
    console.error('Error generating review:', error);
    throw error;
  }
}

/**
 * Generate a consolidated review for multiple files using OpenAI
 * @param files Array of file information
 * @param projectName Name of the project
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenAIConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize a model if we haven't already
    if (!modelInitialized) {
      await initializeAnyOpenAIModel();
    }

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

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

    // Initialize variables
    let content: string;
    let cost: ReviewCost | undefined;
    // No mock responses are used
    let modelUsed = 'unknown';

    try {
      // Extract the actual model name from the openai- prefix
      const actualModelName =
        currentModel && currentModel.startsWith('openai-')
          ? currentModel.substring('openai-'.length)
          : currentModel || DEFAULT_OPENAI_MODEL.substring('openai-'.length);

      console.log(
        `Trying to generate consolidated review with ${actualModelName}...`
      );

      // Check if we should use streaming mode
      const isInteractive = options?.interactive === true;

      if (isInteractive) {
        // Create a stream handler
        const streamHandler = new StreamHandler(reviewType, 'OpenAI');

        // Use streaming mode
        await globalRateLimiter.acquire();

        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: actualModelName,
              messages: [
                { role: 'system', content: 'You are an expert code reviewer.' },
                { role: 'user', content: userPrompt }
              ],
              stream: true,
              temperature: 0.2,
              max_tokens: 4096
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, response: ${errorText}`
          );
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        // Process the stream using a simpler approach with async iterators
        let buffer = '';

        // Convert the response to text and process it line by line
        const text = await response.text();
        const lines = text.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.substring(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                streamHandler.handleChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }

        // Complete the stream and get the full content
        content = streamHandler.complete();
        modelUsed = actualModelName;
      } else {
        // Use regular mode
        await globalRateLimiter.acquire();

        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: actualModelName,
              messages: [
                { role: 'system', content: 'You are an expert code reviewer.' },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.2,
              max_tokens: 4096
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, response: ${errorText}`
          );
        }

        const data = await response.json();
        content = data.choices[0]?.message?.content || '';
        modelUsed = actualModelName;
      }
    } catch (error: any) {
      console.error(
        `Failed to generate consolidated review: ${error.message || error}`
      );
      throw error;
    }

    // Calculate cost information
    cost = getCostInfoFromText(userPrompt, content, modelUsed);

    return {
      filePath: `${reviewType}`,
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      modelUsed
    };
  } catch (error) {
    console.error('Error generating consolidated review:', error);
    throw error;
  }
}

/**
 * Generate an architectural review for multiple files using OpenAI
 * @param files Array of file information
 * @param projectName Name of the project
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenAIArchitecturalReview(
  files: FileInfo[],
  projectName: string,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  return generateOpenAIConsolidatedReview(
    files,
    projectName,
    'architectural',
    projectDocs,
    options
  );
}
