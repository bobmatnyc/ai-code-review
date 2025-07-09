# Project Configuration - AI Code Review

## Project Overview

**AI Code Review** is a comprehensive TypeScript CLI tool for AI-powered code reviews, supporting multiple AI providers (Gemini, Claude, OpenAI, OpenRouter). This tool provides automated code analysis, security review, architectural assessment, and performance optimization recommendations.

## Project Status
- **Type**: Production CLI Tool
- **Category**: Development Tool / Code Analysis
- **Development Status**: Actively maintained and deployed

### Service Classification
- **Type**: CLI Application with multiple AI integrations
- **Purpose**: Automated code review and analysis for development workflows
- **Dependencies**: Multiple AI APIs, Node.js runtime, TypeScript ecosystem

## Service Responsibility Model

### Clear Separation of Concerns

**Project Claude Responsibility:**
- Develop and implement AI code review algorithms
- Create unit tests and integration tests
- Debug and fix service-level issues
- Maintain service-specific documentation
- Ensure code quality and AI model integration

**Project Management:**
- Deploy CLI tool locally and remotely
- Manage service infrastructure and configuration
- Monitor service health and availability
- Handle deployment automation and CI/CD
- Maintain operational documentation

## Legacy Documentation

**IMPORTANT**: This project contains legacy documentation that should be reviewed:
1. `/docs/INSTRUCTIONS.md` - Core development instructions and agent protocol
2. `/docs/WORKFLOW.md` - Required workflow processes  
3. `/docs/PROJECT.md` - Project specifications and requirements
4. `/docs/TOOLCHAIN.md` - Comprehensive toolchain and technical configuration guide

## Technical Stack

### Core Technology
- **Language**: TypeScript 5.8.3 with strict mode
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm with Corepack
- **Build System**: Modern TypeScript with Biome toolchain
- **Testing**: Vitest with comprehensive coverage

### Key Components
- **CLI Interface**: Command-line tool with multiple review strategies
- **AI Providers**: Multi-provider support (Anthropic, Google, OpenAI, OpenRouter)
- **Review Strategies**: Architectural, security, performance, unused code analysis
- **Token Management**: Advanced token counting and estimation
- **Output Formats**: Markdown, JSON, structured reports

### Essential Commands
```bash
# Development workflow
pnpm run lint && pnpm run build:types && pnpm test

# Biome toolchain (10x faster)
pnpm run lint                   # Biome linting
pnpm run lint:fix               # Auto-fix issues
pnpm run format                 # Biome formatting
pnpm run format:check           # Check formatting

# Testing and development
pnpm run dev                    # Run with ts-node
pnpm run test:watch            # Watch mode testing
pnpm run test:coverage         # Coverage reports
```

### Code Standards
- **TypeScript 5.8.3**: Latest stable with strict mode
- **Biome**: Unified linting & formatting (10x faster than ESLint+Prettier)
- **No `any` types** - Use `unknown`, generics, or well-defined types
- **JSDoc required** for all public functions, classes, and types
- **Follow existing patterns** - Consistency across codebase

### Environment Configuration
All environment variables use the `AI_CODE_REVIEW_` prefix:

```bash
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
AI_CODE_REVIEW_WRITER_MODEL=openai:gpt-4o-mini
AI_CODE_REVIEW_OUTPUT_DIR=ai-code-review-docs
AI_CODE_REVIEW_LOG_LEVEL=info
AI_CODE_REVIEW_DEBUG=false
```

## CLI Features

### Review Strategies
1. **Quick Fixes**: Fast issue identification and recommendations
2. **Architectural Review**: Deep structural analysis and design patterns
3. **Security Review**: Security vulnerability detection and remediation
4. **Performance Review**: Performance bottleneck identification
5. **Unused Code**: Dead code detection and cleanup recommendations
6. **Extract Patterns**: Code pattern analysis and best practice suggestions

### AI Provider Support
- **Anthropic Claude**: Advanced reasoning and code understanding
- **Google Gemini**: Fast analysis and pattern recognition
- **OpenAI GPT**: Comprehensive code review capabilities
- **OpenRouter**: Access to multiple models through unified API

### Output Formats
- **Markdown**: Human-readable reports with formatting
- **JSON**: Structured data for CI/CD integration
- **Console**: Interactive terminal output
- **File Output**: Saved reports with timestamps

## Commands & Scripts

### CLI Usage
```bash
# Basic code review
ai-code-review --path ./src --strategy quick-fixes

# Multi-pass review with specific model
ai-code-review --path ./src --strategy architectural --model claude-3-sonnet

# Security-focused review
ai-code-review --path ./src --strategy security --output security-report.md

# Performance analysis
ai-code-review --path ./src --strategy performance --format json

# Test specific models
ai-code-review test-model --model gemini-1.5-pro
ai-code-review list-models --provider anthropic
```

### Development Commands
```bash
# Project setup
pnpm install
pnpm run build

# Run tests
pnpm test
pnpm run test:coverage

# Code quality
pnpm run lint:fix
pnpm run format

# Local development
pnpm run dev
pnpm run local
```

## Integration Patterns

### CI/CD Integration
```yaml
# GitHub Actions example
- name: AI Code Review
  run: |
    npx @bobmatnyc/ai-code-review \
      --path src/ \
      --strategy security \
      --format json \
      --output ai-review.json
```

### Pre-commit Hooks
```bash
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: ai-code-review
        name: AI Code Review
        entry: ai-code-review --path src/ --strategy quick-fixes
        language: node
```

## Project Management

### Success Criteria
- [ ] Multi-provider AI integration operational
- [ ] CLI tool globally installable and functional
- [ ] Comprehensive test coverage (>80%)
- [ ] Documentation complete and current
- [ ] CI/CD pipeline integrated

### Project Compliance
- **CLAUDE.md**: ✅ Present (this file)
- **Documentation**: Comprehensive in `/docs/` directory
- **Testing**: Vitest with extensive coverage
- **Task Management**: Local trackdown system integration

## Notes

This project represents a sophisticated CLI tool for AI-powered code analysis. Key considerations:

1. **Multi-AI Provider Support**: Requires careful API key management and rate limiting
2. **Token Management**: Advanced token counting for cost optimization
3. **Review Strategies**: Multiple analysis approaches for different use cases
4. **Output Flexibility**: Various formats for different integration needs
5. **Development Workflow**: Modern TypeScript toolchain with Biome integration

The tool is designed for both standalone use and CI/CD integration, making it valuable for development teams seeking automated code quality assurance.

---

**Project Integration**: Local project management
**Development Mode**: Active development and maintenance
**Last Updated**: 2025-07-06
