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
 * Generate a versioned output path for review files
 * @param outputBaseDir Base directory for output
 * @param reviewType Type of review
 * @param extension File extension (default: .md)
 * @returns Promise resolving to the output path with version
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
  const pattern = path.join(outputBaseDir, `${baseFilename}-*${extension}`);
  const existingFiles = await glob(pattern);

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
