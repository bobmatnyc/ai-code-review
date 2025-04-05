#!/usr/bin/env node

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

// Check if we have the API key after all attempts
if (process.env.GOOGLE_GENERATIVE_AI_KEY) {
  console.log('API key is available in process.env');
} else {
  console.warn('API key is NOT available. The tool will use mock responses.');
  console.warn('Please make sure your .env.local file contains:');
  console.warn('- GOOGLE_GENERATIVE_AI_KEY=your_api_key_here');
}

// Import other dependencies after environment setup
import { Command } from 'commander';
import { reviewCode } from './commands/reviewCode';

const program = new Command();

program
  .name('code-review')
  .description('AI-powered code review tool using Google Gemini 2.5 Max')
  .version('0.9.0');

program
  .command('code-review')
  .description('Review code in a file or directory')
  .argument('<project>', 'Project name (directory name in sibling directory, use "this" for current project)')
  .argument('<target>', 'File or directory to review')
  .option('-t, --type <type>', 'Type of review (architectural, quick-fixes, security, performance)', 'quick-fixes')
  .option('--include-tests', 'Include test files in the review', false)
  .option('-o, --output <format>', 'Output format (markdown, json)', 'markdown')
  .option('-d, --include-project-docs', 'Include project documentation (PROJECT.md only) in the context', true)
  .option('-c, --consolidated', 'Generate a single consolidated review instead of individual file reviews (default: true)', true)
  .option('--individual', 'Generate individual file reviews instead of a consolidated review', false)
  .option('-i, --interactive', 'Stream the review output to the console as it is generated (only works with single file reviews)', false)
  .action(async (project, target, options) => {
    try {
      await reviewCode(project, target, options);
    } catch (error) {
      console.error('Error during code review:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
