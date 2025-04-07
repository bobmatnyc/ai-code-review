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

// Re-export from PathValidator
export { 
  validatePath,
  fileExists as pathExists,
  directoryExists as isDirectory,
  fileExists as isFile
} from './PathValidator';

// Re-export from FileReader
export {
  readFile,
  readFileWithInfo,
  readFilesWithInfo,
  readFilesInDirectory as findFilesInDirectory
} from './FileReader';

// Re-export from FileWriter
export {
  createDirectory as ensureDirectoryExists,
  writeFile,
  appendFile
} from './FileWriter';

// Re-export from PathGenerator
export {
  generateVersionedOutputPath,
  generateUniqueOutputPath,
  generateTempFilePath
} from './PathGenerator';
