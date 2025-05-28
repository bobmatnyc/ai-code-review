#!/usr/bin/env node

// import * as path from 'path';
// import * as dotenv from 'dotenv';
import { findAvailableModelForProvider } from './clients/utils/modelTester';

// Import the environment variable loader
import { loadEnvVariables } from './utils/envLoader';

// Load environment variables from the tool's directory first
(async () => {
  const result = await loadEnvVariables();
  console.log(result.message);
})();

// Get API key
const apiKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;

if (!apiKey) {
  console.error(
    'No API key found. Please set AI_CODE_REVIEW_GOOGLE_API_KEY in .env.local'
  );
  process.exit(1);
}

// Test models
async function runTest() {
  console.log('Testing available Gemini models...');

  if (!apiKey) {
    console.error(
      'No API key found. Please set AI_CODE_REVIEW_GOOGLE_API_KEY in .env.local'
    );
    return;
  }

  const availableModel = await findAvailableModelForProvider('gemini', [
    'gemini-2.5-pro-preview-03-25',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-pro-latest'
  ]);

  if (availableModel) {
    console.log(`\n✅ Success! Found available model: ${availableModel}`);
    console.log('You can use this model for code reviews.');
  } else {
    console.error('\n❌ Error: No available models found.');
    console.error('Please check your API key and permissions.');
  }
}

runTest().catch(error => {
  console.error('Error running test:', error);
  process.exit(1);
});
