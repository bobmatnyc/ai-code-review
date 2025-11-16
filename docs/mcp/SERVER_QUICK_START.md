# AI Code Review MCP Server Quick Start

## Overview

The AI Code Review MCP (Model Context Protocol) server provides comprehensive code analysis capabilities directly within Claude Desktop and other MCP-compatible clients.

---

## Quick Setup

### Step 1: Install AI Code Review

```bash
# Global installation (recommended for MCP)
pnpm add -g @bobmatnyc/ai-code-review

# Or with npm
npm install -g @bobmatnyc/ai-code-review
```

### Step 2: Configure API Keys

Create a `.env.local` file or set environment variables:

```bash
# Choose your preferred AI provider
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro

# Add your API key
AI_CODE_REVIEW_GOOGLE_API_KEY=your_api_key_here
# Or use other providers:
# AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_key
# AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_key
# AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_key
```

### Step 3: Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the AI Code Review MCP server:

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

### Step 4: Restart Claude Desktop

**IMPORTANT**: Claude Desktop only loads MCP servers on startup.

1. Quit Claude Desktop completely
2. Reopen Claude Desktop
3. Wait a few seconds for the MCP server to initialize

---

## Verify Installation

Start a conversation in Claude Desktop and try:

```
What MCP tools are available from ai-code-review?
```

You should see **4 tools** listed:
- code-review
- pr-review
- git-analysis
- file-analysis

---

## Available Tools

### 1. code-review

Performs comprehensive code analysis on files or directories.

**Example Prompts:**
```
Review the current directory for security issues

Perform an architectural review of the src/components directory

Check src/auth for quick fixes
```

### 2. pr-review

Analyzes Pull Requests and git branch differences.

**Example Prompts:**
```
Review the changes in my feature-branch compared to main

Analyze pull request changes focusing on security

Review the git diff between develop and feature-auth
```

### 3. git-analysis

Analyzes git repository history and patterns.

**Example Prompts:**
```
Analyze the last 50 commits for patterns

Check commit quality in this repository

Review git history for code quality trends
```

### 4. file-analysis

Performs detailed analysis of individual files.

**Example Prompts:**
```
Analyze the complexity of src/utils/helper.ts

Check security issues in src/auth/login.ts

Review performance in src/api/endpoints.ts
```

---

## Common Use Cases

### Security Review

```
Perform a security review of the src/auth directory
```

The MCP server will:
- Scan all authentication code
- Identify security vulnerabilities
- Provide remediation recommendations
- Include severity ratings

### Architectural Analysis

```
Review the architecture of the entire src directory
```

The server will:
- Analyze project structure
- Identify design patterns
- Suggest architectural improvements
- Review code organization

### Pull Request Review

```
Review the changes in feature-login compared to main branch
```

The server will:
- Analyze git diff
- Focus on changed files
- Provide line-specific feedback
- Assess impact of changes

### Performance Check

```
Check src/api for performance issues
```

The server will:
- Identify bottlenecks
- Suggest optimizations
- Review algorithmic complexity
- Recommend best practices

---

## Configuration Options

### Environment Variables

```bash
# Model selection
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro

# API Keys (provide for your chosen provider)
AI_CODE_REVIEW_GOOGLE_API_KEY=your_key
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_key
AI_CODE_REVIEW_OPENAI_API_KEY=your_key
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_key

# Optional: Log level
AI_CODE_REVIEW_LOG_LEVEL=info
```

### Server Options

```json
{
  "mcpServers": {
    "ai-code-review": {
      "command": "ai-code-review",
      "args": ["mcp", "--debug"],  // Enable debug logging
      "env": {
        "AI_CODE_REVIEW_MODEL": "anthropic:claude-4-sonnet"
      }
    }
  }
}
```

---

## Supported Review Types

The MCP server supports all AI Code Review review types:

| Review Type | Description |
|-------------|-------------|
| **comprehensive** | Complete analysis combining all review types |
| **quick-fixes** | Fast issue identification |
| **architectural** | Deep structural analysis |
| **security** | Security vulnerability detection |
| **performance** | Performance optimization suggestions |
| **best-practices** | Code quality and standards |
| **evaluation** | Developer skill assessment |
| **extract-patterns** | Pattern analysis |
| **coding-test** | Coding test evaluation with AI detection |

---

## Troubleshooting

### MCP Server Not Showing Up

1. **Verify installation:**
   ```bash
   ai-code-review --version
   ```

2. **Check Claude Desktop configuration:**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **Restart Claude Desktop completely** (Quit → Reopen)

### Tool Calls Failing

1. **Check API keys are configured:**
   ```bash
   env | grep AI_CODE_REVIEW
   ```

2. **Verify you're in a valid project directory**

3. **Check server logs** in Claude Desktop console

### No Output or Errors

1. **Enable debug logging:**
   ```json
   {
     "mcpServers": {
       "ai-code-review": {
         "command": "ai-code-review",
         "args": ["mcp", "--debug"]
       }
     }
   }
   ```

2. **Test API connection:**
   ```bash
   ai-code-review test-api
   ```

3. **Verify model is available:**
   ```bash
   ai-code-review --listmodels
   ```

---

## Advanced Usage

### Multiple Models

Configure different servers for different models:

```json
{
  "mcpServers": {
    "ai-review-claude": {
      "command": "ai-code-review",
      "args": ["mcp"],
      "env": {
        "AI_CODE_REVIEW_MODEL": "anthropic:claude-4-sonnet"
      }
    },
    "ai-review-gemini": {
      "command": "ai-code-review",
      "args": ["mcp"],
      "env": {
        "AI_CODE_REVIEW_MODEL": "gemini:gemini-2.5-pro"
      }
    }
  }
}
```

### Custom Review Parameters

Specify options in your prompts:

```
Review src/auth with comprehensive analysis, include test files
```

---

## Best Practices

### 1. Use Specific Paths

❌ "Review my code"
✅ "Review the src/components/auth directory for security issues"

### 2. Specify Review Type

❌ "Check this file"
✅ "Perform a security review of src/auth/login.ts"

### 3. Focus Areas

❌ "Review everything"
✅ "Review src/api focusing on performance and security"

### 4. Context Matters

❌ "Fix the bugs"
✅ "Review the latest changes in feature-branch for quick fixes"

---

## Example Conversation Flow

**You:** What MCP tools do you have for code review?

**Claude:** I have access to the ai-code-review MCP server with 4 tools:
- code-review: Comprehensive code analysis
- pr-review: Pull request analysis
- git-analysis: Repository history analysis
- file-analysis: Individual file analysis

**You:** Review the src/auth directory for security issues

**Claude:** I'll perform a security review of your authentication code...

[Uses code-review tool, provides security findings]

**You:** What about the performance of src/api?

**Claude:** Let me analyze the API performance...

[Uses code-review with performance focus]

---

## Next Steps

1. ✅ Install AI Code Review globally
2. ✅ Configure Claude Desktop
3. ✅ Set up API keys
4. ✅ Restart Claude Desktop
5. ✅ Test with a simple review
6. ✅ Start using for real code analysis!

---

## Support & Documentation

- **Main Documentation:** [README.md](../../README.md)
- **MCP Integration Guide:** [MCP_INTEGRATION.md](../MCP_INTEGRATION.md)
- **GitHub:** https://github.com/bobmatnyc/ai-code-review
- **Issues:** https://github.com/bobmatnyc/ai-code-review/issues

---

**Happy Code Reviewing!** 🚀
