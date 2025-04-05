import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/**
 * Check if a file exists
 * @param filePath Path to the file
 * @returns Promise resolving to boolean indicating if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Check if a directory exists
 * @param dirPath Path to the directory
 * @returns Promise resolving to boolean indicating if directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Create a directory and any parent directories if they don't exist
 * @param dirPath Path to the directory
 * @returns Promise resolving when directory is created
 */
export async function createDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist
    const exists = await directoryExists(dirPath);
    if (!exists) {
      throw error;
    }
  }
}

/**
 * Read a file's content
 * @param filePath Path to the file
 * @returns Promise resolving to file content as string
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Write content to a file
 * @param filePath Path to the file
 * @param content Content to write
 * @returns Promise resolving when file is written
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  // Ensure directory exists
  await createDirectory(path.dirname(filePath));
  return fs.writeFile(filePath, content);
}
