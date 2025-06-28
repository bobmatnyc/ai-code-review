# Configuration System Migration Guide

This document explains the migration from the old complex configuration system to the new unified configuration system.

## Overview

The AI Code Review tool has simplified its configuration management to provide:

1. **Clear precedence order**: CLI > Environment > Config File > Defaults
2. **Unified environment variable prefix**: `AI_CODE_REVIEW_*` (deprecating `CODE_REVIEW_*`)
3. **Single configuration module**: `unifiedConfig.ts` replaces multiple config files
4. **Better error messages**: Clear validation and helpful suggestions

## Migration Steps

### 1. Update Environment Variables

**Old (deprecated, but still works with warnings):**
```bash
CODE_REVIEW_GOOGLE_API_KEY=your-key
CODE_REVIEW_OPENROUTER_API_KEY=your-key
CODE_REVIEW_ANTHROPIC_API_KEY=your-key
CODE_REVIEW_OPENAI_API_KEY=your-key
```

**New (recommended):**
```bash
AI_CODE_REVIEW_GOOGLE_API_KEY=your-key
AI_CODE_REVIEW_OPENROUTER_API_KEY=your-key
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your-key
AI_CODE_REVIEW_OPENAI_API_KEY=your-key
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
AI_CODE_REVIEW_LOG_LEVEL=info
AI_CODE_REVIEW_OUTPUT_DIR=ai-code-review-docs
```

### 2. Use Configuration File (Optional)

Create `.ai-code-review.yaml` in your project root:

```yaml
# Copy from .ai-code-review.example.yaml and customize
model:
  default: "gemini:gemini-1.5-pro"
  writer: "openrouter:anthropic/claude-3-haiku"

output:
  directory: "ai-code-review-docs"
  format: "markdown"

behavior:
  debug: false
  log_level: "info"
  interactive: false

features:
  include_tests: false
  include_project_docs: true
  include_dependency_analysis: true
  enable_semantic_chunking: true
```

### 3. Update Code (For Developers)

**Old:**
```typescript
import { getConfig } from './utils/config';
const config = getConfig();
```

**New:**
```typescript
import { getUnifiedConfig } from './utils/unifiedConfig';
const config = getUnifiedConfig();
```

## Configuration Precedence

The new system follows a strict precedence order:

1. **CLI Arguments** (highest priority)
   ```bash
   ai-code-review --model gemini:gemini-2.0-flash --debug
   ```

2. **Environment Variables**
   ```bash
   AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
   AI_CODE_REVIEW_DEBUG=true
   ```

3. **Configuration File**
   ```yaml
   model:
     default: "gemini:gemini-1.5-pro"
   behavior:
     debug: true
   ```

4. **Default Values** (lowest priority)

## Deprecation Timeline

- **Current**: Old `CODE_REVIEW_*` variables work but show warnings
- **Next Major Version**: Old variables will be removed
- **Migration Period**: 6 months from this release

## Error Handling Improvements

The new system provides better error messages:

**Before:**
```
Error: Configuration failed
```

**After:**
```
Configuration validation failed: model: Invalid model format
Suggestions:
- Set AI_CODE_REVIEW_MODEL environment variable (e.g., "gemini:gemini-1.5-pro")
- Ensure the model format is "provider:model-name"
```

## Benefits

1. **Simplified**: Single configuration module instead of 4 separate files
2. **Consistent**: Clear precedence rules eliminate confusion
3. **Secure**: API keys only via environment variables, not config files
4. **Validated**: Zod schema validation with helpful error messages
5. **Future-proof**: Easy to extend with new configuration options

## Troubleshooting

### Common Issues

1. **"No API key found" error**
   - Check environment variables are set correctly
   - Verify `.env.local` file exists and is readable
   - Use `AI_CODE_REVIEW_*` prefix, not `CODE_REVIEW_*`

2. **"Invalid model format" error**
   - Ensure format is `provider:model-name`
   - Example: `gemini:gemini-1.5-pro`, not just `gemini-1.5-pro`

3. **Configuration file not loaded**
   - File must be named `.ai-code-review.yaml`, `.ai-code-review.yml`, or `.ai-code-review.json`
   - File must be in the current working directory
   - Check YAML/JSON syntax is valid

### Getting Help

1. Enable debug mode: `AI_CODE_REVIEW_DEBUG=true`
2. Check the logs for detailed error information
3. Refer to `.ai-code-review.example.yaml` for correct format
4. Use `ai-code-review --help` for CLI option reference

## Legacy Support

The old configuration system is still supported but deprecated:

- `src/utils/config.ts` - Legacy config module (deprecated)
- `src/utils/configManager.ts` - Complex config manager (deprecated)
- `src/utils/envLoader.ts` - Environment loader (deprecated)

These will be removed in a future major version. Please migrate to `unifiedConfig.ts`.
