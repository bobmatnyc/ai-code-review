# AI Code Review v1.0.0

A TypeScript-based tool for automated code reviews using Google's Gemini AI models and OpenRouter API.

## Overview

This tool analyzes code from specified files or directories in sibling projects and generates structured code evaluations. It leverages Google's Gemini AI models and OpenRouter API to provide insightful feedback on code quality, best practices, and potential improvements. With support for multiple AI models, you can choose the best model for your specific needs.

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
- **Multiple AI Models**: Support for Google's Gemini models and OpenRouter API (Claude, GPT-4, etc.)
- **Customizable**: Configure review types, output formats, and prompt templates
- **Memory Optimized**: Process large codebases efficiently with optimized memory usage
- **Error Recovery**: Robust error handling with graceful recovery
- **Cost Estimation**: Track API usage with token and cost estimates

## Installation

### Global Installation

```bash
npm install -g ai-code-review
```

### Local Installation

```bash
npm install --save-dev ai-code-review
```

### API Key Setup

Create a `.env.local` file in your project root with your API keys:

```
# For Google Gemini models
CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# For OpenRouter models (Claude, GPT-4, etc.)
CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

You can get API keys from:
- [Google AI Studio](https://makersuite.google.com/) for Gemini models
- [OpenRouter](https://openrouter.ai/) for access to Claude, GPT-4, and other models

## Usage

### Command Line

```bash
# Global installation
ai-review [project] [file|directory] [options]

# Local installation
npx ai-review [project] [file|directory] [options]
```

### Examples

```bash
# Review a single file in the current project
ai-review this src/index.ts

# Review an entire directory with interactive mode
ai-review this src/utils --interactive

# Perform an architectural review
ai-review this src --type architectural

# Review a file in a sibling project
ai-review other-project src/index.ts

# Include test files in the review
ai-review this src --include-tests

# Specify output format (markdown or json)
ai-review this src/index.ts --output json

# Disable including project documentation in the context (enabled by default)
ai-review this src/index.ts --no-include-project-docs

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
  -h, --help              Display help information
```

## Output

Review results are stored in the `reviews/[project-name]/` directory. For consolidated reviews, the output follows this naming pattern:

```
reviews/[project-name]/[review-type]-review-[date].md
```

For example:

```
reviews/my-project/quick-fixes-review-2024-04-05.md
reviews/my-project/architectural-review-2024-04-05.md
```

If you use the `--individual` flag, each file will have its own review file with a path structure matching the source:

```
reviews/my-project/src/components/Button.ts.md
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
CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# For OpenRouter models (Claude, GPT-4, etc.)
CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Model configuration (required if using the respective API)
# For Google Gemini models, specify the model name
CODE_REVIEW_GEMINI_MODEL=gemini-1.5-pro

# For OpenRouter models, specify the model name without the 'openrouter-' prefix
CODE_REVIEW_OPENROUTER_MODEL=anthropic/claude-3-opus
```

## Requirements

- Node.js >= 16.0.0
- Google Generative AI API key or OpenRouter API key

## License

MIT
