# AI Code Review v1.5.0

A TypeScript-based tool for automated code reviews using Google's Gemini AI models, Anthropic Claude models, and OpenRouter API (Claude, GPT-4, etc.).

## What's New in v1.5.0

### Major Features

- **Structured Output**: Implemented a well-defined schema for code review output that can be easily parsed and rendered procedurally
- **Enhanced Interactive Mode**: Interactive mode now displays all issue details in a structured format with code samples
- **Improved Model Support**: Better support for all model providers including Anthropic, OpenAI, Gemini, and OpenRouter

### Other Improvements

- **Fixed Development Mode**: Fixed bug in API client selection where dynamic imports were failing in development mode
- **Improved Imports**: Updated imports in anthropicClient.ts to use direct imports instead of dynamic imports
- **Faster Development**: Added --transpile-only flag to ts-node for faster development builds

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

# Include test files in the review
ai-code-review src --include-tests

# Specify output format (markdown or json)
ai-code-review src/index.ts --output json

# Disable including project documentation in the context (enabled by default)
ai-code-review src/index.ts --no-include-project-docs

# List all available models
ai-code-review --listmodels

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
  -t, --type <type>       Type of review (architectural, quick-fixes, security, performance) (default: "quick-fixes")
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
  -v, --version           Output the current version
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

You can customize the review process by modifying the prompt templates in the `prompts/` directory:

- `architectural-review.md` - For architectural reviews
- `quick-fixes-review.md` - For quick fixes reviews
- `security-review.md` - For security reviews
- `performance-review.md` - For performance reviews
- `consolidated-review.md` - For consolidated reviews of multiple files
- `base-prompt.md` - Base template used by all review types

### Environment Variables

Create a `.env.local` file in your project root with your API keys:

```
# For Google Gemini models
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# For OpenRouter models (Claude, GPT-4, etc.)
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Model configuration
# Specify which model to use for code reviews using the format adapter:model
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro

# Custom context files
# Comma-separated list of file paths to include as context for the code review
AI_CODE_REVIEW_CONTEXT=README.md,docs/architecture.md,src/types.ts

# See the Supported Models section below for all available models
```

> Note: For backward compatibility, the tool also supports the old `CODE_REVIEW` prefix for environment variables, but the `AI_CODE_REVIEW` prefix is recommended.

## Supported Models

### Gemini Models

| Model Name | Description | API Key Required |
|------------|-------------|------------------|
| `gemini:gemini-1.5-pro` | Recommended for most code reviews | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-1.5-flash` | Faster but less detailed reviews | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-2.5-pro` | Latest model with improved capabilities | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-2.0-flash` | Balanced performance and quality | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-pro` | Legacy model | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-pro-latest` | Latest version of legacy model | `AI_CODE_REVIEW_GOOGLE_API_KEY` |

### OpenRouter Models

| Model Name | Description | API Key Required |
|------------|-------------|------------------|
| `openrouter:anthropic/claude-3-opus` | Highest quality, most detailed reviews | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:anthropic/claude-3-sonnet` | Good balance of quality and speed | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:anthropic/claude-3-haiku` | Fast, efficient reviews | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:openai/gpt-4o` | OpenAI's latest model with strong code understanding | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:openai/gpt-4-turbo` | Powerful model with good code analysis | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:google/gemini-1.5-pro` | Google's model via OpenRouter | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |

### Anthropic Models (Direct API)

| Model Name | Description | API Key Required |
|------------|-------------|------------------|
| `anthropic:claude-3-opus` | Highest quality, most detailed reviews | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |
| `anthropic:claude-3-sonnet` | Good balance of quality and speed | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |
| `anthropic:claude-3-haiku` | Fast, efficient reviews | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |

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
