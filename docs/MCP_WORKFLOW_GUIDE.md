# AI Code Review - MCP Workflow Guide

This guide explains how to use the new MCP workflow commands to integrate AI Code Review into your development workflow with Claude Desktop and other MCP-compatible coding tools.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Command Reference](#command-reference)
3. [MCP Tool Reference](#mcp-tool-reference)
4. [Usage Examples](#usage-examples)
5. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Initialize Your Project

```bash
cd /path/to/your/project
ai-code-review init
```

This command will:
- Detect your project's toolchain (Node.js, Python, Go, etc.)
- Prompt you for an API key (OpenRouter, Anthropic, Google, or OpenAI)
- Validate the API key by making a test call
- Set up default review preferences
- Create `.ai-code-review/config.json` with your settings
- Update `.gitignore` to exclude the config file (it contains secrets)

### 2. Install MCP Server

```bash
ai-code-review install
```

This command will:
- Create `.mcp.json` (project-level MCP configuration)
- Register the MCP server with Claude Desktop
- Configure the server to use your project's settings
- Display instructions for using the MCP tools

### 3. Use in Claude Desktop

Restart Claude Desktop to load the new MCP server, then:

```
Review the file src/index.ts
```

or

```
Review all changes in PR #123
```

Claude will use the `review` MCP tool to perform code analysis and provide structured feedback.

## Command Reference

### `ai-code-review init`

Initialize project configuration and set up API keys.

**Purpose**: Create project-level configuration for AI Code Review.

**Interactive Prompts**:
- API key selection (OpenRouter recommended)
- Default AI model
- Review strictness (strict/balanced/lenient)
- Auto-fix preferences

**Output**:
- `.ai-code-review/config.json` - Project configuration
- Updated `.gitignore` - Excludes config file with secrets

**Example**:
```bash
ai-code-review init
```

**Configuration Structure**:
```json
{
  "apiKeys": {
    "openrouter": "sk-or-v1-..."
  },
  "defaultModel": "openrouter:anthropic/claude-4-sonnet",
  "reviewSettings": {
    "strictness": "balanced",
    "focusAreas": ["security", "performance", "maintainability"],
    "autoFix": false
  },
  "mcp": {
    "enabled": true,
    "toolchainDetected": "nodejs"
  },
  "lastUpdated": "2025-01-16T10:30:00.000Z"
}
```

### `ai-code-review install`

Install AI Code Review as a project-level MCP service.

**Purpose**: Register the MCP server with Claude Desktop and create project-level MCP configuration.

**What It Does**:
1. Detects project toolchain
2. Creates `.mcp.json` in project root
3. Updates Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS)
4. Registers MCP server with environment variables from project config

**Output**:
- `.mcp.json` - Project-level MCP configuration
- Claude Desktop config updated with server registration

**Example**:
```bash
ai-code-review install
```

**Claude Desktop Config Entry**:
```json
{
  "mcpServers": {
    "ai-code-review-myproject": {
      "command": "/opt/homebrew/bin/npx",
      "args": ["@bobmatnyc/ai-code-review", "mcp"],
      "env": {
        "PROJECT_PATH": "/Users/username/projects/myproject",
        "OPENROUTER_API_KEY": "sk-or-v1-..."
      }
    }
  }
}
```

## MCP Tool Reference

### `review` (Primary Tool)

Unified review tool that handles both file-level and PR-level reviews.

**Input Schema**:
```typescript
{
  target: string;        // File path, directory, or PR reference
  context?: string;      // Additional context (e.g., 'pre-commit', 'pr-review')
  reviewType?: string;   // Type of review (default: 'quick-fixes')
  outputFormat?: string; // 'markdown' or 'json' (default: 'json')
}
```

**Output Schema**:
```typescript
{
  status: 'pass' | 'warning' | 'fail';
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    location: string;
    message: string;
    suggestion?: string;
  }>;
  summary: string;
  recommendation: 'approve' | 'request_changes' | 'comment';
  rawOutput?: string;
}
```

**Target Types Supported**:
- **File**: `"src/index.ts"`, `"/absolute/path/to/file.js"`
- **Directory**: `"src/"`, `"lib/"`
- **PR Reference**: `"PR#123"`, `"https://github.com/user/repo/pull/123"`

**Review Types**:
- `quick-fixes` - Fast improvements and bug fixes
- `architectural` - Design patterns and structure
- `security` - Vulnerability detection
- `performance` - Optimization opportunities
- `consolidated` - Comprehensive analysis
- `best-practices` - Code quality and standards
- `comprehensive` - Full analysis (slowest, most thorough)

**Example Usage in Claude**:

```
Review the file src/utils/validator.ts
```

Claude will call:
```json
{
  "tool": "review",
  "arguments": {
    "target": "src/utils/validator.ts",
    "reviewType": "quick-fixes",
    "outputFormat": "json"
  }
}
```

### `code-review` (Specialized Tool)

Perform comprehensive code reviews on files or directories.

**Best For**: Deep analysis of entire codebases or large directories.

**Example**:
```json
{
  "tool": "code-review",
  "arguments": {
    "target": "src/",
    "reviewType": "comprehensive",
    "includeTests": true
  }
}
```

### `pr-review` (Specialized Tool)

Review GitHub pull requests with diff analysis.

**Best For**: PR reviews with change impact assessment.

**Example**:
```json
{
  "tool": "pr-review",
  "arguments": {
    "repository": "https://github.com/user/repo",
    "prNumber": 123,
    "reviewType": "security"
  }
}
```

### `file-analysis` (Specialized Tool)

Analyze individual files for specific issues.

**Best For**: Quick file-level checks.

### `git-analysis` (Specialized Tool)

Analyze git repository history and patterns.

**Best For**: Commit history analysis, code churn detection.

## Usage Examples

### Example 1: Pre-Commit File Review

**Scenario**: You've modified a file and want to check it before committing.

**In Claude Desktop**:
```
Review the file src/api/authentication.ts before I commit it
```

**MCP Tool Call**:
```json
{
  "tool": "review",
  "arguments": {
    "target": "src/api/authentication.ts",
    "context": "pre-commit",
    "reviewType": "security",
    "outputFormat": "json"
  }
}
```

**Sample Response**:
```json
{
  "status": "warning",
  "issues": [
    {
      "severity": "warning",
      "location": "src/api/authentication.ts:42",
      "message": "Password comparison should use constant-time comparison to prevent timing attacks",
      "suggestion": "Use crypto.timingSafeEqual() instead of === for password comparison"
    },
    {
      "severity": "info",
      "location": "src/api/authentication.ts:15",
      "message": "Consider adding input validation for email format"
    }
  ],
  "summary": "Found 2 issue(s): 0 errors, 1 warnings",
  "recommendation": "comment"
}
```

### Example 2: PR Review

**Scenario**: Review a GitHub pull request.

**In Claude Desktop**:
```
Review the changes in PR #456
```

**MCP Tool Call**:
```json
{
  "tool": "review",
  "arguments": {
    "target": "PR#456",
    "context": "pr-review",
    "reviewType": "consolidated",
    "outputFormat": "json"
  }
}
```

### Example 3: Comprehensive Codebase Review

**Scenario**: Review entire src/ directory with comprehensive analysis.

**In Claude Desktop**:
```
Perform a comprehensive security review of the src/ directory
```

**MCP Tool Call**:
```json
{
  "tool": "code-review",
  "arguments": {
    "target": "src/",
    "reviewType": "security",
    "includeTests": false,
    "includeProjectDocs": true
  }
}
```

### Example 4: Architecture Review

**Scenario**: Review architectural patterns and design.

**In Claude Desktop**:
```
Review the architecture of lib/database/ and suggest improvements
```

**MCP Tool Call**:
```json
{
  "tool": "review",
  "arguments": {
    "target": "lib/database/",
    "reviewType": "architectural",
    "outputFormat": "markdown"
  }
}
```

## Configuration Best Practices

### 1. API Key Security

**DO**:
- Store API keys in `.ai-code-review/config.json`
- Ensure `.gitignore` excludes this file
- Use environment variables in CI/CD pipelines

**DON'T**:
- Commit API keys to version control
- Share config files with secrets
- Use the same API key across teams (use separate keys)

### 2. Team Usage

**For Teams**:
1. Each developer runs `ai-code-review init` with their own API key
2. Commit `.ai-code-review/` directory structure (without `config.json`)
3. Document API key setup in team README
4. Use environment variables in CI/CD

**Example Team Setup**:
```bash
# .ai-code-review/.gitkeep (commit this)
# .ai-code-review/config.json (in .gitignore)

# Team README instructions:
# 1. Run: ai-code-review init
# 2. Enter your personal OpenRouter API key
# 3. Config is stored locally and not committed
```

### 3. CI/CD Integration

**GitHub Actions Example**:
```yaml
- name: AI Code Review
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  run: |
    npx @bobmatnyc/ai-code-review . --type security --no-confirm
```

## Troubleshooting

### Issue: "Project not initialized"

**Solution**: Run `ai-code-review init` first.

### Issue: "API key not found"

**Cause**: Project config doesn't exist or doesn't have API keys.

**Solution**:
1. Run `ai-code-review init` to set up API keys
2. Or set environment variable: `export OPENROUTER_API_KEY=sk-or-v1-...`

### Issue: "MCP server not showing in Claude Desktop"

**Solution**:
1. Restart Claude Desktop
2. Check Claude Desktop config file exists:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`
3. Run `ai-code-review install` again if config is missing

### Issue: "Invalid API key format"

**Cause**: API key doesn't match expected pattern for provider.

**Solution**:
- **OpenRouter**: Keys start with `sk-or-v1-`
- **Anthropic**: Keys start with `sk-ant-`
- **OpenAI**: Keys start with `sk-`
- **Google**: Keys are typically 39 characters

Check your API key from the provider's dashboard.

### Issue: "Review tool returns no output"

**Cause**: MCP tool execution may have failed silently.

**Solution**:
1. Check Claude Desktop developer tools (View > Toggle Developer Tools)
2. Look for MCP-related errors in console
3. Run review directly from CLI to test: `ai-code-review <file> --debug`

## Advanced Configuration

### Custom Review Settings

Edit `.ai-code-review/config.json` manually for advanced options:

```json
{
  "reviewSettings": {
    "strictness": "strict",
    "focusAreas": [
      "security",
      "performance",
      "maintainability",
      "accessibility"
    ],
    "autoFix": false,
    "excludePatterns": [
      "**/*.test.ts",
      "**/vendor/**"
    ]
  }
}
```

### Multiple Projects

Each project maintains its own configuration:

```
~/projects/
  project-a/
    .ai-code-review/
      config.json  # Uses OpenRouter
  project-b/
    .ai-code-review/
      config.json  # Uses Anthropic direct
```

Claude Desktop config will have separate entries:

```json
{
  "mcpServers": {
    "ai-code-review-project-a": { ... },
    "ai-code-review-project-b": { ... }
  }
}
```

## Support

- **Documentation**: See `docs/MCP_INTEGRATION.md` for technical details
- **Issues**: https://github.com/bobmatnyc/ai-code-review/issues
- **API Keys**: Get keys from:
  - OpenRouter: https://openrouter.ai/keys
  - Anthropic: https://console.anthropic.com/
  - Google: https://makersuite.google.com/app/apikey
  - OpenAI: https://platform.openai.com/api-keys
