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
