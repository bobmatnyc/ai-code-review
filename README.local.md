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
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here
# or
AI_CODE_REVIEW_GOOGLE_GENERATIVE_AI_KEY=your_google_api_key_here
# or
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here
```
