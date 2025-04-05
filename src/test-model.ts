#!/usr/bin/env node

import * as path from 'path';
import * as dotenv from 'dotenv';
import { findAvailableModel } from './utils/modelTest';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading environment variables from: ${envLocalPath}`);
dotenv.config({ path: envLocalPath });

// Get API key
const apiKey = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY;

if (!apiKey) {
  console.error('No API key found. Please set GOOGLE_AI_STUDIO_KEY or GOOGLE_GENERATIVE_AI_KEY in .env.local');
  process.exit(1);
}

// Test models
async function runTest() {
  console.log('Testing available Gemini models...');

  if (!apiKey) {
    console.error('No API key found. Please set GOOGLE_AI_STUDIO_KEY or GOOGLE_GENERATIVE_AI_KEY in .env.local');
    return;
  }

  const availableModel = await findAvailableModel(apiKey);

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
