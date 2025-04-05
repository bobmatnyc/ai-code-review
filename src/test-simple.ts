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
    if (!apiKey) {
      console.error('No API key found. Please set GOOGLE_AI_STUDIO_KEY or GOOGLE_GENERATIVE_AI_KEY in .env.local');
      return;
    }

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Get the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    console.log("Sending request to gemini-2.0-flash model...");

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

    console.log("\nResponse from AI:");
    console.log("----------------");
    console.log(text);

  } catch (error: any) {
    console.error("Error:", error.message || error);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
