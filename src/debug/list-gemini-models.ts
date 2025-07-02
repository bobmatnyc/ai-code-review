/**
 * @fileoverview Debug utility to list available Gemini models.
 *
 * This script connects to the Google Generative AI API and lists all available models.
 * It's useful for debugging model-related issues and ensuring we're using correct model names.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Helper function to get models from the API or fallback to hardcoded list
 */
async function getModels(): Promise<{ models: any[] }> {
  // Get API key from environment variable
  const apiKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;

  if (!apiKey) {
    console.error(
      'No Google API key found. Set AI_CODE_REVIEW_GOOGLE_API_KEY in your .env.local file.',
    );
    return { models: [] };
  }

  console.log('Initializing Google Generative AI client...');
  const genAI = new GoogleGenerativeAI(apiKey);

  console.log('Fetching available models...');
  // Make an API call to list available models
  // While listModels is not officially documented, we can try using it
  try {
    // @ts-expect-error - This method exists but is not in the type definitions
    const modelList = await genAI.listModels();

    // If API call fails, fall back to our hardcoded knowledge
    if (!modelList || !modelList.models) {
      console.log('API call did not return models, using hardcoded list instead.');
      return getHardcodedModels();
    }

    return modelList;
  } catch (error) {
    console.log('Error listing models via API, using hardcoded list instead:', error);
    // Fallback to hardcoded list
    return getHardcodedModels();
  }
}

/**
 * Return hardcoded model information
 */
function getHardcodedModels(): { models: any[] } {
  return {
    models: [
      {
        name: 'models/gemini-2.5-pro-preview-05-06',
        displayName: 'Gemini 2.5 Pro Preview',
        description: 'Latest cutting-edge Gemini model (preview)',
        inputTokenLimit: 1000000,
        outputTokenLimit: 8192,
        supportedGenerationMethods: ['generateContent'],
        version: '2.5.0-preview',
      },
      {
        name: 'models/gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        description: 'Cost-effective model with good performance',
        inputTokenLimit: 1000000,
        outputTokenLimit: 8192,
        supportedGenerationMethods: ['generateContent'],
        version: '2.0.0',
      },
      {
        name: 'models/gemini-2.0-flash-lite',
        displayName: 'Gemini 2.0 Flash Lite',
        description: 'Lightweight and fast Gemini model',
        inputTokenLimit: 1000000,
        outputTokenLimit: 8192,
        supportedGenerationMethods: ['generateContent'],
        version: '2.0.0',
      },
    ],
  };
}

async function listGeminiModels() {
  try {
    const result = await getModels();

    console.log('\nAvailable models:');
    console.log('----------------');

    if (result && result.models) {
      // Sort models for better display
      const sortedModels = [...result.models].sort((a, b) => a.name.localeCompare(b.name));

      sortedModels.forEach((model) => {
        console.log(`Name: ${model.name.split('/').pop()}`);
        console.log(`  Full Path: ${model.name}`);
        console.log(`  Display Name: ${model.displayName || 'N/A'}`);
        console.log(`  Description: ${model.description || 'N/A'}`);
        console.log(`  Version: ${model.version || 'N/A'}`);
        console.log(`  Input Token Limit: ${model.inputTokenLimit || 'N/A'}`);
        console.log(`  Output Token Limit: ${model.outputTokenLimit || 'N/A'}`);
        console.log(
          `  Supported Generation Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`,
        );
        console.log('---');
      });

      console.log(`\nTotal models available: ${result.models.length}`);
    } else {
      console.log('No models found or unexpected response format.');
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

// Run the function
listGeminiModels().catch(console.error);
