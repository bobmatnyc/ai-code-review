# Enhanced Model Maps Documentation

## Overview

The AI Code Review tool now features an enhanced model mapping system (v4.0.0) that provides comprehensive model configurations with pricing, deprecation tracking, and intelligent model selection capabilities.

## New Features

### 1. Pricing Information

All models now include accurate pricing data for cost estimation:

```typescript
import { calculateCost, formatCost } from './src/clients/utils/modelMaps';

// Calculate cost for a review
const inputTokens = 100000;
const outputTokens = 50000;
const cost = calculateCost('anthropic:claude-4-sonnet', inputTokens, outputTokens);
console.log(`Estimated cost: ${formatCost(cost)}`); // Output: "Estimated cost: $1.0500 USD"
```

### 2. Model Categories

Models are categorized for easier selection:

```typescript
import { getModelsByCategory, ModelCategory } from './src/clients/utils/modelMaps';

// Get all coding-optimized models
const codingModels = getModelsByCategory(ModelCategory.CODING);

// Get cost-optimized models
const budgetModels = getModelsByCategory(ModelCategory.COST_OPTIMIZED);

// Available categories:
// - REASONING: Complex problem-solving
// - FAST_INFERENCE: Speed-optimized
// - COST_OPTIMIZED: Budget-friendly
// - LONG_CONTEXT: Extended context windows
// - MULTIMODAL: Multi-format support
// - CODING: Code-specific optimization
```

### 3. Deprecation Management

The system now tracks deprecated models and provides migration guidance:

```typescript
import { validateModelKey } from './src/clients/utils/modelMaps';

const validation = validateModelKey('anthropic:claude-3-opus');
if (!validation.isValid) {
  console.error(validation.error); // "Model 'anthropic:claude-3-opus' is deprecated"
  console.log(validation.warning); // Migration guide
  console.log(`Suggested alternative: ${validation.suggestion}`); // "anthropic:claude-4-opus"
}
```

### 4. Enhanced Model Information

Get comprehensive model details:

```typescript
import { getEnhancedModelMapping } from './src/clients/utils/modelMaps';

const model = getEnhancedModelMapping('gemini:gemini-2.5-pro');
console.log({
  contextWindow: model.contextWindow, // 1000000
  categories: model.categories, // ['reasoning', 'long-context', 'multimodal']
  status: model.status, // 'available' | 'preview' | 'deprecated' | 'retiring'
  tieredPricing: model.tieredPricing // Pricing tiers for usage-based pricing
});
```

### 5. Smart Model Recommendations

Get AI-recommended models for specific tasks:

```typescript
import { getRecommendedModelForCodeReview } from './src/clients/utils/modelMaps';

// Get the best model for code review
const bestModel = getRecommendedModelForCodeReview();
console.log(bestModel); // "anthropic:claude-4-sonnet"

// Get budget-friendly option
const budgetModel = getRecommendedModelForCodeReview(true);
console.log(budgetModel); // Returns cheapest model with coding capability
```

### 6. Provider Features

Check provider-specific capabilities:

```typescript
import { getProviderFeatures } from './src/clients/utils/modelMaps';

const features = getProviderFeatures('anthropic:claude-4-opus');
console.log({
  supportsPromptCaching: features.supportsPromptCaching, // true
  toolCallingSupport: features.toolCallingSupport, // 'full'
  supportsStreaming: features.supportsStreaming // true
});
```

## Backwards Compatibility

All existing code continues to work without modification:

```typescript
// Legacy exports still available
import { MODEL_MAP, MODELS, getApiNameFromKey } from './src/clients/utils/modelMaps';

// These work exactly as before
const apiName = getApiNameFromKey('gemini:gemini-2.5-pro');
const geminiModels = MODELS.gemini; // Excludes deprecated models by default
```

## Model Status Guide

- **available**: Production-ready models
- **preview**: Beta/preview models with potential changes
- **deprecated**: Models scheduled for removal (still functional)
- **retiring**: Models in the process of being phased out

## Cost Estimation Examples

### Simple Pricing
```typescript
// Models with flat-rate pricing
const cost = calculateCost('anthropic:claude-4-sonnet', 100000, 50000);
// Input: 100k tokens @ $3/1M = $0.30
// Output: 50k tokens @ $15/1M = $0.75
// Total: $1.05
```

### Tiered Pricing
```typescript
// Models like Gemini with usage-based tiers
const cost = calculateCost('gemini:gemini-2.5-pro', 300000, 300000);
// First 200k tokens at lower rate, remaining at higher rate
```

## Migration Guide

When using deprecated models, the system provides clear migration paths:

1. **Check validation** before using a model
2. **Review migration guide** in the deprecation info
3. **Test with suggested alternative** model
4. **Update configuration** to use new model

## Best Practices

1. **Always validate models** before use to catch deprecations early
2. **Use categories** to find appropriate models for your use case
3. **Monitor costs** with the pricing calculator
4. **Check provider features** to ensure compatibility with your workflow
5. **Prefer recommended models** for optimal performance

## Future Enhancements

The enhanced model maps system is designed for extensibility. Future updates may include:

- Performance benchmarks
- Quality scores for different tasks
- Regional availability information
- Rate limit tracking
- Custom model configurations