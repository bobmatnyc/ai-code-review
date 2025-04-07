/**
 * @fileoverview Client for interacting with the Google Gemini API.
 *
 * This module provides a comprehensive client for interacting with Google's Gemini AI models.
 * It handles API key management, model selection and fallback, request formatting, response
 * processing, rate limiting, error handling, and cost estimation for code reviews.
 *
 * Key features:
 * - Automatic model selection with fallback to alternative models
 * - Support for both streaming and non-streaming responses
 * - Robust error handling and rate limit management
 * - Mock response generation for testing without an API key
 * - Cost estimation for API usage
 * - Support for different review types (quick fixes, architectural, security, performance)
 *
 * The client prioritizes the latest Gemini models but includes fallback options
 * to ensure reliability even when specific models are unavailable.
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold
} from '@google/generative-ai';
import { globalRateLimiter } from '../utils/rateLimiter';
import fs from 'fs/promises';
import path from 'path';
import {
  ReviewType,
  ReviewResult,
  FileInfo,
  ReviewCost,
  ReviewOptions
} from '../types/review';
import { StreamHandler } from '../utils/streamHandler';
import { getCostInfoFromText } from './utils/tokenCounter';
import { ProjectDocs, formatProjectDocs } from '../utils/projectDocs';
import { loadPromptTemplate } from './utils/promptLoader';
import { getLanguageFromExtension } from './utils/languageDetection';
import { generateDirectoryStructure } from './utils';

/**
 * Default safety settings for Gemini API calls
 */
const DEFAULT_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  }
];

/**
 * @fileoverview Client for interacting with the Google Gemini API.
 * Handles API key management, request formatting, response processing,
 * rate limiting, and cost estimation for code reviews.
 * Supports mock responses when API key is not available.
 */

/**
 * API Key for Google Generative AI.
 * Only uses AI_CODE_REVIEW_GOOGLE_API_KEY.
 * @type {string | undefined}
 */
const apiKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;

// No mock responses are used in this client

/**
 * Instance of the GoogleGenerativeAI client.
 * Initialized only if an API key is found and valid.
 * @type {GoogleGenerativeAI | null}
 */
let genAI: GoogleGenerativeAI | null = null;

/**
 * The Gemini model instance to use for generating content.
 */
interface CustomModel {
  name: string;
  displayName: string;
  useV1Beta?: boolean;
  generateContent: (
    params: any
  ) => Promise<{ response: { text: () => string } }>;
  generateContentStream?: (params: any) => Promise<any>;
}

let model:
  | ReturnType<GoogleGenerativeAI['getGenerativeModel']>
  | CustomModel
  | null = null;

// Get the selected adapter from environment variables
const modelString = process.env.AI_CODE_REVIEW_MODEL || '';
const [adapterType] = modelString.includes(':')
  ? modelString.split(':')
  : ['gemini'];

// Only initialize if this is the selected adapter
if (adapterType !== 'gemini') {
  // Skip initialization if another adapter is selected
  // No action needed
} else if (!apiKey) {
  console.error('No Google API key found in environment variables.');
  console.error('Please add the following to your .env.local file:');
  console.error('- AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here');
  process.exit(1);
} else {
  // Log API key status
  const isDebugMode = process.argv.includes('--debug');
  if (isDebugMode) {
    console.log('Google API key found: AI_CODE_REVIEW_GOOGLE_API_KEY');
  } else {
    console.log('API key found. Using real Gemini API responses.');
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('Error initializing GoogleGenerativeAI client:', error);
    console.error('Please check your API key and try again.');
    process.exit(1);
  }
}

// Get the model from environment variables
const selectedModel = process.env.AI_CODE_REVIEW_MODEL;
if (!selectedModel) {
  console.error('No model specified in environment variables.');
  console.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');
  console.error('Example: AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro');
  process.exit(1);
}

// Import the model maps
import {
  parseModelString,
  getModelMapping,
  getFullModelKey
} from '../utils/modelMaps';

// Parse the model name
const { provider, modelName } = parseModelString(selectedModel || '');

// Check if the adapter is Gemini
if (provider !== 'gemini') {
  console.error(`Invalid model adapter: ${provider}`);
  console.error('For Gemini client, the model must start with "gemini:"');
  console.error('Example: AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro');
  process.exit(1);
}

// Get the full model key
const fullModelKey = getFullModelKey('gemini', modelName);

// Get the model mapping
const modelMapping = getModelMapping(fullModelKey);

// Create a model option object
let formattedModelName = modelName;

// Use the model mapping to get the correct API model name
if (modelMapping) {
  formattedModelName = modelMapping.apiName;
  if (formattedModelName !== modelName) {
    console.log(`Using ${formattedModelName} for ${modelName}`);
  }
}

const modelOption = {
  name: formattedModelName,
  displayName: modelName, // Keep the original name for display
  useV1Beta: modelMapping?.useV1Beta || modelName.includes('2.5') // Use v1beta for 2.5 models
};

// Export the current model for use in other modules
export let currentModelDisplayName: string = modelName;

// Initialize the model
let modelInitialized = false;

try {
  console.log(`Initializing model: ${modelOption.displayName}...`);

  if (modelOption.useV1Beta) {
    // For v1beta API, we need to use fetch directly
    // We'll create a custom model object that uses v1beta API without testing it first
    // The actual test will happen when the model is used

    // Create a custom model object that uses v1beta API
    model = {
      name: modelOption.name,
      displayName: modelOption.displayName,
      useV1Beta: true,
      generateContent: async (params: any) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelOption.name}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Check if it's a rate limit error (429)
          if (response.status === 429) {
            console.warn(`Rate limit exceeded for ${modelOption.displayName}.`);
            throw new Error(
              `Rate limit exceeded for ${modelOption.displayName}`
            );
          } else if (response.status === 404) {
            const error = `Model ${modelOption.name} not found. Please check if the model name is correct.`
            console.error(error);
            throw new Error(error);
          } else {
            throw new Error(
              `HTTP error! status: ${response.status}, response: ${errorText}`
            );
          }
        }

        const data = await response.json();
        return {
          response: {
            text: (): string => {
              if (
                data.candidates &&
                data.candidates[0] &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts[0]
              ) {
                return data.candidates[0].content.parts[0].text;
              }
              return '';
            }
          }
        };
      }
    };
  } else if (genAI) {
    // For v1 API, use the SDK
    model = genAI.getGenerativeModel({ model: modelOption.name });
  } else {
    throw new Error('Google Generative AI client is not initialized');
  }

  console.log(`Successfully initialized ${modelOption.displayName}`);
  modelInitialized = true;
} catch (error: any) {
  console.error(
    `Failed to initialize ${modelOption.displayName}: ${error.message || error}`
  );
  console.error(
    'Please check your API key and model name in the environment variables.'
  );
  console.error('Example: AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro');
  throw new Error(
    `Failed to initialize Gemini model: ${error.message || error}`
  );
}

// If we get here, we should have a working model

// The loadPromptTemplate function has been moved to src/utils/promptLoader.ts

/**
 * Generate a code review using the Gemini API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @returns Promise resolving to the review result
 */
export async function generateReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  // Model name is already logged in reviewCode.ts
  try {
    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

    // Get file extension and language
    const fileExtension = path.extname(filePath).slice(1);
    const language = getLanguageFromExtension(fileExtension);

    let content: string;
    let cost: ReviewCost | undefined;
    // No mock responses are used
    const modelUsed = modelOption.displayName;

    // Format the code block with language
    const codeBlock = `\`\`\`${language}
${fileContent}
\`\`\``;

    // Format project documentation if available
    const projectContext = projectDocs ? formatProjectDocs(projectDocs) : '';

    // Prepare the prompt with the code and project context
    const prompt = `${promptTemplate}

${projectContext ? projectContext + '\n\n' : ''}## File: ${filePath}

${codeBlock}`;

    // Check if we should use streaming mode
    const isInteractive = options?.interactive === true;

    // Acquire a token from the rate limiter before making the request
    await globalRateLimiter.acquireToken();

    if (isInteractive) {
      // Create a stream handler
      const streamHandler = new StreamHandler(reviewType, 'Google Gemini AI');

      // Use streaming mode
      if (!model) {
        throw new Error('Model is not initialized');
      }

      // Check if the model supports streaming
      if (!('generateContentStream' in model)) {
        throw new Error('Model does not support streaming');
      }

      // Now TypeScript knows generateContentStream exists
      const streamResult = await (model as any).generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Lower temperature for more focused code reviews
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192 // Allow for detailed reviews
        },
        safetySettings: DEFAULT_SAFETY_SETTINGS
      });

      // Process the stream
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        streamHandler.handleChunk(chunkText);
      }

      // Complete the stream and get the full content
      content = streamHandler.complete();
    } else {
      // Call the Gemini API with proper configuration
      if (!model) {
        throw new Error('Model is not initialized');
      }
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Lower temperature for more focused code reviews
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192 // Allow for detailed reviews
        },
        safetySettings: DEFAULT_SAFETY_SETTINGS
      });

      const response = result.response;
      content = response.text();
    }

    // Calculate cost information
    cost = getCostInfoFromText(prompt, content, modelUsed);

    return {
      filePath: path.basename(filePath),
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      modelUsed
    };
  } catch (error) {
    console.error('Error generating review:', error);
    throw new Error(`Failed to generate review for ${filePath}`);
  }
}

/**
 * Generate an architectural review for multiple files
 * @param files Array of file information objects
 * @param projectName Name of the project being reviewed
 * @returns Promise resolving to the review result
 */
/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns Promise resolving to the result of the function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Acquire a token from the rate limiter before making the request
      await globalRateLimiter.acquireToken();

      // Make the request
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Only retry on rate limit errors
      if (!error.message || !error.message.includes('Rate limit exceeded')) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(
        `Rate limit exceeded. Retrying in ${delay / 1000} seconds...`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError;
}

export async function generateConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Load the consolidated review prompt template
    const promptTemplate = await loadPromptTemplate('consolidated', options);

    // Prepare file summaries
    const fileSummaries = files
      .map(file => {
        const fileExtension = path.extname(file.path).slice(1);
        const language = getLanguageFromExtension(fileExtension);

        return `## File: ${file.relativePath}

\`\`\`${language}
${file.content.substring(0, 1000)}${file.content.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
      })
      .join('\n');

    // Create a project structure summary
    const directoryStructure = generateDirectoryStructure(files);

    // Format project documentation if available
    const projectContext = projectDocs ? formatProjectDocs(projectDocs) : '';

    // Prepare the prompt with the code and project context
    const prompt = `${promptTemplate}

${projectContext ? projectContext + '\n\n' : ''}# Project: ${projectName}

## Directory Structure
${directoryStructure}

## File Summaries (truncated for brevity)
${fileSummaries}`;

    // Model name is already logged in reviewCode.ts
    let content = '';
    let cost: ReviewCost | undefined;
    // No mock responses are used
    let modelUsed = 'unknown';
    let result: any;

    try {
      if (modelOption.useV1Beta) {
        // For v1beta API, use fetch directly
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelOption.name}:generateContent?key=${apiKey}`;

        // Use retry with backoff for rate limit errors
        const response = await retryWithBackoff(
          async () => {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 8192
                }
              })
            });

            if (!res.ok) {
              const errorText = await res.text();
              // Check if it's a rate limit error (429)
              if (res.status === 429) {
                throw new Error(
                  `Rate limit exceeded for ${modelOption.displayName}`
                );
              } else {
                throw new Error(
                  `HTTP error! status: ${res.status}, response: ${errorText}`
                );
              }
            }

            return res;
          },
          3,
          2000
        );

        const data = await response.json();

        if (
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts &&
          data.candidates[0].content.parts[0]
        ) {
          content = data.candidates[0].content.parts[0].text;
          modelUsed = modelOption.displayName;
          currentModelDisplayName = modelOption.displayName;
          console.log(`Successfully generated review with ${modelName}`);
        } else {
          throw new Error(
            `Invalid response format from ${modelOption.displayName}`
          );
        }
      } else {
        // For v1 API, use the SDK
        const genModel = genAI?.getGenerativeModel({
          model: modelOption.name
        });

        if (!genModel) {
          throw new Error(`Failed to initialize ${modelOption.displayName}`);
        }

        // Check if we should use streaming mode
        const isInteractive = options?.interactive === true;

        if (isInteractive) {
          // Create a stream handler
          const streamHandler = new StreamHandler(
            reviewType,
            modelOption.displayName
          );

          // Use streaming mode
          await globalRateLimiter.acquireToken();

          const streamResult = await genModel.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192
            },
            safetySettings: DEFAULT_SAFETY_SETTINGS
          });

          // Process the stream
          for await (const chunk of streamResult.stream) {
            const chunkText = chunk.text();
            streamHandler.handleChunk(chunkText);
          }

          // Complete the stream and get the full content
          content = streamHandler.complete();
          modelUsed = modelOption.displayName;
          currentModelDisplayName = modelOption.displayName;
          console.log(`Successfully generated review with ${modelName}`);
        } else {
          // Use regular mode with retry with backoff for rate limit errors
          result = await retryWithBackoff(
            async () => {
              return genModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 8192
                },
                safetySettings: DEFAULT_SAFETY_SETTINGS
              });
            },
            3,
            2000
          );

          content = result.response.text();
          modelUsed = modelOption.displayName;
          console.log(`Successfully generated review with ${modelName}`);
        }
      }
    } catch (error: any) {
      console.error(
        `Failed to generate review with ${modelOption.displayName}: ${error.message || error}`
      );
      console.error(
        'Please check your API key and model name in the environment variables.'
      );
      throw error;
    }

    // Calculate cost information
    cost = getCostInfoFromText(prompt, content, modelUsed);

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

export async function generateArchitecturalReview(
  files: FileInfo[],
  projectName: string,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  // Model name is already logged in reviewCode.ts
  try {
    // Load the architectural review prompt template
    const promptTemplate = await loadPromptTemplate('architectural', options);

    // Prepare file summaries
    const fileSummaries = files
      .map(file => {
        const fileExtension = path.extname(file.path).slice(1);
        const language = getLanguageFromExtension(fileExtension);

        return `## File: ${file.relativePath}

\`\`\`${language}
${file.content.substring(0, 1000)}${file.content.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
      })
      .join('\n');

    // Create a project structure summary
    const directoryStructure = generateDirectoryStructure(files);

    // Format project documentation if available
    const projectContext = projectDocs ? formatProjectDocs(projectDocs) : '';

    // Prepare the prompt with the code and project context
    const prompt = `${promptTemplate}

${projectContext ? projectContext + '\n\n' : ''}# Project: ${projectName}

## Directory Structure
${directoryStructure}

## File Summaries (truncated for brevity)
${fileSummaries}`;

    // Initialize variables
    let content: string;
    let cost: ReviewCost | undefined;
    // No mock responses are used
    const modelUsed = modelOption.displayName;

    // Call the Gemini API with proper configuration
    if (!model) {
      throw new Error('Model is not initialized');
    }
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2, // Lower temperature for more focused architectural reviews
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192 // Allow for detailed reviews
      },
      safetySettings: DEFAULT_SAFETY_SETTINGS
    });

    const response = result.response;
    content = response.text();

    // Calculate cost information
    cost = getCostInfoFromText(prompt, content, modelUsed);

    return {
      filePath: 'architectural',
      reviewType: 'architectural',
      content,
      timestamp: new Date().toISOString(),
      cost,
      modelUsed
    };
  } catch (error) {
    console.error('Error generating architectural review:', error);
    throw new Error(
      `Failed to generate architectural review for ${projectName}`
    );
  }
}
