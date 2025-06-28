# Installation Guide for AI Code Review v2.1.7

This guide will help you install and set up the AI Code Review tool.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended) or npm
- At least one of the following API keys:
  - Google Generative AI API key
  - Anthropic API key
  - OpenRouter API key

## Installation Options

### Global Installation

```bash
# Using pnpm (recommended)
pnpm add -g @bobmatnyc/ai-code-review

# Using npm (alternative)
npm install -g @bobmatnyc/ai-code-review
```

This will install the tool globally, making the `ai-code-review` command available from anywhere.

### Local Installation

```bash
# Using pnpm (recommended)
pnpm add -D @bobmatnyc/ai-code-review

# Using npm (alternative)
npm install --save-dev @bobmatnyc/ai-code-review
```

This will install the tool as a development dependency in your project.

## API Key Setup

1. Copy the sample environment file and fill in your API keys:
   ```bash
   cp .env.sample .env.local
   ```
2. Get an API key from one or more of the following sources:
   - [Google AI Studio](https://makersuite.google.com/) for Gemini models
   - [Anthropic Console](https://console.anthropic.com/) for Claude models
   - [OpenRouter](https://openrouter.ai/) for access to multiple models
2. Create a `.env.local` file in your project root
3. Add your API key(s) to the file:

```
# For Google Gemini models
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# For Anthropic Claude models
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here

# For OpenRouter models (Claude, GPT-4, etc.)
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# For dependency security analysis in architectural reviews (optional)
SERPAPI_KEY=your_serpapi_api_key_here

# Model configuration (examples)
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
# or
# AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus
# or
# AI_CODE_REVIEW_MODEL=openrouter:openai/gpt-4o
```

## Verifying Installation

To verify that the tool is installed correctly, run:

```bash
# Global installation
ai-code-review --version

# Local installation with pnpm
pnpm exec ai-code-review --version

# Local installation with npm
npx ai-code-review --version
```

## Basic Usage

```bash
# Review a file
ai-code-review src/index.ts

# Review a directory
ai-code-review src

# Review with interactive mode
ai-code-review src --interactive

# Run a security review
ai-code-review src --type security

# Run an architectural review with package security analysis
ai-code-review src --type architectural

# List available models
ai-code-review --listmodels

# Estimate token usage and cost
ai-code-review src --estimate

# Test API connections
ai-code-review test-api
```

For more detailed usage instructions, see the [README.md](README.md) file.
