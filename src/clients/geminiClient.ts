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
import { getCostInfo, getCostInfoFromText } from '../utils/tokenCounter';
import { ProjectDocs, formatProjectDocs } from '../utils/projectDocs';

/**
 * @fileoverview Client for interacting with the Google Gemini API.
 * Handles API key management, request formatting, response processing,
 * rate limiting, and cost estimation for code reviews.
 * Supports mock responses when API key is not available.
 */

/**
 * API Key for Google Generative AI.
 * Reads from CODE_REVIEW_GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_KEY environment variable.
 * @type {string | undefined}
 */
const apiKey = process.env.CODE_REVIEW_GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY;

/**
 * Flag indicating if the client is operating in mock mode (no API key).
 * @type {boolean}
 */
let useMockResponses = false;

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

// Initialize the client based on API key availability
if (!apiKey) {
  console.warn(
    'Warning: GOOGLE_GENERATIVE_AI_KEY environment variable is not set.'
  );
  console.warn(
    'Using mock responses for testing. For real reviews, please add your API key to .env.local.'
  );
  useMockResponses = true;
} else {
  console.log('API key found. Using real Gemini API responses.');
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('Error initializing GoogleGenerativeAI client:', error);
    console.warn('Falling back to mock responses due to initialization error.');
    useMockResponses = true;
  }
}

// Get the preferred model from environment variables
const selectedModel = process.env.CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';
const [adapter, modelName] = selectedModel.includes(':') ? selectedModel.split(':') : ['gemini', selectedModel];
const preferredModel = adapter === 'gemini' ? modelName : 'gemini-1.5-pro';

// Define available models in order of preference
const modelOptions = [
  // First try the user's preferred model
  {
    name: preferredModel,
    displayName: `User Preferred (${preferredModel})`,
    useV1Beta: preferredModel.includes('2.5') // Use v1beta for 2.5 models
  },
  // Fallback models if the preferred one doesn't work
  {
    name: 'gemini-2.5-pro-exp-03-25',
    displayName: 'Gemini 2.5 Pro Experimental',
    useV1Beta: true
  },
  { name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
  { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
  { name: 'gemini-pro', displayName: 'Gemini Pro' },
  { name: 'gemini-pro-latest', displayName: 'Gemini Pro Latest' }
];

// Try models in order until one works
let modelInitialized = false;
let currentModel: string | null = null;

if (!useMockResponses) {
  for (const modelOption of modelOptions) {
    if (modelInitialized) break;

    try {
      console.log(`Trying to initialize ${modelOption.displayName}...`);

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
                console.warn(
                  `Rate limit exceeded for ${modelOption.displayName}. Using fallback model.`
                );
                throw new Error(
                  `Rate limit exceeded for ${modelOption.displayName}`
                );
              } else {
                throw new Error(
                  `HTTP error! status: ${response.status}, response: ${errorText}`
                );
              }
            }

            const data = await response.json();
            return {
              response: {
                text: () => {
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
      currentModel = modelOption.name;
    } catch (error: any) {
      console.warn(
        `Failed to initialize ${modelOption.displayName}: ${error.message || error}`
      );
    }
  }
}

if (!modelInitialized) {
  console.error('Failed to initialize any Gemini model. Using mock responses.');
  useMockResponses = true;
}

/**
 * Load a prompt template from the prompts directory
 * @param reviewType Type of review to perform
 * @returns Promise resolving to the prompt template
 */
async function loadPromptTemplate(reviewType: ReviewType): Promise<string> {
  const promptPath = path.resolve('prompts', `${reviewType}-review.md`);
  try {
    return await fs.readFile(promptPath, 'utf-8');
  } catch (error) {
    console.error(`Error loading prompt template for ${reviewType}:`, error);
    throw new Error(`Failed to load prompt template for ${reviewType}`);
  }
}

/**
 * Generate a mock response for testing
 * @param reviewType Type of review to perform
 * @param filePath Path to the file being reviewed
 * @returns Mock review content
 */
async function generateMockResponse(
  reviewType: ReviewType,
  filePath: string
): Promise<string> {
  const fileExtension = path.extname(filePath).slice(1);
  const language = getLanguageFromExtension(fileExtension);

  return `# Mock ${reviewType.toUpperCase()} Review for ${filePath}

This is a mock review generated for testing purposes since no API key was provided.

## Summary

This file appears to be a ${language} file. In a real review, this would contain detailed feedback based on the review type.

## Recommendations

1. Add proper documentation
2. Ensure consistent code style
3. Follow best practices for ${language}

*This is a mock response. To get real reviews, please set either GOOGLE_AI_STUDIO_KEY or GOOGLE_GENERATIVE_AI_KEY environment variable in your .env.local file.*`;
}

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
  try {
    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType);

    // Get file extension and language
    const fileExtension = path.extname(filePath).slice(1);
    const language = getLanguageFromExtension(fileExtension);

    let content: string;
    let cost: ReviewCost | undefined;
    let isMock = false;
    let modelUsed = currentModel || 'gemini-1.5-pro';

    if (useMockResponses) {
      // Generate mock response for testing
      content = await generateMockResponse(reviewType, filePath);
      // Add a note that this is a mock response
      content = `> **Note**: This is a mock response because no API key was provided.\n\n${content}`;
      isMock = true;

      // Add mock cost information for testing
      cost = {
        inputTokens: 1250,
        outputTokens: 750,
        totalTokens: 2000,
        estimatedCost: 0.000625,
        formattedCost: '$0.000625 USD'
      };
    } else {
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
          safetySettings: [
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
          ]
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
          safetySettings: [
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
          ]
        });

        const response = result.response;
        content = response.text();
      }

      // Calculate cost information
      cost = getCostInfoFromText(prompt, content, modelUsed);
    }

    return {
      filePath: path.basename(filePath),
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      isMock,
      modelUsed: currentModel ? `gemini:${currentModel}` : undefined
    };
  } catch (error) {
    console.error('Error generating review:', error);
    throw new Error(`Failed to generate review for ${filePath}`);
  }
}

/**
 * Generate a mock architectural review for testing
 * @param files Array of file information objects
 * @param projectName Name of the project being reviewed
 * @returns Mock review content
 */
async function generateMockArchitecturalResponse(
  files: FileInfo[],
  projectName: string
): Promise<string> {
  // Create a directory structure representation
  const directoryStructure = generateDirectoryStructure(files);

  // Count files by type
  const fileTypes: Record<string, number> = {};
  files.forEach(file => {
    const ext = path.extname(file.path).slice(1) || 'unknown';
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  });

  const fileTypeSummary = Object.entries(fileTypes)
    .map(([ext, count]) => `- ${ext}: ${count} files`)
    .join('\n');

  return `# Mock ARCHITECTURAL Review for ${projectName}

This is a mock architectural review generated for testing purposes since no API key was provided.

## Project Structure

\`\`\`
${directoryStructure}
\`\`\`

## File Types

${fileTypeSummary}

## Architecture Summary

This project contains ${files.length} files. In a real review, this would contain a detailed analysis of the project architecture, including:

- Code organization and modularity
- API design patterns
- Package dependencies
- Component relationships
- Data flow

## Recommendations

1. Ensure consistent code organization
2. Follow best practices for API design
3. Minimize external dependencies
4. Implement clear separation of concerns

*This is a mock response. To get real reviews, please set either GOOGLE_AI_STUDIO_KEY or GOOGLE_GENERATIVE_AI_KEY environment variable in your .env.local file.*`;
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
    let content = '';
    let cost: ReviewCost | undefined;
    let isMock = false;
    let modelUsed = 'unknown';
    const prompt = '';

    if (useMockResponses) {
      // Generate mock response for testing
      content = await generateMockArchitecturalResponse(files, projectName);
      isMock = true;
      modelUsed = 'mock';

      // Add mock cost information for testing
      cost = {
        inputTokens: 5000,
        outputTokens: 2500,
        totalTokens: 7500,
        estimatedCost: 0.002,
        formattedCost: '$0.002 USD'
      };
    } else {
      // Load the consolidated review prompt template
      const promptTemplate = await loadPromptTemplate('consolidated');

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

      // Define available models in order of preference
      const fallbackModels = [
        // Use the experimental version of Gemini 2.5 Pro with v1beta API
        {
          name: 'gemini-2.5-pro-exp-03-25',
          displayName: 'Gemini 2.5 Pro Experimental',
          useV1Beta: true
        },
        // Fallback models with v1 API
        { name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
        { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
        { name: 'gemini-pro', displayName: 'Gemini Pro' },
        { name: 'gemini-pro-latest', displayName: 'Gemini Pro Latest' }
      ];

      // Try each model in order until one works
      let success = false;
      let result: any;

      for (const modelOption of fallbackModels) {
        if (success) break;

        try {
          console.log(
            `Trying to generate review with ${modelOption.displayName}...`
          );

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
              success = true;
              modelUsed = modelOption.displayName;
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
              throw new Error(
                `Failed to initialize ${modelOption.displayName}`
              );
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
                safetySettings: [
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
                ]
              });

              // Process the stream
              for await (const chunk of streamResult.stream) {
                const chunkText = chunk.text();
                streamHandler.handleChunk(chunkText);
              }

              // Complete the stream and get the full content
              content = streamHandler.complete();
              success = true;
              modelUsed = modelOption.displayName;
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
                    safetySettings: [
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
                    ]
                  });
                },
                3,
                2000
              );

              content = result.response.text();
              success = true;
              modelUsed = modelOption.displayName;
            }
          }
        } catch (error: any) {
          console.warn(
            `Failed to generate review with ${modelOption.displayName}: ${error.message || error}`
          );
          // Continue to the next model
        }
      }

      if (!success) {
        throw new Error('Failed to generate review with any available model');
      }

      console.log(`Successfully generated review with ${modelUsed}`);

      // Calculate cost information
      cost = getCostInfoFromText(prompt, content, modelUsed);
    }

    // Format the current date for the filename
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    return {
      filePath: `${reviewType}`,
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      isMock,
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
  try {
    let content: string;
    let cost: ReviewCost | undefined;
    let isMock = false;
    let modelUsed = currentModel || 'gemini-1.5-pro';

    if (useMockResponses) {
      // Generate mock response for testing
      content = await generateMockArchitecturalResponse(files, projectName);
      // Add a note that this is a mock response
      content = `> **Note**: This is a mock response because no API key was provided.\n\n${content}`;
      isMock = true;

      // Add mock cost information for testing
      cost = {
        inputTokens: 5000,
        outputTokens: 3000,
        totalTokens: 8000,
        estimatedCost: 0.0025,
        formattedCost: '$0.002500 USD'
      };
    } else {
      // Load the architectural review prompt template
      const promptTemplate = await loadPromptTemplate('architectural');

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
        safetySettings: [
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
        ]
      });

      const response = result.response;
      content = response.text();

      // Calculate cost information
      cost = getCostInfoFromText(prompt, content, modelUsed);
    }

    return {
      filePath: 'architectural',
      reviewType: 'architectural',
      content,
      timestamp: new Date().toISOString(),
      cost,
      isMock,
      modelUsed: currentModel ? `gemini:${currentModel}` : undefined
    };
  } catch (error) {
    console.error('Error generating architectural review:', error);
    throw new Error(
      `Failed to generate architectural review for ${projectName}`
    );
  }
}

/**
 * Generate a directory structure representation from file paths
 * @param files Array of file information objects
 * @returns String representation of directory structure
 */
function generateDirectoryStructure(files: FileInfo[]): string {
  const structure: Record<string, any> = {};

  // Build tree structure
  for (const file of files) {
    const parts = file.relativePath.split('/');
    let current = structure;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = null;
  }

  // Convert to string representation
  function stringifyStructure(obj: Record<string, any>, indent = 0): string {
    let result = '';
    for (const [key, value] of Object.entries(obj)) {
      result +=
        '  '.repeat(indent) + (value === null ? '📄 ' : '📁 ') + key + '\n';
      if (value !== null) {
        result += stringifyStructure(value, indent + 1);
      }
    }
    return result;
  }

  return stringifyStructure(structure);
}

/**
 * Get the language name from file extension
 * @param extension File extension
 * @returns Language name
 */
function getLanguageFromExtension(extension: string): string {
  const extensionMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    go: 'go',
    rs: 'rust',
    php: 'php',
    cs: 'csharp',
    swift: 'swift',
    kt: 'kotlin'
  };

  return extensionMap[extension.toLowerCase()] || 'plaintext';
}
