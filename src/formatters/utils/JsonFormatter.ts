/**
 * @fileoverview Formatter for JSON output of code reviews.
 * 
 * This module provides functions to format code review results as JSON,
 * including metadata, structured data, and content.
 */

import { ReviewResult } from '../../types/review';
import { sanitizeContent } from '../../utils/sanitizer';

import { extractModelInfo } from './ModelInfoExtractor';
import { createEnhancedMetadata, parseMetadata } from './MetadataFormatter';

/**
 * Format the review as JSON
 * @param review Review result to format
 * @returns JSON string
 */
export function formatAsJson(review: ReviewResult): string {
  // Extract model information
  const { modelVendor, modelName, modelInfo } = extractModelInfo(review.modelUsed);

  // Sanitize the content to prevent XSS attacks
  const sanitizedContent = sanitizeContent(review.content);

  // Parse structured data if available
  let parsedStructuredData = review.structuredData;
  if (typeof review.structuredData === 'string') {
    try {
      parsedStructuredData = JSON.parse(review.structuredData);
    } catch (error) {
      console.error('Error parsing structured review data:', error);
    }
  }

  // Parse additional metadata if available
  const additionalMetadata = parseMetadata(review.metadata);

  // Format path for display
  let displayPath = review.filePath || '';
  if (!displayPath || displayPath === review.reviewType || displayPath === 'consolidated') {
    displayPath = process.cwd() + ' (Current Directory)';
  }

  // Create enhanced metadata with detection info
  const enhancedMetadata = createEnhancedMetadata(
    modelVendor,
    modelName,
    modelInfo,
    review.reviewType,
    displayPath,
    review.timestamp,
    review.costInfo || review.cost,
    review.toolVersion,
    review.commandOptions,
    additionalMetadata,
    review.detectedLanguage,
    review.detectedFramework,
    review.frameworkVersion,
    review.cssFrameworks
  );

  // Create a copy of the review with enhanced metadata
  const reviewWithMeta = {
    ...review,
    content: sanitizedContent,
    structuredData: parsedStructuredData,
    meta: enhancedMetadata,
    // Legacy metadata field for backward compatibility
    metadata: {
      model: modelInfo,
      generatedAt: new Date(review.timestamp).toISOString(),
      costEstimation: review.cost
    }
  };

  return JSON.stringify(reviewWithMeta, null, 2);
}