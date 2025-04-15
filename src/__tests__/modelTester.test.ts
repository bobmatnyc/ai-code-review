/**
 * @fileoverview Tests for the modelTester module.
 *
 * These tests verify that the model testing functions work correctly,
 * with mocking to avoid actual API calls.
 */

import {
  testGeminiModel,
  testAnthropicModel,
  testOpenAIModel,
  testOpenRouterModel,
  findAvailableModelForProvider,
  testBestAvailableModel
} from '../clients/utils/modelTester';

// Mock the environment variables
process.env.AI_CODE_REVIEW_GOOGLE_API_KEY = 'mock-google-key';
process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY = 'mock-anthropic-key';
process.env.AI_CODE_REVIEW_OPENAI_API_KEY = 'mock-openai-key';
process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY = 'mock-openrouter-key';

// Mock dynamic imports
jest.mock('@google/generative-ai', () => {
  return {
    __esModule: true,
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => 'Hello!' }
        })
      })
    })),
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  };
}, { virtual: true });

// Mock the environment loader
jest.mock('../utils/envLoader', () => ({
  getGoogleApiKey: jest.fn().mockReturnValue({ 
    apiKey: 'mock-google-key',
    source: 'environment',
    message: 'Mock API key loaded'
  }),
  getAnthropicApiKey: jest.fn().mockReturnValue({ 
    apiKey: 'mock-anthropic-key',
    source: 'environment',
    message: 'Mock API key loaded'
  }),
  getOpenAIApiKey: jest.fn().mockReturnValue({ 
    apiKey: 'mock-openai-key',
    source: 'environment',
    message: 'Mock API key loaded'
  }),
  getOpenRouterApiKey: jest.fn().mockReturnValue({ 
    apiKey: 'mock-openrouter-key',
    source: 'environment',
    message: 'Mock API key loaded'
  }),
  isDebugMode: jest.fn().mockReturnValue(false)
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock fetch for API calls
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes('anthropic.com')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: 'Hello!' }] })
    });
  } else if (url.includes('openai.com')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'Hello!' } }] })
    });
  } else if (url.includes('openrouter.ai')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'Hello!' } }] })
    });
  }
  
  return Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: { message: 'Not found' } })
  });
});

describe('modelTester', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock implementation for each test
    global.fetch.mockImplementation((url) => {
      if (url.includes('anthropic.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ content: [{ text: 'Hello!' }] })
        });
      } else if (url.includes('openai.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: 'Hello!' } }] })
        });
      } else if (url.includes('openrouter.ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: 'Hello!' } }] })
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: 'Not found' } })
      });
    });
  });
  
  describe('testGeminiModel', () => {
    it('should successfully test a Gemini model', async () => {
      const result = await testGeminiModel('gemini-1.5-pro');
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('gemini-1.5-pro');
      expect(result.provider).toBe('gemini');
      expect(result.response).toBe('Hello!');
    });
    
    it('should handle errors gracefully', async () => {
      // Create a local mock that will throw an error
      jest.spyOn(global, 'require').mockImplementation(() => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
          throw new Error('API key invalid');
        })
      }));
      
      const result = await testGeminiModel('gemini-1.5-pro');
      
      expect(result.success).toBe(false);
      expect(result.model).toBe('gemini-1.5-pro');
      expect(result.provider).toBe('gemini');
      expect(result.message).toContain('API key invalid');
    });
  });
  
  describe('testAnthropicModel', () => {
    it('should successfully test an Anthropic model', async () => {
      const result = await testAnthropicModel('claude-3-opus-20240229');
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('claude-3-opus-20240229');
      expect(result.provider).toBe('anthropic');
      expect(result.response).toBe('Hello!');
    });
    
    it('should handle API errors gracefully', async () => {
      // Override the default mock for this specific test
      global.fetch.mockImplementationOnce(() => {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
        });
      });
      
      const result = await testAnthropicModel('claude-3-opus-20240229');
      
      expect(result.success).toBe(false);
      expect(result.model).toBe('claude-3-opus-20240229');
      expect(result.provider).toBe('anthropic');
      expect(result.message).toContain('API error: 401 Invalid API key');
    });
  });
  
  describe('testOpenAIModel', () => {
    it('should successfully test an OpenAI model', async () => {
      const result = await testOpenAIModel('gpt-4o');
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('gpt-4o');
      expect(result.provider).toBe('openai');
      expect(result.response).toBe('Hello!');
    });
  });
  
  describe('testOpenRouterModel', () => {
    it('should successfully test an OpenRouter model', async () => {
      const result = await testOpenRouterModel('anthropic/claude-3-opus-20240229');
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('anthropic/claude-3-opus-20240229');
      expect(result.provider).toBe('openrouter');
      expect(result.response).toBe('Hello!');
    });
  });
  
  describe('findAvailableModelForProvider', () => {
    it('should find the first available model for a provider', async () => {
      const result = await findAvailableModelForProvider('gemini', [
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-1.5-pro'
      ]);
      
      expect(result).toBe('gemini-2.5-pro');
    });
    
    it('should return null if no models are available', async () => {
      // Create a local mock that will throw an error
      jest.spyOn(global, 'require').mockImplementation(() => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
          throw new Error('No models available');
        })
      }));
      
      const result = await findAvailableModelForProvider('gemini', [
        'gemini-2.5-pro',
        'gemini-2.0-flash'
      ]);
      
      expect(result).toBeNull();
    });
    
    it('should handle unknown providers', async () => {
      const result = await findAvailableModelForProvider('unknown' as any, ['model1']);
      
      expect(result).toBeNull();
    });
  });
  
  describe('testBestAvailableModel', () => {
    it('should find the best available model across providers', async () => {
      const result = await testBestAvailableModel();
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('gemini');
    });
    
    it('should try each provider in order until one succeeds', async () => {
      // Create a local mock that will throw an error for Gemini
      jest.spyOn(global, 'require').mockImplementation(() => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
          throw new Error('Gemini unavailable');
        })
      }));
      
      const result = await testBestAvailableModel();
      
      // Should fall back to Anthropic
      expect(result.success).toBe(true);
      expect(result.provider).toBe('anthropic');
    });
    
    it('should return failure if all providers fail', async () => {
      // Create a local mock that will throw an error for Gemini
      jest.spyOn(global, 'require').mockImplementation(() => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
          throw new Error('Gemini unavailable');
        })
      }));
      
      // Make all API calls fail
      global.fetch.mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: 'Service unavailable' } })
        });
      });
      
      const result = await testBestAvailableModel();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('No API keys found or all API tests failed');
    });
  });
});
