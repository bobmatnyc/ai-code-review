#!/usr/bin/env node

/**
 * @fileoverview Command to list all available models.
 *
 * This module provides a command-line interface for listing all available models
 * based on configured API keys.
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { listModels, printCurrentModel } from '../clients/utils/modelLister';
// import * as dotenv from 'dotenv'; // Not used in this file
// import * as path from 'path'; // Not used in this file
import { loadEnvVariables } from '../utils/envLoader';

/**
 * Main function to run the list-models command
 */
async function main(): Promise<void> {
  // Load environment variables from the tool's directory first
  await loadEnvVariables();

  // Parse command line arguments
  const argv = await yargs(hideBin(process.argv))
    .option('available', {
      alias: 'a',
      type: 'boolean',
      default: false,
      describe: 'Show only available models (with configured API keys)',
    })
    .option('current', {
      alias: 'c',
      type: 'boolean',
      default: false,
      describe: 'Show only the current model (from AI_CODE_REVIEW_MODEL)',
    })
    .help()
    .parse();

  // Print models
  if (argv.current) {
    printCurrentModel();
  } else {
    listModels(argv.available);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
