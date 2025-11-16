# Project Organization Standard

**Project**: ai-code-review
**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Framework**: Node.js/TypeScript CLI Tool

## Overview

This document defines the official organization standard for the ai-code-review project. All files must be placed according to these rules to maintain consistency and discoverability.

## Directory Structure

```
ai-code-review/
├── .github/                    # GitHub workflows and issue templates
├── .claude/                    # Claude MPM configuration
├── .claude-mpm/                # Claude MPM runtime data
├── completions/                # Shell completion scripts
├── dist/                       # Build output (generated, not tracked)
├── docs/                       # ALL project documentation
│   ├── reference/              # Technical reference docs
│   ├── design/                 # Design documents and specs
│   ├── archive/                # Archived/historical docs
│   ├── chapters/               # Documentation chapters
│   ├── analysis/               # Analysis reports
│   └── mcp/                    # MCP-specific documentation
├── examples/                   # Example configurations and usage
├── locales/                    # i18n translation files
├── node_modules/               # Dependencies (generated, not tracked)
├── plugins/                    # Plugin system
├── prompts/                    # AI prompt templates
├── promptText/                 # Prompt text resources
├── release-notes/              # Release note archives
├── scripts/                    # Build, test, and utility scripts
├── src/                        # Source code (TypeScript)
│   ├── analysis/               # Code analysis modules
│   ├── cli/                    # CLI argument parsing
│   ├── clients/                # AI API clients (Gemini, Claude, OpenRouter)
│   ├── commands/               # CLI command implementations
│   ├── core/                   # Core business logic
│   ├── formatters/             # Output formatters
│   ├── lib/                    # Shared library code (for npm package exports)
│   ├── mcp/                    # MCP (Model Context Protocol) implementation
│   ├── strategies/             # Review strategy implementations
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   ├── web/                    # Web integration code
│   └── __tests__/              # Test files (colocated with source)
├── tests/                      # Additional test utilities and fixtures
├── tickets/                    # Issue tracking (epics, issues)
├── tmp/                        # Temporary files, backups, logs
└── .aitrackdown/               # AI trackdown configuration
```

## File Placement Rules

### Documentation Files (*.md)

All markdown documentation MUST be placed in the `docs/` directory:

| File Type | Location | Examples |
|-----------|----------|----------|
| MCP Documentation | `docs/mcp/` | MCP_INTEGRATION.md, MCP_SERVER_QUICK_START.md |
| Design Docs | `docs/design/` | Architecture specs, system designs |
| Reference Docs | `docs/reference/` | API reference, organization standards |
| Analysis Reports | `docs/analysis/` | Test reports, migration guides |
| Archive | `docs/archive/` | Historical docs no longer current |
| General Docs | `docs/` | PROJECT.md, WORKFLOW.md, TESTING.md |

**Exceptions** (root directory only):
- `README.md` - Project overview and quick start
- `CHANGELOG.md` - Version history
- `LICENSE` - License file
- `CONTRIBUTING.md` - Contribution guidelines (if created)
- `CLAUDE.md` - Claude AI project instructions
- `INSTALL.md` - Installation instructions

### Source Code (src/)

TypeScript source code follows a **type-based organization** with feature modules:

| Directory | Purpose | Naming Convention |
|-----------|---------|-------------------|
| `src/analysis/` | Code analysis logic | camelCase files |
| `src/cli/` | CLI argument parsing | camelCase files |
| `src/clients/` | AI API client wrappers | camelCase files |
| `src/commands/` | CLI command implementations | camelCase files |
| `src/core/` | Core business logic | camelCase files |
| `src/formatters/` | Output formatting | camelCase files |
| `src/lib/` | Shared library code for npm exports | camelCase files |
| `src/mcp/` | MCP server and tools | camelCase files |
| `src/strategies/` | Review strategy pattern | camelCase files |
| `src/types/` | TypeScript type definitions | camelCase files |
| `src/utils/` | Utility functions | camelCase files |
| `src/web/` | Web integration | camelCase files |

### Test Files

**Primary**: Tests are colocated with source in `src/__tests__/`
**Secondary**: Additional test utilities in `tests/`

Test file naming: `*.test.ts` or `*.spec.ts`

### Scripts

All scripts go in `scripts/`, NEVER in project root:

| Script Type | Location |
|-------------|----------|
| Build scripts | `scripts/` |
| Test scripts | `scripts/tests/` |
| Release scripts | `scripts/` |
| CI scripts | `scripts/` |
| Utility scripts | `scripts/` |

### Configuration Files

Configuration files remain in project root:
- `package.json`, `tsconfig.json`, `biome.json`
- `.env` files (never committed)
- `.gitignore`, `.npmignore`, `.prettierrc`
- Framework config files

### Examples and Templates

- Example configs: `examples/`
- AI prompt templates: `prompts/`, `promptText/`
- Shell completions: `completions/`

### Temporary and Build Artifacts

| Type | Location | Git Tracked |
|------|----------|-------------|
| Build output | `dist/` | No |
| Temporary files | `tmp/` | No |
| Backups | `tmp/backups/` | No |
| Logs | `tmp/logs/` or `.claude-mpm/logs/` | No |
| Node modules | `node_modules/` | No |

### Issue Tracking

- Tickets (if using file-based tracking): `tickets/epics/`, `tickets/issues/`
- AI trackdown data: `.aitrackdown/`

## Naming Conventions

### Files
- **TypeScript source**: camelCase (e.g., `argumentParser.ts`, `reviewOrchestrator.ts`)
- **Test files**: `*.test.ts` or `*.spec.ts`
- **Documentation**: SCREAMING_SNAKE_CASE or kebab-case (e.g., `PROJECT_ORGANIZATION.md`, `quick-start.md`)
- **Scripts**: kebab-case (e.g., `build.js`, `increment-build-number.js`)

### Directories
- **Source code**: camelCase (e.g., `src/analysis/`, `src/clients/`)
- **Documentation**: lowercase (e.g., `docs/reference/`, `docs/mcp/`)
- **Config/Special**: lowercase with hyphens (e.g., `.github/`, `.claude-mpm/`)

## Import Path Conventions

TypeScript imports should use relative paths or configured path aliases:

```typescript
// Relative imports (preferred for nearby files)
import { Parser } from './argumentParser';

// Absolute imports (for shared utilities)
import { formatOutput } from '@/utils/formatters';
```

## Migration Procedures

When moving files:

1. Use `git mv` for tracked files to preserve history
2. Use regular `mv` for untracked files
3. Update all import statements referencing moved files
4. Update package.json paths if applicable
5. Test build after moves: `pnpm run build`
6. Document moves in commit message

## Quality Standards

Before committing:
1. Run `pnpm run lint:fix` to auto-fix code issues
2. Run `pnpm run test` to ensure tests pass
3. Run `pnpm run build` to verify build succeeds
4. Follow conventional commit format (feat:, fix:, docs:, etc.)

## Framework-Specific Rules

### Node.js/TypeScript CLI
- Entry point: `src/index.ts`
- CLI parsing: `src/cli/argumentParser.ts`
- Commands: `src/commands/`
- Build output: `dist/` (mapped from src/)

### NPM Package Structure
- Main export: `dist/index.js`
- Library exports: `dist/lib/index.js`
- Types: `dist/index.d.ts`
- Published files: See `package.json` "files" array

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-15 | Initial organization standard created |

## See Also

- [CLAUDE.md](/CLAUDE.md) - Claude AI project instructions
- [README.md](/README.md) - Project overview
- [CHANGELOG.md](/CHANGELOG.md) - Version history
