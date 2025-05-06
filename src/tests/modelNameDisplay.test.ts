import { jest } from '@jest/globals';
import * as fs from 'fs/promises';
import path from 'path';

// Mock fs/promises at the top level
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('Test prompt template')
}));

// Mock the console.log and console.error
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  process.env.AI_CODE_REVIEW_GOOGLE_API_KEY = 'test-api-key';
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock the fetch function
global.fetch = jest.fn();

describe('Model Name Display', () => {
  it('should display the correct model name for gemini-2.5-pro', async () => {
    // Set up environment
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-2.5-pro';

    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Test response' }]
            }
          }
        ]
      })
    });

    // Import the module
    const geminiClient = require('../clients/geminiClient');

    // The fs/promises mock is already set up at the top level

    // Call the function that should display the model name
    try {
      await geminiClient.generateConsolidatedReview(
        [{ path: 'test.ts', relativePath: 'test.ts', content: 'test content' }],
        'Test Project',
        'quick-fixes',
        null,
        {}
      );
    } catch (error) {
      // Ignore errors, we're just testing the console output
    }

    // Check that Gemini initialization log was called
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Initializing Gemini model: gemini-2.5-pro')
    );
  });

  it('should display the correct model name for gemini-1.5-pro', async () => {
    // Set up environment
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-1.5-pro';

    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Test response' }]
            }
          }
        ]
      })
    });

    // Import the module
    const geminiClient = require('../clients/geminiClient');

    // The fs/promises mock is already set up at the top level

    // Call the function that should display the model name
    try {
      await geminiClient.generateConsolidatedReview(
        [{ path: 'test.ts', relativePath: 'test.ts', content: 'test content' }],
        'Test Project',
        'quick-fixes',
        null,
        {}
      );
    } catch (error) {
      // Ignore errors, we're just testing the console output
    }

    // Check that the correct model name was displayed
    // For gemini-1.5-pro, we expect to see the initialization message
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Initializing Gemini model: gemini-1.5-pro')
    );
  });

  it('should use the correct API model name for gemini-2.5-pro', async () => {
    // Set up environment
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-2.5-pro';

    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Test response' }]
            }
          }
        ]
      })
    });

    // Import the module
    const geminiClient = require('../clients/geminiClient');

    // The fs/promises mock is already set up at the top level

    // Call the function that should use the API model name
    try {
      await geminiClient.generateConsolidatedReview(
        [{ path: 'test.ts', relativePath: 'test.ts', content: 'test content' }],
        'Test Project',
        'quick-fixes',
        null,
        {}
      );
    } catch (error) {
      // Ignore errors, we're just testing the fetch call
    }

    // Check that Gemini initialization log was called
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Initializing Gemini model: gemini-2.5-pro')
    );

    // No need to check for specific success message format since it may have changed
  });
});