import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import * as fs from 'fs/promises';
import path from 'path';

// Mock the console.log and console.error
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  process.env.AI_CODE_REVIEW_GOOGLE_API_KEY = 'test-api-key';
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock the fetch function
global.fetch = vi.fn();

describe('Model Name Display', () => {
  it('should display the correct model name for gemini-2.5-pro', async () => {
    // Set up environment
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-2.5-pro';
    
    // Mock fetch response
    (global.fetch as Mock).mockResolvedValueOnce({
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
    
    // Import the module (this will be after the mocks are set up)
    const { generateConsolidatedReview } = await import('../clients/geminiClient');
    
    // Mock the loadPromptTemplate function
    vi.mock('fs/promises', async () => {
      const actual = await vi.importActual('fs/promises');
      return {
        ...actual as any,
        readFile: vi.fn().mockResolvedValue('Test prompt template')
      };
    });
    
    // Call the function that should display the model name
    try {
      await generateConsolidatedReview(
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
    expect(console.log).toHaveBeenCalledWith('Using gemini-2.5-pro-preview-03-25 for gemini-2.5-pro');
    expect(console.log).toHaveBeenCalledWith('Generating review with gemini-2.5-pro...');
  });
  
  it('should display the correct model name for gemini-1.5-pro', async () => {
    // Set up environment
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-1.5-pro';
    
    // Mock fetch response
    (global.fetch as Mock).mockResolvedValueOnce({
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
    
    // Import the module (this will be after the mocks are set up)
    const { generateConsolidatedReview } = await import('../clients/geminiClient');
    
    // Mock the loadPromptTemplate function
    vi.mock('fs/promises', async () => {
      const actual = await vi.importActual('fs/promises');
      return {
        ...actual as any,
        readFile: vi.fn().mockResolvedValue('Test prompt template')
      };
    });
    
    // Call the function that should display the model name
    try {
      await generateConsolidatedReview(
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
    // For gemini-1.5-pro, we don't need to map the name, so there should be no "Using X for Y" message
    expect(console.log).not.toHaveBeenCalledWith(expect.stringMatching(/Using .* for .*/));
    expect(console.log).toHaveBeenCalledWith('Generating review with gemini-1.5-pro...');
  });
  
  it('should use the correct API model name for gemini-2.5-pro', async () => {
    // Set up environment
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-2.5-pro';
    
    // Mock fetch response
    (global.fetch as Mock).mockResolvedValueOnce({
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
    
    // Import the module (this will be after the mocks are set up)
    const { generateConsolidatedReview } = await import('../clients/geminiClient');
    
    // Mock the loadPromptTemplate function
    vi.mock('fs/promises', async () => {
      const actual = await vi.importActual('fs/promises');
      return {
        ...actual as any,
        readFile: vi.fn().mockResolvedValue('Test prompt template')
      };
    });
    
    // Call the function that should use the API model name
    try {
      await generateConsolidatedReview(
        [{ path: 'test.ts', relativePath: 'test.ts', content: 'test content' }],
        'Test Project',
        'quick-fixes',
        null,
        {}
      );
    } catch (error) {
      // Ignore errors, we're just testing the fetch call
    }
    
    // Check that the correct API model name was used in the fetch call
    const fetchCalls = (global.fetch as Mock).mock.calls;
    expect(fetchCalls.length).toBeGreaterThan(0);
    
    // The URL should contain the correct model name
    const url = fetchCalls[0][0];
    expect(url).toContain('gemini-2.5-pro-preview-03-25');
  });
});
