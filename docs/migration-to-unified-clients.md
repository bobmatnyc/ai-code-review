# Migration Guide: Legacy Clients to Unified Client System

This guide helps you migrate from the legacy client system to the new unified client architecture.

## Overview

The unified client system provides a consistent interface across all AI providers while maintaining backward compatibility. You can migrate gradually without breaking existing functionality.

## Migration Strategy

### Phase 1: Parallel Implementation (Current)

Both systems run side-by-side:
- Legacy clients continue to work
- New unified clients are available for new features
- Gradual migration of existing code

### Phase 2: Unified by Default (Future)

- New code uses unified clients by default
- Legacy clients marked as deprecated
- Migration tools and helpers provided

### Phase 3: Legacy Removal (Future)

- Legacy clients removed
- All code uses unified system
- Simplified codebase

## Code Migration Examples

### 1. OpenAI Client Migration

**Before (Legacy):**
```typescript
import { 
  generateOpenAIConsolidatedReview,
  initializeAnyOpenAIModel 
} from '../clients/openaiClientWrapper';

// Initialize
await initializeAnyOpenAIModel('gpt-4');

// Generate review
const result = await generateOpenAIConsolidatedReview(
  fileInfos,
  projectName,
  reviewType,
  projectDocs,
  options
);
```

**After (Unified):**
```typescript
import { createUnifiedClient } from '../clients/unified';

// Create and initialize client
const client = await createUnifiedClient('openai:gpt-4');

// Generate review
const result = await client.generateConsolidatedReview(
  fileInfos,
  projectName,
  reviewType,
  projectDocs,
  options
);
```

### 2. Anthropic Client Migration

**Before (Legacy):**
```typescript
import { 
  generateAnthropicConsolidatedReview,
  initializeAnthropicClient 
} from '../clients/anthropicClientWrapper';

// Initialize
await initializeAnthropicClient('claude-3-5-sonnet-20241022');

// Generate review
const result = await generateAnthropicConsolidatedReview(
  fileInfos,
  projectName,
  reviewType,
  projectDocs,
  options
);
```

**After (Unified):**
```typescript
import { createUnifiedClient } from '../clients/unified';

// Create and initialize client
const client = await createUnifiedClient('anthropic:claude-3-5-sonnet-20241022');

// Generate review
const result = await client.generateConsolidatedReview(
  fileInfos,
  projectName,
  reviewType,
  projectDocs,
  options
);
```

### 3. Gemini Client Migration

**Before (Legacy):**
```typescript
import { generateConsolidatedReview } from '../clients/geminiClient';

// Generate review (initialization was implicit)
const result = await generateConsolidatedReview(
  fileInfos,
  projectName,
  reviewType,
  projectDocs,
  options
);
```

**After (Unified):**
```typescript
import { createUnifiedClient } from '../clients/unified';

// Create and initialize client
const client = await createUnifiedClient('gemini:gemini-2.5-pro');

// Generate review
const result = await client.generateConsolidatedReview(
  fileInfos,
  projectName,
  reviewType,
  projectDocs,
  options
);
```

### 4. Dynamic Provider Selection

**Before (Legacy):**
```typescript
// Complex switch statement based on provider
switch (provider) {
  case 'openai':
    await initializeAnyOpenAIModel(model);
    result = await generateOpenAIConsolidatedReview(...);
    break;
  case 'anthropic':
    await initializeAnthropicClient(model);
    result = await generateAnthropicConsolidatedReview(...);
    break;
  case 'gemini':
    result = await generateConsolidatedReview(...);
    break;
  default:
    throw new Error(`Unknown provider: ${provider}`);
}
```

**After (Unified):**
```typescript
// Simple, consistent interface
const client = await createUnifiedClient(`${provider}:${model}`);
const result = await client.generateConsolidatedReview(...);
```

## Migration Checklist

### For Individual Files

- [ ] Replace provider-specific imports with unified imports
- [ ] Update initialization code to use `createUnifiedClient`
- [ ] Replace provider-specific method calls with unified interface
- [ ] Update error handling for new error types
- [ ] Test the migrated code thoroughly

### For the ReviewGenerator

The main `ReviewGenerator.ts` has been updated to support both systems:

```typescript
// New unified approach (recommended)
export async function generateReviewWithUnifiedClient(
  fileInfos: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs: ProjectDocs | null,
  options: ReviewOptions,
): Promise<ReviewResult> {
  const client = await createUnifiedClient(modelName);
  return await client.generateConsolidatedReview(...);
}

// Legacy approach (still works)
export async function generateReview(...) {
  // Existing legacy implementation
}
```

## Benefits of Migration

### 1. Consistency

All providers use the same interface:
```typescript
// Same methods for all providers
await client.initialize();
await client.generateReview(...);
await client.testConnection();
await client.estimateCost(...);
```

### 2. Error Handling

Unified error types and consistent error messages:
```typescript
try {
  const client = await createUnifiedClient('provider:model');
} catch (error) {
  if (error instanceof ModelNotSupportedError) {
    // Handle unsupported model
  } else if (error instanceof InitializationError) {
    // Handle initialization failure
  }
}
```

### 3. Automatic Fallbacks

The system can automatically try alternative providers:
```typescript
// Will try multiple providers if needed
const { client, supportInfo } = await getBestUnifiedClient('gpt-4');
console.log(`Using ${supportInfo.provider} for gpt-4`);
```

### 4. Performance

- Client caching reduces initialization overhead
- Lazy loading of provider SDKs
- Efficient model support checking

### 5. Extensibility

Adding new providers is much simpler:
```typescript
// Register a new provider
UnifiedClientFactory.registerProvider('newprovider', (config) => {
  return new NewProviderApiClient(config);
});
```

## Common Migration Patterns

### 1. Wrapper Function Pattern

Create a wrapper function to ease migration:

```typescript
// Legacy wrapper for gradual migration
export async function generateReviewLegacyWrapper(
  provider: string,
  model: string,
  ...args: any[]
): Promise<ReviewResult> {
  try {
    // Try unified client first
    const client = await createUnifiedClient(`${provider}:${model}`);
    return await client.generateConsolidatedReview(...args);
  } catch (error) {
    // Fallback to legacy implementation
    return await generateReviewLegacy(provider, model, ...args);
  }
}
```

### 2. Configuration Migration

Update configuration to use unified model names:

```typescript
// Before
const config = {
  provider: 'openai',
  model: 'gpt-4'
};

// After
const config = {
  selectedModel: 'openai:gpt-4'
};
```

### 3. Test Migration

Update tests to use the unified system:

```typescript
// Before
import { generateOpenAIConsolidatedReview } from '../clients/openaiClientWrapper';

describe('OpenAI Client', () => {
  it('should generate review', async () => {
    const result = await generateOpenAIConsolidatedReview(...);
    expect(result).toBeDefined();
  });
});

// After
import { createUnifiedClient } from '../clients/unified';

describe('Unified OpenAI Client', () => {
  it('should generate review', async () => {
    const client = await createUnifiedClient('openai:gpt-4');
    const result = await client.generateConsolidatedReview(...);
    expect(result).toBeDefined();
  });
});
```

## Migration Timeline

### Immediate (Now)

- [x] Unified client system implemented
- [x] OpenAI client migrated
- [x] Basic tests and documentation
- [x] Backward compatibility maintained

### Short Term (Next Sprint)

- [ ] Migrate Anthropic client to unified system
- [ ] Migrate Gemini client to unified system
- [ ] Migrate OpenRouter client to unified system
- [ ] Update main ReviewGenerator to use unified clients by default

### Medium Term (Next Month)

- [ ] Migrate all existing code to use unified clients
- [ ] Add comprehensive integration tests
- [ ] Performance optimization and monitoring
- [ ] Enhanced error handling and logging

### Long Term (Future)

- [ ] Remove legacy client implementations
- [ ] Add new providers using unified system
- [ ] Advanced features (load balancing, rate limiting)
- [ ] Configuration management improvements

## Troubleshooting Migration Issues

### 1. Import Errors

**Problem:** Cannot find unified client imports
**Solution:** Ensure you're importing from the correct path:
```typescript
import { createUnifiedClient } from '../clients/unified';
```

### 2. Model Name Format

**Problem:** Model not recognized
**Solution:** Use the correct format with provider prefix:
```typescript
// Correct
'openai:gpt-4'
'anthropic:claude-3-5-sonnet-20241022'

// Incorrect
'gpt-4' // Missing provider prefix
```

### 3. Environment Variables

**Problem:** API key not found
**Solution:** Ensure environment variables are set:
```bash
export AI_CODE_REVIEW_OPENAI_API_KEY="your-key"
export AI_CODE_REVIEW_ANTHROPIC_API_KEY="your-key"
```

### 4. Async/Await Issues

**Problem:** Initialization not awaited
**Solution:** Always await client creation:
```typescript
// Correct
const client = await createUnifiedClient('openai:gpt-4');

// Incorrect
const client = createUnifiedClient('openai:gpt-4'); // Missing await
```

## Getting Help

1. **Documentation:** Check the unified client system documentation
2. **Tests:** Look at the test files for usage examples
3. **Code Review:** Request review for migration changes
4. **Issues:** Create GitHub issues for migration problems

## Next Steps

1. Start with low-risk, isolated code sections
2. Migrate one provider at a time
3. Test thoroughly after each migration
4. Update documentation as you go
5. Share learnings with the team

The unified client system is designed to make AI provider integration simpler and more maintainable. Take your time with the migration and don't hesitate to ask for help!
