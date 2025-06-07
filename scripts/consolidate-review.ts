#!/usr/bin/env ts-node

/**
 * CLI script to consolidate an existing multi-pass review file
 * 
 * This script takes a path to a review file, reads its content,
 * and sends it to the AI model for consolidation. It then saves
 * the consolidated review to a new file.
 * 
 * Usage: ts-node scripts/consolidate-review.ts [path-to-review-file]
 */

import fs from 'fs';
import path from 'path';
import { consolidateReview } from '../src/utils/review/consolidateReview';
import logger from '../src/utils/logger';
import { formatAsMarkdown } from '../src/formatters/outputFormatter';
import { loadEnv } from '../src/utils/envLoader';

// Load environment variables
loadEnv();

// Set up the API key
const API_KEY = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY || '';
if (!API_KEY) {
  console.error('Error: No API key found. Set AI_CODE_REVIEW_GOOGLE_API_KEY environment variable.');
  process.exit(1);
}

// Define the model to use
const MODEL_NAME = 'gemini-1.5-pro';

async function main(): Promise<void> {
  // Get the review file path from command line arguments
  const reviewFilePath = process.argv[2];
  if (!reviewFilePath) {
    console.error('Error: Please provide a path to the review file.');
    console.error('Usage: ts-node scripts/consolidate-review.ts [path-to-review-file]');
    process.exit(1);
  }

  // Check if the file exists
  if (!fs.existsSync(reviewFilePath)) {
    console.error(`Error: File not found: ${reviewFilePath}`);
    process.exit(1);
  }

  try {
    // Read the review file
    const reviewContent = fs.readFileSync(reviewFilePath, 'utf8');

    // Parse the review type from the file
    const reviewTypeMatch = reviewContent.match(/> \*\*Review Type\*\*: (.+)/);
    const reviewType = reviewTypeMatch ? reviewTypeMatch[1].trim() : 'unknown';

    // Extract other metadata
    const filePath = path.dirname(reviewFilePath);
    const timestamp = new Date().toISOString();

    // Parse token usage
    const tokenInfoMatch = reviewContent.match(/Input tokens: ([\d,]+)\s+Output tokens: ([\d,]+)\s+Total tokens: ([\d,]+)\s+Estimated cost: \$([\d.]+) USD/);
    const costInfo = tokenInfoMatch ? {
      inputTokens: parseInt(tokenInfoMatch[1].replace(/,/g, '')),
      outputTokens: parseInt(tokenInfoMatch[2].replace(/,/g, '')),
      totalTokens: parseInt(tokenInfoMatch[3].replace(/,/g, '')),
      estimatedCost: parseFloat(tokenInfoMatch[4]),
      formattedCost: `$${tokenInfoMatch[4]} USD`
    } : undefined;

    // Parse pass count
    const passCountMatch = reviewContent.match(/Multi-pass review: (\d+) passes/);
    const passCount = passCountMatch ? parseInt(passCountMatch[1]) : 5;

    if (costInfo) {
      costInfo.passCount = passCount;
    }

    logger.info(`Consolidating ${reviewType} review with ${passCount} passes...`);

    // Create the review object
    const review = {
      content: reviewContent,
      reviewType,
      filePath,
      timestamp,
      costInfo,
      files: [],
      modelUsed: `gemini:${MODEL_NAME}`
    };

    // Consolidate the review
    const consolidatedContent = await consolidateReview(review, API_KEY, MODEL_NAME);

    // Update the review object with the consolidated content
    const consolidatedReview = {
      ...review,
      content: consolidatedContent
    };

    // Format the consolidated review as Markdown
    const formattedReview = formatAsMarkdown(consolidatedReview);

    // Generate output file path
    const outputFilePath = path.join(
      path.dirname(reviewFilePath),
      `consolidated-${path.basename(reviewFilePath)}`
    );

    // Write the consolidated review to a new file
    fs.writeFileSync(outputFilePath, formattedReview);

    logger.info(`Consolidated review saved to: ${outputFilePath}`);
  } catch (error) {
    logger.error(`Error consolidating review: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();