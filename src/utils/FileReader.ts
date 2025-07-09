/**
 * @fileoverview File reading utilities.
 *
 * This module provides utilities for reading files and directories,
 * with error handling and logging.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileInfo } from '../types/review';
import logger from './logger';

/**
 * Read a file and return its content
 * @param filePath Path to the file
 * @returns Promise resolving to the file content
 * @throws Error if the file cannot be read
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    logger.error(
      `Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Read a file and return its content with file info
 * @param filePath Path to the file
 * @returns Promise resolving to a FileInfo object
 */
export async function readFileWithInfo(filePath: string): Promise<FileInfo> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const extension = path.extname(filePath).slice(1);

    return {
      path: filePath,
      content,
      extension,
    };
  } catch (error) {
    logger.error(
      `Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Read multiple files and return their contents with file info
 * @param filePaths Array of file paths
 * @returns Promise resolving to an array of FileInfo objects
 */
export async function readFilesWithInfo(filePaths: string[]): Promise<FileInfo[]> {
  const fileInfoPromises = filePaths.map((filePath) => readFileWithInfo(filePath));
  return Promise.all(fileInfoPromises);
}

/**
 * Read all files in a directory recursively
 * @param dirPath Path to the directory
 * @param filter Optional filter function to exclude certain files
 * @returns Promise resolving to an array of file paths
 */
export async function readFilesInDirectory(
  dirPath: string,
  filter?: (filePath: string) => boolean,
): Promise<string[]> {
  const result: string[] = [];

  async function processDirectory(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(entryPath);
      } else if (entry.isFile()) {
        if (!filter || filter(entryPath)) {
          result.push(entryPath);
        }
      }
    }
  }

  await processDirectory(dirPath);
  return result;
}
