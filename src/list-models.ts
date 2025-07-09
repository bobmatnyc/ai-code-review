#!/usr/bin/env node

// import * as path from 'path'; // Not used in this file
// import * as dotenv from 'dotenv'; // Not used in this file
import { GoogleGenerativeAI } from '@google/generative-ai';

// Import the environment variable loader
import { loadEnvVariables } from './utils/envLoader';

// Load environment variables from the tool's directory first
(async () => {
  const result = await loadEnvVariables();
  console.log(result.message);
})();

// Get API key
const apiKey =
  process.env.AI_CODE_REVIEW_GOOGLE_API_KEY ||
  process.env.CODE_REVIEW_GOOGLE_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_KEY ||
  process.env.GOOGLE_AI_STUDIO_KEY;

if (!apiKey) {
  console.error('No API key found. Please set AI_CODE_REVIEW_GOOGLE_API_KEY in .env.local');
  process.exit(1);
}

async function listModels() {
  try {
    if (!apiKey) {
      console.error('No API key found. Please set AI_CODE_REVIEW_GOOGLE_API_KEY in .env.local');
      return;
    }

    console.log('Listing available Gemini models...');
    const genAI = new GoogleGenerativeAI(apiKey);

    // Try to use the SDK's built-in method to list models if available
    try {
      // @ts-expect-error - This might be available in newer versions
      if (typeof genAI.listModels === 'function') {
        // @ts-expect-error - listModels method exists but not in type definitions
        const models = await genAI.listModels();
        console.log('Models from SDK:', models);
        return;
      }
    } catch (_err) {
      console.log('SDK does not support listModels, using REST API instead');
    }

    // Make a request to list models using REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}`);
      console.error(`Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('\nAvailable models:');

    if (data.models && Array.isArray(data.models)) {
      data.models.forEach((model: any) => {
        console.log(`- ${model.name} (${model.displayName || 'No display name'})`);
        if (model.supportedGenerationMethods) {
          console.log(`  Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
        }
      });
    } else {
      console.log('No models found or unexpected response format.');
      console.log('Raw response:', JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.error('Error listing models:', error.message || error);
  }
}

listModels().catch((error) => {
  console.error('Error running script:', error);
  process.exit(1);
});
