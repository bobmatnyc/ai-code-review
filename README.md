# AI Code Review v1.9.4

A TypeScript-based tool for automated code reviews using Google's Gemini AI models, Anthropic Claude models, OpenAI models, and OpenRouter API (Claude, GPT-4, etc.) with LangChain integration for enhanced prompt management.

## What's New in v1.9.4

### Major Features

- **LangChain Integration**: Added LangChain for enhanced prompt management, templating, and chain capabilities
- **New Review Types**: Added 'unused-code' review type to identify and suggest removal of dead code
- **Improved Prompts**: Enhanced prompt templates with LangChain, including few-shot learning and structured output
- **Structured Schemas**: Created detailed Zod schemas for all review types to enable more structured and consistent output
- **Enhanced TypeScript Support**: Added TypeScript-specific templates and analyzers for better static analysis
- **Model Testing**: Added new commands to test individual models (`model-test`) and verify all models on build
  - Test specific models with `ai-code-review model-test gemini:gemini-2.5-pro`
  - Test all models from a provider with `ai-code-review model-test -p gemini`
  - Test all available models with `ai-code-review model-test --all`
  - Verify models during build with `ai-code-review test-build`

### Other Improvements

- **Model Listing Feature**: Added `--models` flag to list all supported models with their configuration names
- **Improved Error Handling**: Enhanced error handling and recovery mechanisms
- **Debug Logging Control**: Suppressed DEBUG logging messages in production builds
- **Performance Optimizations**: Improved memory usage and processing speed
- **Build Verification**: Added automatic model testing during build process

## What's New in v1.3.2

- **Fixed API Client Selection**: Fixed bug in dynamic imports for API clients
- **Fixed Anthropic API Version**: Updated Anthropic API version to use the correct version

## What's New in v1.3.1

- **Simplified Model Names**: Removed version-specific details from model names for better usability
- **Improved Model Management**: Derived model lists from a single source of truth
- **Structured Output**: Added structured JSON output format for code reviews
- **Enhanced Formatting**: Improved formatting of review results with priority-based grouping

## What's New in v1.3.0

- **Structured Output Format**: Added structured JSON output for code reviews
- **JSON Parsing**: Added support for parsing JSON responses wrapped in code blocks
- **New Type Definitions**: Added structured review type definitions
- **Improved Formatting**: Added formatStructuredReviewAsMarkdown function

## What's New in v1.2.0

- **Multi-Provider Support**: Added support for multiple AI providers (Google, Anthropic, OpenAI, OpenRouter)
- **Token and Cost Estimation**: Implemented comprehensive token and cost estimation for all supported models
- **Model Listing**: Added `--listmodels` flag to display all available models
- **Improved Code Organization**: Reorganized utility modules to reduce duplication and improve maintainability
- **Enhanced Documentation**: Added detailed JSDoc comments to key functions and classes
- **Bug Fixes**: Fixed various issues including language output problems and failing tests

## Overview

This tool analyzes code from specified files or directories in sibling projects and generates structured code evaluations. It leverages Google's Gemini AI models, Anthropic Claude models, and OpenRouter API to provide insightful feedback on code quality, best practices, and potential improvements. With support for multiple AI models, you can choose the best model for your specific needs.

## Features

- **Multiple Review Types**: Focus on different aspects of code quality:
  - **Architectural**: Holistic review of code structure, APIs, and package organization
  - **Quick Fixes**: Identify low-hanging fruit and easy improvements
  - **Security**: Focus on security vulnerabilities and best practices
  - **Performance**: Identify performance bottlenecks and optimization opportunities
  - **Unused Code**: Identify and suggest removal of dead code, redundant functions, and unused variables with deep code tracing capabilities
- **Interactive Mode**: Process review results interactively, implementing fixes based on priority
- **Automatic Fixes**: Automatically implement high priority fixes without manual intervention
- **Prompt-Based Fixes**: Confirm and apply medium and low priority fixes with user input
- **Directory Support**: Review entire directories and their subdirectories in one command
- **Consolidated Reviews**: Generate a single comprehensive review for multiple files
- **Project Context**: Include project documentation in the review context
- **Multiple AI Models**: Support for Google's Gemini models, Anthropic Claude models, and OpenRouter API (Claude, GPT-4, etc.)
- **Model Listing**: List all available models with the `--listmodels` flag
- **Token and Cost Estimation**: Estimate token usage and cost with the `--estimate` flag
- **Customizable**: Configure review types, output formats, and prompt templates
- **Memory Optimized**: Process large codebases efficiently with optimized memory usage
- **Error Recovery**: Robust error handling with graceful recovery

## Installation

### Global Installation

```bash
npm install -g @bobmatnyc/ai-code-review
```

### Local Installation

```bash
npm install --save-dev @bobmatnyc/ai-code-review
```

### API Key Setup

Create a `.env.local` file in your project root with your API keys:

```
# Required: Model selection
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
# or
# AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-opus
# or
# AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus

# Required: API key for the selected model type
# For Google Gemini models
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# For OpenRouter models (Claude, GPT-4, etc.)
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# For direct Anthropic Claude models
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

You can get API keys from:
- [Google AI Studio](https://makersuite.google.com/) for Gemini models
- [OpenRouter](https://openrouter.ai/) for access to Claude, GPT-4, and other models
- [Anthropic](https://console.anthropic.com/) for direct access to Claude models

## Usage

### Command Line

```bash
# Global installation
ai-code-review [target] [options]

# Local installation
npx ai-code-review [target] [options]

# Note: The tool only works within the current project
```

### Examples

```bash
# Review a single file in the current project
ai-code-review src/index.ts

# Review an entire directory with interactive mode
ai-code-review src/utils --interactive

# Perform an architectural review
ai-code-review src --type architectural

# Find unused code that can be safely removed
ai-code-review src --type unused-code

# Use deep code tracing for high-confidence unused code detection
ai-code-review src --type unused-code --trace-code

# Use LangChain for enhanced prompt management
ai-code-review src --type quick-fixes --prompt-strategy langchain

# Include test files in the review
ai-code-review src --include-tests

# Specify output format (markdown or json)
ai-code-review src/index.ts --output json

# Disable including project documentation in the context (enabled by default)
ai-code-review src/index.ts --no-include-project-docs

# List all available models
ai-code-review --listmodels

# List all supported models with their configuration names
ai-code-review --models

# Test a specific model
ai-code-review model-test gemini:gemini-1.5-pro

# Test all models for a specific provider
ai-code-review model-test -p anthropic

# Test all available models
ai-code-review model-test --all

# Use a custom prompt template file
ai-code-review src/index.ts --prompt custom-prompt.md

# Add a custom prompt fragment
ai-code-review src/index.ts --prompt-fragment "Focus on performance issues"

# Specify the position of the prompt fragment
ai-code-review src/index.ts --prompt-fragment "Focus on security issues" --prompt-fragment-position start

# Use a specific prompt strategy
ai-code-review src/index.ts --prompt-strategy anthropic

# Estimate token usage and cost without performing a review
ai-code-review src/utils --estimate

# Check the version of the tool
ai-code-review --version

# Run in debug mode for additional logging
ai-code-review src/utils --debug

# Run in quiet mode to suppress non-essential output
ai-code-review src/utils -q

# The AI model is configured in .env.local, not via command line
# See the Configuration section for details on setting up models
```

### Options

```
Options:
  -t, --type <type>       Type of review (architectural, quick-fixes, security, performance, unused-code) (default: "quick-fixes")
  --include-tests         Include test files in the review (default: false)
  -o, --output <format>   Output format (markdown, json) (default: "markdown")
  -d, --include-project-docs  Include project documentation in the context (default: true)
  -c, --consolidated      Generate a single consolidated review (default: true)
  --individual            Generate individual file reviews (default: false)
  -i, --interactive       Process review results interactively (default: false)
  --auto-fix              Automatically implement high priority fixes (default: true)
  --prompt-all            Prompt for confirmation on all fixes (default: false)
  --test-api              Test API connections before running the review (default: false)
  --debug                 Enable debug mode with additional logging (default: false)
  -q, --quiet             Suppress non-essential output (default: false)
  --listmodels            List all available models (default: false)
  --models                List all supported models with their configuration names (default: false)
  --trace-code            Use deep code tracing for high-confidence unused code detection (default: false)
  --prompt-strategy       Prompt strategy to use (anthropic, gemini, openai, langchain) (optional)
  -e, --estimate          Estimate token usage and cost without performing the review (default: false)
  -v, --version           Output the current version
  -h, --help              Display help information
```

### Model Testing Options

```
Command: model-test [provider:model]
Description: Test AI models to verify API keys and model availability

Arguments:
  provider:model          Provider and model to test (e.g. gemini:gemini-1.5-pro, anthropic:claude-3-opus)

Options:
  --all                   Test all available models
  -p, --provider <provider>  Test all models for a specific provider
  -h, --help              Display help information

Command: test-build
Description: Test all AI models during build process

Options:
  --fail-on-error         Exit with error code if any model test fails
  --json                  Output results in JSON format
  -p, --provider <provider>  Test only models for a specific provider
  -h, --help              Display help information
```

## Output

Review results are stored in the `ai-code-review-docs/` directory. For consolidated reviews, the output follows this naming pattern:

```
ai-code-review-docs/[ai-model]-[review-type]-[file-or-directory-name]-[date].md
```

For example:

```
ai-code-review-docs/openai-gpt-4o-quick-fixes-review-src-2024-04-06.md
ai-code-review-docs/gemini-1.5-pro-architectural-review-src-utils-2024-04-06.md
```

If you use the `--individual` flag, each file will have its own review file with a path structure matching the source:

```
ai-code-review-docs/[ai-model]-[review-type]-[file-name]-[date].md
```

## Configuration

### Customizing Prompts

You can customize the review process in several ways:

#### Prompt Templates

The tool comes with built-in prompt templates in the `prompts/templates/` directory:

- `quick-fixes-review.md` - For quick fixes reviews
- `security-review.md` - For security reviews
- `architectural-review.md` - For architectural reviews
- `performance-review.md` - For performance reviews

#### Custom Prompt Templates

You can create your own prompt templates and use them with the `--prompt` flag. Custom templates should include metadata in YAML format at the top of the file:

```markdown
---
name: Custom Security Review
description: A custom prompt template for security-focused code reviews
version: 1.0.0
author: Your Name
reviewType: security
language: typescript
tags: security, custom
---

# Security Code Review

Please review the following code for security vulnerabilities:

{{LANGUAGE_INSTRUCTIONS}}

## Output Format

Please provide your findings in the following format:

1. **Vulnerability**: Description of the vulnerability
2. **Severity**: High/Medium/Low
3. **Location**: File and line number
4. **Recommendation**: How to fix the issue

{{SCHEMA_INSTRUCTIONS}}
```

#### Prompt Fragments

You can inject custom fragments into the prompt with the `--prompt-fragment` flag:

```bash
ai-code-review src/index.ts --prompt-fragment "Focus on performance issues"
```

You can also specify the position of the fragment with the `--prompt-fragment-position` flag (start, middle, or end):

```bash
ai-code-review src/index.ts --prompt-fragment "Focus on security issues" --prompt-fragment-position start
```

#### Model-Specific Strategies

You can use model-specific prompt strategies with the `--prompt-strategy` flag:

```bash
ai-code-review src/index.ts --prompt-strategy anthropic
```

Available strategies:
- `anthropic` - Optimized for Claude models
- `gemini` - Optimized for Gemini models
- `openai` - Optimized for GPT models
- `langchain` - Uses LangChain for enhanced prompt management

The LangChain strategy is particularly useful for complex reviews that benefit from:
- Structured output with Zod schemas
- Few-shot learning with examples
- Chain-based reasoning

```bash
# Use LangChain for an unused code review
ai-code-review src/utils --type unused-code --prompt-strategy langchain

# Use LangChain for quick fixes with enhanced prompts
ai-code-review src/components --type quick-fixes --prompt-strategy langchain
```

### Environment Variables

Create a `.env.local` file in your project root with your API keys:

```
# For Google Gemini models
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# For OpenRouter models (Claude, GPT-4, etc.)
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Model configuration
# Specify which model to use for code reviews using the format provider:model
# The tool will automatically map this to the correct API model name
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro

# See the Supported Models section for all available models and their API mappings

# Custom context files
# Comma-separated list of file paths to include as context for the code review
AI_CODE_REVIEW_CONTEXT=README.md,docs/architecture.md,src/types.ts

# See the Supported Models section below for all available models
```

> Note: For backward compatibility, the tool also supports the old `CODE_REVIEW` prefix for environment variables, but the `AI_CODE_REVIEW` prefix is recommended.

## Supported Models

### Model Mapping System

The tool uses a centralized model mapping system that automatically converts user-friendly model names to provider-specific API formats. This ensures that you can use consistent model names across different providers without worrying about the specific API requirements of each provider.

For example, when you specify `anthropic:claude-3-opus` as your model, the tool automatically maps this to the correct API model name `claude-3-opus-20240229` when making requests to the Anthropic API.

The model mapping system provides the following benefits:

- **Consistent Model Names**: Use the same model naming convention across all providers
- **Automatic API Format Conversion**: No need to remember provider-specific model formats
- **Centralized Configuration**: All model mappings are defined in a single location for easy maintenance
- **Extensible**: New models can be added easily without changing the core code

You can see all available models and their mappings by running `ai-code-review --listmodels`.

### Gemini Models

| Model Name | Description | API Key Required | API Model Name |
|------------|-------------|------------------|----------------|
| `gemini:gemini-1.5-pro` | Recommended for most code reviews | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-1.5-pro` |
| `gemini:gemini-1.5-flash` | Faster but less detailed reviews | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-1.5-flash` |
| `gemini:gemini-2.5-pro` | Latest model with improved capabilities | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-2.5-pro` |
| `gemini:gemini-2.0-flash` | Balanced performance and quality | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-2.0-flash` |
| `gemini:gemini-pro` | Legacy model | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-pro` |
| `gemini:gemini-pro-latest` | Latest version of legacy model | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-pro-latest` |

### OpenRouter Models

| Model Name | Description | API Key Required | API Model Name |
|------------|-------------|------------------|----------------|
| `openrouter:anthropic/claude-3-opus` | Highest quality, most detailed reviews | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `anthropic/claude-3-opus` |
| `openrouter:anthropic/claude-3-sonnet` | Good balance of quality and speed | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `anthropic/claude-3-sonnet` |
| `openrouter:anthropic/claude-3-haiku` | Fast, efficient reviews | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `anthropic/claude-3-haiku` |
| `openrouter:openai/gpt-4o` | OpenAI's latest model with strong code understanding | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `openai/gpt-4o` |
| `openrouter:openai/gpt-4-turbo` | Powerful model with good code analysis | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `openai/gpt-4-turbo` |
| `openrouter:google/gemini-1.5-pro` | Google's model via OpenRouter | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `google/gemini-1.5-pro` |

### Anthropic Models (Direct API)

| Model Name | Description | API Key Required | API Model Name |
|------------|-------------|------------------|----------------|
| `anthropic:claude-3-opus` | Highest quality, most detailed reviews | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-3-opus-20240229` |
| `anthropic:claude-3-sonnet` | Good balance of quality and speed | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-3-sonnet-20240229` |
| `anthropic:claude-3-haiku` | Fast, efficient reviews | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-3-haiku-20240307` |

### OpenAI Models (Direct API)

| Model Name | Description | API Key Required | API Model Name |
|------------|-------------|------------------|----------------|
| `openai:gpt-4-turbo` | Powerful model with good code analysis | `AI_CODE_REVIEW_OPENAI_API_KEY` | `gpt-4-turbo-preview` |
| `openai:gpt-4o` | OpenAI's latest model with strong code understanding | `AI_CODE_REVIEW_OPENAI_API_KEY` | `gpt-4o` |
| `openai:gpt-4` | Original GPT-4 model | `AI_CODE_REVIEW_OPENAI_API_KEY` | `gpt-4` |

### Extending the Model Mapping System

If you need to add support for a new model or update an existing model mapping, you can modify the `MODEL_MAP` in `src/clients/utils/modelMaps.ts`. The model mapping system uses a simple key-value structure where the key is the user-friendly model name (e.g., `anthropic:claude-3-opus`) and the value contains the API-specific details:

```typescript
export const MODEL_MAP: Record<string, ModelMapping> = {
  'anthropic:claude-3-opus': {
    apiName: 'claude-3-opus-20240229',  // The actual API model name
    displayName: 'Claude 3 Opus',       // Human-readable name
    provider: 'anthropic',              // Provider identifier
    contextWindow: 200000,              // Context window size in tokens
    description: 'Claude 3 Opus - Anthropic\'s most powerful model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY'  // Required API key
  },
  // Add more models here...
};
```

After adding a new model mapping, you can use it by setting the `AI_CODE_REVIEW_MODEL` environment variable to the new model key.

### Model Mapping Utility Functions

The model mapping system provides several utility functions that you can use in your code:

```typescript
// Get the API name for a model key
const apiName = getApiNameFromKey('anthropic:claude-3-opus');
// Returns: 'claude-3-opus-20240229'

// Get the full model mapping
const modelMapping = getModelMapping('anthropic:claude-3-opus');
// Returns: { apiName: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus', ... }

// Get all models for a provider
const anthropicModels = getModelsByProvider('anthropic');
// Returns: ['anthropic:claude-3-opus', 'anthropic:claude-3-sonnet', ...]

// Parse a model string
const { provider, modelName } = parseModelString('anthropic:claude-3-opus');
// Returns: { provider: 'anthropic', modelName: 'claude-3-opus' }

// Get the full model key from provider and model name
const fullModelKey = getFullModelKey('anthropic', 'claude-3-opus');
// Returns: 'anthropic:claude-3-opus'
```

These utility functions make it easy to work with the model mapping system in your code.

## Code Tracing for Unused Code Detection

The tool includes a powerful code tracing feature for identifying unused code with high confidence. This feature uses a multi-pass approach to analyze code dependencies and references, providing detailed evidence for each element identified as unused.

### How Code Tracing Works

The code tracing feature follows a comprehensive approach:

1. **Entry Point & Dependency Mapping**: Identifies all entry points to the codebase and maps module dependencies
2. **Reference Tracing**: Finds all references to each code element throughout the codebase
3. **Verification & Confidence Assessment**: Evaluates evidence and assigns confidence levels (high, medium, low)

### Using Code Tracing

To enable code tracing:

```bash
# Basic unused code detection
ai-code-review src --type unused-code

# Enhanced detection with deep code tracing
ai-code-review src --type unused-code --trace-code
```

### Code Tracing Benefits

- **High Confidence Detection**: Thorough evidence collection ensures recommendations are reliable
- **Detailed Evidence**: Each element includes complete evidence chain showing why it's unused
- **Risk Assessment**: Evaluates potential risks of removing each element
- **Removal Scripts**: Automatically generates scripts for safely removing unused code
- **Edge Case Detection**: Considers special cases like dynamic imports and reflection patterns

### Confidence Levels

Code tracing assigns confidence levels to each finding:

- **High**: Clear evidence the element is never referenced (safe to remove)
- **Medium**: Likely unused but with some uncertainty (verify before removing)
- **Low**: Possibly unused but with significant uncertainty (requires further investigation)

## Testing API Connections

You can test your API connections to verify that your API keys are valid and working correctly:

```bash
# Test API connections directly
ai-code-review test-api

# Test API connections before running a review
ai-code-review src --test-api
```

This will test connections to both Google Gemini API and OpenRouter API (if configured) and provide detailed feedback on the status of each connection.

## Requirements

- Node.js >= 16.0.0
- Google Generative AI API key or OpenRouter API key

## License

MIT
