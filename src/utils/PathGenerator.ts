/**
 * @fileoverview Path generation utilities.
 *
 * This module provides utilities for generating file and directory paths,
 * including versioned output paths for review results.
 */

import path from 'node:path';
import { ensureDirectoryExists } from './FileWriter';
import { pathExists } from './pathValidator';

/**
 * Generate a versioned output path for a file
 * @param baseDir Base directory for the output
 * @param prefix Prefix for the filename
 * @param extension File extension (including the dot)
 * @param modelName Name of the model used for the review
 * @param targetName Name of the target file or directory
 * @returns Promise resolving to the generated path
 */
export async function generateVersionedOutputPath(
  baseDir: string,
  prefix: string,
  extension: string,
  modelName: string,
  targetName: string,
): Promise<string> {
  // Ensure the output directory exists
  await ensureDirectoryExists(baseDir);

  // Generate a timestamp for the filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Clean up the model name for use in a filename
  const cleanModelName = modelName.replace(/[^a-zA-Z0-9-]/g, '-');

  // Clean up the target name for use in a filename
  let cleanTargetName = targetName.replace(/[^a-zA-Z0-9-]/g, '-');

  // Handle special cases for target names
  if (targetName === '.' || cleanTargetName === '-' || cleanTargetName === '') {
    cleanTargetName = 'current-dir';
  }

  // Remove any sequential dashes
  cleanTargetName = cleanTargetName.replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Generate the filename
  const filename = `${prefix}-${cleanTargetName}-${cleanModelName}-${timestamp}${extension}`;

  // Return the full path
  return path.join(baseDir, filename);
}

/**
 * Generate an output path for a file with a unique name
 * @param baseDir Base directory for the output
 * @param filename Desired filename
 * @returns Promise resolving to the generated path
 */
export async function generateUniqueOutputPath(baseDir: string, filename: string): Promise<string> {
  // Ensure the output directory exists
  await ensureDirectoryExists(baseDir);

  // Generate the initial path
  let outputPath = path.join(baseDir, filename);

  // If the file already exists, add a number to the filename
  if (await pathExists(outputPath)) {
    const extension = path.extname(filename);
    const nameWithoutExtension = path.basename(filename, extension);
    let counter = 1;

    // Try different numbers until we find an available filename
    while (await pathExists(outputPath)) {
      outputPath = path.join(baseDir, `${nameWithoutExtension}-${counter}${extension}`);
      counter++;
    }
  }

  return outputPath;
}

/**
 * Generate a temporary file path
 * @param prefix Prefix for the filename
 * @param extension File extension (including the dot)
 * @returns Generated temporary file path
 */
export function generateTempFilePath(prefix: string, extension: string): string {
  const timestamp = Date.now();
  const randomPart = Math.floor(Math.random() * 10000);
  return path.join(
    process.env.TEMP || process.env.TMP || '/tmp',
    `${prefix}-${timestamp}-${randomPart}${extension}`,
  );
}
