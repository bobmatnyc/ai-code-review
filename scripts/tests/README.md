# AI Code Review Test Scripts

This directory contains test scripts for the AI Code Review tool, organized by functionality.

## Running Tests

Use the `run-tests.sh` script to run any test in this directory:

```bash
# Run from project root
./scripts/run-tests.sh <test-name> [arguments]

# Examples:
./scripts/run-tests.sh test-files.js
./scripts/run-tests.sh tool-calling/test-mock-data.js

# List available tests
./scripts/run-tests.sh
```

## Test Organization

Tests are organized into the following directories:

- `scripts/tests/` - Main test scripts for general functionality
- `scripts/tests/tool-calling/` - Tests for tool calling functionality with Anthropic and OpenAI

## Available Tests

### Main Tests

- `test-code-tracing.sh` - Tests code tracing for unused code reviews
- `test-file-detection.js` - Tests file discovery and filtering
- `test-files.js` - Tests file system utilities
- `test-metadata-headers.js` - Tests metadata handling in prompts
- `test-simple-tool-calling.js` - Simple test for tool calling functionality
- `test-tool-calling.js` - General test for tool calling
- `real-world-test-improved.js` - Improved real-world test with mock responses
- `standalone-test.js` - Standalone test for core functionality

### Tool Calling Tests

- `direct-test.js` - Direct test of tool calling functionality
- `real-world-test.js` - Real-world test for tool calling
- `run-live-test.js` - Run live tool calling test with actual API calls
- `run-mock-test.js` - Run tool calling test with mock API responses
- `test-gemini.js` - Test Gemini model connectivity
- `test-mock-data.js` - Test tool calling with mock data
- `test-mock-serpapi.js` - Test tool calling with mock SERPAPI responses
- `test-tool-calling-local.js` - Test tool calling with local ts-node execution

## API Keys for Testing

Some tests require API keys to be set as environment variables:

- `AI_CODE_REVIEW_OPENAI_API_KEY` - OpenAI API key
- `AI_CODE_REVIEW_ANTHROPIC_API_KEY` - Anthropic API key
- `AI_CODE_REVIEW_GOOGLE_API_KEY` - Google API key (for Gemini)
- `SERPAPI_KEY` - SERPAPI key for dependency analysis

For tests with `mock` in the name, a mock implementation will be used if the real API keys are not available.