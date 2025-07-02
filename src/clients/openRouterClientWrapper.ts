/**
 * @fileoverview Wrapper for the OpenRouter client.
 *
 * This module provides a wrapper for the OpenRouter client to handle dynamic imports.
 */

import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import type { ProjectDocs } from '../utils/projectDocs';

// Import the OpenRouter client directly
import * as openRouterClient from './openRouterClient';

/**
 * Initialize the OpenRouter client
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
export async function initializeAnyOpenRouterModel(): Promise<boolean> {
  return openRouterClient.initializeAnyOpenRouterModel();
}

/**
 * Generate a consolidated review using the OpenRouter API
 * @param fileInfos Array of file information objects
 * @param project Project name
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenRouterConsolidatedReview(
  fileInfos: FileInfo[],
  project: string,
  reviewType: ReviewType,
  projectDocs: ProjectDocs | null,
  options: ReviewOptions,
): Promise<ReviewResult> {
  return openRouterClient.generateOpenRouterConsolidatedReview(
    fileInfos,
    project,
    reviewType,
    projectDocs,
    options,
  );
}
