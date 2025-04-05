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

async function main() {
  try {
    // Initialize the Google Generative AI client with v1beta API
    const genAI = new GoogleGenerativeAI(apiKey, {
      apiVersion: 'v1beta'
    });
    
    // Try to use Gemini 2.5 Pro model
    const modelName = 'gemini-2.5-pro-preview-03-25';
    console.log(`Testing model: ${modelName} with v1beta API...`);
    
    // Get the model
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Generate content
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: "Explain how AI works" }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000,
      }
    });
    
    // Get the response
    const response = result.response;
    const text = response.text();
    
    console.log(`\n✅ Success! Model ${modelName} is available with v1beta API.`);
    console.log("\nResponse from AI:");
    console.log("----------------");
    console.log(text);
    
  } catch (error: any) {
    console.error(`❌ Error with v1beta API:`, error.message || error);
    
    // Try with gemini-2.0-flash as fallback
    try {
      console.log("\nTrying fallback to gemini-2.0-flash...");
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: "Explain how AI works" }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        }
      });
      
      const response = result.response;
      const text = response.text();
      
      console.log(`\n✅ Fallback to gemini-2.0-flash succeeded.`);
      console.log("\nResponse from AI:");
      console.log("----------------");
      console.log(text);
    } catch (fallbackError: any) {
      console.error(`❌ Fallback also failed:`, fallbackError.message || fallbackError);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
