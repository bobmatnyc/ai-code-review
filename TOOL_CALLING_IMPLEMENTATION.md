# Tool Calling Implementation for ai-code-review

This document provides an overview of the tool calling implementation for the architectural review feature in the ai-code-review project. Tool calling allows LLMs to search for security information about dependencies in a project.

## Overview

The tool calling implementation allows AI models (OpenAI and Anthropic) to analyze dependencies in a project for security vulnerabilities, deprecated packages, and version recommendations. This enhancement significantly improves the architectural review feature by providing up-to-date security information for dependencies.

## Supported Models

Tool calling is supported by the following models:

- **OpenAI**:
  - GPT-4.1
  - GPT-4o
  - GPT-4.5
  - GPT-4-turbo

- **Anthropic**:
  - Claude 3 Opus
  - Claude 3 Sonnet
  - Claude 3 Haiku

## Core Components

### 1. Package Analysis

The `packageAnalyzer.ts` module extracts package information from various package management files:

- `package.json` (NPM)
- `composer.json` (PHP)
- `requirements.txt` (Python)
- `Gemfile` (Ruby)

For each package, it extracts information such as:
- Package name
- Version
- Constraints (version ranges)
- Whether it's a dev dependency

### 2. Security Information Search

The `serpApiHelper.ts` module uses the SERPAPI service to search for security information about packages:

- Searches for known vulnerabilities
- Extracts severity information
- Identifies affected and fixed versions
- Determines recommended versions
- Gathers package health information

### 3. Tool Calling Abstractions

The `toolCalling.ts` module provides abstractions for tool calling across different LLM providers:

- Unified interface for tool definitions
- Provider-specific handlers for OpenAI and Anthropic
- Tool execution logic

### 4. Provider-Specific Implementations

- **OpenAI**: `openAIToolCallingHandler.ts` formats tools and handles responses according to OpenAI's API requirements.
- **Anthropic**: `anthropicToolCallingHandler.ts` formats tools and handles responses according to Anthropic's API requirements.

## How It Works

1. **Dependency Extraction**: When an architectural review is requested, the system extracts package information from the project.

2. **Tool Preparation**: The system prepares tool definitions for security analysis based on the LLM provider.

3. **Initial Request**: The system makes a request to the LLM with the project code, dependency information, and available tools.

4. **Tool Calling**: The LLM generates tool calls to search for security information about critical dependencies.

5. **Tool Execution**: The system executes these tool calls, searching for security information using SERPAPI.

6. **Result Integration**: The system sends the tool results back to the LLM, which incorporates the security information into the architectural review.

7. **Final Response**: The LLM generates a comprehensive architectural review that includes security recommendations for dependencies.

## Testing

The tool calling implementation can be tested using two approaches:

1. **Mock Testing**: Using mock data to simulate tool calling without making actual API calls.
2. **Integration Testing**: Using real API keys to test the full functionality.

The `test-mock-data.js` script provides a standalone simulation of the tool calling workflow.

## Configuration

To enable tool calling, you need to set up the following environment variables:

- `SERPAPI_KEY`: Your SERPAPI key for searching dependency information
- `AI_CODE_REVIEW_MODEL`: A model that supports tool calling (e.g., `openai:gpt-4o` or `anthropic:claude-3-opus`)
- `AI_CODE_REVIEW_OPENAI_API_KEY` or `AI_CODE_REVIEW_ANTHROPIC_API_KEY`: API key for the model provider

## Usage

Run an architectural review with tool calling enabled:

```bash
ai-code-review path/to/project --type=arch
```

The review will include security recommendations for dependencies if a SERPAPI key is configured and the model supports tool calling.

## Extension

This tool calling implementation can be extended to support additional use cases:

- Checking for library compatibility
- Searching for usage examples
- Finding documentation for libraries
- Analyzing code against best practices