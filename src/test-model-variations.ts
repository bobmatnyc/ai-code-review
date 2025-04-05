#!/usr/bin/env node

import * as path from 'path';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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

/**
 * Test if a specific Gemini model is available
 * @param modelName Name of the model to test
 */
async function testModel(modelName: string): Promise<boolean> {
  try {
    console.log(`Testing model: ${modelName}...`);
    const genAI = new GoogleGenerativeAI(apiKey as string);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Try a simple generation to verify the model works
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hello, are you available?' }] }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 100,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        }
      ]
    });

    const response = result.response;
    const text = response.text();

    console.log(`✅ Model ${modelName} is available. Response: "${text.substring(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error testing model ${modelName}: ${error.message || error}`);
    return false;
  }
}

// Test models
async function runTest() {
  console.log('Testing different variations of Gemini 2.5 Pro model names...');

  // Different variations to try
  const modelVariations = [
    // Try the experimental version first (might be free)
    'gemini-2.5-pro-exp-03-25',
    // Then try the preview version (might require payment)
    'gemini-2.5-pro-preview-03-25',
    // Try other variations
    'gemini-2.5-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-pro-experimental',
    'models/gemini-2.5-pro-exp-03-25',
    'models/gemini-2.5-pro-preview-03-25',
    'models/gemini-2.5-pro-preview',
    'models/gemini-2.5-pro',
    'models/gemini-2.5-pro-experimental'
  ];

  let foundWorkingModel = false;

  for (const modelName of modelVariations) {
    const isAvailable = await testModel(modelName);
    if (isAvailable) {
      console.log(`\n✅ Success! Found working model: ${modelName}`);
      foundWorkingModel = true;
    }
  }

  if (!foundWorkingModel) {
    console.error('\n❌ None of the Gemini 2.5 Pro model variations worked.');
    console.error('Please check your API key permissions or try a different model.');
  }
}

runTest().catch(error => {
  console.error('Error running test:', error);
  process.exit(1);
});
