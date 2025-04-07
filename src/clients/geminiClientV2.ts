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
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerativeModel
} from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import {
  ReviewType,
  ReviewResult,
  FileInfo,
  ReviewCost,
  ReviewOptions
} from '../types/review';
import { getCostInfo, getCostInfoFromText } from '../utils/tokenCounter';
import { ProjectDocs, formatProjectDocs } from '../utils/projectDocs';
import { loadPromptTemplate } from '../utils/promptLoader';
import { BaseAiClient } from './baseClient';
import { getApiKeyForProvider } from '../utils/config';
import logger from '../utils/logger';
import { StreamHandler } from '../utils/streamHandler';
import { getSchemaInstructions } from '../types/reviewSchema';

/**
 * Client for interacting with the Google Gemini API.
 * Extends the BaseAiClient to provide Gemini-specific functionality.
 */
export class GeminiClient extends BaseAiClient {
  private static instance: GeminiClient;
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private currentModel: string = '';

  // Default Gemini models to try in order of preference
  private readonly DEFAULT_MODELS = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.0-pro'
  ];

  /**
   * Get the singleton instance of the client
   * @returns GeminiClient instance
   */
  public static getInstance(): GeminiClient {
    if (!GeminiClient.instance) {
      GeminiClient.instance = new GeminiClient();
    }
    return GeminiClient.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
    this.useMockResponses = !getApiKeyForProvider('gemini');
  }

  /**
   * Check if the client is initialized and ready to use
   * @returns True if the client is initialized
   */
  public isInitialized(): boolean {
    return this.initialized && this.genAI !== null && this.model !== null;
  }

  /**
   * Initialize the client with the specified model
   * @param modelName Model name to use (defaults to gemini-1.5-pro)
   * @returns True if initialization was successful
   */
  public async initialize(modelName: string = 'gemini-1.5-pro'): Promise<boolean> {
    // If already initialized with the same model, return true
    if (this.initialized && this.currentModel === modelName) {
      return true;
    }

    // Get API key from config
    const apiKey = getApiKeyForProvider('gemini');

    if (!apiKey) {
      this.useMockResponses = true;
      logger.warn('No Google API key found. Using mock responses.');
      return false;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);

      // Try to initialize the model
      this.model = this.genAI.getGenerativeModel({
        model: modelName,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          }
        ]
      });

      this.currentModel = modelName;
      this.initialized = true;
      return true;
    } catch (error) {
      this.logError('initialize', error);
      return false;
    }
  }

  /**
   * Initialize with the specified model only, no fallbacks
   * @param modelName The model name to initialize
   * @returns True if initialization was successful
   */
  public async initializeAnyModel(modelName: string = 'gemini-1.5-pro'): Promise<boolean> {
    // Only try the specified model, no fallbacks
    return await this.initialize(modelName);
  }

  /**
   * Generate a review for a single file
   * @param fileInfo File information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  public async generateReview(
    fileInfo: FileInfo,
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult> {
    // Initialize if not already initialized
    if (!this.isInitialized()) {
      // Extract model name from the full model string (e.g., 'gemini:gemini-1.5-pro' -> 'gemini-1.5-pro')
      const modelParts = this.config.selectedModel.split(':');
      const modelName = modelParts.length > 1 ? modelParts[1] : modelParts[0];

      const success = await this.initializeAnyModel(modelName);

      if (!success) {
        return {
          filePath: fileInfo.path,
          reviewType: options.type as ReviewType,
          content: `Error: Failed to initialize model ${modelName}. Please check if the model is available and your API key is valid.`,
          timestamp: new Date().toISOString(),
          isMock: false,
          modelUsed: modelName
        };
      }
    }

    // Set up stream handler if streaming is enabled
    const streamHandler = this.setupStreamHandler(options);

    // If using mock responses, return a mock response
    if (this.useMockResponses) {
      return this.generateMockReview(fileInfo, options);
    }

    try {
      // Wait for rate limiter
      await this.rateLimiter.acquire();

      // Load the appropriate prompt template
      const promptTemplate = await loadPromptTemplate(
        options.type as ReviewType || 'quick-fixes',
        options.language || 'typescript'
      );

      // Format project docs if available
      const formattedDocs = projectDocs ? formatProjectDocs(projectDocs) : '';

      // Format the code block
      const codeBlock = this.formatCodeBlock(fileInfo.content, options.language);

      // Build the prompt
      const prompt = promptTemplate
        .replace('{{FILE_PATH}}', fileInfo.path)
        .replace('{{FILE_CONTENT}}', codeBlock)
        .replace('{{PROJECT_DOCS}}', formattedDocs);

      // Add schema instructions for interactive mode
      const finalPrompt = options.interactive
        ? `${prompt}\n\n${getSchemaInstructions()}`
        : prompt;

      // Generate content
      if (streamHandler && this.model?.generateContentStream) {
        // Streaming response
        const result = await this.model.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
        });

        let fullResponse = '';

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;

          // Add the chunk to the stream handler
          process.stdout.write(chunkText);
        }

        // Calculate cost
        const costInfo = getCostInfoFromText(finalPrompt, fullResponse, this.currentModel);

        // Complete the stream handler
        if (streamHandler) {
          streamHandler.complete();
        }

        return {
          filePath: fileInfo.path,
          reviewType: options.type as ReviewType,
          content: fullResponse,
          timestamp: new Date().toISOString(),
          cost: costInfo,
          isMock: false,
          modelUsed: this.currentModel
        };
      } else {
        // Non-streaming response
        const result = await this.model!.generateContent({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
        });

        const response = result.response.text();

        // Calculate cost
        const costInfo = getCostInfoFromText(finalPrompt, response, this.currentModel);

        return {
          filePath: fileInfo.path,
          reviewType: options.type as ReviewType,
          content: response,
          timestamp: new Date().toISOString(),
          cost: costInfo,
          isMock: false,
          modelUsed: this.currentModel
        };
      }
    } catch (error) {
      // Log the error
      this.logError('generateReview', error);

      return {
        filePath: fileInfo.path,
        reviewType: options.type as ReviewType,
        content: `Error generating review: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        isMock: false,
        modelUsed: this.currentModel
      };
    }
  }

  /**
   * Generate a consolidated review for multiple files
   * @param files Array of file information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  public async generateConsolidatedReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult> {
    // Initialize if not already initialized
    if (!this.isInitialized()) {
      // Extract model name from the full model string (e.g., 'gemini:gemini-1.5-pro' -> 'gemini-1.5-pro')
      const modelParts = this.config.selectedModel.split(':');
      const modelName = modelParts.length > 1 ? modelParts[1] : modelParts[0];

      const success = await this.initializeAnyModel(modelName);

      // Use the first file's path as the filePath or a default if no files
      const filePath = files.length > 0 ? files[0].path : 'consolidated-review';

      if (!success) {
        return {
          filePath,
          reviewType: options.type as ReviewType,
          content: `Error: Failed to initialize model ${modelName}. Please check if the model is available and your API key is valid.`,
          timestamp: new Date().toISOString(),
          isMock: false,
          modelUsed: modelName
        };
      }
    }

    // Set up stream handler if streaming is enabled
    const streamHandler = this.setupStreamHandler(options);

    // If using mock responses, return a mock response
    if (this.useMockResponses) {
      return this.generateMockConsolidatedReview(files, options);
    }

    try {
      // Wait for rate limiter
      await this.rateLimiter.acquire();

      // Load the appropriate prompt template
      // Use 'consolidated' as the language for consolidated reviews
      const promptTemplate = await loadPromptTemplate(
        options.type as ReviewType || 'quick-fixes',
        options.language || 'consolidated'
      );

      // Format project docs if available
      const formattedDocs = projectDocs ? formatProjectDocs(projectDocs) : '';

      // Format the file summaries
      const fileSummaries = files.map((file) => {
        return `File: ${file.path}\nLanguage: ${options.language || 'unknown'}\n\n${this.formatCodeBlock(file.content, options.language)}\n\n`;
      }).join('\n---\n\n');

      // Build the prompt
      const prompt = promptTemplate
        .replace('{{FILE_SUMMARIES}}', fileSummaries)
        .replace('{{PROJECT_DOCS}}', formattedDocs);

      // Add schema instructions for interactive mode
      const finalPrompt = options.interactive
        ? `${prompt}\n\n${getSchemaInstructions()}`
        : prompt;

      // Generate content
      if (streamHandler && this.model?.generateContentStream) {
        // Streaming response
        const result = await this.model.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
        });

        let fullResponse = '';

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;

          // Add the chunk to the stream handler
          process.stdout.write(chunkText);
        }

        // Calculate cost
        const costInfo = getCostInfoFromText(finalPrompt, fullResponse, this.currentModel);

        // Complete the stream handler
        if (streamHandler) {
          streamHandler.complete();
        }

        // Use the first file's path as the filePath
        const filePath = files.length > 0 ? files[0].path : 'consolidated-review';

        return {
          filePath,
          reviewType: options.type as ReviewType,
          content: fullResponse,
          timestamp: new Date().toISOString(),
          cost: costInfo,
          isMock: false,
          modelUsed: this.currentModel
        };
      } else {
        // Non-streaming response
        const result = await this.model!.generateContent({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
        });

        const response = result.response.text();

        // Calculate cost
        const costInfo = getCostInfoFromText(finalPrompt, response, this.currentModel);

        // Use the first file's path as the filePath
        const filePath = files.length > 0 ? files[0].path : 'consolidated-review';

        return {
          filePath,
          reviewType: options.type as ReviewType,
          content: response,
          timestamp: new Date().toISOString(),
          cost: costInfo,
          isMock: false,
          modelUsed: this.currentModel
        };
      }
    } catch (error) {
      // Log the error
      this.logError('generateConsolidatedReview', error);

      // Use the first file's path as the filePath
      const filePath = files.length > 0 ? files[0].path : 'consolidated-review';

      return {
        filePath,
        reviewType: options.type as ReviewType,
        content: `Error generating consolidated review: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        isMock: false,
        modelUsed: this.currentModel
      };
    }
  }

  /**
   * Generate an architectural review for multiple files
   * @param files Array of file information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  public async generateArchitecturalReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult> {
    // Set the review type to architectural
    const architecturalOptions: ReviewOptions = {
      ...options,
      type: 'architectural'
    };

    // Use the consolidated review function with architectural options
    return this.generateConsolidatedReview(files, architecturalOptions, projectDocs);
  }

  /**
   * Generate a security review for multiple files
   * @param files Array of file information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  public async generateSecurityReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult> {
    // Set the review type to security
    const securityOptions: ReviewOptions = {
      ...options,
      type: 'security'
    };

    // Use the consolidated review function with security options
    return this.generateConsolidatedReview(files, securityOptions, projectDocs);
  }

  /**
   * Generate a performance review for multiple files
   * @param files Array of file information
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Review result
   */
  public async generatePerformanceReview(
    files: FileInfo[],
    options: ReviewOptions,
    projectDocs?: ProjectDocs
  ): Promise<ReviewResult> {
    // Set the review type to performance
    const performanceOptions: ReviewOptions = {
      ...options,
      type: 'performance'
    };

    // Use the consolidated review function with performance options
    return this.generateConsolidatedReview(files, performanceOptions, projectDocs);
  }

  /**
   * Generate a mock review for testing without an API key
   * @param fileInfo File information
   * @param options Review options
   * @returns Mock review result
   */
  private async generateMockReview(
    fileInfo: FileInfo,
    options: ReviewOptions
  ): Promise<ReviewResult> {
    // Load mock response template
    const mockTemplate = await fs.readFile(
      path.join(process.cwd(), 'src', 'mocks', 'mockReview.md'),
      'utf-8'
    );

    // Replace placeholders
    const mockResponse = mockTemplate
      .replace('{{FILE_PATH}}', fileInfo.path)
      .replace('{{REVIEW_TYPE}}', options.type as string || 'quick-fixes')
      .replace('{{TIMESTAMP}}', new Date().toISOString());

    // Calculate mock cost
    const costInfo: ReviewCost = {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      estimatedCost: 0.0,
      formattedCost: '$0.00 (mock)'
    };

    return {
      filePath: fileInfo.path,
      reviewType: options.type as ReviewType,
      content: mockResponse,
      timestamp: new Date().toISOString(),
      cost: costInfo,
      isMock: true,
      modelUsed: 'mock-gemini-model'
    };
  }

  /**
   * Generate a mock consolidated review for testing without an API key
   * @param files Array of file information
   * @param options Review options
   * @returns Mock consolidated review result
   */
  private async generateMockConsolidatedReview(
    files: FileInfo[],
    options: ReviewOptions
  ): Promise<ReviewResult> {
    // Load mock response template
    const mockTemplate = await fs.readFile(
      path.join(process.cwd(), 'src', 'mocks', 'mockConsolidatedReview.md'),
      'utf-8'
    );

    // Format file list
    const fileList = files.map(file => `- ${file.path}`).join('\n');

    // Replace placeholders
    const mockResponse = mockTemplate
      .replace('{{FILE_LIST}}', fileList)
      .replace('{{FILE_COUNT}}', files.length.toString())
      .replace('{{REVIEW_TYPE}}', options.type as string || 'quick-fixes')
      .replace('{{TIMESTAMP}}', new Date().toISOString());

    // Calculate mock cost
    const costInfo: ReviewCost = {
      inputTokens: 2000,
      outputTokens: 1000,
      totalTokens: 3000,
      estimatedCost: 0.0,
      formattedCost: '$0.00 (mock)'
    };

    // Use the first file's path as the filePath
    const filePath = files.length > 0 ? files[0].path : 'consolidated-review';

    return {
      filePath,
      reviewType: options.type as ReviewType,
      content: mockResponse,
      timestamp: new Date().toISOString(),
      cost: costInfo,
      isMock: true,
      modelUsed: 'mock-gemini-model'
    };
  }
}
