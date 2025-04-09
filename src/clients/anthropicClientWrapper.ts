/**
 * @fileoverview Wrapper for the Anthropic client.
 *
 * This module provides a wrapper for the Anthropic client to handle dynamic imports.
 */

import {
  ReviewType,
  ReviewOptions,
  ReviewResult,
  FileInfo
} from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';

// Import the Anthropic client directly
import * as anthropicClient from './anthropicClient';

/**
 * Initialize the Anthropic client
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
export async function initializeAnthropicClient(): Promise<boolean> {
  return anthropicClient.initializeAnthropicClient();
}

/**
 * Generate a consolidated review using the Anthropic API
 * @param fileInfos Array of file information objects
 * @param project Project name
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateAnthropicConsolidatedReview(
  fileInfos: FileInfo[],
  project: string,
  reviewType: ReviewType,
  projectDocs: ProjectDocs | null,
  options: ReviewOptions
): Promise<ReviewResult> {
  return anthropicClient.generateAnthropicConsolidatedReview(
    fileInfos,
    project,
    reviewType,
    projectDocs,
    options
  );
}
