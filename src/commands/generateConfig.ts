/**
 * @fileoverview Command handler for generating sample JSON configuration files.
 *
 * This module provides functionality to generate sample configuration files
 * with all available options, API key placeholders, and helpful comments.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateSampleConfig, generateSampleConfigJSON } from '../utils/configFileManager';
import logger from '../utils/logger';

/**
 * Generate a sample configuration file with enhanced content
 * @param outputPath Path where to save the configuration file
 * @param force Whether to overwrite existing files
 * @param format Format to use ('yaml' or 'json')
 * @returns Promise that resolves when the file is created
 */
export async function generateConfigCommand(
  outputPath: string,
  force = false,
  format: 'yaml' | 'json' = 'yaml',
): Promise<void> {
  try {
    // Resolve the output path
    const resolvedPath = path.resolve(process.cwd(), outputPath);

    // Check if file already exists
    if (fs.existsSync(resolvedPath) && !force) {
      logger.error(`Configuration file already exists at ${resolvedPath}`);
      logger.info('Use --force to overwrite the existing file');
      process.exit(1);
    }

    // Generate sample configuration in the specified format
    const sampleConfig = format === 'json' ? generateSampleConfigJSON() : generateSampleConfig();

    // Write the file
    fs.writeFileSync(resolvedPath, sampleConfig, 'utf-8');

    logger.info(`Sample ${format.toUpperCase()} configuration file created at: ${resolvedPath}`);
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Edit the configuration file to add your API keys');
    logger.info('2. Customize the settings according to your needs');
    logger.info('3. Run the tool with: ai-code-review --config ' + path.basename(resolvedPath));
    logger.info('');
    logger.info('Configuration priority order:');
    logger.info('1. Command-line arguments (highest priority)');
    logger.info('2. JSON configuration file');
    logger.info('3. Environment variables');
    logger.info('4. Default values (lowest priority)');
  } catch (error) {
    logger.error(
      `Failed to generate configuration file: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

/**
 * Handle the generate-config command from CLI
 * @param argv Command line arguments
 */
export async function handleGenerateConfigCommand(argv: any): Promise<void> {
  // Default to YAML format
  let outputPath = argv.output || '.ai-code-review.yaml';
  const force = argv.force || false;

  // Detect format from file extension or explicit format option
  let format: 'yaml' | 'json' = 'yaml';
  if (argv.format) {
    format = argv.format;
    // Update output path if format was explicitly specified but path wasn't
    if (!argv.output) {
      outputPath = format === 'json' ? '.ai-code-review.json' : '.ai-code-review.yaml';
    }
  } else {
    // Auto-detect from file extension
    const ext = path.extname(outputPath).toLowerCase();
    if (ext === '.json') {
      format = 'json';
    } else if (ext === '.yaml' || ext === '.yml') {
      format = 'yaml';
    }
  }

  await generateConfigCommand(outputPath, force, format);
}
