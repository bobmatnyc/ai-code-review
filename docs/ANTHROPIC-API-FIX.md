# Anthropic API 404 Error Fix

## Problem

Users were experiencing 404 errors when using the Anthropic Claude API for code review, specifically with newer models like Claude 3.7 Sonnet. The API calls were failing with 404 Not Found errors, despite appearing to be configured correctly.

## Root Cause Analysis

After extensive testing, we identified the issue:

1. The Anthropic API requires specific model name formats that include date suffixes (e.g., `claude-3-7-sonnet-20250219`).
2. Models without date suffixes (e.g., `claude-3-sonnet` or `claude-3.7-sonnet`) were returning 404 errors.
3. Our model mapping system had duplicated model definitions in both `modelMaps.ts` and `modelMaps.json`, leading to inconsistencies.
4. The system wasn't handling different format variations consistently (dots vs hyphens, with/without provider prefix).

## Solution

1. **Hardcoded Model Mappings**: Added explicit hardcoded mappings in `anthropicModelHelpers.ts` for common models to ensure consistent mapping regardless of input format:
   ```typescript
   // Specifically for Claude 3.7 Sonnet - all its known variants
   if (modelName === 'claude-3.7-sonnet' || 
       modelName === 'anthropic:claude-3.7-sonnet' ||
       modelName === 'claude-3-7-sonnet' ||
       modelName === 'anthropic:claude-3-7-sonnet') {
     logger.debug(`Detected Claude 3.7 Sonnet model, using fixed API name: claude-3-7-sonnet-20250219`);
     return 'claude-3-7-sonnet-20250219';
   }
   ```

2. **Single Source of Truth**: Ensured `modelMaps.json` is the single source of truth for model mappings:
   ```typescript
   // Load model mappings from JSON file
   function loadModelMappings(): Record<string, ModelMapping> {
     try {
       // Attempt to read from the JSON file
       const jsonPath = path.resolve(__dirname, 'modelMaps.json');
       const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
       const modelMap = JSON.parse(jsonContent);
       
       if (Object.keys(modelMap).length === 0) {
         throw new Error('Empty model map loaded from JSON');
       }
       
       return modelMap;
     } catch (error) {
       logger.error(`Failed to load model mappings from JSON: ${error}`);
       return {};
     }
   }
   ```

3. **Format Handling**: Enhanced the model mapping function to handle different format variations:
   - Dot notation vs hyphen notation (e.g., `claude-3.7-sonnet` vs `claude-3-7-sonnet`)
   - With/without provider prefix (e.g., `anthropic:claude-3-opus` vs `claude-3-opus`)
   - With/without date suffix (e.g., `claude-3-opus` vs `claude-3-opus-20240229`)

4. **Testing Tools**: Developed comprehensive testing tools to validate the solution:
   - `scripts/test-model-mapping.js`: Tests the model name mapping functionality
   - `scripts/debug-anthropic-request.js`: Makes direct API calls to verify model name handling

## Model Name Mappings

The following model name mappings are now explicitly supported:

| User Input Format | API Format (with date) |
|-------------------|------------------------|
| claude-3.7-sonnet | claude-3-7-sonnet-20250219 |
| claude-3-7-sonnet | claude-3-7-sonnet-20250219 |
| anthropic:claude-3.7-sonnet | claude-3-7-sonnet-20250219 |
| claude-3.5-sonnet | claude-3-5-sonnet-20241022 |
| claude-3-5-sonnet | claude-3-5-sonnet-20241022 |
| claude-3-opus | claude-3-opus-20240229 |
| claude-3.0-opus | claude-3-opus-20240229 |
| claude-3-sonnet | claude-3-sonnet-20240229 |
| claude-3-haiku | claude-3-haiku-20240307 |
| claude-3.5-haiku | claude-3-5-haiku-20241022 |

## Testing the Fix

You can test the fix using the provided scripts:

1. To test model name mapping:
   ```bash
   node scripts/test-model-mapping.js
   ```

2. To test direct API calls with a specific model:
   ```bash
   node scripts/debug-anthropic-request.js claude-3.7-sonnet
   ```

3. To test all model formats:
   ```bash
   node scripts/debug-anthropic-request.js --all
   ```

## Future Improvements

1. **API Version Updates**: Monitor Anthropic API changes and update date suffixes when new model versions are released.
2. **Automated Testing**: Add automated tests to CI pipeline to catch model mapping issues early.
3. **Error Handling**: Improve error messages when API calls fail due to model format issues.