# Installation Guide for AI Code Review v1.0.0

This guide will help you install and set up the AI Code Review tool.

## Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- Google Generative AI API key

## Installation Options

### Global Installation

```bash
npm install -g ai-code-review
```

This will install the tool globally, making the `ai-review` command available from anywhere.

### Local Installation

```bash
npm install --save-dev ai-code-review
```

This will install the tool as a development dependency in your project.

## API Key Setup

1. Get an API key from the [Google AI Studio](https://makersuite.google.com/)
2. Create a `.env.local` file in your project root
3. Add your API key to the file:

```
GOOGLE_GENERATIVE_AI_KEY=your_api_key_here
```

## Verifying Installation

To verify that the tool is installed correctly, run:

```bash
# Global installation
ai-review --version

# Local installation
npx ai-review --version
```

## Basic Usage

```bash
# Review a file
ai-review this src/index.ts

# Review a directory
ai-review this src

# Review with interactive mode
ai-review this src --interactive
```

For more detailed usage instructions, see the [README.md](README.md) file.
