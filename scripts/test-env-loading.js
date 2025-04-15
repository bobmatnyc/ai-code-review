#!/usr/bin/env node

/**
 * Test script for verifying environment variable loading.
 * 
 * This script demonstrates how the AI Code Review tool prioritizes loading
 * environment variables from its own directory first, before falling back
 * to the target project directory.
 */

// Load dotenv as early as possible
const path = require('path');
const fs = require('fs');

console.log('Testing environment variable loading...');

// Check if debug mode is enabled
const isDebug = process.argv.includes('--debug');

// Define paths
const toolDirectory = path.resolve(__dirname, '..');
const toolEnvPath = path.resolve(toolDirectory, '.env.local');
const cwdEnvPath = path.resolve(process.cwd(), '.env.local');

// Log paths
console.log(`Tool directory: ${toolDirectory}`);
console.log(`Tool .env.local path: ${toolEnvPath}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`Current directory .env.local path: ${cwdEnvPath}`);

// Check if tool .env.local exists
console.log('\nChecking for .env.local files:');
let toolEnvExists = false;
try {
  toolEnvExists = fs.existsSync(toolEnvPath);
  console.log(`- Tool .env.local exists: ${toolEnvExists}`);
} catch (err) {
  console.error(`Error checking tool .env.local: ${err.message}`);
}

// Check if current directory .env.local exists
let cwdEnvExists = false;
try {
  cwdEnvExists = fs.existsSync(cwdEnvPath);
  console.log(`- Current directory .env.local exists: ${cwdEnvExists}`);
} catch (err) {
  console.error(`Error checking current directory .env.local: ${err.message}`);
}

// Now load environment with our prioritization logic
console.log('\nLoading environment variables with prioritization:');

// First try tool directory
if (toolEnvExists) {
  console.log('Found .env.local in tool directory, loading from there.');
  require('dotenv').config({ path: toolEnvPath });
  
  // Show loaded variables (names only) if in debug mode
  if (isDebug) {
    try {
      const envContent = fs.readFileSync(toolEnvPath, 'utf8');
      const varNames = envContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.split('=')[0]);
      console.log('Variables found in tool .env.local (names only):');
      console.log(varNames.join(', '));
    } catch (err) {
      console.error(`Error reading tool .env.local: ${err.message}`);
    }
  }
} 
// Fall back to current directory
else if (cwdEnvExists) {
  console.log('No .env.local in tool directory, falling back to current directory.');
  require('dotenv').config({ path: cwdEnvPath });
  
  // Show loaded variables (names only) if in debug mode
  if (isDebug) {
    try {
      const envContent = fs.readFileSync(cwdEnvPath, 'utf8');
      const varNames = envContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.split('=')[0]);
      console.log('Variables found in current directory .env.local (names only):');
      console.log(varNames.join(', '));
    } catch (err) {
      console.error(`Error reading current directory .env.local: ${err.message}`);
    }
  }
} else {
  console.log('No .env.local found in either location.');
}

// Check for API keys (prioritizing AI_CODE_REVIEW prefixed keys)
console.log('\nChecking for API keys:');

const googleKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY || 
                 process.env.CODE_REVIEW_GOOGLE_API_KEY || 
                 process.env.GOOGLE_GENERATIVE_AI_KEY ||
                 process.env.GOOGLE_AI_STUDIO_KEY;

const openRouterKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY ||
                     process.env.CODE_REVIEW_OPENROUTER_API_KEY ||
                     process.env.OPENROUTER_API_KEY;

const anthropicKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY ||
                    process.env.CODE_REVIEW_ANTHROPIC_API_KEY ||
                    process.env.ANTHROPIC_API_KEY;

const openaiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY ||
                 process.env.CODE_REVIEW_OPENAI_API_KEY ||
                 process.env.OPENAI_API_KEY;

console.log(`- Google API key available: ${!!googleKey}`);
console.log(`- OpenRouter API key available: ${!!openRouterKey}`);
console.log(`- Anthropic API key available: ${!!anthropicKey}`);
console.log(`- OpenAI API key available: ${!!openaiKey}`);

// Check for selected model
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || process.env.CODE_REVIEW_MODEL;
console.log(`- Selected model: ${selectedModel || '(not set)'}`);

console.log('\nEnvironment variable loading test complete!');