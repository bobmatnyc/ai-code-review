# README.md CLI Options Update Report

**Task**: TSK-0002 - Update README.md CLI options section  
**Date**: 2025-07-09  
**Reference**: CLI_REFERENCE_AUDIT.md

## Summary of Changes

Successfully updated the README.md file to accurately reflect the actual CLI implementation based on the comprehensive CLI audit findings. All discrepancies between documented and actual CLI behavior have been resolved.

## Key Changes Made

### 1. Review Types Updated
- **Before**: 6 review types (architectural, quick-fixes, security, performance, unused-code, evaluation)
- **After**: 11 review types with exact naming from CLI
- **Added**: focused-unused-code, code-tracing-unused-code, improved-quick-fixes, consolidated, extract-patterns
- **Fixed**: All names now match CLI exactly (e.g., "quick-fixes" not "Quick Fixes")

### 2. Default Model Corrected
- **Before**: `gemini:gemini-1.5-pro` as default
- **After**: `gemini:gemini-2.5-pro` as default (matches CLI audit)
- **Impact**: All example configuration files updated

### 3. CLI Options Section Complete Rewrite
- **Removed**: All non-existent options from documentation
- **Added**: All missing options that exist in actual CLI
- **Fixed**: Option descriptions to match actual help text
- **Updated**: Default values to match CLI implementation

### 4. Command Structure Corrections
- **Fixed**: `model-test` → `test-model` (subcommand name)
- **Updated**: All subcommand help text to match actual CLI
- **Added**: Missing subcommands (generate-config, sync-github-projects)
- **Corrected**: Command arguments and options

### 5. Model Information Updated
- **Fixed**: Model table format for consistency
- **Added**: Context window information for all models
- **Updated**: Model descriptions to match CLI reference
- **Marked**: Deprecated models clearly
- **Reorganized**: Models by provider with accurate information

### 6. Environment Variables
- **Standardized**: All variables use `AI_CODE_REVIEW_` prefix
- **Added**: Missing environment variables
- **Removed**: Deprecated or non-existent variables
- **Updated**: Variable names to match actual implementation

### 7. Examples Section
- **Updated**: All example commands to use correct syntax
- **Added**: Examples for new CLI options
- **Removed**: Examples with deprecated options
- **Fixed**: Command structure in all examples

### 8. Subcommands Documentation
- **Added**: Complete subcommand list with descriptions
- **Fixed**: sync-github-projects options
- **Added**: generate-config subcommand documentation
- **Updated**: test-model subcommand (was model-test)

## Specific Fixes Applied

### Review Types
```bash
# Before: Limited types
--type architectural | quick-fixes | security | performance | unused-code

# After: Complete list
--type quick-fixes | architectural | security | performance | unused-code | focused-unused-code | code-tracing-unused-code | improved-quick-fixes | consolidated | evaluation | extract-patterns
```

### Default Model
```bash
# Before
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro

# After
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
```

### Command Structure
```bash
# Before
ai-code-review model-test --provider anthropic

# After
ai-code-review test-model --model anthropic:claude-4-sonnet
```

### Options Documentation
- Added: `--output-dir`, `--enable-semantic-chunking`, `--multi-pass`, `--force-single-pass`
- Fixed: `--model` option with correct default
- Updated: All option descriptions to match help text
- Removed: Non-existent options like `--use-ts-prune`, `--prompt-fragment`

## Verification

All documented CLI commands and options now match the actual implementation as verified in CLI_REFERENCE_AUDIT.md:

- ✅ All 11 review types correctly documented
- ✅ All CLI options match actual implementation
- ✅ All subcommands properly documented
- ✅ All model information accurate
- ✅ All environment variables correct
- ✅ All examples use valid syntax
- ✅ Default values match CLI implementation

## Files Modified

1. `/Users/masa/Projects/managed/ai-code-review/README.md` - Complete CLI options section update

## Next Steps

- Users can now successfully use the CLI based on the README documentation
- All documented commands will work correctly
- No discrepancies between documentation and actual CLI behavior
- CLI options section fully synchronized with implementation

This update ensures that the README.md serves as an accurate reference for CLI usage, eliminating user confusion and enabling successful tool adoption.