# Local Development Guide for AI Code Review

This guide explains how to run the AI Code Review tool locally during development.

## Running the Local Development Version

To run the local development version (TypeScript source code directly without building):

```bash
# Using the convenience script
./local-ai-review.sh [target] [options]

# Or using pnpm
pnpm run local [target] [options]

# Examples:
./local-ai-review.sh src/utils --type security
./local-ai-review.sh src/index.ts --interactive
```

This runs the TypeScript code directly using ts-node, which is perfect for development.

## Testing AI Models

You can test your AI model connectivity and API keys using the model testing commands:

```bash
# Test a specific model
./local-ai-review.sh model-test gemini:gemini-2.5-pro
./local-ai-review.sh model-test anthropic:claude-3-opus
./local-ai-review.sh model-test openai:gpt-4o

# Test all models from a specific provider
./local-ai-review.sh model-test -p gemini
./local-ai-review.sh model-test --provider openai

# Test all available models (requires API keys for all providers)
./local-ai-review.sh model-test --all

# Run model tests during build process
./local-ai-review.sh test-build
./local-ai-review.sh test-build --fail-on-error
./local-ai-review.sh test-build --json
```

These commands are useful for verifying that your API keys are valid and that you can connect to the AI services.

## Running the Built Version

To test the built version (simulating the installed npm package):

```bash
# Using the convenience script
./built-ai-review.sh [target] [options]

# Or using pnpm
pnpm run built-review [target] [options]

# Or using npm
npm run build && npm start [target] [options]

# Examples:
./built-ai-review.sh src/utils --type security
./built-ai-review.sh src/index.ts --interactive
```

This first runs `npm run build` (which uses esbuild to bundle the source and emit type declarations) and then executes the bundled `dist/index.js`, simulating how the package will behave when installed from npm.

## Testing Specific Features

```bash
# List available models
pnpm run list:models

# Test API connections
pnpm run test:api

# Test all models during build
pnpm run test:build

# Test a specific model
pnpm run test:model -- gemini:gemini-1.5-pro
pnpm run test:model -- anthropic:claude-3-opus
pnpm run test:model -- openai:gpt-4o

# Test all models for a specific provider
pnpm run test:model -- -p anthropic

# Test all available models
pnpm run test:model -- --all

# Run tests
pnpm run test
```

## Publishing

When you're ready to publish:

```bash
# Prepare the package for publishing
pnpm run prepare-package

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
