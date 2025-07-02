# Claude Code Instructions

**AI Assistant Instructions for @bobmatnyc/ai-code-review Project**

## CRITICAL: Review Required Documentation
**IMPORTANT**: Before starting any work, you MUST review these files:
1. `/docs/INSTRUCTIONS.md` - Core development instructions and agent protocol
2. `/docs/WORKFLOW.md` - Required workflow processes  
3. `/docs/PROJECT.md` - Project specifications and requirements
4. `/docs/TOOLCHAIN.md` - Comprehensive toolchain and technical configuration guide

**Following these instructions is MANDATORY. Ask for clarification before considering ANY variance from the documented procedures.**

## 🔄 TrackDown Integration & Task Management

### YOLO Mode Requirements
- **ALWAYS work from a TrackDown task** when in YOLO mode
- **Branch naming MUST tie to TrackDown tasks**: `feature/US-001-description`
- **All development work** follows epic/subticket workflow with proper branching
- **Never work without a linked TrackDown ticket** for accountability

### Task-Driven Development Workflow
```bash
# 1. Start from TrackDown task
trackdown view US-001  # Review task details

# 2. Create properly named branch
git checkout -b feature/US-001-new-feature

# 3. Update task status
trackdown update US-001 --status "In Progress"

# 4. Implement with task linkage in commits
git commit -m "feat: implement core feature

Partial work on US-001. Added basic structure.
References: EP-001"

# 5. Complete and link back to task
trackdown update US-001 --status "Done" --notes "Implementation complete"
```

### Epic Management
- **Complex work MUST use epic/subticket structure**
- **Epic branches** serve as base for all related subticket branches
- **All documentation epics** follow the 6-subticket pattern:
  1. Audit and Analysis
  2. Toolchain Enhancement  
  3. Workflow Documentation
  4. Business Context
  5. Structure Optimization
  6. Integration Testing

---

## 🎯 Project Overview
This is a **TypeScript CLI tool** for AI-powered code reviews:
- **Package**: `@bobmatnyc/ai-code-review`
- **Purpose**: Automated code reviews using multiple AI providers (Gemini, Claude, OpenAI, OpenRouter)
- **Architecture**: Single-repo NPM package (not a monorepo)
- **Package Manager**: `pnpm` (with Corepack enabled)
- **Runtime**: Node.js with TypeScript

## 🔧 Development Guidelines

### Essential Commands
```bash
# Before completing any task (2025 Biome toolchain)
pnpm run lint && pnpm run build:types && pnpm test

# New Biome commands (10x faster linting/formatting)
pnpm run lint                   # Biome linting (replaces ESLint)
pnpm run lint:fix               # Auto-fix issues with Biome
pnpm run format                 # Biome formatting (replaces Prettier)
pnpm run format:check           # Check formatting without fixing

# Local development
pnpm run dev                    # Run with ts-node
pnpm run local                  # Run with path resolution
pnpm run test:watch            # Watch mode testing
pnpm run test:coverage         # Coverage reports
```

### Code Standards (2025 Modernized Toolchain)
- **TypeScript 5.8.3**: Latest stable with strict mode enabled
- **Biome**: Unified linting & formatting (10x faster than ESLint+Prettier)
- **Node.js 20+**: Modern runtime requirement (updated from 18+)
- **No `any` types** - Use `unknown`, generics, or well-defined types
- **JSDoc required** for all public functions, classes, and types
- **Follow existing patterns** - Don't introduce new paradigms without approval
- **NEVER deviate from documented instructions without explicit approval**

## 🌍 Environment Variables
All environment variables use the `AI_CODE_REVIEW_` prefix:

### Required API Keys
```bash
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here
```

### Configuration
```bash
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro  # Format: provider:model
AI_CODE_REVIEW_LOG_LEVEL=info               # debug, info, warn, error, none
AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING=true
AI_CODE_REVIEW_DIR=/custom/tool/directory   # Optional tool directory
```

### GitHub Integration
```bash
GITHUB_TOKEN=your_github_token_here         # For GitHub Projects
GITHUB_PROJECT_ID=your_project_id_here      # Optional
GITHUB_PROJECT_NUMBER=1                     # Optional
```

## 🚀 CLI Usage Patterns
```bash
# Review types (positional argument syntax)
ai-code-review architectural .
ai-code-review quick-fixes src/
ai-code-review security src/components/
ai-code-review performance .

# Flags and options
ai-code-review . --interactive              # Interactive mode
ai-code-review . --estimate                 # Cost estimation
ai-code-review . --version                  # Show version
ai-code-review . --listmodels              # List available models
ai-code-review . --debug                   # Debug logging
```

## 📁 Key Project Structure
```
src/
├── index.ts              # Main CLI entry point
├── cli/                  # Argument parsing
├── commands/             # Command handlers
├── clients/              # AI provider clients
├── prompts/              # Bundled prompts (primary source)
├── utils/                # Utilities including envLoader
└── types/                # TypeScript definitions

docs/                     # Documentation
├── WORKFLOW.md           # TrackDown workflow and development processes
├── INSTRUCTIONS.md       # Agent protocol and core guidelines
├── PROJECT.md            # Business context and current state
├── TOOLCHAIN.md          # Comprehensive toolchain mastery guide
└── TESTING.md            # Testing strategy and requirements

promptText/               # External prompts (optional)
ai-code-review-docs/      # Generated review outputs
trackdown/                # Project management and tracking
```

## 🔧 Development Server Management

### TypeScript CLI Development
```bash
# Development workflow
pnpm run dev                    # Run with ts-node for development
pnpm run local                  # Run with path resolution testing
pnpm run test:watch            # Watch mode for continuous testing

# Monitor for issues during development
tail -f logs/error-logs/error-*.json | grep -E "(Error|error|failed)"
```

### Post-Task Verification Procedures
**CRITICAL**: After each development task, run these verification steps:

```bash
# 1. Clean build verification
pnpm run build                 # Full TypeScript compilation
pnpm run lint                  # ESLint validation (target: <500 warnings)
pnpm run test                  # Full test suite execution

# 2. Integration verification  
pnpm run test:coverage         # Verify coverage targets (70%+ core code)
pnpm run validate:prompts      # Prompt template validation
pnpm run validate:models       # Model configuration validation

# 3. CLI functionality verification
./dist/index.js --version      # Verify executable works
./dist/index.js --listmodels   # Verify model configurations
```

## 🛠️ Claude Code Integration Setup

### MCP Server Configuration
Create `.mcp.json` in project root for Claude Code integrations:

```json
{
  "mcpServers": {
    "trackdown": {
      "command": "trackdown",
      "args": ["mcp-server"],
      "description": "TrackDown project management integration"
    },
    "github": {
      "command": "gh",
      "args": ["api"],
      "description": "GitHub CLI integration for issues and PRs"
    }
  }
}
```

### Custom Slash Commands Setup
Store reusable workflows in `.claude/commands/`:

**`.claude/commands/fix-trackdown-ticket.md`**:
```markdown
Analyze and fix the TrackDown ticket: $ARGUMENTS

Follow this workflow:
1. Use `trackdown view` to get ticket details
2. Search codebase for relevant files
3. Implement necessary changes with proper testing
4. Create tests to verify the fix
5. Run full CI pipeline: `pnpm run lint && pnpm run build:types && pnpm test`
6. Commit with conventional format linking to ticket
7. Update ticket status using `trackdown update`
```

### Environment Inheritance
Claude inherits your shell environment including:
- TrackDown CLI access and authentication
- Git configuration and credentials
- Node.js, pnpm, and all project dependencies
- All AI provider API keys from environment

## 🔍 Code-Truth Validation Requirements

### Documentation Alignment Principle
**CRITICAL**: Code is the source of truth. When documentation conflicts with implementation:
1. **Assume code is correct** unless explicitly told otherwise
2. **Update documentation** to match current code behavior
3. **Verify technical instructions** against actual package.json scripts
4. **Cross-reference configurations** with actual config files

### Validation Process
```bash
# Before documenting any technical procedure:
cat package.json | grep -A 10 "scripts"    # Verify npm scripts exist
ls -la tsconfig.json vitest.config.mjs     # Verify config files
git ls-files | grep -E "\.(ts|js)$" | head # Verify file structure

# Validate environment setup against actual code:
grep -r "AI_CODE_REVIEW_" src/ --include="*.ts" # Check env var usage
grep -r "process.env" src/utils/envLoader.ts    # Check loader implementation
```

## 🔄 Iterative Refinement Patterns

### Planning-First Approach
```bash
# 1. Context Gathering (explicitly avoid coding)
# Read relevant files, gather requirements, understand scope
# Use subagents for parallel exploration of large codebases

# 2. Planning Phase (use enhanced reasoning)
# Generate detailed implementation plan
# Request plan review before coding
# Create TrackDown tickets for complex work

# 3. Implementation Phase
# Follow plan with validation at each step
# Run post-task verification after each change
# Use independent validation when needed
```

### Effective Prompting Patterns
- **"Think hard"** or **"ultrathink"** for complex planning
- **"Don't write code yet"** during planning phases
- **"Validate against source code"** for documentation work
- **"Use subagents for parallel work"** on independent tasks

### Session Management
- **Interactive sessions**: Pipe in log files, combine data sources
- **Headless automation**: Use `-p` flag with `--output-format stream-json`
- **CI integration**: Leverage `--dangerously-skip-permissions` for safe automation

## ⚠️ Critical Rules
1. **Use bundled prompts** as primary source (not external ones)
2. **No fallback models** - fail gracefully if specified model unavailable
3. **Use package managers** for dependencies (never edit package.json manually)
4. **Process one file at a time** for multiple files
5. **Suggest changes, don't auto-fix** code
6. **Use proper logging wrapper** instead of console.log
7. **Lazy initialization** of clients only when called
8. **Model-agnostic design** - only use models specified in environment variables

## 🧪 Testing Strategy & Requirements

### Current Test Status (As of 2025-06-29)
- **46/46 test files pass** (100% pass rate)
- **476/498 tests pass** (95.6% pass rate)
- **22 tests skipped** (integration tests requiring API keys)
- **Zero test failures** - all critical functionality working

### Coverage Goals & Configuration
**Core Code Coverage Targets**: 70% for statements, branches, functions, and lines

**Coverage Exclusions** (configured in `vitest.config.mjs`):
- `docs/**`, `scripts/**`, `src/prompts/**` - Non-core code
- `**/examples/**`, `**/debug/**` - Experimental code
- `src/database/**`, `src/evaluation/**` - Experimental features

### Test Categories
1. **Unit Tests**: Individual functions/classes (CLI parsing, file ops, config)
2. **Integration Tests**: Component interactions (file discovery, review strategies)
3. **End-to-End Tests**: Complete user workflows (CLI execution, output generation)
4. **API Integration Tests**: Real API calls (skipped when API keys unavailable)

### Testing Commands
```bash
# Essential testing workflow
pnpm test                    # Run all tests
pnpm run test:coverage       # Coverage analysis (core code only)
pnpm run test:watch         # Development watch mode

# Before any commit/merge
pnpm run lint && pnpm run build:types && pnpm test
```

### Test Quality Standards
- **Mock external dependencies** (APIs, file system when appropriate)
- **Use descriptive test names** and organize in logical describe blocks
- **Test both success and error cases** for all critical paths
- **Maintain test independence** - no test should depend on another
- **Clean up test artifacts** - use temp directories, clean in afterEach

### Well-Tested Areas (>80% coverage)
- CLI argument parsing (84.01%)
- Model maps & configuration (99.61%)
- File system utilities (100%)
- Framework detection (87.63%)
- Review context management (96.23%)

### Areas Needing More Tests (<70% coverage)
- API client implementations
- Review strategy execution
- Error handling scenarios
- Edge case coverage

### Publishing Requirements
- **All tests must pass** before publishing
- **Test with all supported providers** (when API keys available)
- **Build tarball and test locally** before publishing
- **Use `npm publish --access=public`** for publishing
- **Update version and documentation** (VERSIONS, README, PROGRESS files)

**See `docs/TESTING.md` for comprehensive testing strategy and best practices.**
**See `docs/development/ROADMAP.md` for current development priorities and phases.**

## 📋 Task Management
- User prefers **Track Down over GitHub issues** for project management
- Update `workflow.md` to reflect Track Down preference
- Track **Dependabot security vulnerabilities** through GitHub issues
- Add issues to GitHub projects **manually via web UI**