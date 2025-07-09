/**
 * @fileoverview File system utilities for the code review tool.
 *
 * This module provides utilities for working with the file system,
 * including reading and writing files, creating directories, and
 * generating versioned output paths.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ReviewType } from '../types/review';
import logger from './logger';

/**
 * Create a directory if it doesn't exist
 * @param dirPath Directory path
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch (_error) {
    // Directory doesn't exist, create it
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Generate a versioned output path for review results
 * @param reviewType Type of review
 * @param filePath Path of the file being reviewed
 * @returns Versioned output path
 */
export function generateVersionedOutputPath(reviewType: ReviewType, filePath: string): string {
  // Get the current date
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '-');

  // Get the base name of the file
  const baseName = path.basename(filePath);

  // Create the output directory if it doesn't exist
  const outputDir = path.resolve(process.cwd(), 'ai-code-review-docs');

  // Generate the output file name
  const outputFileName = `${reviewType}-review-${baseName}-${dateStr}.md`;

  // Return the full output path
  return path.join(outputDir, outputFileName);
}

/**
 * Generate a versioned output path for consolidated review results
 * @param reviewType Type of review
 * @param sourceDir Directory being reviewed
 * @returns Versioned output path
 */
export function generateConsolidatedOutputPath(reviewType: ReviewType, sourceDir: string): string {
  // Get the current date
  const now = new Date();
  const dateStr = now
    .toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
    .replace(/\//g, '-');

  // Get the base name of the directory
  const baseName = path.basename(sourceDir);

  // Create the output directory if it doesn't exist
  const outputDir = path.resolve(process.cwd(), 'ai-code-review-docs');

  // Generate the output file name
  const outputFileName = `${reviewType}-review-${baseName}-${dateStr}.md`;

  // Return the full output path
  return path.join(outputDir, outputFileName);
}

/**
 * Write review results to a file
 * @param outputPath Output file path
 * @param content Review content
 */
export async function writeReviewToFile(outputPath: string, content: string): Promise<void> {
  try {
    // Ensure the output directory exists
    await ensureDirectoryExists(path.dirname(outputPath));

    // Write the content to the file
    await fs.writeFile(outputPath, content, 'utf-8');

    logger.info(`Review saved to: ${outputPath}`);
  } catch (error) {
    logger.error(`Error writing review to file ${outputPath}:`, error);
    throw error;
  }
}

/**
 * Read a file and return its content
 * @param filePath File path
 * @returns File content
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    logger.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Check if a file exists
 * @param filePath File path
 * @returns True if the file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}
