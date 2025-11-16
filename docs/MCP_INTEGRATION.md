# AI Code Review MCP Integration

This document describes how to integrate the AI Code Review tool with MCP (Model Context Protocol) compatible clients like Claude Desktop.

## Overview

The AI Code Review MCP server provides comprehensive code analysis capabilities through the Model Context Protocol, enabling AI assistants to:

- Perform code reviews with multiple analysis types
- Analyze Pull Requests and git diffs
- Examine git repository history and patterns
- Conduct detailed file-level analysis

## Quick Start

### 1. Start the MCP Server

```bash
# Start the MCP server
ai-code-review mcp

# Start with debug logging
ai-code-review mcp --debug

# Custom configuration
ai-code-review mcp --name "my-code-review" --max-requests 10
```

### 2. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the AI Code Review server:

```json
{
  "mcpServers": {
    "ai-code-review": {
      "command": "ai-code-review",
      "args": ["mcp"]
    }
  }
}
```

### 3. Configure API Keys

Create a `.env.local` file in your project or set environment variables:

```bash
# Choose your preferred AI provider
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro

# API Keys (provide for your chosen provider)
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## Available Tools

### 1. Code Review Tool (`code-review`)

Performs comprehensive code analysis on files or directories.

**Parameters:**
- `target` (required): Path to file or directory to review
- `reviewType`: Type of review (quick-fixes, architectural, security, performance, etc.)
- `outputFormat`: Output format (markdown, json)
- `model`: AI model to use
- `includeTests`: Include test files in review
- `includeProjectDocs`: Include project documentation
- `language`: Programming language hint
- `framework`: Framework context

**Example Usage in Claude:**
```
"Review the src/components directory for security issues using the security review type"
```

### 2. PR Review Tool (`pr-review`)

Analyzes Pull Requests and git branch differences.

**Parameters:**
- `repository` (required): GitHub URL or local git repository path
- `prNumber`: GitHub PR number (for GitHub repos)
- `baseBranch`: Base branch to compare against
- `headBranch`: Head branch to review
- `reviewType`: Type of review to perform
- `focusAreas`: Specific areas to focus on
- `generateComments`: Generate line-specific comments

**Example Usage in Claude:**
```
"Review the changes in my local git repository comparing feature-branch to main"
```

### 3. Git Analysis Tool (`git-analysis`)

Analyzes git repository history and patterns.

**Parameters:**
- `repository` (required): Path to git repository
- `commitCount`: Number of recent commits to analyze
- `branch`: Branch to analyze
- `analysisType`: Type of analysis (commits, changes, patterns, quality)
- `since`: Start date for analysis
- `until`: End date for analysis

**Example Usage in Claude:**
```
"Analyze the commit history of this repository for the last 50 commits"
```

### 4. File Analysis Tool (`file-analysis`)

Performs detailed analysis of individual files.

**Parameters:**
- `filePath` (required): Path to file to analyze
- `analysisType`: Type of analysis (syntax, complexity, security, performance, patterns)
- `language`: Programming language
- `framework`: Framework context

**Example Usage in Claude:**
```
"Analyze the complexity of src/utils/helper.ts"
```

## Usage Examples

### Basic Code Review

```
"Please review the current directory for quick fixes"
```

This will use the `code-review` tool with:
- `target`: "."
- `reviewType`: "quick-fixes"

### Security Analysis

```
"Perform a security review of the src/auth directory"
```

This will use the `code-review` tool with:
- `target`: "src/auth"
- `reviewType`: "security"

### PR Review

```
"Review the pull request changes in my local repository comparing feature-login to main"
```

This will use the `pr-review` tool with:
- `repository`: "."
- `baseBranch`: "main"
- `headBranch`: "feature-login"

### Git History Analysis

```
"Analyze the git commit patterns for the last 30 commits"
```

This will use the `git-analysis` tool with:
- `repository`: "."
- `commitCount`: 30
- `analysisType`: "commits"

### File Complexity Analysis

```
"Check the complexity metrics for src/components/Dashboard.tsx"
```

This will use the `file-analysis` tool with:
- `filePath`: "src/components/Dashboard.tsx"
- `analysisType`: "complexity"

## Configuration Options

### Server Options

- `--debug`: Enable debug logging
- `--name <name>`: Set server name (default: "ai-code-review")
- `--max-requests <number>`: Maximum concurrent requests (default: 5)
- `--timeout <number>`: Request timeout in milliseconds (default: 300000)

### Environment Variables

- `AI_CODE_REVIEW_MODEL`: Default model to use
- `AI_CODE_REVIEW_GOOGLE_API_KEY`: Google Gemini API key
- `AI_CODE_REVIEW_ANTHROPIC_API_KEY`: Anthropic Claude API key
- `AI_CODE_REVIEW_OPENAI_API_KEY`: OpenAI API key
- `AI_CODE_REVIEW_OPENROUTER_API_KEY`: OpenRouter API key

## Troubleshooting

### Server Won't Start

1. Check that you have the AI Code Review tool installed globally:
   ```bash
   npm install -g @bobmatnyc/ai-code-review
   ```

2. Verify your API keys are configured correctly

3. Check the server logs for error messages

### Claude Desktop Not Connecting

1. Verify the configuration file path and format
2. Restart Claude Desktop after configuration changes
3. Check that the `ai-code-review` command is available in your PATH

### Tool Execution Errors

1. Ensure you're in a valid project directory
2. Check file paths are correct and accessible
3. Verify git repository is properly initialized (for git-related tools)

## Advanced Usage

### Custom Model Configuration

You can specify different models for different types of analysis:

```bash
# Use Claude for architectural reviews
AI_CODE_REVIEW_MODEL=anthropic:claude-4-sonnet ai-code-review mcp

# Use Gemini for quick fixes
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro ai-code-review mcp
```

### Multiple Server Instances

You can run multiple MCP servers with different configurations:

```json
{
  "mcpServers": {
    "ai-code-review-security": {
      "command": "ai-code-review",
      "args": ["mcp", "--name", "security-review"]
    },
    "ai-code-review-performance": {
      "command": "ai-code-review", 
      "args": ["mcp", "--name", "performance-review"]
    }
  }
}
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/bobmatnyc/ai-code-review/issues
- Documentation: https://github.com/bobmatnyc/ai-code-review/docs
