# AI Code Review - Claude AI Instructions

**Version**: 4.6.0
**Last Updated**: 2025-12-16
**Project Type**: CLI Tool / NPM Package
**Language**: TypeScript/JavaScript
**Package Manager**: pnpm (v8.15.0+)

## Priority Index

This index ranks instructions by priority for AI agents. Follow 🔴 Critical items first.

| Priority | Category | Description | Link |
|----------|----------|-------------|------|
| 🔴 | Security | API key handling and secret management | [Security Rules](#security-rules) |
| 🔴 | Build | Single-path build and test commands | [Build Commands](#build-commands) |
| 🔴 | Structure | File organization and naming standards | [Project Structure](#project-structure) |
| 🟡 | Development | Coding standards and patterns | [Development Guidelines](#development-guidelines) |
| 🟡 | Testing | Test requirements and commands | [Testing](#testing) |
| 🟡 | Quality | Linting and formatting standards | [Code Quality](#code-quality) |
| 🟢 | Release | Version management and publishing | [Release Process](#release-process) |
| 🟢 | Memory | KuzuMemory integration | [Memory Integration](#memory-integration) |
| ⚪ | Documentation | Documentation standards | [Documentation Standards](#documentation-standards) |

---

## Project Overview

AI Code Review is a TypeScript-based CLI tool for automated code reviews using multiple AI models:

- **Primary Models**: Google Gemini, Anthropic Claude, OpenAI GPT, OpenRouter
- **Purpose**: Automated code analysis with specialized review types
- **Architecture**: CLI tool with library exports for web integration
- **Package**: `@bobmatnyc/ai-code-review` on npm
- **Node Version**: >=20.0.0
- **Package Manager**: pnpm >=8.0.0

### Key Features

- **15+ Review Types**: comprehensive, quick-fixes, architectural, security, performance, unused-code, best-practices, evaluation, extract-patterns, coding-test, ai-integration, cloud-native, developer-experience, and more
- **Multi-Language Support**: TypeScript, JavaScript, Python, Ruby, PHP, Go, Java, Rust, Dart/Flutter
- **Semantic Chunking**: AI-guided TreeSitter-based code analysis (95%+ token reduction)
- **MCP Integration**: Model Context Protocol server for Claude Desktop
- **Library Mode**: Use as npm package in web applications
- **Interactive Mode**: Process review results in real-time

### Version 4.6.0 Release (2025-12-17)

This is a minor release with:
- API Key Validation on Startup with interactive recovery
- Project Configuration Storage in `.ai-code-review/config.yaml`
- Enhanced configuration precedence (CLI > Project Config > Env > Defaults)
- New `--skip-key-check` CLI flag
- Fixed model selection propagation throughout codebase

---

## Security Rules

### 🔴 CRITICAL: Never Commit API Keys

**ALWAYS follow these rules:**

1. **Environment Variables Only**: Use `.env.local` for API keys
2. **Check .gitignore**: Ensure `.env.local`, `tmp/`, `.claude-mpm/` are ignored
3. **Use Placeholders**: Example files must use `your_api_key_here`
4. **Review Before Commit**: Scan for secrets before `git add`
5. **Archive Location**: `docs/archive/` for sensitive docs (already in .gitignore)

### API Key Environment Variables

```bash
# Required: Model selection
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro

# Required: API key for selected provider
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here

# Optional: Separate model for consolidation/report writing
AI_CODE_REVIEW_WRITER_MODEL=openai:gpt-4o-mini
```

### Sensitive Files Checklist

- ❌ NEVER commit: `.env`, `.env.local`, `*.key`, `credentials.json`
- ✅ ALWAYS ignore: `tmp/`, `.claude-mpm/`, `docs/archive/`
- ✅ Example files: `.env.example` with placeholder values only

---

## Build Commands

### 🔴 Single-Path Workflow

**ONE command for each task:**

```bash
# Development
pnpm run dev              # Run from source with ts-node
pnpm run local            # Run with path resolution (tsconfig-paths)

# Build
pnpm run build            # Full build: test + types + bundle + sync
pnpm run quick-build      # Fast build: skip tests

# Testing
pnpm run test             # Run all tests (vitest)
pnpm run test:watch       # Watch mode
pnpm run test:coverage    # With coverage report
pnpm run test:e2e         # End-to-end tests

# Quality
pnpm run lint             # Check code with Biome
pnpm run lint:fix         # Auto-fix linting issues
pnpm run format           # Format code
pnpm run format:check     # Check formatting

# Release
pnpm run release:patch    # Bump patch version (1.0.x)
pnpm run release:minor    # Bump minor version (1.x.0)
pnpm run release:major    # Bump major version (x.0.0)
pnpm run release:dry-run  # Test release without publishing

# Verification
pnpm run ci:local         # Local CI checks (before push)
pnpm run pre-release      # Pre-release validation
```

### Build Process Details

The build process follows this sequence:

1. **prebuild**: Clean `dist/` and increment build number
2. **test**: Run test suite
3. **build:types**: Generate TypeScript declarations
4. **build**: Bundle with esbuild
5. **postbuild**: Link global installation

**NEVER manually run build steps.** Always use `pnpm run build`.

---

## Project Structure

### 🔴 File Organization Standard

**CRITICAL**: Follow [docs/reference/PROJECT_ORGANIZATION.md](/Users/masa/Projects/ai-code-review/docs/reference/PROJECT_ORGANIZATION.md) exactly.

#### Directory Layout

```
ai-code-review/
├── .github/                    # GitHub workflows
├── .claude/                    # Claude MPM config
├── .claude-mpm/               # Claude MPM runtime (NOT in git)
│   ├── logs/                  # Log files
│   ├── memories/              # Memory system storage
│   └── sessions/              # Session data
├── completions/               # Shell completion scripts
├── dist/                      # Build output (NOT in git)
├── docs/                      # ALL documentation
│   ├── _archive/              # Archived docs (NOT in git)
│   ├── reference/             # Technical references
│   ├── design/                # Design documents
│   ├── analysis/              # Analysis reports
│   ├── chapters/              # Documentation chapters
│   └── mcp/                   # MCP-specific docs
├── examples/                  # Example configurations
├── locales/                   # i18n translations
├── plugins/                   # Plugin system
├── prompts/                   # AI prompt templates
├── promptText/                # Prompt text resources
├── release-notes/             # Release archives
├── scripts/                   # Build/test/utility scripts
│   ├── tests/                 # Test scripts
│   └── runners/               # Runner scripts
├── src/                       # TypeScript source code
│   ├── analysis/              # Code analysis modules
│   ├── cli/                   # CLI argument parsing
│   ├── clients/               # AI API clients
│   ├── commands/              # CLI command implementations
│   ├── core/                  # Core business logic
│   ├── formatters/            # Output formatters
│   ├── lib/                   # Library exports
│   ├── mcp/                   # MCP server implementation
│   ├── strategies/            # Review strategies
│   ├── types/                 # Type definitions
│   ├── utils/                 # Utility functions
│   ├── web/                   # Web integration
│   └── __tests__/             # Tests (colocated)
├── tests/                     # Test utilities and fixtures
├── tickets/                   # Issue tracking
├── tmp/                       # Temporary files (NOT in git)
└── .aitrackdown/              # AI trackdown config
```

#### File Placement Rules

| File Type | Location | Examples |
|-----------|----------|----------|
| **Documentation** | `docs/` | All .md files except root exceptions |
| **Root Exceptions** | Root | README.md, CHANGELOG.md, LICENSE, CLAUDE.md, INSTALL.md |
| **MCP Docs** | `docs/mcp/` | MCP_INTEGRATION.md |
| **Design Docs** | `docs/design/` | Architecture specs |
| **Reference** | `docs/reference/` | PROJECT_ORGANIZATION.md |
| **Source Code** | `src/` | All .ts files |
| **Tests** | `src/__tests__/` | *.test.ts, *.spec.ts |
| **Scripts** | `scripts/` | Build, test, utility scripts |
| **Temp Files** | `tmp/` | Backups, logs (gitignored) |

#### Naming Conventions

- **TypeScript**: camelCase (e.g., `argumentParser.ts`, `reviewOrchestrator.ts`)
- **Tests**: `*.test.ts` or `*.spec.ts`
- **Documentation**: SCREAMING_SNAKE_CASE or kebab-case (e.g., `PROJECT_ORGANIZATION.md`, `quick-start.md`)
- **Scripts**: kebab-case (e.g., `build.js`, `increment-build-number.js`)
- **Directories**: camelCase for src/, lowercase for docs/

---

## Development Guidelines

### Code Standards

1. **TypeScript Strict Mode**: All code must compile with strict mode enabled
2. **Path Aliases**: Use configured paths from tsconfig.json
   ```typescript
   import { Parser } from '@/cli/argumentParser';
   import { formatOutput } from '@/utils/formatters';
   ```
3. **Type Safety**: No `any` types without explicit justification
4. **Error Handling**: Always handle errors gracefully
5. **Logging**: Use appropriate log levels (debug, info, warn, error)

### Architecture Patterns

- **Unified Client System**: BaseApiClient interface for all AI providers
- **Strategy Pattern**: Review types implement strategy pattern
- **Factory Pattern**: UnifiedClientFactory for client creation
- **Service Layer**: Core services in `src/core/`
- **Command Pattern**: CLI commands in `src/commands/`

### Import Conventions

```typescript
// Relative imports (for nearby files)
import { Parser } from './argumentParser';

// Absolute imports (for shared utilities)
import { formatOutput } from '@/utils/formatters';
import { ApiClient } from '@/clients/BaseApiClient';
```

### Key Entry Points

- **CLI Entry**: `src/index.ts`
- **Library Entry**: `src/lib/index.ts`
- **MCP Server**: `src/mcp/server.ts`
- **Web Integration**: `src/web/index.ts`

---

## Testing

### Test Commands

```bash
# Run all tests
pnpm run test

# Watch mode for development
pnpm run test:watch

# Coverage report
pnpm run test:coverage

# Specific test suites
pnpm run test:e2e                    # End-to-end tests
pnpm run test:model                  # Model connection tests
pnpm run test:api                    # API connection tests
pnpm run test:extract-patterns       # Pattern extraction tests
```

### Test Organization

- **Unit Tests**: `src/__tests__/*.test.ts`
- **Integration Tests**: `tests/integration/`
- **E2E Tests**: Run via `scripts/e2e-test.js`
- **Test Utilities**: `tests/` directory

### Test Requirements

1. **Coverage**: Aim for >80% coverage
2. **Test Naming**: Descriptive names (`*.test.ts`, `*.spec.ts`)
3. **Test Isolation**: Each test should be independent
4. **Mocking**: Use vitest mocking for external dependencies
5. **Assertions**: Clear, specific assertions

### Running Tests Before Build

Tests are automatically run during `pnpm run build`. To skip tests:

```bash
pnpm run quick-build  # Faster build without tests
```

---

## Code Quality

### Linting and Formatting

```bash
# Check code quality
pnpm run lint              # Check with Biome
pnpm run format:check      # Check formatting

# Auto-fix issues
pnpm run lint:fix          # Fix linting issues
pnpm run format            # Format code
```

### Quality Tools

- **Biome**: Primary linter and formatter (v2.0.6+)
- **TypeScript**: Type checking with strict mode
- **Vitest**: Testing framework
- **Pre-commit Hooks**: Optional setup via `scripts/setup-pre-commit.sh`

### Pre-commit Setup

```bash
# Install pre-commit hooks (optional)
pnpm run setup:pre-commit
```

This installs hooks that run:
- Linting on staged files
- Type checking
- Test validation

---

## Release Process

### Version Management

**Semantic Versioning**: `MAJOR.MINOR.PATCH+BUILD`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes
- **BUILD**: Auto-incremented on each build

### Release Commands

```bash
# Automated release (recommended)
pnpm run release:patch     # 4.5.0 -> 4.5.1
pnpm run release:minor     # 4.5.0 -> 4.6.0
pnpm run release:major     # 4.5.0 -> 5.0.0

# Dry run (test without publishing)
pnpm run release:dry-run

# Pre-release checks
pnpm run pre-release       # Validate before release
```

### Release Checklist

1. **Pre-release**:
   - Run `pnpm run pre-release`
   - Update CHANGELOG.md
   - Update README.md version references
   - Run `pnpm run ci:local`

2. **Release**:
   - Run appropriate `pnpm run release:*` command
   - Script handles: version bump, changelog, git tag, npm publish

3. **Post-release**:
   - Verify npm package: `npm view @bobmatnyc/ai-code-review`
   - Test global install: `pnpm add -g @bobmatnyc/ai-code-review`
   - Update GitHub release notes

### Build Number System

Build numbers auto-increment on each build:

```bash
# View current build info
pnpm run build:info

# Reset build number (rare)
pnpm run build:reset
```

Build metadata tracked in `package.json` under `buildMetadata`.

---

## Memory Integration

### KuzuMemory System

This project uses KuzuMemory for intelligent context management.

#### Available Commands

```bash
# Enhance prompts with project context
kuzu-memory enhance "<prompt>"

# Store learning from conversations (async)
kuzu-memory learn "<content>"

# Query project memories
kuzu-memory recall "<query>"

# View memory statistics
kuzu-memory stats
```

#### MCP Tools (Claude Desktop)

When using Claude Desktop with MCP integration:

- **kuzu_enhance**: Enhance prompts with project memories
- **kuzu_learn**: Store new learnings asynchronously
- **kuzu_recall**: Query specific memories
- **kuzu_stats**: Get memory system statistics

#### Memory Guidelines

**Store:**
- Project decisions and conventions
- Technical specifications and API details
- User preferences and patterns
- Error solutions and workarounds

**DO NOT store:**
- Sensitive information or API keys
- Temporary debugging information
- Generic programming knowledge
- Information already in documentation

#### Memory Location

Memories stored in: `.claude-mpm/memories/agentic-coder-optimizer_memories.md`

**Format**: Markdown (.md), NOT JSON

---

## Documentation Standards

### Documentation Hierarchy

1. **README.md**: Project overview, installation, usage (root only)
2. **CLAUDE.md**: This file - AI agent instructions (root only)
3. **CHANGELOG.md**: Version history (root only)
4. **INSTALL.md**: Installation guide (root only)
5. **docs/**: All other documentation

### Documentation Categories

| Category | Location | Purpose |
|----------|----------|---------|
| **MCP Integration** | `docs/mcp/` | MCP server setup and usage |
| **Design Docs** | `docs/design/` | Architecture, system design |
| **Reference** | `docs/reference/` | API reference, standards |
| **Analysis** | `docs/analysis/` | Test reports, evaluations |
| **Archive** | `docs/_archive/` | Historical docs (gitignored) |
| **General** | `docs/` | Guides, workflows, testing |

### Writing Documentation

1. **Clear Headers**: Use markdown headers hierarchically
2. **Code Examples**: Include working examples
3. **Links**: Use absolute paths for cross-references
4. **Version Info**: Include version/date in major docs
5. **Table of Contents**: Add for long documents (>500 lines)

### Updating Documentation

When making changes:
1. Update relevant documentation files
2. Check for broken links
3. Update version references if applicable
4. Run documentation through markdown linter

---

## Common Tasks

### Adding a New Review Type

1. Create prompt template: `prompts/templates/{review-type}-review.md`
2. Add strategy: `src/strategies/{ReviewType}Strategy.ts`
3. Register in: `src/strategies/index.ts`
4. Add tests: `src/__tests__/strategies/{reviewType}.test.ts`
5. Update CLI options: `src/cli/argumentParser.ts`
6. Update README.md review types section

### Adding a New AI Provider

1. Create client: `src/clients/{Provider}ApiClient.ts`
2. Implement BaseApiClient interface
3. Add model mappings: `src/clients/utils/modelMaps.ts`
4. Register in factory: `src/clients/UnifiedClientFactory.ts`
5. Add environment variables
6. Update documentation

### Troubleshooting Build Issues

```bash
# Clean build artifacts
rm -rf dist/ .tsbuildinfo node_modules/.cache

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Reset build number (if corrupted)
pnpm run build:reset

# Run full clean build
pnpm run build
```

### Fixing Global Installation

```bash
# Fix global command not found
./scripts/fix-global-command.sh

# Manual link (if script fails)
pnpm link --global
```

---

## Model Configuration

### Supported Models

The tool uses a centralized model mapping system in `src/clients/utils/modelMaps.ts`.

#### Primary Models (Recommended)

- **gemini:gemini-2.5-pro** (DEFAULT) - Production-ready, 1M context
- **anthropic:claude-4-sonnet** - Balanced performance, 200K context
- **openai:gpt-4o** - Multimodal, 128K context

#### Model Format

```bash
# Format: provider:model-name
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
AI_CODE_REVIEW_MODEL=anthropic:claude-4-opus
AI_CODE_REVIEW_MODEL=openai:gpt-4o
AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-4-sonnet
```

#### List Available Models

```bash
# List all models
ai-code-review --listmodels

# List by provider
ai-code-review --models | grep "gemini:"
```

### Writer Model Configuration

Use a separate model for consolidation/report writing:

```bash
# Cost optimization: powerful model for analysis, cheaper for reports
AI_CODE_REVIEW_MODEL=anthropic:claude-4-opus
AI_CODE_REVIEW_WRITER_MODEL=anthropic:claude-3-haiku

# Performance: fast model for final report generation
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
AI_CODE_REVIEW_WRITER_MODEL=openai:gpt-4o-mini
```

---

## MCP Integration

### Starting MCP Server

```bash
# Start MCP server
ai-code-review mcp

# With debug logging
ai-code-review mcp --debug

# Custom configuration
ai-code-review mcp --name "my-code-review" --max-requests 10
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

### MCP Tools Available

- **code-review**: Comprehensive code analysis
- **pr-review**: Pull Request diff analysis
- **git-analysis**: Git repository history analysis
- **file-analysis**: Individual file metrics

See [docs/mcp/MCP_INTEGRATION.md](/Users/masa/Projects/ai-code-review/docs/mcp/MCP_INTEGRATION.md) for full details.

---

## Web Integration

The tool can be used as a library in web applications:

```typescript
import { performCodeReview } from '@bobmatnyc/ai-code-review/lib';

const result = await performCodeReview({
  target: './src',
  config: {
    model: 'openrouter:anthropic/claude-3.5-sonnet',
    reviewType: 'security',
    apiKeys: {
      openrouter: process.env.OPENROUTER_API_KEY
    }
  }
});
```

See [docs/WEB_INTEGRATION.md](/Users/masa/Projects/ai-code-review/docs/WEB_INTEGRATION.md) for full integration guide.

---

## Environment Configuration

### Environment Variable Priority

1. **CLI flags** (highest priority)
2. **Project `.env.local`**
3. **Project `.env`**
4. **System environment variables**
5. **Tool installation `.env.local`** (lowest priority)

### Required Variables

```bash
# Model selection (required)
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro

# API key for selected provider (required)
AI_CODE_REVIEW_GOOGLE_API_KEY=your_key_here
```

### Optional Variables

```bash
# Writer model for consolidation
AI_CODE_REVIEW_WRITER_MODEL=openai:gpt-4o-mini

# Debug logging
AI_CODE_REVIEW_LOG_LEVEL=info

# Custom context files
AI_CODE_REVIEW_CONTEXT=README.md,docs/architecture.md
```

---

## Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clean and rebuild
rm -rf dist/ .tsbuildinfo
pnpm install
pnpm run build
```

#### Tests Fail

```bash
# Run specific test
pnpm run test -- src/__tests__/specific.test.ts

# Update snapshots
pnpm run test -- -u

# Clear cache
rm -rf node_modules/.cache
```

#### Global Command Not Found

```bash
# Fix global installation
./scripts/fix-global-command.sh

# Or manually link
pnpm link --global
which ai-code-review
```

#### API Key Errors

```bash
# Test API connection
ai-code-review test-model

# Verify environment
echo $AI_CODE_REVIEW_GOOGLE_API_KEY

# Check .env.local location
ls -la .env.local
```

### Debug Mode

```bash
# Enable debug logging
ai-code-review ./src --debug

# Set log level
export AI_CODE_REVIEW_LOG_LEVEL=debug
ai-code-review ./src
```

---

## Quick Reference

### Most Used Commands

```bash
# Development
pnpm run dev              # Run from source
pnpm run build            # Full build
pnpm run test             # Run tests

# Quality
pnpm run lint:fix         # Fix linting
pnpm run format           # Format code

# Release
pnpm run release:patch    # Patch release
pnpm run ci:local         # Pre-push checks

# Usage
ai-code-review .                          # Review current directory
ai-code-review ./src --type security      # Security review
ai-code-review ./src --interactive        # Interactive mode
```

### Key Files

- **Entry Point**: `src/index.ts`
- **CLI Parser**: `src/cli/argumentParser.ts`
- **Client Factory**: `src/clients/UnifiedClientFactory.ts`
- **Model Maps**: `src/clients/utils/modelMaps.ts`
- **Organization**: `docs/reference/PROJECT_ORGANIZATION.md`

### Important Links

- **Repository**: https://github.com/bobmatnyc/ai-code-review
- **NPM Package**: https://www.npmjs.com/package/@bobmatnyc/ai-code-review
- **Issue Tracker**: https://github.com/bobmatnyc/ai-code-review/issues

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| 4.5.0 | 2025-12-16 | MCP workflow, documentation overhaul, model maps update |
| 4.4.6 | 2025-08-17 | Flutter/Dart support, comprehensive review type |
| 4.4.5 | 2025-08-17 | Documentation consistency improvements |
| 4.4.4 | 2025-08-16 | Unified client system, build number tracking |
| 4.3.0 | 2025-06-30 | Prompt template manager, YAML configuration |
| 4.2.0 | 2025-06-24 | Evaluation review, Golang support |
| 4.1.0 | 2025-06-08 | CLI improvements, deprecated --individual flag |
| 4.0.0 | 2025-06-04 | AI-guided semantic chunking, 95%+ token reduction |

See [CHANGELOG.md](/Users/masa/Projects/ai-code-review/CHANGELOG.md) for complete version history.

---

## Agentic Coder Notes

### For AI Agents Reading This

1. **Priority-First Approach**: Follow 🔴 Critical items before others
2. **Single-Path Commands**: Always use documented commands exactly
3. **Security First**: Never handle API keys in code or commit secrets
4. **Structure Compliance**: Follow PROJECT_ORGANIZATION.md strictly
5. **Test Before Commit**: Run `pnpm run ci:local` before git operations

### Memory Updates

When you learn something important, store it using KuzuMemory:

```bash
kuzu-memory learn "Project uses unified client factory for all AI providers"
```

### Getting Help

- **Documentation**: Check `docs/` directory first
- **Examples**: See `examples/` directory
- **Tests**: Review test files for usage patterns
- **Scripts**: Explore `scripts/` for utilities

---

*Last updated: 2025-12-16*
*Generated for Claude AI optimization*
*Version: 4.6.0*
