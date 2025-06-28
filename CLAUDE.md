# Claude Code Instructions

**AI Assistant Instructions for @bobmatnyc/ai-code-review Project**

## CRITICAL: Review Required Documentation
**IMPORTANT**: Before starting any work, you MUST review these files:
1. `/docs/INSTRUCTIONS.md` - Core development instructions and agent protocol
2. `/docs/WORKFLOW.md` - Required workflow processes
3. `/docs/PROJECT.md` - Project specifications and requirements (if exists)

**Following these instructions is MANDATORY. Ask for clarification before considering ANY variance from the documented procedures.**

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
# Before completing any task
pnpm run lint && pnpm run build:types && pnpm test

# Local development
pnpm run dev                    # Run with ts-node
pnpm run local                  # Run with path resolution
pnpm run test:watch            # Watch mode testing
pnpm run test:coverage         # Coverage reports
```

### Code Standards
- **TypeScript**: Strict mode enabled (`tsconfig.json`)
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
promptText/               # External prompts (optional)
ai-code-review-docs/      # Generated review outputs
```

## ⚠️ Critical Rules
1. **Use bundled prompts** as primary source (not external ones)
2. **No fallback models** - fail gracefully if specified model unavailable
3. **Use package managers** for dependencies (never edit package.json manually)
4. **Process one file at a time** for multiple files
5. **Suggest changes, don't auto-fix** code
6. **Use proper logging wrapper** instead of console.log
7. **Lazy initialization** of clients only when called
8. **Model-agnostic design** - only use models specified in environment variables

## 🧪 Testing Requirements
- **Unit tests** for message output and model data structures
- **Test with all supported providers** before publishing
- **Build tarball and test locally** before publishing
- **Use `npm publish --access=public`** for publishing
- **Update version to 2.0.0** and update VERSIONS, README, PROGRESS files

## 📋 Task Management
- User prefers **Track Down over GitHub issues** for project management
- Update `workflow.md` to reflect Track Down preference
- Track **Dependabot security vulnerabilities** through GitHub issues
- Add issues to GitHub projects **manually via web UI**