/**
 * @fileoverview Utility for generating and saving unused code removal scripts.
 *
 * This module provides utilities for generating and saving shell scripts
 * that can be used to remove unused code identified in reviews.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ReviewResult } from '../types/review';
import logger from './logger';

/**
 * Generate and save a removal script for unused code
 * @param reviewResult Review result containing metadata with the removal script
 * @param outputDir Directory to save the script to
 * @returns Path to the saved script
 */
export async function saveRemovalScript(
  reviewResult: ReviewResult,
  outputDir: string,
): Promise<string | null> {
  try {
    // Check if the review result has a removal script
    if (!reviewResult.metadata?.removalScript) {
      logger.debug('No removal script found in review result');
      return null;
    }

    // Create the output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Generate a filename based on review info
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `unused-code-removal-script-${timestamp}.sh`;
    const scriptPath = path.join(outputDir, filename);

    // Write the script to file
    await fs.writeFile(scriptPath, reviewResult.metadata.removalScript as string, {
      mode: 0o755,
    }); // Make it executable

    logger.info(`Generated removal script: ${scriptPath}`);

    return scriptPath;
  } catch (error) {
    logger.error('Error generating removal script:', error);
    return null;
  }
}

/**
 * Print instructions for using the removal script
 * @param scriptPath Path to the removal script
 */
export function printRemovalScriptInstructions(scriptPath: string | null): void {
  if (!scriptPath) {
    return;
  }

  console.log('\n----------------------------------------------------------------------');
  console.log('UNUSED CODE REMOVAL SCRIPT GENERATED');
  console.log('----------------------------------------------------------------------');
  console.log('A script has been generated to help you remove unused files and functions:');
  console.log(`  ${scriptPath}`);
  console.log('\nBefore running this script:');
  console.log('1. REVIEW the script carefully to ensure it only removes code you want to remove');
  console.log('2. MAKE A BACKUP of your codebase or commit your current changes');
  console.log('3. Run in a clean git working directory to easily see the changes');
  console.log('\nTo run the script:');
  console.log(`  chmod +x ${scriptPath}`);
  console.log(`  ${scriptPath}`);
  console.log('\nAfter running:');
  console.log('  git diff               # To see what was removed');
  console.log('  git checkout -- <file> # To restore any files if needed');
  console.log('----------------------------------------------------------------------\n');
}

export default {
  saveRemovalScript,
  printRemovalScriptInstructions,
};
