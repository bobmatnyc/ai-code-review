# OpenRouter Context Window Resolution Analysis

**Date**: 2026-02-22
**Scope**: How unregistered OpenRouter models get context window sizes; why `openrouter:google/gemini-3.1-pro-preview` gets 128K instead of 1M
**Status**: Actionable -- implementation recommendations included

---

## Problem Statement

When a user specifies `openrouter:google/gemini-3.1-pro-preview` (or any OpenRouter model not in the static registry), the system falls back to the OpenRouter default context window of **128,000 tokens** instead of using the underlying model's actual context window (e.g., **1,048,576** for Gemini models).

This causes the chunking and multi-pass systems to unnecessarily split content that would fit in a single API call, degrading review quality and increasing cost.

---

## Findings

### 1. Static Registry (openrouter.ts) -- Only 11 Models Registered

**File**: `src/clients/utils/modelMaps/openrouter.ts`

The OpenRouter registry contains exactly 11 hardcoded models:

| Registry Key | Context Window |
|---|---|
| `openrouter:anthropic/claude-4-opus` | 200,000 |
| `openrouter:anthropic/claude-4-sonnet` | 200,000 |
| `openrouter:openai/gpt-4o` | 128,000 |
| `openrouter:anthropic/claude-3.5-sonnet` | 200,000 |
| `openrouter:google/gemini-2.0-pro` | 1,048,576 |
| `openrouter:meta-llama/llama-3.3-70b` | 131,072 |
| `openrouter:openai/gpt-4-turbo` | 128,000 |
| `openrouter:openai/gpt-4o-mini` | 128,000 |
| `openrouter:google/gemini-1.5-flash` | 1,048,576 |
| `openrouter:deepseek/deepseek-v3` | 65,536 |
| `openrouter:qwen/qwen-2.5-coder-32b` | 32,768 |

Any model NOT in this list (e.g., `google/gemini-3.1-pro-preview`, `anthropic/claude-4-haiku`, `google/gemini-2.5-flash`, etc.) hits the fallback path.

### 2. Fallback Logic (functions.ts) -- Flat 128K Default

**File**: `src/clients/utils/modelMaps/functions.ts`, lines 18-24 and 142-181

The `getEnhancedModelMapping()` function is the primary context window resolver. When a model key is not found in `ENHANCED_MODEL_MAP`:

```typescript
// Line 18-24
const DEFAULT_CONTEXT_WINDOWS: Record<string, number> = {
  gemini: 1_048_576,
  google: 1_048_576,
  anthropic: 200_000,
  openai: 128_000,
  openrouter: 128_000,  // <-- THIS IS THE PROBLEM
};

// Line 164-166 (inside fallback creation)
return {
  contextWindow: DEFAULT_CONTEXT_WINDOWS[provider] || 100_000,  // provider = "openrouter" = 128K
  // ...
};
```

The `provider` for all OpenRouter models is `"openrouter"`, so the fallback always returns **128,000** regardless of what underlying model is being proxied.

### 3. Duplicate Default Constants

The default context windows are defined in TWO places:

1. **`src/clients/utils/modelMaps/functions.ts`** lines 18-24 (used by `getEnhancedModelMapping`)
2. **`src/clients/utils/modelMaps/types.ts`** lines 78-83 (exported but not imported by functions.ts)

Both have `openrouter: 128_000`. This duplication should be consolidated.

### 4. TokenAnalyzer Has Partial Pattern-Matching (But Only After Registry Miss)

**File**: `src/analysis/tokens/TokenAnalyzer.ts`, lines 117-189

`TokenAnalyzer.getContextWindowSize()` calls `getEnhancedModelMapping()` first, and if that returns a `contextWindow`, it uses it directly. Since the fallback in `getEnhancedModelMapping()` DOES return a `contextWindow` (128K for openrouter), the TokenAnalyzer's own pattern-matching code (lines 140-181) is **never reached** for unregistered OpenRouter models.

The pattern-matching code handles:
- `gemini-2.x` and `gemini-1.5` patterns -> 1,048,576
- `claude-3` and `claude-4` patterns -> 200,000
- `gpt-4o` and `gpt-4` patterns -> 128,000

But these patterns operate on the `baseName` (after stripping provider prefix), and they are only reached if `getEnhancedModelMapping()` returns `undefined` -- which it never does, because the fallback always creates a mapping.

### 5. estimationUtils Has Its Own Separate Logic

**File**: `src/utils/estimationUtils.ts`, lines 283-289

```typescript
const getContextWindow = (model: string): number => {
  if (model.includes('claude')) return 200000;
  if (model.includes('gpt-4o')) return 128000;
  if (model.includes('gpt-4')) return 128000;
  if (model.includes('gemini')) return 1000000;
  return 100000;
};
```

This is a completely separate, simplified estimation that operates on the raw model string. For `openrouter:google/gemini-3.1-pro-preview`, `model.includes('gemini')` would return `true` and correctly yield 1,000,000. However, this function is only used for cost estimation previews, not for the actual chunking/batching decisions.

### 6. OpenRouter API Already Returns `context_length`

**File**: `src/utils/pricing/openRouterPricing.ts`, lines 12-24

The `OpenRouterModel` interface already captures `context_length`:

```typescript
interface OpenRouterModel {
  id: string;
  name?: string;
  context_length: number;  // <-- ALREADY FETCHED BUT UNUSED
  pricing: {
    prompt: string;
    completion: string;
  };
}
```

The `parsePricingData()` function (lines 93-107) processes the API response but **only extracts pricing**, discarding `context_length`:

```typescript
function parsePricingData(apiResponse: OpenRouterApiResponse): Map<string, ModelPricing> {
  const pricingMap = new Map<string, ModelPricing>();
  for (const model of apiResponse.data) {
    pricingMap.set(model.id, {
      inputPrice: convertPriceToPerMillion(model.pricing.prompt),
      outputPrice: convertPriceToPerMillion(model.pricing.completion),
      // context_length is IGNORED here
    });
  }
  return pricingMap;
}
```

### 7. OpenRouter Client Does NOT Query Model Metadata

**File**: `src/clients/openRouterClient.ts`

The OpenRouter client has **no logic** to query the `/api/v1/models` endpoint for model metadata. It goes straight to the chat completions endpoint. The `/api/v1/models` endpoint is only called in:

1. `src/clients/utils/apiTester.ts` (line 70) -- for API key validation only, response data discarded
2. `src/utils/pricing/openRouterPricing.ts` (line 51) -- for pricing only, `context_length` discarded
3. `src/utils/apiKeyHealthCheck.ts` (line 121) -- for health checks only

---

## Root Cause Summary

The root cause is a **three-layer failure**:

1. **Static registry gap**: Only 11 OpenRouter models are registered; hundreds exist on OpenRouter.
2. **Flat fallback**: Unregistered models get `openrouter: 128_000` default, ignoring the underlying model's actual capability.
3. **Unused data**: The OpenRouter `/api/v1/models` API response already contains `context_length`, but it is discarded during pricing fetch.

---

## Recommended Fix (Three Options, Ordered by Preference)

### Option A: Dynamic Context Window from OpenRouter API (RECOMMENDED)

Extend `openRouterPricing.ts` to also cache and expose `context_length`, then use it in the fallback path of `getEnhancedModelMapping()`.

**Changes required:**

1. **`src/utils/pricing/openRouterPricing.ts`** -- Extend `ModelPricing` to include `contextLength`:

```typescript
export interface ModelPricing {
  inputPrice: number;
  outputPrice: number;
  contextLength: number;  // ADD THIS
}
```

Update `parsePricingData()` to capture it:

```typescript
pricingMap.set(model.id, {
  inputPrice: convertPriceToPerMillion(model.pricing.prompt),
  outputPrice: convertPriceToPerMillion(model.pricing.completion),
  contextLength: model.context_length,  // ADD THIS
});
```

2. **`src/clients/utils/modelMaps/functions.ts`** -- In `getEnhancedModelMapping()` fallback, attempt dynamic lookup:

```typescript
// After determining provider is 'openrouter' and model not in registry:
// Try to get context_length from OpenRouter API cache
import { getModelPricing } from '../../../utils/pricing/openRouterPricing';

// In the fallback section (async version needed, or use cached data):
const openRouterData = await getModelPricing(modelName);
const contextWindow = openRouterData?.contextLength
  || DEFAULT_CONTEXT_WINDOWS[provider]
  || 100_000;
```

**Caveat**: `getEnhancedModelMapping()` is currently synchronous. Making it async would be a significant refactor. A better approach is to pre-fetch and cache the OpenRouter model data at startup (during `initializeAnyOpenRouterModel()`), then provide a synchronous accessor.

3. **Alternative sync approach** -- Add a module-level cache that is populated asynchronously on first OpenRouter use:

```typescript
// In a new file or in openRouterPricing.ts
let modelMetadataCache: Map<string, { contextLength: number }> | null = null;

export async function ensureModelMetadataLoaded(): Promise<void> {
  if (modelMetadataCache) return;
  // fetch from /api/v1/models and cache
}

export function getModelContextLength(modelId: string): number | undefined {
  return modelMetadataCache?.get(modelId)?.contextLength;
}
```

Then call `ensureModelMetadataLoaded()` during `initializeAnyOpenRouterModel()`, and use `getModelContextLength()` in the synchronous `getEnhancedModelMapping()` fallback.

### Option B: Cross-Provider Pattern Matching in Fallback (SIMPLER, LESS COMPLETE)

Add pattern matching in the `getEnhancedModelMapping()` fallback specifically for OpenRouter models, extracting the underlying model family from the OpenRouter model ID:

**File**: `src/clients/utils/modelMaps/functions.ts`, in the fallback section (~line 164):

```typescript
// For OpenRouter models, try to infer context window from underlying model name
let contextWindow = DEFAULT_CONTEXT_WINDOWS[provider] || 100_000;

if (provider === 'openrouter') {
  // OpenRouter model names follow pattern: vendor/model-name
  // e.g., google/gemini-3.1-pro-preview, anthropic/claude-4-haiku
  const OPENROUTER_CONTEXT_PATTERNS: Array<{ pattern: RegExp; contextWindow: number }> = [
    { pattern: /google\/gemini/i, contextWindow: 1_048_576 },
    { pattern: /anthropic\/claude/i, contextWindow: 200_000 },
    { pattern: /openai\/gpt-4o/i, contextWindow: 128_000 },
    { pattern: /openai\/gpt-4/i, contextWindow: 128_000 },
    { pattern: /openai\/o1/i, contextWindow: 200_000 },
    { pattern: /openai\/o3/i, contextWindow: 200_000 },
    { pattern: /meta-llama\/llama-3/i, contextWindow: 131_072 },
    { pattern: /deepseek\//i, contextWindow: 65_536 },
    { pattern: /mistralai\//i, contextWindow: 131_072 },
    { pattern: /qwen\//i, contextWindow: 131_072 },
  ];

  for (const { pattern, contextWindow: cw } of OPENROUTER_CONTEXT_PATTERNS) {
    if (pattern.test(modelName)) {
      contextWindow = cw;
      logger.info(
        `Inferred context window for OpenRouter model "${modelName}": ${cw.toLocaleString()} tokens`
      );
      break;
    }
  }
}
```

**Pros**: Simple, synchronous, no API calls needed.
**Cons**: Must be manually maintained; won't catch new models or model families.

### Option C: Hybrid Approach (RECOMMENDED FOR PRODUCTION)

Combine Options A and B:

1. Use pattern matching (Option B) as the **synchronous** fallback -- always available, no API call needed.
2. Layer the dynamic API lookup (Option A) as an **async enhancement** that runs at initialization and overwrites the pattern-matched value with the exact API-reported value.
3. Consolidate the duplicate `DEFAULT_CONTEXT_WINDOWS` (currently in both `functions.ts` and `types.ts`).

This provides:
- Correct context windows for common model families immediately (pattern matching)
- Exact context windows for all OpenRouter models after first API call (dynamic)
- Graceful degradation if the API is unreachable (falls back to patterns, then to 128K)

---

## Additional Issues Found

### Duplicate DEFAULT_CONTEXT_WINDOWS

`DEFAULT_CONTEXT_WINDOWS` is defined in both:
- `src/clients/utils/modelMaps/functions.ts` (lines 18-24) -- used internally
- `src/clients/utils/modelMaps/types.ts` (lines 78-83) -- exported but unused by functions.ts

**Recommendation**: Remove the one in `functions.ts` and import from `types.ts`.

### estimationUtils Has Separate Hardcoded Logic

`src/utils/estimationUtils.ts` lines 283-289 has its own context window detection that does NOT use the model registry. It should be refactored to call `getEnhancedModelMapping()` instead.

### configManager Also Hardcodes 128K

`src/utils/configManager.ts` line 216 hardcodes `openrouter: createConfigValue(128000, 'default_value')`.

---

## Impact Assessment

| Impact Area | Severity | Description |
|---|---|---|
| Token Analysis | HIGH | Files that fit in 1M window get chunked into ~8 batches |
| Multi-Pass Strategy | HIGH | Unnecessary multi-pass reviews for Gemini-via-OpenRouter |
| Cost Estimation | MEDIUM | Incorrect pass count estimates inflate cost previews |
| Review Quality | MEDIUM | Multi-pass consolidation loses cross-file context |

---

## Implementation Priority

1. **Immediate (Option B)**: Add pattern matching in `getEnhancedModelMapping()` fallback -- 30 minutes of work, zero runtime cost, fixes the most common cases.
2. **Short-term (Option A sync cache)**: Extend `openRouterPricing.ts` to cache `context_length` and expose it via synchronous accessor -- 2-3 hours.
3. **Cleanup**: Deduplicate `DEFAULT_CONTEXT_WINDOWS`, refactor `estimationUtils` to use model registry.
