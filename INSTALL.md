# Installation Guide for AI Code Review v1.0.0

This guide will help you install and set up the AI Code Review tool.

## Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- Google Generative AI API key

## Installation Options

### Global Installation

```bash
npm install -g @bobmatnyc/ai-code-review
```

This will install the tool globally, making the `ai-code-review` command available from anywhere.

### Local Installation

```bash
npm install --save-dev @bobmatnyc/ai-code-review
```

This will install the tool as a development dependency in your project.

## API Key Setup

1. Get an API key from the [Google AI Studio](https://makersuite.google.com/) or [OpenRouter](https://openrouter.ai/)
2. Create a `.env.local` file in your project root
3. Add your API key to the file:

```
# For Google Gemini models
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# For OpenRouter models (Claude, GPT-4, etc.)
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Model configuration
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
```

## Verifying Installation

To verify that the tool is installed correctly, run:

```bash
# Global installation
ai-code-review --version

# Local installation
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

# Test API connections
ai-code-review test-api
```

For more detailed usage instructions, see the [README.md](README.md) file.
