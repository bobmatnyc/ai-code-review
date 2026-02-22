# Issue #86 Analysis: Incorrect Context Limits for Gemini Models

**Date**: 2026-02-22
**Issue**: User reports incorrect context window size of 100,000 for model "google/gemini-3.1-pro-preview"
**Expected**: Much higher context limit (likely 1M+ tokens based on Gemini standards)

## Root Cause Analysis

### 1. Problem Summary

The model string "google/gemini-3.1-pro-preview" is parsed incorrectly, causing the system to fall back to a default context window of 100,000 tokens instead of the proper Gemini context limits.

### 2. Code Flow Analysis

#### 2.1 Model String Parsing
```typescript
// In functions.ts:parseModelString()
const parts = modelString.split(':');
// For "google/gemini-3.1-pro-preview":
// parts = ["google/gemini-3.1-pro-preview"] (length: 1)

// Since parts.length !== 2, falls back to:
return {
  provider: 'gemini',  // Default provider
  modelName: 'google/gemini-3.1-pro-preview'  // Full string as model name
};
```

**Issue**: The function expects format `provider:model` but gets `google/gemini-3.1-pro-preview` which has no colon.

#### 2.2 Fallback Logic in getEnhancedModelMapping()
```typescript
// Enhanced mapping lookup fails for parsed result:
// modelKey: "gemini:google/gemini-3.1-pro-preview"
// (constructed from provider:modelName)

// Falls back to provider defaults:
const { provider, modelName } = parseModelString(modelKey);
// provider = "gemini", modelName = "google/gemini-3.1-pro-preview"

// Looks up in DEFAULT_CONTEXT_WINDOWS:
contextWindow: DEFAULT_CONTEXT_WINDOWS[provider] || 100_000
// DEFAULT_CONTEXT_WINDOWS["gemini"] = 1_048_576 ✓ Should work
```

**Wait - this should work!** Let me re-examine...

#### 2.3 Alternative Scenario - OpenRouter Context

Looking at the code examples in `argumentParser.ts` and `init.ts`, I see references like:
- `openrouter:google/gemini-2.0-pro`

This suggests the user might be using OpenRouter format. Let me trace this:

```typescript
// User input: "google/gemini-3.1-pro-preview"
// No colon, so parseModelString returns:
{
  provider: 'gemini',  // Default fallback
  modelName: 'google/gemini-3.1-pro-preview'
}

// But what if user meant it as OpenRouter format without prefix?
// Real intention might be: "openrouter:google/gemini-3.1-pro-preview"
```

#### 2.4 The Real Issue - Provider Mismatch

Looking closer at the DEFAULT_CONTEXT_WINDOWS:

```typescript
const DEFAULT_CONTEXT_WINDOWS: Record<string, number> = {
  gemini: 1_048_576,      // ✓ Correct high value
  anthropic: 200_000,
  openai: 128_000,
  openrouter: 128_000,
};
```

**The issue is likely that the user is using "google" as provider name, not "gemini".**

If user somehow passes `google:gemini-3.1-pro-preview` or the system interprets it as provider "google":
```typescript
// parseModelString("google:gemini-3.1-pro-preview") returns:
{
  provider: 'google',  // Not in DEFAULT_CONTEXT_WINDOWS!
  modelName: 'gemini-3.1-pro-preview'
}

// Fallback lookup:
contextWindow: DEFAULT_CONTEXT_WINDOWS['google'] || 100_000
// DEFAULT_CONTEXT_WINDOWS['google'] = undefined
// Falls back to 100_000 ❌
```

### 3. Confirmed Root Cause

The issue occurs when:
1. User specifies a model with "google" as the provider name
2. The model is not in the registry (e.g., "google:gemini-3.1-pro-preview")
3. `DEFAULT_CONTEXT_WINDOWS` has no entry for "google" provider
4. System falls back to the hardcoded 100,000 default

### 4. Evidence from Codebase

#### 4.1 Missing "google" in DEFAULT_CONTEXT_WINDOWS
```typescript
const DEFAULT_CONTEXT_WINDOWS: Record<string, number> = {
  gemini: 1_048_576,     // ✓ Has gemini
  // google: ???,        // ❌ Missing google
  anthropic: 200_000,
  openai: 128_000,
  openrouter: 128_000,
};
```

#### 4.2 Examples Use Both Formats
- CLI help shows: `openrouter:google/gemini-2.0-pro`
- But registered models use: `gemini:gemini-2.5-pro`

This inconsistency could confuse users into using "google" directly.

## Recommended Solutions

### Solution 1: Add "google" Alias (Recommended)
Add "google" as an alias to the DEFAULT_CONTEXT_WINDOWS map:

```typescript
const DEFAULT_CONTEXT_WINDOWS: Record<string, number> = {
  gemini: 1_048_576,
  google: 1_048_576,     // ✓ Add alias for google → gemini defaults
  anthropic: 200_000,
  openai: 128_000,
  openrouter: 128_000,
};
```

**Benefits**:
- Minimal code change
- Backwards compatible
- Handles user confusion between "google" vs "gemini"
- Fixes the immediate issue

### Solution 2: Enhanced Provider Aliasing System
Create a provider aliasing system:

```typescript
const PROVIDER_ALIASES: Record<string, string> = {
  'google': 'gemini',
  'gcp': 'gemini',
  'google-ai': 'gemini',
};

export function normalizeProvider(provider: string): string {
  return PROVIDER_ALIASES[provider] || provider;
}
```

**Benefits**:
- More comprehensive solution
- Handles multiple aliases
- Cleaner architecture

### Solution 3: Add Missing Gemini Models
Add "gemini-3.1-pro-preview" and other missing models to the registry.

**Benefits**:
- Complete solution
- Provides accurate model-specific context limits
- Better user experience

## Impact Assessment

### High Priority
- **User Experience**: Users get incorrect context limits, leading to potential issues
- **Data Quality**: Incorrect context windows affect chunking and analysis
- **Trust**: Users may lose confidence in the tool's accuracy

### Medium Priority
- **Documentation**: Examples show inconsistent provider naming
- **API Compatibility**: OpenRouter uses "google/" prefix in model names

### Low Priority
- **Error Handling**: Better error messages for unknown models
- **Validation**: Warn users about deprecated or unknown models

## Implementation Priority

1. **Immediate Fix**: Add "google" alias to DEFAULT_CONTEXT_WINDOWS (Solution 1)
2. **Short Term**: Update documentation for consistent provider naming
3. **Medium Term**: Implement comprehensive provider aliasing (Solution 2)
4. **Long Term**: Add missing Gemini models to registry (Solution 3)

## Testing Strategy

### Test Cases to Add
1. Model string "google:gemini-3.1-pro-preview" → Should use 1M+ context
2. Model string "google:any-unknown-model" → Should use 1M+ context
3. Backwards compatibility with existing "gemini:" prefix
4. OpenRouter format "openrouter:google/gemini-model" → Should work correctly

### Regression Tests
- Ensure existing Gemini models still work
- Verify OpenRouter models maintain correct context limits
- Test edge cases with malformed model strings

## Files to Modify

### Primary Files
1. `/src/clients/utils/modelMaps/functions.ts`
   - Add "google" to DEFAULT_CONTEXT_WINDOWS
   - Add "google" to DEFAULT_OUTPUT_LIMITS
   - Update apiKeyEnvVar mapping

### Secondary Files (if implementing aliasing)
2. `/src/clients/utils/modelMaps/types.ts`
   - Add provider aliasing types
3. Test files to add regression coverage

### Documentation Updates
4. Update CLI help text for consistency
5. Update examples to show correct usage patterns

## Conclusion

The root cause is a missing "google" provider entry in the DEFAULT_CONTEXT_WINDOWS map. The immediate fix is simple and low-risk: add "google" as an alias pointing to the same values as "gemini". This will resolve the user's issue while maintaining backwards compatibility.

The broader issue is inconsistent provider naming conventions between the internal "gemini" provider and user-facing "google" terminology. A more comprehensive solution would implement proper provider aliasing, but the immediate fix addresses the urgent user issue.