/**
 * @fileoverview File system utilities for the code review tool.
 *
 * This module re-exports utilities from more specialized modules to maintain
 * backward compatibility while adhering to the Single Responsibility Principle.
 *
 * The original functionality has been split into:
 * - pathValidator: For path validation and security checks
 * - fileReader: For reading file operations
 * - fileWriter: For writing file operations
 * - pathGenerator: For generating output paths
 */

// Import from pathValidator for aliases
import {
  isDirectory,
  isFile,
  isPathWithinCwd,
  pathExists,
  validateTargetPath,
} from './pathValidator';

// Re-export from pathValidator
export { validateTargetPath, pathExists, isDirectory, isFile, isPathWithinCwd };

// Aliases for backward compatibility
export const fileExists = pathExists;
export const directoryExists = isDirectory;
export const validatePath = validateTargetPath;

// Re-export from fileReader
export {
  readFile,
  readFilesInDirectory as findFilesInDirectory,
  readFilesWithInfo,
  readFileWithInfo,
} from './FileReader';

// Import from fileWriter for aliases
import {
  appendFile as appendFileImpl,
  ensureDirectoryExists,
  writeFile as writeFileImpl,
} from './FileWriter';

// Re-export from fileWriter
export { ensureDirectoryExists, writeFileImpl as writeFile, appendFileImpl as appendFile };

// Alias for backward compatibility
export const createDirectory = ensureDirectoryExists;

// Re-export from pathGenerator
export {
  generateTempFilePath,
  generateUniqueOutputPath,
  generateVersionedOutputPath,
} from './PathGenerator';
