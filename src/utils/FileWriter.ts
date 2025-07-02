/**
 * @fileoverview File writing utilities.
 *
 * This module provides utilities for writing files and creating directories,
 * with error handling and logging.
 */

import fs from 'fs/promises';
import path from 'path';
import logger from './logger';
import { pathExists } from './pathValidator';

/**
 * Create a directory if it doesn't exist
 * @param dirPath Path to the directory
 * @returns Promise resolving when the directory is created or already exists
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    if (!pathExists(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
      logger.debug(`Created directory: ${dirPath}`);
    }
  } catch (error) {
    logger.error(
      `Error creating directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Write content to a file, creating the directory if needed
 * @param filePath Path to the file
 * @param content Content to write
 * @returns Promise resolving when the file is written
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    await ensureDirectoryExists(dirPath);

    // Write the file
    await fs.writeFile(filePath, content);
    logger.debug(`Wrote file: ${filePath}`);
  } catch (error) {
    logger.error(
      `Error writing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Append content to a file, creating the file if it doesn't exist
 * @param filePath Path to the file
 * @param content Content to append
 * @returns Promise resolving when the content is appended
 */
export async function appendFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    await ensureDirectoryExists(dirPath);

    // Append to the file
    await fs.appendFile(filePath, content);
    logger.debug(`Appended to file: ${filePath}`);
  } catch (error) {
    logger.error(
      `Error appending to file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
