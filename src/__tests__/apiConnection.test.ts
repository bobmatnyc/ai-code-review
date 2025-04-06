/**
 * @fileoverview Tests for API connections to verify API keys.
 *
 * This module provides Jest tests to verify that the API keys provided in the
 * environment variables are valid and working correctly. It tests connections
 * to both Google Gemini API and OpenRouter API.
 */

import dotenv from 'dotenv';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import path from 'path';

import fetch from 'node-fetch';

// Load environment variables before running tests
beforeAll(() => {
  // Try to load from .env.local first
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const result = dotenv.config({ path: envLocalPath });

  if (result.error) {
    console.warn(`Could not load .env.local: ${result.error.message}`);
    // Fall back to .env
    dotenv.config();
  } else {
    console.log('Loaded environment variables from .env.local');
  }
});

describe('API Connection Tests', () => {
  describe('Google Gemini API', () => {
    const apiKey = process.env.CODE_REVIEW_GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY;

    test('API key is checked', () => {
      // This test just checks if the API key is available, but doesn't fail if it's not
      // This allows the tests to run in CI environments without API keys
      if (!apiKey) {
        console.warn('No Google Gemini API key found in environment variables');
      } else {
        console.log('Google Gemini API key is available');
      }
      // Always pass this test
      expect(true).toBe(true);
    });

    test('Can connect to Google Gemini API', async () => {
      // Skip test if no API key is available
      if (!apiKey) {
        console.warn('Skipping Google Gemini API test - no API key available');
        return;
      }

      try {
        // Initialize the Google Generative AI client
        const genAI = new GoogleGenerativeAI(apiKey);

        // Get a simple model
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            }
          ]
        });

        // Test with a simple prompt
        const result = await model.generateContent('Hello, are you working?');
        const response = result.response;
        const text = response.text();

        expect(text).toBeTruthy();
        expect(text.length).toBeGreaterThan(0);
        console.log(`Google Gemini API response: "${text.substring(0, 50)}..."`);
      } catch (error) {
        console.error('Google Gemini API error:', error);
        throw error; // Re-throw to fail the test
      }
    }, 30000); // 30 second timeout for this test
  });

  describe('OpenRouter API', () => {
    const apiKey = process.env.CODE_REVIEW_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

    test('API key is checked', () => {
      // This test just checks if the API key is available, but doesn't fail if it's not
      // This allows the tests to run in CI environments without API keys
      if (!apiKey) {
        console.warn('No OpenRouter API key found in environment variables');
      } else {
        console.log('OpenRouter API key is available');
      }
      // Always pass this test
      expect(true).toBe(true);
    });

    test('Can connect to OpenRouter API', async () => {
      // Skip test if no API key is available
      if (!apiKey) {
        console.warn('Skipping OpenRouter API test - no API key available');
        return;
      }

      try {
        // Make a simple request to the OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
            'X-Title': 'AI Code Review Tool'
          },
          body: JSON.stringify({
            model: 'openai/gpt-3.5-turbo', // Use a simple model for testing
            messages: [
              { role: 'user', content: 'Hello, are you working?' }
            ],
            max_tokens: 10,
            temperature: 0.2,
            stream: false
          })
        });

        expect(response.ok).toBe(true);

        const data = await response.json() as any;

        expect(data).toBeDefined();
        expect(data.choices).toBeDefined();
        expect(data.choices.length).toBeGreaterThan(0);
        expect(data.choices[0].message).toBeDefined();
        expect(data.choices[0].message.content).toBeDefined();

        console.log(`OpenRouter API response: "${data.choices[0].message.content}"`);
      } catch (error) {
        console.error('OpenRouter API error:', error);
        throw error; // Re-throw to fail the test
      }
    }, 30000); // 30 second timeout for this test
  });

  describe('Selected Model', () => {
    test('CODE_REVIEW_MODEL is properly formatted if present', () => {
      const selectedModel = process.env.CODE_REVIEW_MODEL;

      // Skip test if no model is specified
      if (!selectedModel) {
        console.warn('No CODE_REVIEW_MODEL specified in environment variables');
        return;
      }

      // Check that the model follows the adapter:model format
      expect(selectedModel).toContain(':');

      const [adapter, model] = selectedModel.split(':');

      // Check that the adapter is valid
      expect(['gemini', 'openrouter']).toContain(adapter);

      // Check that the model is not empty
      expect(model).toBeTruthy();
      expect(model.length).toBeGreaterThan(0);

      console.log(`Selected model: ${adapter}:${model}`);
    });
  });
});
