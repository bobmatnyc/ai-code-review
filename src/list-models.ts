#!/usr/bin/env node

import * as path from 'path';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading environment variables from: ${envLocalPath}`);
dotenv.config({ path: envLocalPath });

// Get API key
const apiKey =
  process.env.GOOGLE_AI_STUDIO_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY;

if (!apiKey) {
  console.error(
    'No API key found. Please set GOOGLE_AI_STUDIO_KEY or GOOGLE_GENERATIVE_AI_KEY in .env.local'
  );
  process.exit(1);
}

async function listModels() {
  try {
    if (!apiKey) {
      console.error(
        'No API key found. Please set GOOGLE_AI_STUDIO_KEY or GOOGLE_GENERATIVE_AI_KEY in .env.local'
      );
      return;
    }

    console.log('Listing available Gemini models...');
    const genAI = new GoogleGenerativeAI(apiKey);

    // Try to use the SDK's built-in method to list models if available
    try {
      // @ts-ignore - This might be available in newer versions
      if (typeof genAI.listModels === 'function') {
        // @ts-ignore
        const models = await genAI.listModels();
        console.log('Models from SDK:', models);
        return;
      }
    } catch (err) {
      console.log('SDK does not support listModels, using REST API instead');
    }

    // Make a request to list models using REST API
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models?key=' + apiKey
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
        console.log(
          `- ${model.name} (${model.displayName || 'No display name'})`
        );
        if (model.supportedGenerationMethods) {
          console.log(
            `  Supported methods: ${model.supportedGenerationMethods.join(', ')}`
          );
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

listModels().catch(error => {
  console.error('Error running script:', error);
  process.exit(1);
});
