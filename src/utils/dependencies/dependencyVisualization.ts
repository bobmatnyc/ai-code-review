/**
 * @fileoverview Dependency visualization utilities for AI Code Review
 *
 * This module contains functions for generating and working with
 * dependency visualizations using tools like dependency-cruiser.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { globSync } from 'glob';
import logger from '../logger';

/**
 * Run dependency visualization using dependency-cruiser
 * @param projectPath Path to the project
 * @returns Path to the generated visualization
 */
export async function generateDependencyVisualization(projectPath: string): Promise<string | null> {
  logger.info('Generating dependency visualization...');

  try {
    // Create output directory
    const outputDir = path.join(projectPath, 'dependency-analysis');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate SVG visualization
    const outputPath = path.join(outputDir, 'dependency-graph.svg');
    const jsonOutputPath = path.join(outputDir, 'dependencies.json');

    // Try to find dependency-cruiser installation
    const localDepCruiserPath = path.join(projectPath, 'node_modules', '.bin', 'depcruise');
    let depCruiserCommand = '';

    try {
      await fs.access(localDepCruiserPath);
      depCruiserCommand = localDepCruiserPath;
      logger.info('Using locally installed dependency-cruiser');
    } catch (_error) {
      logger.warn('dependency-cruiser not found in node_modules, checking global installation');

      try {
        // Check for global installation
        execSync('dependency-cruiser --version', { stdio: 'ignore' });
        depCruiserCommand = 'dependency-cruiser';
        logger.info('Using globally installed dependency-cruiser');
      } catch (_globalError) {
        // Try depcruise command instead (sometimes installed as depcruise instead of dependency-cruiser)
        try {
          execSync('depcruise --version', { stdio: 'ignore' });
          depCruiserCommand = 'depcruise';
          logger.info('Using globally installed depcruise');
        } catch (_depCruiseError) {
          logger.error('dependency-cruiser not found globally either');
          logger.info('Installing dependency-cruiser temporarily for analysis...');

          try {
            // Try to install dependency-cruiser temporarily
            execSync('npm install --no-save dependency-cruiser graphviz', {
              cwd: projectPath,
              stdio: 'inherit',
            });

            // Use the newly installed dependency-cruiser
            depCruiserCommand = localDepCruiserPath;
            logger.info('Temporary dependency-cruiser installation succeeded');
          } catch (installError) {
            logger.error(`Failed to install dependency-cruiser: ${installError}`);
            return null;
          }
        }
      }
    }

    // Check for graphviz (dot) command availability
    let hasDot = false;
    try {
      execSync('dot -V', { stdio: 'ignore' });
      hasDot = true;
      logger.info('Graphviz dot command is available');
    } catch (_dotError) {
      logger.warn('Graphviz dot command not available, will use JSON output only');
    }

    // First, generate JSON output in any case
    try {
      const srcDir = path.join(projectPath, 'src');

      // Check if src directory exists
      const srcExists = await fs
        .access(srcDir)
        .then(() => true)
        .catch(() => false);
      const targetDir = srcExists ? 'src' : '.';

      logger.info(`Analyzing dependencies in ${targetDir} directory`);

      execSync(
        `"${depCruiserCommand}" --include-only "^${targetDir}" --output-type json > "${jsonOutputPath}"`,
        {
          cwd: projectPath,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      logger.info(`Dependency data generated at ${jsonOutputPath}`);

      // If dot is available, also generate SVG visualization
      if (hasDot) {
        logger.info('Generating SVG visualization with Graphviz');

        execSync(
          `"${depCruiserCommand}" --include-only "^${targetDir}" --output-type dot ${targetDir} | dot -T svg > "${outputPath}"`,
          {
            cwd: projectPath,
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );

        logger.info(`Dependency visualization generated at ${outputPath}`);
        return outputPath;
      }

      return jsonOutputPath;
    } catch (execError) {
      logger.error(`Error executing dependency-cruiser: ${execError}`);

      // Create a simple text report as fallback
      const fallbackPath = path.join(outputDir, 'dependencies-fallback.txt');

      // List all .js and .ts files in src
      try {
        const files = globSync('src/**/*.{js,ts,jsx,tsx}', { cwd: projectPath });
        await fs.writeFile(
          fallbackPath,
          `Found ${files.length} JavaScript/TypeScript files in the project.\n\nFiles:\n${files.join('\n')}`,
        );

        logger.info(`Created fallback dependency listing at ${fallbackPath}`);
        return fallbackPath;
      } catch (fallbackError) {
        logger.error(`Error creating fallback report: ${fallbackError}`);
        return null;
      }
    }
  } catch (error) {
    logger.error(`Error generating dependency visualization: ${error}`);
    return null;
  }
}
