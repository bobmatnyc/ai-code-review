/**
 * @fileoverview Gemini client implementation using the abstract client interface.
 * 
 * This module implements the Gemini client using the abstract client base class.
 * It provides functionality for interacting with Google's Gemini models for code reviews.
 */

import {
  AbstractClient,
  detectModelProvider,
  validateApiKey,
  createStandardReviewResult,
  handleApiError,
  withRetry
} from '../base';
import {
  ReviewType,
  ReviewResult,
  FileInfo,
  ReviewOptions
} from '../../types/review';
import { ProjectDocs } from '../../utils/projectDocs';
import logger from '../../utils/logger';
import {
  formatSingleFileReviewPrompt,
  formatConsolidatedReviewPrompt
} from '../utils/promptFormatter';
import { loadPromptTemplate } from '../utils/promptLoader';
import { getLanguageFromExtension } from '../utils/languageDetection';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { globalRateLimiter } from '../../utils/rateLimiter';

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

const MAX_TOKENS_PER_REQUEST = 8192;

/**
 * Interface for custom model options
 */
interface CustomModel {
  name: string;
  displayName: string;
  useV1Beta?: boolean;
}

/**
 * Gemini client implementation
 */
export class GeminiClient extends AbstractClient {
  protected apiKey: string | undefined;
  protected genAI: GoogleGenerativeAI | null = null;
  protected customModel: CustomModel | null = null;
  
  /**
   * Initialize with default values
   */
  constructor() {
    super();
    this.modelName = '';
    this.isInitialized = false;
    this.apiKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;
  }
  
  /**
   * Check if the provided model name is supported by this client
   * @param modelName The full model name (potentially with provider prefix)
   * @returns Object indicating if this is the correct client for the model
   */
  public isModelSupported(modelName: string): {
    isCorrect: boolean;
    adapter: string;
    modelName: string;
  } {
    return detectModelProvider('gemini', modelName);
  }
  
  /**
   * Get the provider name for this client
   * @returns The provider name
   */
  protected getProviderName(): string {
    return 'gemini';
  }
  
  /**
   * Initialize the Gemini client
   * @returns Promise resolving to a boolean indicating success
   */
  public async initialize(): Promise<boolean> {
    // If already initialized, return true
    if (this.isInitialized) {
      return true;
    }
    
    // Get model information
    const { isCorrect, modelName } = this.isModelSupported(process.env.AI_CODE_REVIEW_MODEL || '');
    
    // If this is not a Gemini model, just return true without initializing
    if (!isCorrect) {
      return true;
    }
    
    // Set the model name
    this.modelName = modelName;
    
    // Validate the API key
    if (!validateApiKey('gemini', 'AI_CODE_REVIEW_GOOGLE_API_KEY')) {
      process.exit(1);
    }
    
    try {
      logger.info(`Initializing Gemini model: ${this.modelName}...`);
      
      // Initialize the Google Generative AI client
      this.genAI = new GoogleGenerativeAI(this.apiKey || '');
      
      // Set the custom model information
      this.customModel = {
        name: this.modelName,
        displayName: this.modelName
      };
      
      // Mark as initialized
      this.isInitialized = true;
      logger.info(`Successfully initialized Gemini model: ${this.modelName}`);
      return true;
    } catch (error) {
      logger.error(
        `Error initializing Gemini model ${this.modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }
  
  /**
   * Generate a review for a single file
   * @param fileContent Content of the file to review
   * @param filePath Path to the file
   * @param reviewType Type of review to perform
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the review result
   */
  public async generateReview(
    fileContent: string,
    filePath: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions
  ): Promise<ReviewResult> {
    const { isCorrect } = this.isModelSupported(process.env.AI_CODE_REVIEW_MODEL || '');
    
    // Make sure this is the correct client
    if (!isCorrect) {
      throw new Error(
        `Gemini client was called with an invalid model. This is likely a bug in the client selection logic.`
      );
    }
    
    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Apply rate limiting
      await globalRateLimiter.acquire();
      
      // Get the language from file extension
      const language = getLanguageFromExtension(filePath);
      
      // Load the appropriate prompt template
      const promptTemplate = await loadPromptTemplate(reviewType, options);
      
      // Format the prompt
      const prompt = formatSingleFileReviewPrompt(
        promptTemplate,
        fileContent,
        filePath,
        projectDocs
      );
      
      try {
        logger.info(`Generating review with Gemini ${this.modelName}...`);
        
        // Generate the response
        const response = await this.generateGeminiResponse(prompt, options);
        
        logger.info(`Successfully generated review with Gemini ${this.modelName}`);
        
        // Create and return the review result
        return createStandardReviewResult(
          response,
          prompt,
          this.getFullModelName(),
          filePath,
          reviewType
        );
      } catch (error) {
        throw handleApiError(error, 'generate review', this.getFullModelName());
      }
    } catch (error) {
      this.handleApiError(error, 'generating review', filePath);
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
  public async generateConsolidatedReview(
    files: FileInfo[],
    projectName: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions
  ): Promise<ReviewResult> {
    const { isCorrect } = this.isModelSupported(process.env.AI_CODE_REVIEW_MODEL || '');
    
    // Make sure this is the correct client
    if (!isCorrect) {
      throw new Error(
        `Gemini client was called with an invalid model. This is likely a bug in the client selection logic.`
      );
    }
    
    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Apply rate limiting
      await globalRateLimiter.acquire();
      
      // Load the appropriate prompt template
      const promptTemplate = await loadPromptTemplate(reviewType, options);
      
      // Format the prompt
      const prompt = formatConsolidatedReviewPrompt(
        promptTemplate,
        projectName,
        files.map(file => ({
          relativePath: file.relativePath || '',
          content: file.content,
          sizeInBytes: file.content.length
        })),
        projectDocs
      );
      
      try {
        logger.info(`Generating consolidated review with Gemini ${this.modelName}...`);
        
        // Generate the response
        const response = await this.generateGeminiResponse(prompt, options);
        
        logger.info(`Successfully generated consolidated review with Gemini ${this.modelName}`);
        
        // Create and return the review result
        return createStandardReviewResult(
          response,
          prompt,
          this.getFullModelName(),
          'consolidated',
          reviewType
        );
      } catch (error) {
        throw handleApiError(
          error, 
          'generate consolidated review', 
          this.getFullModelName()
        );
      }
    } catch (error) {
      this.handleApiError(error, 'generating consolidated review', projectName);
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
  public async generateArchitecturalReview(
    files: FileInfo[],
    projectName: string,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions
  ): Promise<ReviewResult> {
    // For Gemini, architectural reviews are handled by the consolidated review function
    // with the review type set to 'architectural'
    return this.generateConsolidatedReview(
      files,
      projectName,
      'architectural',
      projectDocs,
      options
    );
  }
  
  /**
   * Generate a response from the Gemini API
   * @param prompt The prompt to send to the API
   * @param options Review options
   * @returns Promise resolving to the response text
   */
  private async generateGeminiResponse(
    prompt: string,
    options?: ReviewOptions
  ): Promise<string> {
    if (!this.genAI || !this.customModel) {
      throw new Error('Gemini client not initialized');
    }
    
    try {
      // Create a model instance
      const modelOptions = {
        model: this.customModel.name,
        safetySettings: DEFAULT_SAFETY_SETTINGS,
        apiVersion: this.customModel.useV1Beta ? 'v1beta' : undefined
      };
      
      const model = this.genAI.getGenerativeModel(modelOptions);
      
      // Generate content
      // Add a prefix to the prompt to instruct the model not to repeat the instructions
      // and to provide output in a structured format
      const outputInstructions = `
You are a helpful AI assistant that provides code reviews. Focus on providing actionable feedback. Do not repeat the instructions in your response.

IMPORTANT: Format your response as a well-structured Markdown document with the following sections:

# Code Review

## Summary
A brief summary of the code review.

## Issues

### High Priority
For each high priority issue:
- Issue title
- File path and line numbers
- Description of the issue
- Code snippet (if relevant)
- Suggested fix
- Impact of the issue

### Medium Priority
(Same format as high priority)

### Low Priority
(Same format as high priority)

## General Recommendations
- List of general recommendations

## Positive Aspects
- List of positive aspects of the code

Ensure your response is well-formatted Markdown with proper headings, bullet points, and code blocks.
`;
      
      const modifiedPrompt = outputInstructions + '\n\n' + prompt;
      
      const result = await withRetry(() =>
        model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: modifiedPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: MAX_TOKENS_PER_REQUEST
          }
        })
      );
      
      // Extract the response text
      const response = result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      // Handle API errors
      if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
      } else {
        throw new Error(`Unknown Gemini API error: ${String(error)}`);
      }
    }
  }
}