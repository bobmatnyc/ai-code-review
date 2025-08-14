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

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import { ApiError, TokenLimitError } from '../utils/apiErrorHandler';
import { getApiKeyForProvider, getConfig } from '../utils/config';
import { enhancePromptForDiagrams } from '../utils/diagramGenerator';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import { globalRateLimiter } from '../utils/rateLimiter';
import { getModelMapping } from './utils/modelMaps';
// import { getLanguageFromExtension } from './utils/languageDetection'; // Not used in this file
// import { generateDirectoryStructure } from './utils'; // Not used in this specific implementation
// Model mapping has been removed; using raw model name as API name
import {
  formatConsolidatedReviewPrompt,
  formatSingleFileReviewPrompt,
} from './utils/promptFormatter';
// import { formatProjectDocs } from '../utils/projectDocs'; // Not used in this specific implementation
import { loadPromptTemplate } from './utils/promptLoader';
import { getSystemPrompt } from './utils/systemPrompts';
import { getCostInfoFromText } from './utils/tokenCounter';

/**
 * Default safety settings for Gemini API calls
 */
const DEFAULT_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const MAX_OUTPUT_TOKENS = 8192;

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
}

/**
 * The model to use for generating content.
 * @type {CustomModel | null}
 */
let selectedGeminiModel: CustomModel | null = null;

// Helper function to check if this is the correct client for the selected model
function isGeminiModel(): {
  isCorrect: boolean;
  adapter: string;
  modelName: string;
} {
  // Get the model from configuration
  const config = getConfig();
  const selectedModel = config.selectedModel || '';

  // Parse the model name
  const [adapter, modelName] = selectedModel.includes(':')
    ? selectedModel.split(':')
    : ['gemini', selectedModel];

  return {
    isCorrect: adapter === 'gemini',
    adapter,
    modelName,
  };
}

// This function was removed as it's no longer needed with the improved client selection logic

// Initialize the client if needed
function initializeGeminiClient(): void {
  const { isCorrect, modelName } = isGeminiModel();

  // If this is not a Gemini model, just return
  if (!isCorrect) {
    return;
  }

  // If we've already initialized, return
  if (genAI !== null && selectedGeminiModel !== null) {
    return;
  }

  // Get the API key from the config
  const apiKey = getApiKeyForProvider('gemini');

  // Check if we have an API key
  if (!apiKey) {
    logger.error('No Google API key found in configuration.');
    logger.error('Please add the following to your .env.local file:');
    logger.error('- AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here');
    process.exit(1);
  }

  // Log API key status
  const config = getConfig();
  if (config.debug) {
    logger.info('Using real Gemini API responses.');
  } else {
    logger.info('API key found. Using real Gemini API responses.');
  }

  // Initialize the client
  genAI = new GoogleGenerativeAI(apiKey);

  // Set the model to use
  if (!modelName) {
    throw new Error('No Gemini model specified. Set AI_CODE_REVIEW_MODEL=gemini:<model_name>.');
  }
  // Get the actual API identifier from the model mapping
  let apiIdentifier = modelName;

  // Try to get the API identifier from the model mapping
  try {
    // Use the imported getModelMapping function
    const fullModelKey = `gemini:${modelName}`;
    const modelMapping = getModelMapping(fullModelKey);

    if (modelMapping?.apiIdentifier) {
      apiIdentifier = modelMapping.apiIdentifier;
      logger.debug(`Using API identifier from mapping: ${modelName} → ${apiIdentifier}`);
    } else {
      logger.debug(`No mapping found for ${fullModelKey}, using model name directly`);
    }
  } catch (error) {
    logger.debug(`Error getting model mapping: ${error}`);
  }

  logger.info(`Initializing Gemini model: ${apiIdentifier}...`);
  // Set the selected model
  selectedGeminiModel = {
    name: apiIdentifier,
    displayName: modelName,
  };
}

/**
 * Generate a code review using the Gemini API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions,
): Promise<ReviewResult> {
  const { isCorrect, adapter, modelName } = isGeminiModel();

  // With the improved client selection logic, this function should only be called
  // with Gemini models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `Gemini client was called with an invalid model: ${adapter ? `${adapter}:${modelName}` : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`,
    );
  }

  // Initialize the client if needed
  initializeGeminiClient();

  // The rest of the function remains the same
  try {
    // Apply rate limiting
    await globalRateLimiter.acquire();

    // Get the language from the file extension
    // const language = getLanguageFromExtension(filePath); // Not used in formatSingleFileReviewPrompt

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

    // Format the prompt
    const prompt = formatSingleFileReviewPrompt(promptTemplate, fileContent, filePath, projectDocs);

    // Generate the review
    const response = await generateGeminiResponse(prompt, options);

    // Calculate cost information
    const cost = getCostInfoFromText(prompt, response, `gemini:${selectedGeminiModel?.name}`);

    // Try to parse the response as JSON, but skip for architectural reviews with diagrams
    let structuredData = null;

    // For architectural reviews with diagrams, keep the Markdown format
    if (!(reviewType === 'architectural' && options?.diagram)) {
      try {
        // First, check if the response is wrapped in a code block
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonContent = jsonMatch ? jsonMatch[1] : response;

        // Check if the content is valid JSON
        structuredData = JSON.parse(jsonContent);

        // Validate that it has the expected structure
        if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
          logger.warn('Response is valid JSON but does not have the expected structure');
        }
      } catch (parseError) {
        logger.debug(
          `Response is not JSON (expected for architectural reviews with diagrams): ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
        // Keep the original response as content
      }
    } else {
      logger.debug(
        'Skipping JSON parsing for architectural review with diagrams - keeping Markdown format',
      );
    }

    // Return the review result
    return {
      content: response,
      cost,
      modelUsed: `gemini:${selectedGeminiModel?.name}`,
      filePath,
      reviewType,
      timestamp: new Date().toISOString(),
      structuredData,
      metadata: {
        ...options?.metadata,
        diagramRequested: options?.diagram,
      },
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
export async function generateConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions,
): Promise<ReviewResult> {
  const { isCorrect, adapter, modelName } = isGeminiModel();

  // With the improved client selection logic, this function should only be called
  // with Gemini models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `Gemini client was called with an invalid model: ${adapter ? `${adapter}:${modelName}` : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`,
    );
  }

  // Initialize the client if needed
  initializeGeminiClient();

  // The rest of the function remains the same
  try {
    // Apply rate limiting
    await globalRateLimiter.acquire();

    // Load the appropriate prompt template
    let promptTemplate = await loadPromptTemplate(reviewType, options);

    // Enhance prompt for diagram generation if requested for architectural reviews
    if (options?.diagram && reviewType === 'architectural') {
      promptTemplate = enhancePromptForDiagrams(
        promptTemplate,
        { ...options, type: reviewType },
        projectName,
        options?.framework,
      );
      logger.debug('Enhanced prompt with diagram generation instructions');
    }

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

    // Generate the review
    const response = await generateGeminiResponse(prompt, options);

    // Calculate cost information
    const cost = getCostInfoFromText(prompt, response, `gemini:${selectedGeminiModel?.name}`);

    // Try to parse the response as JSON, but skip for architectural reviews with diagrams
    let structuredData = null;

    // For architectural reviews with diagrams, keep the Markdown format
    if (!(reviewType === 'architectural' && options?.diagram)) {
      try {
        // First, check if the response is wrapped in a code block
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonContent = jsonMatch ? jsonMatch[1] : response;

        // Check if the content is valid JSON
        structuredData = JSON.parse(jsonContent);

        // Validate that it has the expected structure
        if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
          logger.warn('Response is valid JSON but does not have the expected structure');
        }
      } catch (parseError) {
        logger.debug(
          `Response is not JSON (expected for architectural reviews with diagrams): ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
        // Keep the original response as content
      }
    } else {
      logger.debug(
        'Skipping JSON parsing for architectural review with diagrams - keeping Markdown format',
      );
    }

    // Return the review result
    return {
      content: response,
      cost,
      modelUsed: `gemini:${selectedGeminiModel?.name}`,
      filePath: `${reviewType}`,
      reviewType,
      timestamp: new Date().toISOString(),
      structuredData,
      metadata: {
        ...options?.metadata,
        diagramRequested: options?.diagram,
      },
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

/**
 * Generate an architectural review for a project
 * @param files Array of file information objects
 * @param projectName Name of the project
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateArchitecturalReview(
  files: FileInfo[],
  projectName: string,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions,
): Promise<ReviewResult> {
  // Architectural reviews are just consolidated reviews with the architectural review type
  return generateConsolidatedReview(files, projectName, 'architectural', projectDocs, options);
}

// The formatPrompt function has been replaced with formatSingleFileReviewPrompt from promptFormatter.ts

// The formatConsolidatedPrompt function has been replaced with formatConsolidatedReviewPrompt from promptFormatter.ts

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      // Type assertion for error with status property
      const err = e as { status?: number };
      if ((err.status === 429 || (err.status && err.status >= 500)) && i < retries - 1) {
        await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
      } else {
        throw e;
      }
    }
  }
  throw new Error('Exceeded retry attempts');
}

/**
 * Generate a response from the Gemini API
 * @param prompt The prompt to send to the API
 * @param options Review options
 * @returns Promise resolving to the response text
 */
async function generateGeminiResponse(prompt: string, options?: ReviewOptions): Promise<string> {
  if (!genAI || !selectedGeminiModel) {
    throw new Error('Gemini client not initialized');
  }

  try {
    // Create a model instance
    const modelOptions = {
      model: selectedGeminiModel.name,
      safetySettings: DEFAULT_SAFETY_SETTINGS,
      apiVersion: selectedGeminiModel.useV1Beta ? 'v1beta' : undefined,
    };

    const model = genAI.getGenerativeModel(modelOptions);

    // Get the appropriate system prompt based on review type and options
    // Use Markdown format for better compatibility and diagram support
    const systemPrompt = getSystemPrompt(
      options?.type || 'quick-fixes',
      true, // Use Markdown format for Gemini
      options,
    );

    // Combine system prompt with user prompt
    const modifiedPrompt = `${systemPrompt}\n\n${prompt}`;

    const result = await withRetry(() =>
      model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: modifiedPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    );

    // Extract the response text
    const response = result.response;
    const text = response.text();

    return text;
  } catch (error) {
    // Handle API errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Check for token limit errors
      if (
        errorMessage.includes('token') &&
        (errorMessage.includes('limit') ||
          errorMessage.includes('exceed') ||
          errorMessage.includes('too long') ||
          errorMessage.includes('too many'))
      ) {
        // Extract token count from prompt if possible
        const { countTokens } = await import('../tokenizers');
        const modelName = selectedGeminiModel?.name || 'gemini';
        const tokenCount = countTokens(prompt, modelName);

        throw new TokenLimitError(
          `Token limit exceeded for Gemini model ${modelName}. Content has ${tokenCount.toLocaleString()} tokens. Consider using --multi-pass flag for large codebases.`,
          tokenCount,
          undefined,
          undefined,
          error.message,
        );
      }

      throw new ApiError(`Gemini API error: ${error.message}`);
    }
    throw new ApiError(`Unknown Gemini API error: ${String(error)}`);
  }
}
