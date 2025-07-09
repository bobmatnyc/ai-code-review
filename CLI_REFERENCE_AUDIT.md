# AI Code Review CLI Reference - Complete Audit

**Generated:** 2025-07-09  
**CLI Version:** 4.3.0  
**Task:** TSK-0001 - Comprehensive CLI help output audit

## Main Command Structure

### Primary Command
```bash
ai-code-review [target]
```

**Description:** Run a code review on the specified target  
**Target:** Path to the file or directory to review (default: ".")

### Available Subcommands

1. **`ai-code-review code-review [target]`** - Run a code review on the specified target (default)
2. **`ai-code-review test-model`** - Test the configured model with a simple prompt
3. **`ai-code-review test-build`** - Test the build by running a simple command
4. **`ai-code-review sync-github-projects`** - Sync GitHub projects to local directory
5. **`ai-code-review generate-config`** - Generate a sample configuration file

## Complete CLI Options Reference

### Global Options (Available for all commands)
- **`-v, --version`** - Show version number [boolean]
- **`--show-version`** - Show version information [boolean] [default: false]
- **`-h, --help`** - Show help [boolean]
- **`--debug`** - Enable debug logging [boolean] [default: false]

### Code Review Options (Main command and code-review subcommand)

#### Core Review Options
- **`-t, --type`** - Type of review to perform  
  **Choices:** `"quick-fixes"`, `"architectural"`, `"security"`, `"performance"`, `"unused-code"`, `"focused-unused-code"`, `"code-tracing-unused-code"`, `"improved-quick-fixes"`, `"consolidated"`, `"evaluation"`, `"extract-patterns"`

- **`-o, --output`** - Output format (markdown or json)  
  **Choices:** `"markdown"`, `"json"`  
  **Default:** `"markdown"`

- **`--output-dir`** - Directory to save review output [string]

- **`-m, --model`** - Model to use for the review (format: provider:model)  
  **Default:** `"gemini:gemini-2.5-pro"`

#### Processing Options
- **`--include-tests`** - Include test files in the review [boolean] [default: false]
- **`--include-project-docs`** - Include project documentation in the review context [boolean] [default: true]
- **`--include-dependency-analysis`** - Include dependency analysis in the review [boolean]
- **`--enable-semantic-chunking`** - Enable semantic chunking for intelligent code analysis [boolean] [default: true]

#### Execution Options
- **`-i, --interactive`** - Run in interactive mode, processing review results in real-time [boolean] [default: false]
- **`--test-api`** - Test API connections before running the review [boolean] [default: false]
- **`--estimate`** - Estimate token usage and cost without performing the review [boolean] [default: false]

#### Multi-pass Options
- **`--multi-pass`** - Use multi-pass review for large codebases [boolean] [default: false]
- **`--force-single-pass`** - Force single-pass review even if token analysis suggests multiple passes are needed [boolean] [default: false]
- **`--context-maintenance-factor`** - Context maintenance factor for multi-pass reviews (0-1) [number] [default: 0.15]

#### Configuration Options
- **`--no-confirm`** - Skip confirmation prompts [boolean] [default: false]
- **`--language`** - Specify the programming language (auto-detected if not specified) [string]
- **`--framework`** - Specify the framework (auto-detected if not specified) [string]
- **`--config`** - Path to JSON configuration file [string]

#### Model and Information Options
- **`--listmodels`** - List available models based on configured API keys [boolean] [default: false]
- **`--models`** - List all supported models and their configuration names [boolean] [default: false]

#### API Key Options
- **`--google-api-key`** - Google API key for Gemini models [string]
- **`--openrouter-api-key`** - OpenRouter API key [string]
- **`--anthropic-api-key`** - Anthropic API key for Claude models [string]
- **`--openai-api-key`** - OpenAI API key for GPT models [string]

### test-model Subcommand Options
- **`-m, --model`** - Model to test (format: provider:model) [string] [default: "gemini:gemini-2.5-pro"]
- **`--google-api-key`** - Google API key for Gemini models [string]
- **`--openrouter-api-key`** - OpenRouter API key [string]
- **`--anthropic-api-key`** - Anthropic API key for Claude models [string]
- **`--openai-api-key`** - OpenAI API key for GPT models [string]

### test-build Subcommand Options
- No specific options (only global options available)

### sync-github-projects Subcommand Options
- **`--token`** - GitHub token [string] [required]
- **`--org`** - GitHub organization [string] [required]
- **`--output-dir`** - Output directory [string] [default: "./github-projects"]

### generate-config Subcommand Options
- **`-o, --output`** - Output file path for the configuration [string]
- **`-f, --format`** - Configuration file format  
  **Choices:** `"yaml"`, `"json"`  
  **Default:** `"yaml"`
- **`--force`** - Overwrite existing configuration file [boolean] [default: false]

## Review Types Reference

### Available Review Types
1. **`quick-fixes`** - Fast issue identification and recommendations
2. **`architectural`** - Deep structural analysis and design patterns
3. **`security`** - Security vulnerability detection and remediation
4. **`performance`** - Performance bottleneck identification
5. **`unused-code`** - Dead code detection and cleanup recommendations
6. **`focused-unused-code`** - Focused unused code analysis
7. **`code-tracing-unused-code`** - Code tracing for unused code detection
8. **`improved-quick-fixes`** - Enhanced quick fixes with better suggestions
9. **`consolidated`** - Consolidated review combining multiple approaches
10. **`evaluation`** - Comprehensive code evaluation
11. **`extract-patterns`** - Code pattern analysis and best practice suggestions

## Available Models

### Google Models (26 total available)
- **`gemini:gemini-2.5-pro-preview`** - Most advanced reasoning and multimodal capabilities (1M tokens)
- **`gemini:gemini-2.5-pro`** - Production-ready advanced reasoning model (1M tokens) **[DEFAULT]**
- **`gemini:gemini-2.0-flash-lite`** - Ultra-fast, cost-efficient model (1M tokens)
- **`gemini:gemini-2.0-flash`** - Fast, efficient model with strong performance (1M tokens)
- **`gemini:gemini-1.5-pro`** - Previous generation large context model (1M tokens)
- **`gemini:gemini-1.5-flash`** - Previous generation fast model (1M tokens)

### Anthropic Models
- **`anthropic:claude-4-opus`** - Most capable Claude model with superior reasoning (200K tokens)
- **`anthropic:claude-4-sonnet`** - Balanced performance and cost for code review (200K tokens)
- **`anthropic:claude-3.5-sonnet`** - Enhanced Claude 3 with improved capabilities (200K tokens)
- **`anthropic:claude-3-opus`** - DEPRECATED: Migrate to Claude 4 Opus (200K tokens)
- **`anthropic:claude-3-sonnet`** - Previous generation balanced model (200K tokens)
- **`anthropic:claude-3.5-haiku`** - Fast, cost-effective model (200K tokens)
- **`anthropic:claude-3-haiku`** - DEPRECATED: Migrate to Claude 3.5 Haiku (200K tokens)

### OpenAI Models
- **`openai:gpt-4o`** - Multimodal model with vision capabilities (128K tokens)
- **`openai:gpt-4.1`** - Latest GPT-4 with improved reasoning (128K tokens)
- **`openai:gpt-4.5`** - DEPRECATED: Migrate to GPT-4.1 (128K tokens)
- **`openai:gpt-4-turbo`** - Fast GPT-4 variant (128K tokens)
- **`openai:gpt-3.5-turbo`** - Fast, cost-effective model (16K tokens)
- **`openai:o3`** - Advanced reasoning model (100K tokens)
- **`openai:o3-mini`** - Efficient reasoning model (60K tokens)

### OpenRouter Models
- **`openrouter:anthropic/claude-4-opus`** - Access Claude 4 Opus through OpenRouter (200K tokens)
- **`openrouter:anthropic/claude-4-sonnet`** - Access Claude 4 Sonnet through OpenRouter (200K tokens)
- **`openrouter:openai/gpt-4o`** - Access GPT-4o through OpenRouter (128K tokens)
- **`openrouter:google/gemini-2.5-pro`** - Access Gemini 2.5 Pro through OpenRouter (1M tokens)
- **`openrouter:meta-llama/llama-3.3-70b`** - Open source alternative (131K tokens)
- **`openrouter:anthropic/claude-3-haiku`** - Fast, affordable model (200K tokens)

## Command Examples

### Basic Usage
```bash
# Basic review with default settings
ai-code-review

# Review specific directory
ai-code-review ./src

# Review with specific type
ai-code-review --type security ./src

# Review with specific model
ai-code-review --model anthropic:claude-4-sonnet ./src
```

### Advanced Usage
```bash
# Estimate tokens and cost
ai-code-review --estimate --type architectural ./src

# Multi-pass review for large codebases
ai-code-review --multi-pass --type consolidated ./src

# Interactive mode with JSON output
ai-code-review --interactive --output json ./src

# Include tests and dependency analysis
ai-code-review --include-tests --include-dependency-analysis ./src
```

### Model and Configuration Commands
```bash
# List available models
ai-code-review --listmodels

# List all supported models with details
ai-code-review --models

# Test specific model
ai-code-review test-model --model gemini:gemini-2.5-pro

# Generate configuration file
ai-code-review generate-config --output .ai-code-review.yaml --format yaml
```

### GitHub Integration
```bash
# Sync GitHub projects
ai-code-review sync-github-projects --token <token> --org <org> --output-dir ./projects
```

## Environment Variables

All environment variables use the `AI_CODE_REVIEW_` prefix:

- **`AI_CODE_REVIEW_GOOGLE_API_KEY`** - Google API key for Gemini models
- **`AI_CODE_REVIEW_ANTHROPIC_API_KEY`** - Anthropic API key for Claude models
- **`AI_CODE_REVIEW_OPENROUTER_API_KEY`** - OpenRouter API key
- **`AI_CODE_REVIEW_OPENAI_API_KEY`** - OpenAI API key for GPT models
- **`AI_CODE_REVIEW_MODEL`** - Default model (format: provider:model)
- **`AI_CODE_REVIEW_WRITER_MODEL`** - Writer model for multi-pass reviews
- **`AI_CODE_REVIEW_LOG_LEVEL`** - Log level (debug, info, warn, error)

## Output Formats

### Markdown (default)
- Human-readable reports with formatting
- Includes code snippets and recommendations
- Suitable for documentation and review

### JSON
- Structured data format
- Machine-readable for CI/CD integration
- Includes metadata and structured recommendations

## Key Features Verified

1. **Multi-provider Support**: Successfully supports 4 AI providers (Google, Anthropic, OpenAI, OpenRouter)
2. **Review Strategy Options**: 11 different review types available
3. **Token Management**: Advanced token estimation and multi-pass capabilities
4. **Configuration Management**: YAML/JSON config file support
5. **Environment Integration**: Comprehensive environment variable support
6. **Model Flexibility**: 26 models available across different providers
7. **Output Flexibility**: Multiple output formats (markdown, json)
8. **GitHub Integration**: Built-in GitHub project sync capabilities

## Notes for Documentation Updates

1. **Default Model**: Currently `gemini:gemini-2.5-pro` (not `gemini-1.5-pro` as might be documented elsewhere)
2. **Review Types**: The exact list includes 11 types, with specific naming conventions
3. **Model Format**: All models use `provider:model` format consistently
4. **Context Windows**: Vary significantly by provider (16K to 1M tokens)
5. **Deprecated Models**: Some models are marked as deprecated with migration recommendations
6. **Configuration**: Supports both YAML and JSON configuration files
7. **API Keys**: All API keys are optional command-line arguments and environment variables

## Command Verification Status

- ✅ **Main help output** - Complete and accurate
- ✅ **Subcommand help** - All 5 subcommands documented
- ✅ **Model listing** - Both --listmodels and --models work correctly
- ✅ **Basic functionality** - Commands execute without errors
- ✅ **Review types** - All 11 review types confirmed
- ✅ **Output formats** - Both markdown and json confirmed
- ✅ **API integration** - All 4 providers supported

This reference document provides the complete, accurate CLI interface for documentation agents to use when updating README.md and QUICK_START.md files.