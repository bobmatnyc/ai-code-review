/**
 * @fileoverview Formatter for architectural code reviews.
 *
 * This module enhances the output of architectural reviews by adding a list
 * of all files that were included in the review process.
 */

import type { FileInfo, ReviewResult } from '../types/review';
import logger from '../utils/logger';
import { generateFileTree } from '../utils/treeGenerator';
import { formatReviewOutput } from './outputFormatter';

/**
 * Format an architectural review to include the list of analyzed files
 * @param review The review result
 * @param outputFormat Output format (markdown or JSON)
 * @param files Array of file information objects that were analyzed
 * @returns The formatted review output
 */
export function formatArchitecturalReview(
  review: ReviewResult,
  outputFormat: 'markdown' | 'json',
  files: FileInfo[],
): string {
  logger.debug(
    `formatArchitecturalReview called with ${files.length} files, format: ${outputFormat}`,
  );
  files.forEach((file, index) => {
    logger.debug(`File ${index + 1}: ${file.relativePath || file.path}`);
  });

  // Get the base formatted review
  const baseFormattedReview = formatReviewOutput(review, outputFormat);

  if (outputFormat === 'json') {
    // For JSON output, we need to parse, modify, and then stringify again
    try {
      const reviewObj = JSON.parse(baseFormattedReview);
      const relativePaths = files.map((file) => file.relativePath || file.path);

      // Add both a flat list and a tree structure
      reviewObj.analyzedFiles = relativePaths;
      reviewObj.fileTree = generateFileTree(relativePaths).replace(/```/g, '').trim();

      return JSON.stringify(reviewObj, null, 2);
    } catch (error) {
      logger.warn(`Error enhancing JSON review with file list: ${error}`);
      return baseFormattedReview;
    }
  } else {
    // For markdown, we append the file list at the end with a tree structure
    const relativePaths = files.map((file) => file.relativePath || file.path);
    const fileTree = generateFileTree(relativePaths);

    const fileListSection = `
## Files Analyzed

The following ${files.length} files were included in this review:

${fileTree}

`;

    // Find the position to insert (before cost information section)
    const costSectionMatch = baseFormattedReview.match(/^## Cost Information/m);

    if (costSectionMatch?.index) {
      // Insert before cost information
      const position = costSectionMatch.index;
      logger.debug('Inserting file list before Cost Information section');
      return (
        baseFormattedReview.substring(0, position) +
        fileListSection +
        baseFormattedReview.substring(position)
      );
    }
    // If cost section not found, append at the end
    logger.debug('Cost Information section not found, appending file list to end');
    return baseFormattedReview + fileListSection;
  }
}
