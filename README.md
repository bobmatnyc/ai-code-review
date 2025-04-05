# Code Review Tool

A TypeScript-based tool for automated code reviews using Google's Gemini AI models.

## Overview

This tool analyzes code from specified files or directories in sibling projects and generates structured code evaluations. It leverages Google's Gemini AI models to provide insightful feedback on code quality, best practices, and potential improvements.

## Features

- Review individual files or entire directories
- Multiple review types to focus on different aspects of code quality:
  - **Architectural**: Holistic review of code structure, APIs, and package organization
  - **Quick Fixes**: Identify low-hanging fruit and easy improvements
  - **Security**: Focus on security vulnerabilities and best practices
  - **Performance**: Identify performance bottlenecks and optimization opportunities
- Generate structured code evaluations based on predefined criteria
- Support for Next.js and TypeScript projects
- Customizable review parameters
- Output organized in a consistent directory structure
- Proper error handling with clear error messages
- Cost estimation for API usage (tokens and USD)

## Installation

```bash
# Clone the repository
git clone [repository-url]
cd code-review

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API key to .env.local
# You can use either GOOGLE_AI_STUDIO_KEY or GOOGLE_GENERATIVE_AI_KEY
# GOOGLE_AI_STUDIO_KEY is preferred and should be used when possible
```

## Usage

```bash
# Review a specific file in a sibling project
yarn dev code-review project-name path/to/file.ts

# Review a directory in a sibling project
yarn dev code-review project-name path/to/directory

# Review the current project (use 'this', 'self', or '.' as the project name)
yarn dev code-review this src

# Interactive mode (streams output to console, only works with single files)
yarn dev code-review this src/utils/fileSystem.ts --interactive

# Specify review type (architectural, quick-fixes, security, performance)
yarn dev code-review project-name path/to/file.ts --type=security

# Include test files in the review
yarn dev code-review project-name path/to/directory --include-tests

# Specify output format (markdown or json)
yarn dev code-review project-name path/to/file.ts --output=json

# Disable including project documentation in the context (enabled by default)
yarn dev code-review project-name path/to/file.ts --no-include-project-docs
```

## Output

Review results are stored in the `/review/[project-name]/` directory, with subdirectories matching the source path structure. For example:

```
/review/my-project/src/components/Button.ts.md
```

## Configuration

You can customize the review process by modifying the prompt template in `GEMINI-PROMPT.md`.

## Requirements

- Node.js 18+
- TypeScript 5+
- Google AI Studio API key

## License

[License information]
