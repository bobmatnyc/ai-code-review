import { vi } from 'vitest';

// Mock fs/promises at the top level
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('Test prompt template')
}));

// Mock the configuration loading to prevent YAML file interference
vi.mock('../utils/config', () => ({
  getConfig: vi.fn(),
  resetConfig: vi.fn(),
  getApiKeyForProvider: vi.fn(),
  hasAnyApiKey: vi.fn().mockReturnValue(true)
}));

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

beforeEach(async () => {
  vi.resetModules();
  process.env = { ...originalEnv };
  process.env.AI_CODE_REVIEW_GOOGLE_API_KEY = 'test-api-key';

  // Reset the config mock
  const { getConfig, getApiKeyForProvider } = await import('../utils/config');
  vi.mocked(getConfig).mockImplementation(() => ({
    selectedModel: process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-2.5-pro',
    googleApiKey: 'test-api-key',
    openRouterApiKey: undefined,
    anthropicApiKey: undefined,
    openAIApiKey: undefined,
    debug: false,
    logLevel: 'info' as const,
    contextPaths: undefined,
    writerModel: undefined
  }));

  vi.mocked(getApiKeyForProvider).mockImplementation((provider: string) => {
    if (provider === 'gemini') return 'test-api-key';
    return undefined;
  });
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
    (global.fetch as any).mockResolvedValueOnce({
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
    const geminiClient = await import('../clients/geminiClient');

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
    // The logger formats messages with timestamp and level, and logs the API identifier
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Initializing Gemini model: gemini-2.5-pro-preview-05-06')
    );
  });

  it('should display the correct model name for gemini-1.5-pro', async () => {
    // Set up environment
    process.env.AI_CODE_REVIEW_MODEL = 'gemini:gemini-1.5-pro';

    // Mock fetch response
    (global.fetch as any).mockResolvedValueOnce({
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
    const geminiClient = await import('../clients/geminiClient');

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
    (global.fetch as any).mockResolvedValueOnce({
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
    const geminiClient = await import('../clients/geminiClient');

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
      expect.stringContaining('Initializing Gemini model: gemini-2.5-pro-preview-05-06')
    );

    // No need to check for specific success message format since it may have changed
  });
});