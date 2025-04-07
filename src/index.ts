#!/usr/bin/env node

/**
 * @fileoverview Main entry point for the AI Code Review CLI tool.
 *
 * This file serves as the primary entry point for the AI Code Review command-line interface.
 * It handles environment variable loading, command-line argument parsing, and dispatches
 * to the appropriate command handlers. The tool supports multiple review types including
 * quick fixes, architectural reviews, security reviews, and performance reviews.
 *
 * Key responsibilities:
 * - Loading environment variables from .env.local
 * - Setting up command-line interface and argument parsing
 * - Dispatching to appropriate command handlers based on user input
 * - Providing help and usage information
 * - Handling model testing and verification
 *
 * Usage: ai-code-review [file|directory] [options]
 */

// Load dotenv as early as possible
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Import logger after dotenv so it can use environment variables
import logger, { LogLevel } from './utils/logger';

// Check if debug mode is enabled
const isDebugMode = process.argv.includes('--debug');

// Helper function for debug logging
function debugLog(message: string): void {
  if (isDebugMode) {
    logger.debug(message);
  }
}

// Set log level to DEBUG if debug mode is enabled
if (isDebugMode) {
  logger.setLogLevel(LogLevel.DEBUG);
}

// First try to load from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
debugLog(`Attempting to load environment variables from: ${envLocalPath}`);

// Check if .env.local exists
let envFileExists = false;
try {
  envFileExists = fs.existsSync(envLocalPath);
} catch (err) {
  logger.error('Error checking if .env.local exists:', err);
}

if (envFileExists) {
  // Load .env.local
  const result = dotenv.config({ path: envLocalPath });

  if (result.error) {
    console.error('Error parsing .env.local file:', result.error);
  } else {
    debugLog('Successfully loaded environment variables from .env.local');
  }

  // Read the file content for debugging
  try {
    if (isDebugMode) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      debugLog('Variables found in .env.local (names only):');
      const varNames = envContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.split('=')[0]);
      debugLog(varNames.join(', '));
    }
  } catch (err) {
    console.error('Error reading .env.local file:', err);
  }
} else {
  console.warn('.env.local file not found. Trying to load from .env');
  // Try to load from .env as fallback
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error('Error loading .env file:', result.error);
    } else {
      debugLog('Successfully loaded environment variables from .env');
    }
  } catch (err) {
    console.error('Error loading any environment files:', err);
  }
}

// Check if we have any API keys after all attempts
const hasGoogleKey = !!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;
const hasOpenRouterKey = !!process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;
const hasAnthropicKey = !!process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

// Check for model configuration
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || process.env.CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';
const [adapter, model] = selectedModel.includes(':') ? selectedModel.split(':') : ['gemini', selectedModel];

if (adapter === 'gemini' && hasGoogleKey) {
  console.log(`Using Gemini API with model: ${model}`);
} else if (adapter === 'openrouter' && hasOpenRouterKey) {
  console.log(`Using OpenRouter API with model: ${model}`);
} else if (adapter === 'anthropic' && hasAnthropicKey) {
  console.log(`Using Anthropic API with model: ${model}`);
} else if (adapter === 'gemini' && !hasGoogleKey) {
  console.error(`Gemini API key not found but Gemini model selected (${model}).`);
  console.error('Please add AI_CODE_REVIEW_GOOGLE_API_KEY to your .env.local file.');
  process.exit(1);
} else if (adapter === 'openrouter' && !hasOpenRouterKey) {
  console.error(`OpenRouter API key not found but OpenRouter model selected (${model}).`);
  console.error('Please add AI_CODE_REVIEW_OPENROUTER_API_KEY to your .env.local file.');
  process.exit(1);
} else if (adapter === 'anthropic' && !hasAnthropicKey) {
  console.error(`Anthropic API key not found but Anthropic model selected (${model}).`);
  console.error('Please add AI_CODE_REVIEW_ANTHROPIC_API_KEY to your .env.local file.');
  process.exit(1);
}

if (!hasGoogleKey && !hasOpenRouterKey && !hasAnthropicKey) {
  console.error('No API keys are available. Please add at least one API key.');
  console.error('Please make sure your .env.local file contains one of:');
  console.error('- AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here');
  console.error('- AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here');
  console.error('- AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here');
  process.exit(1);
}

// Import other dependencies after environment setup
import { reviewCode } from './commands/reviewCode';
import { runApiConnectionTests } from './tests/apiConnectionTest';
import { getCommandLineArguments } from './cli/argumentParser';

// Get version from package.json
const packageJson = require('../package.json');

// Main function to run the application
async function main() {
  try {
    // Parse command-line arguments
    const args = await getCommandLineArguments();

    // Check for version flag
    if (args.version) {
      console.log(`AI Code Review Tool v${packageJson.version}`);
      return;
    }

    // Check for test-api command
    if (args.testApi) {
      try {
        await runApiConnectionTests();
        // If we're only testing the API, exit after the test
        if (args.target === '.') {
          return;
        }
      } catch (error) {
        // Format the error message for better readability
        logger.error(`Error testing API connections: ${error instanceof Error ? error.message : String(error)}`);

        // Add a helpful message about common API issues
        logger.info('\nCommon solutions:');
        logger.info('- Check that your API keys are correctly set in .env.local');
        logger.info('- Verify that your internet connection is working');
        logger.info('- Ensure that the API services are available and not experiencing downtime');
        logger.info('- Check for any rate limiting issues with the API providers');

        process.exit(1);
      }
    }

    // Run the code review
    await reviewCode(args.target, args);
  } catch (error) {
    // Format the error message for better readability
    logger.error(`Error during code review: ${error instanceof Error ? error.message : String(error)}`);

    // Add a helpful message about common issues
    logger.info('\nCommon solutions:');
    logger.info('- Make sure you are running the command from the correct directory');
    logger.info('- Check that the target path exists and is within the current directory');
    logger.info('- For API issues, run with --test-api to verify your API connections');

    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  logger.error(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
