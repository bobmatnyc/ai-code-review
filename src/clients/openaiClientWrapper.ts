/**
 * @fileoverview Wrapper for the OpenAI client.
 *
 * This module provides a wrapper for the OpenAI client using the class-based implementation.
 * This wrapper maintains backward compatibility while using the modern client architecture.
 */

import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import { OpenAIClient } from './implementations/openaiClient';

// Create a singleton instance of the OpenAI client
let openaiClientInstance: OpenAIClient | null = null;

/**
 * Get or create the OpenAI client instance
 * @returns The OpenAI client instance
 */
function getClientInstance(): OpenAIClient {
  if (!openaiClientInstance) {
    openaiClientInstance = new OpenAIClient();
  }
  return openaiClientInstance;
}

/**
 * Initialize the OpenAI client
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
export async function initializeAnyOpenAIModel(): Promise<boolean> {
  try {
    const client = getClientInstance();
    return await client.initialize();
  } catch (error) {
    logger.error('Failed to initialize OpenAI model:', error);
    return false;
  }
}

/**
 * Generate a consolidated review using the OpenAI API
 * @param fileInfos Array of file information objects
 * @param project Project name
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenAIConsolidatedReview(
  fileInfos: FileInfo[],
  project: string,
  reviewType: ReviewType,
  projectDocs: ProjectDocs | null,
  options: ReviewOptions,
): Promise<ReviewResult> {
  const client = getClientInstance();

  // Ensure client is initialized
  if (!client.getIsInitialized()) {
    await client.initialize();
  }

  return client.generateConsolidatedReview(fileInfos, project, reviewType, projectDocs, options);
}

/**
 * Generate a single-file review using the OpenAI API
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
  options?: ReviewOptions,
): Promise<ReviewResult> {
  const client = getClientInstance();

  // Ensure client is initialized
  if (!client.getIsInitialized()) {
    await client.initialize();
  }

  return client.generateReview(fileContent, filePath, reviewType, projectDocs, options);
}

/**
 * Generate an architectural review using the OpenAI API
 * @param fileInfos Array of file information objects
 * @param project Project name
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenAIArchitecturalReview(
  fileInfos: FileInfo[],
  project: string,
  projectDocs: ProjectDocs | null,
  options: ReviewOptions,
): Promise<ReviewResult> {
  const client = getClientInstance();

  // Ensure client is initialized
  if (!client.getIsInitialized()) {
    await client.initialize();
  }

  return client.generateArchitecturalReview(fileInfos, project, projectDocs, options);
}
