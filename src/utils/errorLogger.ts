/**
 * @fileoverview Error logging utilities for the code review tool.
 *
 * This module provides error logging functionality to capture and persist error
 * information for debugging and troubleshooting. It writes detailed error logs
 * to files with timestamps and contextual information to help diagnose issues.
 *
 * Key responsibilities:
 * - Capturing error details including stack traces
 * - Recording contextual information about the error environment
 * - Writing error logs to timestamped files
 * - Creating error log directories as needed
 * - Providing a consistent error logging interface across the application
 *
 * These utilities help developers diagnose and fix issues by preserving detailed
 * error information that might otherwise be lost in console output.
 */

import fs from 'fs/promises';
import path from 'path';
import { createDirectory } from './fileSystem';

/**
 * Log an error to a file
 * @param error Error to log
 * @param context Additional context information
 * @returns Promise resolving to the path of the error log file
 */
export async function logError(error: any, context: Record<string, any> = {}): Promise<string> {
  try {
    // Create error logs directory
    const errorLogsDir = path.resolve('error-logs');
    await createDirectory(errorLogsDir);

    // Generate timestamp for the filename
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const errorLogPath = path.join(errorLogsDir, `error-${timestamp}.json`);

    // Format error object
    const errorObj = {
      timestamp: new Date().toISOString(),
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      context,
    };

    // Write error to file
    await fs.writeFile(errorLogPath, JSON.stringify(errorObj, null, 2));

    console.error(`Error logged to: ${errorLogPath}`);
    return errorLogPath;
  } catch (logError) {
    console.error('Failed to log error:', logError);
    return '';
  }
}
