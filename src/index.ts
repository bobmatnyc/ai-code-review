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

// First try to load from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
console.log(`Attempting to load environment variables from: ${envLocalPath}`);

// Check if .env.local exists
let envFileExists = false;
try {
  envFileExists = fs.existsSync(envLocalPath);
} catch (err) {
  console.error('Error checking if .env.local exists:', err);
}

if (envFileExists) {
  // Load .env.local
  const result = dotenv.config({ path: envLocalPath });

  if (result.error) {
    console.error('Error parsing .env.local file:', result.error);
  } else {
    console.log('Successfully loaded environment variables from .env.local');
  }

  // Read the file content for debugging
  try {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    console.log('Variables found in .env.local (names only):');
    const varNames = envContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('=')[0]);
    console.log(varNames.join(', '));
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
      console.log('Successfully loaded environment variables from .env');
    }
  } catch (err) {
    console.error('Error loading any environment files:', err);
  }
}

// Check if we have any API keys after all attempts
const hasGoogleKey = !!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY || !!process.env.CODE_REVIEW_GOOGLE_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_KEY || !!process.env.AI_CODE_REVIEW_GOOGLE_GENERATIVE_AI_KEY;
const hasOpenRouterKey = !!process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY || !!process.env.CODE_REVIEW_OPENROUTER_API_KEY || !!process.env.OPENROUTER_API_KEY;

// Check for model configuration
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || process.env.CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';
const [adapter, model] = selectedModel.includes(':') ? selectedModel.split(':') : ['gemini', selectedModel];

if (adapter === 'gemini' && hasGoogleKey) {
  console.log(`Using Gemini API with model: ${model}`);
} else if (adapter === 'openrouter' && hasOpenRouterKey) {
  console.log(`Using OpenRouter API with model: ${model}`);
} else if (adapter === 'gemini' && !hasGoogleKey) {
  console.warn(`Gemini API key not found but Gemini model selected (${model}). Will use mock responses.`);
} else if (adapter === 'openrouter' && !hasOpenRouterKey) {
  console.warn(`OpenRouter API key not found but OpenRouter model selected (${model}). Will use mock responses.`);
}

if (!hasGoogleKey && !hasOpenRouterKey) {
  console.warn('No API keys are available. The tool will use mock responses.');
  console.warn('Please make sure your .env.local file contains one of:');
  console.warn('- AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here');
  console.warn('- AI_CODE_REVIEW_GOOGLE_GENERATIVE_AI_KEY=your_google_api_key_here');
  console.warn('- AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here');
  console.warn('- CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here (legacy)');
  console.warn('- CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here (legacy)');
}

// Import other dependencies after environment setup
import { Command } from 'commander';
import { reviewCode } from './commands/reviewCode';
import { runApiConnectionTests } from './tests/apiConnectionTest';

const program = new Command();

// Get version from package.json
const packageJson = require('../package.json');

program
  .name('ai-code-review')
  .description('AI-powered code review tool using Google Gemini AI models and OpenRouter API')
  .version(packageJson.version, '-v, --version', 'Output the current version');

program
  .command('test-api')
  .description('Test API connections to verify API keys')
  .action(async () => {
    try {
      await runApiConnectionTests();
    } catch (error) {
      // Format the error message for better readability
      if (error instanceof Error) {
        console.error('\x1b[31mError testing API connections:\x1b[0m', error.message);
      } else {
        console.error('\x1b[31mError testing API connections:\x1b[0m', error);
      }

      // Add a helpful message about common API issues
      console.error('\n\x1b[33mCommon solutions:\x1b[0m');
      console.error('- Check that your API keys are correctly set in .env.local');
      console.error('- Verify that your internet connection is working');
      console.error('- Ensure that the API services are available and not experiencing downtime');
      console.error('- Check for any rate limiting issues with the API providers');

      process.exit(1);
    }
  });

program
  .description('Review code in a file or directory within the current project')
  .argument('<target>', 'File or directory to review (relative to the current directory)')
  .option('-t, --type <type>', 'Type of review (architectural, quick-fixes, security, performance)', 'quick-fixes')
  .option('--include-tests', 'Include test files in the review', false)
  .option('-o, --output <format>', 'Output format (markdown, json)', 'markdown')
  .option('-d, --include-project-docs', 'Include project documentation (PROJECT.md only) in the context', true)
  .option('-c, --consolidated', 'Generate a single consolidated review instead of individual file reviews (default: true)', true)
  .option('--individual', 'Generate individual file reviews instead of a consolidated review', false)
  .option('-i, --interactive', 'Process review results interactively, implementing fixes based on priority', false)
  .option('--auto-fix', 'Automatically implement high priority fixes without confirmation', true)
  .option('--prompt-all', 'Prompt for confirmation on all fixes, including high priority ones', false)
  .option('--test-api', 'Test API connections before running the review', false)
  .option('--debug', 'Enable debug mode with additional logging', false)
  .option('-q, --quiet', 'Suppress non-essential output', false)
  .option('-h, --help', 'Display help information')
  .action(async (target, options) => {
    try {
      await reviewCode(target, options);
    } catch (error) {
      // Format the error message for better readability
      if (error instanceof Error) {
        console.error('\x1b[31mError during code review:\x1b[0m', error.message);
      } else {
        console.error('\x1b[31mError during code review:\x1b[0m', error);
      }

      // Add a helpful message about common issues
      console.error('\n\x1b[33mCommon solutions:\x1b[0m');
      console.error('- Make sure you are running the command from the correct directory');
      console.error('- Check that the target path exists and is within the current directory');
      console.error('- For API issues, run with --test-api to verify your API connections');

      process.exit(1);
    }
  });

program.parse(process.argv);
