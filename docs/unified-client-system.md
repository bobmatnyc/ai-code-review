# Unified Client System

The Unified Client System is a new architecture for managing AI API clients in the AI Code Review tool. It provides a consistent interface for all AI providers while maintaining backward compatibility with existing implementations.

## Overview

The unified client system consists of several key components:

1. **IApiClient Interface** - A unified interface that all API clients must implement
2. **BaseApiClient** - A base class providing common functionality
3. **UnifiedClientFactory** - A factory for creating and managing client instances
4. **Provider-specific Clients** - Implementations for each AI provider (OpenAI, Anthropic, etc.)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                 Unified Client System                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ UnifiedClient   │  │ UnifiedClient   │  │ UnifiedClient│ │
│  │ Factory         │  │ Registration    │  │ Index        │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    IApiClient Interface                     │
├─────────────────────────────────────────────────────────────┤
│                     BaseApiClient                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ OpenAIApiClient │  │AnthropicApiClient│  │GeminiApiClient│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Provider SDKs                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   OpenAI SDK    │  │ Anthropic SDK   │  │  Google SDK  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Unified Interface

All API clients implement the same `IApiClient` interface, providing:

- `initialize()` - Initialize the client with configuration
- `generateReview()` - Generate a single file review
- `generateConsolidatedReview()` - Generate a multi-file review
- `testConnection()` - Test the API connection
- `estimateCost()` - Estimate the cost of a review
- `isModelSupported()` - Check if a model is supported
- Model information methods

### 2. Automatic Provider Detection

The factory can automatically detect the provider from model names:

```typescript
// These all work automatically
const client1 = await createUnifiedClient('openai:gpt-4');
const client2 = await createUnifiedClient('anthropic:claude-3-5-sonnet-20241022');
const client3 = await createUnifiedClient('gemini:gemini-2.5-pro');
```

### 3. Fallback Support

If a specific provider doesn't support a model, the system can try other providers:

```typescript
const result = await getBestUnifiedClient('some-model');
// Will try all registered providers to find the best match
```

### 4. Caching and Performance

- Client instances are cached to avoid repeated initialization
- Lazy loading of provider SDKs
- Efficient model support checking

## Usage

### Basic Usage

```typescript
import { createUnifiedClient, initializeUnifiedClients } from '../clients/unified';

// Initialize the system (call once at startup)
initializeUnifiedClients();

// Create a client for a specific model
const client = await createUnifiedClient('openai:gpt-4');

// Generate a review
const result = await client.generateReview(
  fileContent,
  filePath,
  'quick-fixes',
  projectDocs,
  options
);
```

### Advanced Usage

```typescript
import { 
  UnifiedClientFactory, 
  getBestUnifiedClient,
  testUnifiedClients 
} from '../clients/unified';

// Find the best client for a model
const { client, supportInfo } = await getBestUnifiedClient('gpt-4');
console.log(`Using ${supportInfo.provider} with confidence ${supportInfo.confidence}`);

// Test all registered clients
const testResults = await testUnifiedClients();
console.log('Client test results:', testResults);

// Get system statistics
const stats = UnifiedClientFactory.getStatistics();
console.log(`${stats.totalProviders} providers registered`);
```

### Custom Provider Registration

```typescript
import { UnifiedClientFactory } from '../clients/unified';

// Register a custom provider
UnifiedClientFactory.registerProvider('custom', (config) => {
  return new CustomApiClient(config);
});
```

## Implementation Guide

### Creating a New Provider Client

1. **Extend BaseApiClient**:

```typescript
export class MyProviderApiClient extends BaseApiClient {
  private client: any;

  constructor(config: ApiClientConfig) {
    super(config);
  }

  protected async performInitialization(): Promise<void> {
    // Initialize your provider's SDK
    this.client = new MyProviderSDK({
      apiKey: this.config.apiKey,
      // ... other config
    });
  }

  // Implement required methods...
}
```

2. **Register the Provider**:

```typescript
// In src/clients/unified/index.ts
UnifiedClientFactory.registerProvider('myprovider', (config) => {
  return new MyProviderApiClient(config);
});
```

3. **Add Environment Variable Mapping**:

```typescript
// In UnifiedClientFactory.ts
const envVarMap: Record<string, string> = {
  // ... existing mappings
  myprovider: 'AI_CODE_REVIEW_MYPROVIDER_API_KEY',
};
```

### Required Methods

Every provider client must implement:

- `performInitialization()` - Provider-specific setup
- `generateSingleReview()` - Core review generation
- `getSupportedModels()` - List of supported models
- `getProviderName()` - Provider identifier
- `calculateCost()` - Cost calculation logic

## Migration Guide

### From Legacy Clients

The unified system maintains backward compatibility. Existing code will continue to work, but you can gradually migrate:

```typescript
// Old way
import { generateOpenAIConsolidatedReview } from '../clients/openaiClientWrapper';

// New way
import { createUnifiedClient } from '../clients/unified';
const client = await createUnifiedClient('openai:gpt-4');
const result = await client.generateConsolidatedReview(...);
```

### Benefits of Migration

1. **Consistent Interface** - Same methods across all providers
2. **Better Error Handling** - Unified error types and messages
3. **Automatic Fallbacks** - Try multiple providers automatically
4. **Performance** - Caching and lazy loading
5. **Extensibility** - Easy to add new providers

## Configuration

### Environment Variables

Each provider requires an API key environment variable:

- `AI_CODE_REVIEW_OPENAI_API_KEY` - OpenAI API key
- `AI_CODE_REVIEW_ANTHROPIC_API_KEY` - Anthropic API key
- `AI_CODE_REVIEW_GOOGLE_API_KEY` - Google/Gemini API key
- `AI_CODE_REVIEW_OPENROUTER_API_KEY` - OpenRouter API key

### Model Configuration

Models can be specified with or without provider prefixes:

```typescript
// With provider prefix (recommended)
'openai:gpt-4'
'anthropic:claude-3-5-sonnet-20241022'
'gemini:gemini-2.5-pro'

// Without prefix (auto-detection)
'gpt-4'  // Will try OpenAI first
'claude-3-5-sonnet-20241022'  // Will try Anthropic first
```

## Testing

The system includes comprehensive tests:

```bash
npm test -- src/__tests__/clients/unified/UnifiedClientSystem.test.ts
```

Test coverage includes:
- Client registration and creation
- Model support detection
- Review generation
- Error handling
- Statistics and monitoring

## Future Enhancements

1. **More Providers** - Add support for additional AI providers
2. **Load Balancing** - Distribute requests across multiple providers
3. **Rate Limiting** - Built-in rate limiting and retry logic
4. **Monitoring** - Enhanced metrics and monitoring
5. **Configuration** - Dynamic configuration and hot-reloading

## Troubleshooting

### Common Issues

1. **Provider SDK Not Installed**
   ```
   Error: OpenAI SDK not installed. Please run: npm install openai
   ```
   Solution: Install the required SDK for your provider.

2. **Missing API Key**
   ```
   Error: Unknown provider: myprovider
   ```
   Solution: Set the appropriate environment variable.

3. **Model Not Supported**
   ```
   ModelNotSupportedError: Model "unknown-model" is not supported
   ```
   Solution: Check the model name and provider support.

### Debug Mode

Enable debug logging to see detailed information:

```typescript
import logger from '../utils/logger';
logger.level = 'debug';
```

This will show:
- Client creation and initialization
- Model support checks
- Fallback attempts
- Cache hits and misses
