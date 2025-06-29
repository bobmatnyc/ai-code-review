# 🔧 Feature: Add Output Directory Flag and JSON Configuration Support

## Summary

We need to add two key features to the AI code review tool:
1. A command-line flag to override the output directory for review results
2. JSON configuration file support for persistent configuration of all flags and settings

## Why it matters

Currently, review outputs are always saved to the `ai-code-review-docs` directory. Users should be able to specify a different output location. Additionally, the tool relies on command-line flags and environment variables for configuration, but lacks a persistent configuration file option which would improve usability for teams and complex projects.

## Problem details

### Output Directory Flag

While the code already has:
- `-o, --output` flag to set output format (markdown or json)
- `--output-dir` flag defined in `argumentParser.ts` for overriding the output directory
- `AI_CODE_REVIEW_OUTPUT_DIR` environment variable support

The issue is that `--output-dir` is processed but doesn't completely override the hardcoded output directory in `reviewOrchestrator.ts`. The output base directory is currently defined as:
```typescript
const outputBaseDir = path.resolve(projectPath, 'ai-code-review-docs');
```

### JSON Configuration File

Users need to repeatedly specify the same flags when running the tool. A JSON configuration file would:
- Provide persistent settings across multiple runs
- Allow teams to share standard configurations
- Simplify complex flag combinations
- Reduce errors from mistyped CLI flags

## Proposed Implementation

### 1. Output Directory Flag

1. Update `reviewOrchestrator.ts` to properly use the `outputDir` option:
   ```typescript
   // Change from:
   const outputBaseDir = path.resolve(projectPath, 'ai-code-review-docs');
   
   // To:
   const outputDir = options.outputDir || configManager.getPathsConfig().outputDir || 'ai-code-review-docs';
   const outputBaseDir = path.isAbsolute(outputDir) ? outputDir : path.resolve(projectPath, outputDir);
   ```

2. Ensure the `--output-dir` flag is properly documented in help text

### 2. JSON Configuration File

1. Create a new module `src/utils/configFileManager.ts` to handle loading and parsing JSON configuration files
2. Add a new CLI flag `--config <path>` to specify a custom config file path
3. Update `argumentParser.ts` to merge configuration from:
   - Default values (lowest priority)
   - JSON config file (medium priority)
   - CLI flags and environment variables (highest priority)
4. Add a command to generate a sample configuration file: `--generate-config`

#### Sample Configuration File Format

```json
{
  "output": {
    "format": "markdown",
    "dir": "./reviews"
  },
  "review": {
    "type": "quick-fixes",
    "interactive": true,
    "include-tests": false,
    "include-project-docs": true,
    "include-dependency-analysis": true,
    "trace-code": false
  },
  "api": {
    "model": "gemini:gemini-1.5-pro",
    "keys": {
      "google": null,
      "openrouter": null,
      "anthropic": null,
      "openai": null
    }
  },
  "system": {
    "debug": false,
    "log-level": "info"
  }
}
```

## Acceptance Criteria

1. **Output Directory Flag**
   - [x] `--output-dir` flag properly overrides the default output directory
   - [x] Absolute and relative paths both work correctly
   - [x] Help text documents this option clearly
   - [x] Environment variable overrides work as expected

2. **JSON Configuration**
   - [ ] Tool reads JSON configuration from default location if it exists
   - [ ] `--config` flag allows specifying a custom config file location
   - [ ] Command-line flags override JSON config settings
   - [ ] Environment variables take precedence over config file
   - [ ] `--generate-config` creates a well-commented sample config file
   - [ ] All current CLI flags are supported in the JSON configuration

## Implementation Details

The implementation should follow these principles:

1. **Backward Compatibility**
   - Existing behavior should continue to work as expected
   - Default paths should match current behavior

2. **Security**
   - Validate all paths from config files for potential traversal issues
   - Don't load config files from untrusted locations

3. **Usability**
   - Clear error messages for malformed config files
   - Sensible comments in generated config files

## Examples

### Example Usage with CLI Flag

```bash
# Specify output directory via CLI flag
npm run review -- code-review path/to/file.ts --output-dir ./custom-review-output

# Specify output directory as absolute path
npm run review -- code-review path/to/file.ts --output-dir /tmp/reviews
```

### Example Usage with Config File

```bash
# Use a custom config file
npm run review -- code-review path/to/file.ts --config ./my-review-config.json

# Generate a sample config file
npm run review -- code-review --generate-config > my-review-config.json
```

## References

- Related file: `src/core/reviewOrchestrator.ts` (handles output directory creation)
- Related file: `src/cli/argumentParser.ts` (processes command line arguments)
- Related file: `src/utils/configManager.ts` (manages application configuration)
- Related file: `src/types/configuration.ts` (defines configuration interfaces)

