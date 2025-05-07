# Model Mappings

The JSON file (`modelMaps.json`) has been completely removed. 

All model mappings are now defined directly in the TypeScript code in `modelMaps.ts` as constant values. This change eliminates the need to copy JSON files during the build process and ensures that all model definitions are bundled directly into the executable binary.

Key benefits:
1. No runtime dependency on external JSON files
2. Single source of truth for model mappings
3. TypeScript type checking for model definitions
4. Easier to maintain and update

## Previous Structure

The previous implementation loaded model mappings from an external JSON file, which required copying the file during build to make it available at runtime. This approach sometimes led to issues when the JSON file couldn't be found.

## Current Structure 

The current implementation defines all models directly in the `MODEL_MAP` object in `modelMaps.ts`, eliminating the need for file I/O operations at runtime.

```typescript
// Hard-coded model mappings to avoid relying on external JSON files
export const MODEL_MAP: Record<string, ModelMapping> = {
  "gemini:gemini-2.5-pro": {
    "apiName": "gemini-2.5-pro-preview-03-25",
    "displayName": "Gemini 2.5 Pro",
    "provider": "gemini",
    ...
  },
  ...
};
```

**NOTE: This change removes the potential for inconsistency between JSON and TypeScript definitions. All model configurations are now maintained in a single location.**