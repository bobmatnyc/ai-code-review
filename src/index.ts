#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import dotenv from 'dotenv';
import { reviewCode } from './commands/reviewCode';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading environment variables from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env.local file:', result.error);
} else {
  console.log('Environment variables loaded successfully');
  // Check if the API key is available after loading
  if (process.env.GOOGLE_GENERATIVE_AI_KEY) {
    console.log('API key is available in process.env');
  } else {
    console.log('API key is NOT available in process.env after loading .env.local');
    // Try to read the file directly to debug
    const fs = require('fs');
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('Content of .env.local (without showing sensitive data):',
        envContent.replace(/=.*/g, '=<REDACTED>'));
    } catch (err) {
      console.error('Error reading .env.local file directly:', err);
    }
  }
}

const program = new Command();

program
  .name('code-review')
  .description('AI-powered code review tool using Google Gemini 2.5 Max')
  .version('0.1.0');

program
  .command('review')
  .description('Review code in a file or directory')
  .argument('<project>', 'Project name (directory name in sibling directory)')
  .argument('<target>', 'File or directory to review')
  .option('-t, --type <type>', 'Type of review (architectural, quick-fixes, security, performance)', 'quick-fixes')
  .option('-i, --include-tests', 'Include test files in the review', false)
  .option('-o, --output <format>', 'Output format (markdown, json)', 'markdown')
  .action(async (project, target, options) => {
    try {
      await reviewCode(project, target, options);
    } catch (error) {
      console.error('Error during code review:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
