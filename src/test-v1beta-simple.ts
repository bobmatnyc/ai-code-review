#!/usr/bin/env node

import * as path from 'path';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
 * Test if a specific Gemini model is available with v1beta API
 * @param modelName Name of the model to test
 */
async function testModel(modelName: string): Promise<boolean> {
  try {
    console.log(`Testing model: ${modelName} with v1beta API...`);
    
    // Initialize with v1beta API
    const genAI = new GoogleGenerativeAI(apiKey, {
      apiVersion: 'v1beta'
    });
    
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Try a simple generation to verify the model works
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hello, are you available?' }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 100,
      }
    });
    
    const response = result.response;
    const text = response.text();
    
    console.log(`✅ Model ${modelName} is available with v1beta API. Response: "${text.substring(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error testing model ${modelName} with v1beta API: ${error.message || error}`);
    return false;
  }
}

// Test models
async function runTest() {
  console.log('Testing Gemini models with v1beta API...');
  
  // Different models to try
  const modelVariations = [
    'gemini-2.5-pro-preview-03-25',
    'gemini-2.5-pro-exp-03-25',
    'gemini-2.0-flash',
    'gemini-1.5-pro'
  ];
  
  for (const modelName of modelVariations) {
    await testModel(modelName);
    console.log(); // Add a blank line for readability
  }
}

// Run the main function
runTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
