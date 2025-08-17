# AI Code Review - Claude Code Project Configuration

**Project**: AI Code Review v4.4.5
**Type**: TypeScript CLI Tool for AI-powered code reviews
**Repository**: https://github.com/bobmatnyc/ai-code-review.git
**Package Manager**: pnpm with Corepack integration

## Project Overview

AI Code Review is a TypeScript-based CLI tool that provides automated code reviews using multiple AI providers (Google Gemini, Anthropic Claude, OpenAI, OpenRouter). The tool supports various review types, multi-language analysis, and advanced features like semantic chunking and AI detection.

## Development Environment & Tools

### Core Commands
```bash
# Development cycle
pnpm run dev                    # Development execution
pnpm run test:watch            # Continuous testing
pnpm run lint                  # Biome linting and formatting check

# Before commit
pnpm run lint && pnpm run build:types && pnpm test

# Build and release
pnpm run build                 # Full build with tests
pnpm run quick-build          # Fast build without tests

# Testing
pnpm test                     # Run all tests
pnpm run test:coverage        # Test with coverage
pnpm run test:e2e            # End-to-end tests

# Debugging
ai-code-review . --debug       # Debug mode
ai-code-review . --estimate    # Token estimation
ai-code-review . --listmodels  # Available models
```

### Package Manager
- **Primary**: pnpm (required for development)
- **Version**: 8.15.0+ with Corepack integration
- **Lock file**: pnpm-lock.yaml (commit this file)

### Build System
- **TypeScript**: Strict mode with comprehensive type safety
- **Build tool**: Custom esbuild configuration
- **Target**: Node.js 20+ with ES2022 features
- **Output**: dist/ directory with executable preparation

## Project Structure

```
src/
├── analysis/          # Token analysis and semantic chunking
├── cli/              # Command-line interface and argument parsing
├── clients/          # AI provider clients (Gemini, Claude, OpenAI, OpenRouter)
├── commands/         # CLI command implementations
├── core/            # Core orchestration logic and review execution
├── formatters/      # Output formatting (Markdown, JSON)
├── prompts/         # Prompt management, templates, and schemas
├── strategies/      # Review strategy implementations
├── types/           # TypeScript type definitions
└── utils/           # Utility functions and helpers

docs/                # Documentation (2-click navigation principle)
├── README.md        # Documentation index
├── QUICK_START.md   # 5-minute setup guide
├── WORKFLOW.md      # Development workflows and processes
├── TOOLCHAIN.md     # Technical toolchain guide
├── PROJECT.md       # Business context and features
├── TESTING.md       # Testing strategy
└── chapters/        # Detailed technical content

tests/               # Test suites
├── unit-tests/      # Unit tests
├── integration-tests/ # Integration tests
└── demo-tests/      # Demo and example tests

promptText/          # Prompt templates and schemas
├── languages/       # Language-specific prompts
├── frameworks/      # Framework-specific prompts
└── schema/         # JSON schemas for validation
```

## Development Conventions

### Code Style
- **TypeScript**: Strict mode with no `any` types allowed
- **Linting**: Biome for formatting and linting
- **Imports**: Use absolute imports with path mapping
- **Error Handling**: Comprehensive error handling with typed exceptions
- **Logging**: Structured logging with appropriate levels

### Git Workflow
- **Commits**: Conventional commit format (feat, fix, chore, docs, refactor, test)
- **Branches**: feature/slug, fix/slug naming convention
- **PRs**: Required for all changes, include tests and documentation updates
- **Versioning**: Semantic versioning with automatic build number tracking

### Testing Guidelines
- **Coverage**: Maintain >95% test coverage for core functionality
- **Types**: Unit tests, integration tests, and E2E tests
- **API Testing**: Real API integration tests with proper mocking
- **Location**: Tests in tests/ directory, organized by type
- **Command**: `pnpm test` for full test suite

## AI Provider Configuration

### Environment Variables
```bash
# Model selection (choose one)
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
# AI_CODE_REVIEW_MODEL=anthropic:claude-4-sonnet
# AI_CODE_REVIEW_MODEL=openai:gpt-4o
# AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-4-opus

# API Keys (provide for selected model)
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Separate model for consolidation
AI_CODE_REVIEW_WRITER_MODEL=anthropic:claude-3-haiku
```

### Supported Providers
1. **Google Gemini**: gemini-2.5-pro, gemini-2.0-flash (1M token context)
2. **Anthropic Claude**: claude-4-opus, claude-4-sonnet (200K token context)
3. **OpenAI**: gpt-4o, gpt-4.1, o3, o3-mini (128K token context)
4. **OpenRouter**: Access to 100+ models through unified API

## Core Features & Review Types

### Review Types
- **quick-fixes**: Fast issue identification and recommendations
- **architectural**: Deep structural analysis and design patterns
- **security**: Security vulnerability detection and remediation
- **performance**: Performance bottleneck identification
- **unused-code**: Dead code detection and cleanup recommendations
- **consolidated**: Multi-file comprehensive review
- **evaluation**: Developer skill assessment with AI detection
- **extract-patterns**: Code pattern analysis and best practices
- **coding-test**: Comprehensive coding test evaluation

### Advanced Features
- **Semantic Chunking**: AI-guided code analysis with 95%+ token reduction
- **Multi-pass Reviews**: Intelligent chunking for large codebases
- **Interactive Mode**: Real-time review processing and fix application
- **AI Detection**: Identify AI-generated code in submissions
- **Multi-language Support**: TypeScript, JavaScript, Python, Go, Ruby, PHP, Java, Rust
- **Framework Detection**: Next.js, React, Vue, Django, Laravel, Rails

## File Locations & Key Files

### Configuration
- **Main config**: .env.local (API keys and model selection)
- **Package config**: package.json (dependencies and scripts)
- **TypeScript config**: tsconfig.json, tsconfig.build.json
- **Test config**: vitest.config.mjs
- **Lint config**: biome.json

### Entry Points
- **Main entry**: src/index.ts (CLI entry point)
- **Commands**: src/commands/ (command implementations)
- **Core logic**: src/core/reviewOrchestrator.ts

### Build Artifacts
- **Distribution**: dist/ (compiled JavaScript)
- **Version tracking**: src/version.ts (auto-generated)
- **Build metadata**: build-number.json

## Development Workflow

### Daily Development
1. **Start**: `pnpm run dev` for development mode
2. **Test**: `pnpm run test:watch` for continuous testing
3. **Lint**: `pnpm run lint` before commits
4. **Build**: `pnpm run build` for full build with tests

### Before Commits
1. Run full test suite: `pnpm test`
2. Check linting: `pnpm run lint`
3. Verify build: `pnpm run build:types`
4. Update documentation if needed

### Release Process
1. Update version in package.json
2. Update CHANGELOG.md with new features
3. Run full build: `pnpm run build`
4. Test installation: `pnpm pack` and test locally
5. Publish: `npm publish` (after build completes)

## Quality Standards

### Code Quality
- **Type Safety**: Strict TypeScript with comprehensive type definitions
- **Testing**: >95% test coverage with real API integration tests
- **Documentation**: JSDoc comments for all public APIs
- **Error Handling**: Comprehensive error handling with typed exceptions

### Performance
- **Token Efficiency**: Semantic chunking reduces token usage by 95%+
- **Memory Management**: Optimized for large codebase processing
- **API Efficiency**: Intelligent batching and rate limiting

### Security
- **API Key Management**: Environment variable based configuration
- **Input Validation**: Comprehensive input validation and sanitization
- **Dependency Security**: Regular dependency audits and updates

## Troubleshooting

### Common Issues
1. **API Key Errors**: Verify .env.local file exists and contains correct keys
2. **Build Failures**: Run `pnpm install` and check Node.js version (20+)
3. **Test Failures**: Check API connectivity and rate limits
4. **Global Installation**: Use `./scripts/fix-global-command.sh` for global issues

### Debug Mode
```bash
# Enable debug logging
ai-code-review . --debug

# Test API connections
ai-code-review . --test-api

# Estimate token usage
ai-code-review . --estimate
```

### Support Resources
- **Documentation**: docs/README.md (2-click navigation)
- **Quick Start**: docs/QUICK_START.md (5-minute setup)
- **Workflow Guide**: docs/WORKFLOW.md (development processes)
- **Technical Guide**: docs/TOOLCHAIN.md (technical details)

---

*This configuration enables Claude Code to understand the AI Code Review project structure, development practices, and provide contextually appropriate assistance.*