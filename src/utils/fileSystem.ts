/**
 * @fileoverview File system utilities for the code review tool.
 *
 * This module re-exports utilities from more specialized modules to maintain
 * backward compatibility while adhering to the Single Responsibility Principle.
 *
 * The original functionality has been split into:
 * - PathValidator: For path validation and security checks
 * - FileReader: For reading file operations
 * - FileWriter: For writing file operations
 * - PathGenerator: For generating output paths
 */

// Import from PathValidator for aliases
import {
  validateTargetPath,
  pathExists,
  isDirectory,
  isFile,
  isPathWithinCwd
} from './PathValidator';

// Re-export from PathValidator
export { validateTargetPath, pathExists, isDirectory, isFile, isPathWithinCwd };

// Aliases for backward compatibility
export const fileExists = pathExists;
export const directoryExists = isDirectory;
export const validatePath = validateTargetPath;

// Re-export from FileReader
export {
  readFile,
  readFileWithInfo,
  readFilesWithInfo,
  readFilesInDirectory as findFilesInDirectory
} from './FileReader';

// Import from FileWriter for aliases
import {
  ensureDirectoryExists,
  writeFile as writeFileImpl,
  appendFile as appendFileImpl
} from './FileWriter';

// Re-export from FileWriter
export {
  ensureDirectoryExists,
  writeFileImpl as writeFile,
  appendFileImpl as appendFile
};

// Alias for backward compatibility
export const createDirectory = ensureDirectoryExists;

// Re-export from PathGenerator
export {
  generateVersionedOutputPath,
  generateUniqueOutputPath,
  generateTempFilePath
} from './PathGenerator';
