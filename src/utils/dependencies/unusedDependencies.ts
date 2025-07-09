/**
 * @fileoverview Unused dependency detection for AI Code Review
 *
 * This module provides functionality to detect unused dependencies
 * using tools like depcheck and provides actionable information.
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import logger from '../logger';

/**
 * Find unused dependencies using depcheck
 * @param projectPath Path to the project
 * @returns Array of unused dependencies
 */
export async function findUnusedDependencies(projectPath: string): Promise<string[]> {
  logger.info('Detecting unused dependencies...');

  try {
    // Check if depcheck is installed locally
    const depcheckPath = path.join(projectPath, 'node_modules', '.bin', 'depcheck');
    let useLocalDepcheck = false;

    try {
      await fs.access(depcheckPath);
      useLocalDepcheck = true;
      logger.info('Using locally installed depcheck');
    } catch (_error) {
      logger.warn('depcheck not found in node_modules, attempting to use global installation');
      // Try to use globally installed depcheck
      try {
        execSync('depcheck --version', { stdio: 'ignore' });
        logger.info('Using globally installed depcheck');
      } catch (_globalError) {
        logger.error('depcheck not installed globally either');
        logger.info('Installing depcheck temporarily for analysis...');

        try {
          // Try to install depcheck temporarily using npm
          execSync('npm install --no-save depcheck', {
            cwd: projectPath,
            stdio: 'inherit',
          });
          // Use the newly installed depcheck
          useLocalDepcheck = true;
          logger.info('Temporary depcheck installation succeeded');
        } catch (installError) {
          logger.error(`Failed to install depcheck: ${installError}`);
          return ['Error: depcheck not installed and could not be installed temporarily'];
        }
      }
    }

    // Run depcheck with JSON output
    let result;
    if (useLocalDepcheck) {
      logger.info(`Running depcheck from: ${depcheckPath}`);
      result = spawnSync('node', [depcheckPath, '--json'], {
        cwd: projectPath,
        encoding: 'utf-8',
        shell: true,
      });
    } else {
      logger.info('Running global depcheck');
      result = spawnSync('depcheck', ['--json'], {
        cwd: projectPath,
        encoding: 'utf-8',
        shell: true,
      });
    }

    if (result.status !== 0) {
      logger.error(`depcheck failed with status ${result.status}: ${result.stderr}`);
      // Still try to parse output if available
      if (!result.stdout) {
        logger.error('No output received from depcheck');
        return ['Error running depcheck'];
      }
    }

    // Parse the JSON output
    try {
      // Debug the output to see what we're getting
      logger.debug(`Raw depcheck output type: ${typeof result.stdout}`);
      logger.debug(`Raw depcheck output sample: ${result.stdout.substring(0, 100)}...`);

      // Handle special case with depcheck's output which might be array notation
      if (result.stdout.trim().startsWith('[')) {
        // This might be just an array of unused dependencies in string format
        try {
          // Try parsing as an array of strings
          const parsedArray = JSON.parse(result.stdout);
          if (Array.isArray(parsedArray) && parsedArray.every((item) => typeof item === 'string')) {
            logger.info(
              `Found ${parsedArray.length} unused dependencies directly from array output`,
            );
            return parsedArray;
          }
        } catch (arrayParseError) {
          logger.warn(`Could not parse as direct array: ${arrayParseError}`);
        }
      }

      // Regular case - try to parse full JSON object output
      const outputData = JSON.parse(result.stdout);

      if (!outputData || typeof outputData !== 'object') {
        logger.warn('Depcheck returned invalid JSON structure');
        return ['Error: Invalid depcheck output format'];
      }

      // Get the list of unused dependencies
      let unusedDeps: string[] = [];

      // Handle possible output formats
      if (outputData.dependencies && typeof outputData.dependencies === 'object') {
        // Normal format with dependencies and devDependencies objects
        unusedDeps = [
          ...Object.keys(outputData.dependencies || {}),
          ...Object.keys(outputData.devDependencies || {}),
        ];
      } else if (Array.isArray(outputData)) {
        // Simple array of dependency names
        unusedDeps = outputData;
      } else {
        // Try to extract from any format we can find
        for (const entry of Object.entries(outputData)) {
          const value = entry[1]; // Get the value from the entry
          if (typeof value === 'object' && value !== null) {
            unusedDeps.push(...Object.keys(value));
          } else if (Array.isArray(value)) {
            unusedDeps.push(...value.filter((item) => typeof item === 'string'));
          }
        }
      }

      // Filter out empty or non-string entries
      unusedDeps = unusedDeps.filter((dep) => dep && typeof dep === 'string');

      // Log the full list for debugging
      logger.debug(`Unused dependencies: ${JSON.stringify(unusedDeps)}`);
      logger.info(`Found ${unusedDeps.length} unused dependencies`);

      return unusedDeps;
    } catch (parseError) {
      logger.error(`Error parsing depcheck output: ${parseError}`);
      logger.debug(`Raw depcheck output: ${result.stdout.substring(0, 200)}...`);

      // Try a simple fallback parsing method for common depcheck output formats
      try {
        // Some versions of depcheck output a simple list of names
        const lines = result.stdout.split('\n').filter(Boolean);
        if (lines.length > 0 && lines[0].trim().match(/^[a-zA-Z0-9@/-]+$/)) {
          logger.info(`Extracted ${lines.length} dependencies from plain text output`);
          return lines;
        }
      } catch (fallbackError) {
        logger.error(`Fallback parsing also failed: ${fallbackError}`);
      }

      return ['Error parsing depcheck output'];
    }
  } catch (error) {
    logger.error(`Error finding unused dependencies: ${error}`);
    return ['Error detecting unused dependencies'];
  }
}
