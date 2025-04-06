/**
 * @fileoverview File system utilities for the code review tool.
 *
 * This module provides a comprehensive set of file system operations used throughout
 * the code review tool. It abstracts common file operations like checking existence,
 * reading/writing files, creating directories, and generating output paths.
 *
 * Key responsibilities:
 * - Checking if files and directories exist
 * - Reading file content with proper encoding
 * - Creating directories with recursive support
 * - Writing review outputs to files
 * - Generating versioned output paths to prevent overwriting
 * - Finding files matching patterns
 * - Managing temporary files
 *
 * These utilities ensure consistent file system interaction across the application
 * and provide error handling for common file operations.
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/**
 * Validates a file path to prevent path traversal attacks
 * @param filePath Path to validate, can be absolute or relative
 * @param basePath Base directory that the path should be within, used as the security boundary
 * @returns The resolved absolute path if valid and within the base directory
 * @throws {Error} If the path is outside the base directory or if path resolution fails
 * @example
 * // Returns '/project/src/file.ts' (absolute path)
 * validatePath('./src/file.ts', '/project')
 *
 * // Throws error: Path traversal attempt detected
 * validatePath('../../etc/passwd', '/project')
 */
export function validatePath(filePath: string, basePath: string): string {
  // Normalize paths to handle different path formats
  const normalizedFilePath = path.normalize(filePath);

  // Check for path traversal attempts using '..' in the normalized path
  if (normalizedFilePath.includes('..')) {
    throw new Error(
      `Path traversal attempt detected. Path "${filePath}" contains ".." which is not allowed.`
    );
  }

  // Resolve absolute paths
  const absoluteFilePath = path.resolve(basePath, normalizedFilePath);
  const absoluteBasePath = path.resolve(basePath);

  // Use path.relative to ensure the path is truly within the base directory
  const relativePath = path.relative(absoluteBasePath, absoluteFilePath);

  // If the relative path starts with '..' or is absolute, it's outside the base directory
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(
      `Path traversal attempt detected. Path "${filePath}" is outside the base directory "${basePath}".`
    );
  }

  return absoluteFilePath;
}

/**
 * Check if a file exists
 * @param filePath Path to the file to check
 * @returns Promise resolving to boolean indicating if file exists and is a regular file
 * @example
 * if (await fileExists('./config.json')) {
 *   // File exists, proceed with reading it
 * }
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
 * @param dirPath Path to the directory to check
 * @returns Promise resolving to boolean indicating if directory exists and is a directory
 * @example
 * if (await directoryExists('./output')) {
 *   // Directory exists, proceed with writing files to it
 * } else {
 *   // Create the directory first
 *   await createDirectory('./output');
 * }
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
 * @param dirPath Path to the directory to create
 * @returns Promise resolving when directory is created or already exists
 * @throws {Error} If directory creation fails for reasons other than the directory already existing
 * @example
 * // Creates the entire path if it doesn't exist
 * await createDirectory('./reviews/project/output');
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
 * Generate a versioned output path for review files
 * @param outputBaseDir Base directory for output files
 * @param reviewType Type of review (e.g., 'quick-fixes', 'architectural')
 * @param extension File extension (default: .md)
 * @returns Promise resolving to the output path with version number if needed
 * @example
 * // Might return '/reviews/project/quick-fixes-2023-04-05.md' if no previous file exists
 * // or '/reviews/project/quick-fixes-2023-04-05-2.md' if a previous version exists
 * const outputPath = await generateVersionedOutputPath('/reviews/project', 'quick-fixes');
 */
export async function generateVersionedOutputPath(
  outputBaseDir: string,
  reviewType: string,
  extension: string = '.md'
): Promise<string> {
  // Format the current date for the filename
  const date = new Date();
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  // Base filename without version
  const baseFilename = `${reviewType}-${formattedDate}`;

  // Check for existing files with the same base name
  const pattern = `${baseFilename}-*${extension}`;
  let existingFiles: string[] = [];
  try {
    // Use our improved findFiles function with better error handling
    existingFiles = await findFiles(pattern, outputBaseDir);
  } catch (error: any) {
    // Continue with empty array if findFiles fails
    console.warn(`Could not find existing files with pattern "${pattern}". Using empty array.`);
  }

  // Also check for the file without version number
  const noVersionFile = path.join(outputBaseDir, `${baseFilename}${extension}`);
  const noVersionExists = await fileExists(noVersionFile);

  // Determine the next version number
  let nextVersion = 1;

  if (existingFiles.length > 0) {
    // Extract version numbers from existing files
    const versions = existingFiles.map(file => {
      const match = path.basename(file).match(new RegExp(`${baseFilename}-(\\d+)${extension.replace('.', '\\.')}$`));
      return match ? parseInt(match[1], 10) : 0;
    });

    // Find the highest version number
    nextVersion = Math.max(...versions) + 1;
  } else if (noVersionExists) {
    // If the file without version exists, start with version 1
    nextVersion = 1;
  } else {
    // If no files exist, don't add a version number
    return path.join(outputBaseDir, `${baseFilename}${extension}`);
  }

  // Return the path with version number
  return path.join(outputBaseDir, `${baseFilename}-${nextVersion}${extension}`);
}

/**
 * Read a file's content
 * @param filePath Path to the file
 * @param basePath Optional base directory to validate against for path traversal prevention
 * @returns Promise resolving to file content as string
 * @throws {Error} If the file cannot be read, does not exist, or is outside the base directory
 */
export async function readFile(filePath: string, basePath?: string): Promise<string> {
  try {
    // Validate path if basePath is provided
    const pathToRead = basePath ? validatePath(filePath, basePath) : filePath;

    return await fs.readFile(pathToRead, 'utf-8');
  } catch (error: any) {
    console.error(`Error reading file "${filePath}":`, error.message || error);
    throw new Error(`Could not read file: ${filePath}`);
  }
}

/**
 * Write content to a file
 * @param filePath Path to the file
 * @param content Content to write
 * @param basePath Optional base directory to validate against for path traversal prevention
 * @returns Promise resolving when file is written
 * @throws {Error} If the file cannot be written or is outside the base directory
 */
export async function writeFile(filePath: string, content: string, basePath?: string): Promise<void> {
  try {
    // Validate path if basePath is provided
    const pathToWrite = basePath ? validatePath(filePath, basePath) : filePath;

    // Ensure directory exists
    await createDirectory(path.dirname(pathToWrite));
    await fs.writeFile(pathToWrite, content);
  } catch (error: any) {
    console.error(`Error writing to file "${filePath}":`, error.message || error);
    throw new Error(`Could not write to file: ${filePath}`);
  }
}

/**
 * Find files matching a pattern with improved error handling
 * @param pattern Glob pattern to match files
 * @param cwd Base directory for the search (optional)
 * @param options Additional glob options (optional)
 * @returns Promise resolving to an array of matching file paths
 * @throws {Error} If the glob operation fails with an unexpected error
 */
export async function findFiles(
  pattern: string,
  cwd?: string,
  options: { nodir?: boolean; ignore?: string[] } = {}
): Promise<string[]> {
  try {
    // Set default options for better performance and security
    const globOptions = {
      nodir: options.nodir !== undefined ? options.nodir : true,
      absolute: true,
      follow: false,
      ...(cwd ? { cwd } : {}),
      ...(options.ignore ? { ignore: options.ignore } : {})
    };

    const files = await glob(pattern, globOptions);

    if (files.length === 0) {
      const cwdInfo = cwd ? ` in directory "${cwd}"` : '';
      console.warn(`No files found matching pattern "${pattern}"${cwdInfo}.`);
    }

    return files;
  } catch (error: any) {
    const cwdInfo = cwd ? ` in directory "${cwd}"` : '';
    console.error(`Error finding files with pattern "${pattern}"${cwdInfo}:`, error.message || error);
    throw new Error(`Failed to execute glob pattern: ${pattern}`);
  }
}
