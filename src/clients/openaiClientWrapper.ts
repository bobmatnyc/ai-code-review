/**
 * @fileoverview Wrapper for the OpenAI client.
 *
 * This module provides a wrapper for the OpenAI client to handle dynamic imports.
 */

import {
  ReviewType,
  ReviewOptions,
  ReviewResult,
  FileInfo
} from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';

// Import the OpenAI client directly
import * as openaiClient from './openaiClient';

/**
 * Initialize the OpenAI client
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
export async function initializeAnyOpenAIModel(): Promise<boolean> {
  return openaiClient.initializeAnyOpenAIModel();
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
  options: ReviewOptions
): Promise<ReviewResult> {
  return openaiClient.generateOpenAIConsolidatedReview(
    fileInfos,
    project,
    reviewType,
    projectDocs,
    options
  );
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
  options?: ReviewOptions
): Promise<ReviewResult> {
  return openaiClient.generateOpenAIReview(
    fileContent,
    filePath,
    reviewType,
    projectDocs,
    options
  );
}
