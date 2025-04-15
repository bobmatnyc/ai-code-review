# Local Development Guide for AI Code Review

This guide explains how to run the AI Code Review tool locally during development.

## Running the Local Development Version

To run the local development version (TypeScript source code directly without building):

```bash
# Using the convenience script
./local-ai-review.sh [target] [options]

# Or using yarn
yarn local-review [target] [options]

# Examples:
./local-ai-review.sh src/utils --type security
./local-ai-review.sh src/index.ts --interactive
```

This runs the TypeScript code directly using ts-node, which is perfect for development.

## Running the Built Version

To test the built version (simulating the installed npm package):

```bash
# Using the convenience script
./built-ai-review.sh [target] [options]

# Or using yarn
yarn built-review [target] [options]

# Examples:
./built-ai-review.sh src/utils --type security
./built-ai-review.sh src/index.ts --interactive
```

This first builds the TypeScript code and then runs the JavaScript output, simulating how the package will behave when installed from npm.

## Testing Specific Features

```bash
# List available models
yarn list:models

# Test API connections
yarn test:api

# Test all models during build
yarn test:build

# Test a specific model
yarn test:model -- gemini:gemini-1.5-pro
yarn test:model -- anthropic:claude-3-opus
yarn test:model -- openai:gpt-4o

# Test all models for a specific provider
yarn test:model -- -p anthropic

# Test all available models
yarn test:model -- --all

# Run tests
yarn test
```

## Publishing

When you're ready to publish:

```bash
# Prepare the package for publishing
yarn prepare-package

# Publish to npm
npm publish --access=public
```

## Environment Variables

For local development, create a `.env.local` file with your API keys:

```
# Google Gemini API - Required for testing Gemini models
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# Anthropic API - Required for testing Claude models directly
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here

# OpenAI API - Required for testing OpenAI models directly
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here

# OpenRouter API - Required for testing models via OpenRouter
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Set default model to use (provider:model format)
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
```

You don't need to set all API keys, just the ones for the providers you want to test.
