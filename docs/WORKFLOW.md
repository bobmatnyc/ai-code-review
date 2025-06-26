# 🔁 AI Code Review Tool - Development Workflow

**Version**: 1.0  
**Updated**: 2025-06-11  
**Repository**: https://github.com/bobmatnyc/ai-code-review.git

This document contains the complete workflow procedures for the AI Code Review tool project, a TypeScript-based CLI tool for automated code reviews using multiple AI providers (Gemini, Claude, OpenAI, OpenRouter).

## 📋 Prerequisites

This project uses **pnpm** as the package manager. Make sure you have pnpm installed:

```bash
# Install pnpm globally
npm install -g pnpm

# Or enable Corepack (recommended)
corepack enable
```

---

## 🔧 1. Development Environment Setup

### Prerequisites
- Node.js >= 18.0.0
- npm (or pnpm for some operations)
- API keys for at least one AI provider

### Local Setup
```bash
# Clone the repository
git clone https://github.com/bobmatnyc/ai-code-review.git
cd ai-code-review

# Install dependencies (using pnpm)
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run tests to verify setup
pnpm test

# Build the project
pnpm run build
```

### Required Environment Variables
Create `.env.local` with at least one AI provider:
```bash
# Choose one or more providers
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
GOOGLE_API_KEY=your_google_api_key

# OR
AI_CODE_REVIEW_MODEL=anthropic:claude-3.5-sonnet
ANTHROPIC_API_KEY=your_anthropic_api_key

# OR  
AI_CODE_REVIEW_MODEL=openai:gpt-4o
OPENAI_API_KEY=your_openai_api_key

# OR
AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3.5-sonnet
OPENROUTER_API_KEY=your_openrouter_api_key
```

---

## 🔁 2. Git Workflow & Version Control

### Commit Standards
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(optional-scope): short summary

[optional body]
[optional footer(s)]
```

**Valid types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`

**Examples:**
- `feat(evaluation): add developer skill assessment review type`
- `fix(golang): correct Go project type detection`
- `docs(readme): update installation instructions`
- `chore(deps): update dependencies to latest versions`

### Branch Naming
```bash
feature/evaluation-review-type
fix/golang-file-detection
chore/update-dependencies
docs/workflow-documentation
```

### Local Development Workflow
```bash
# Start from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit frequently
git add .
git commit -m "feat(scope): add initial implementation"

# Keep up to date
git fetch origin
git rebase origin/main

# Push and create PR
git push -u origin feature/new-feature
```

---

## 🧪 3. Testing & Quality Assurance

### Full CI Pipeline
Before committing or publishing, always run:

```bash
# Complete validation pipeline
pnpm run lint          # ESLint validation
pnpm test              # Full test suite with vitest
pnpm run build         # TypeScript compilation and bundling
pnpm run validate:prompts  # Validate prompt templates
```

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: API client and workflow testing  
- **Prompt Validation**: Template syntax and metadata validation
- **Model Tests**: Live API testing (when keys available)

### Coverage Requirements
- Minimum 80% test coverage for new features
- All public APIs must have tests
- Critical paths (review orchestration, client selection) require comprehensive testing

---

## 📦 4. Building & Packaging

### Development Build
```bash
npm run dev        # Run with ts-node for development
npm run local      # Run with tsconfig-paths for module resolution
```

### Production Build
```bash
npm run build      # Full production build with tests
npm run quick-build # Fast build without tests (development only)
```

### Package Preparation
```bash
npm run prepare-package  # Complete package preparation for publishing
```

This script:
1. Cleans previous builds
2. Runs full test suite
3. Builds TypeScript with type definitions
4. Creates executable CLI with shebang
5. Validates package.json structure
6. Syncs model mappings and version

**⚠️ Known Issue**: Watch for duplicate shebang lines in `dist/index.js`. If you encounter `SyntaxError: Invalid or unexpected token` when running the CLI, check for and remove duplicate shebang lines (see Troubleshooting section).

---

## 📋 5. Release Process

### Pre-Release Checklist
1. **Version Management**:
   ```bash
   # Update version in package.json
   npm version [patch|minor|major]

   # Version is automatically synced during build
   ```

2. **Documentation Updates**:
   - Update README.md with new features
   - Update CHANGELOG.md with release notes
   - Verify all prompt templates have correct metadata

3. **Quality Verification**:
   ```bash
   npm run lint && npm run test && npm run build
   ```

4. **Package Preparation**:
   ```bash
   npm run prepare-package
   ```

### Publishing to NPM
```bash
# Verify you're logged into npm
npm whoami

# Publish to npm registry
npm publish

# Or using pnpm (alternative)
pnpm publish
```

### Release Tags
```bash
# Tag the release
git tag -a v4.2.0 -m "Release version 4.2.0: evaluation review and Golang support"
git push origin v4.2.0
```

---

## 🎯 6. Feature Development Guidelines

### Adding New Review Types
1. **Create Schema**: Define Zod schema in `src/prompts/schemas/`
2. **Create Prompts**: Add language-specific templates in `promptText/languages/`
3. **Update Types**: Add to `ReviewType` enum in `src/types/review.ts`
4. **Update CLI**: Add to argument parser choices
5. **Add Tests**: Create comprehensive test coverage
6. **Update Docs**: Document in README.md and examples

### Adding Language Support
1. **Prompt Templates**: Create templates in `promptText/languages/[language]/`
2. **Project Detection**: Update `src/utils/detection/projectTypeDetector.ts`
3. **File Filtering**: Update `src/utils/files/fileFilters.ts`
4. **Language Detection**: Update language mapping functions
5. **Testing**: Add language-specific test cases

### Adding AI Provider Support
1. **Client Implementation**: Create in `src/clients/implementations/`
2. **Model Maps**: Update `src/clients/utils/modelMaps/data/`
3. **Factory Registration**: Update client factory
4. **Error Handling**: Implement provider-specific error patterns
5. **Cost Estimation**: Add to estimator factory

---

## 🔍 7. Code Quality Standards

### TypeScript Requirements
- Strict mode enabled (`tsconfig.json`)
- No `any` types (prefer `unknown` or proper interfaces)
- Complete JSDoc documentation for public APIs
- Consistent import/export patterns

### ESLint Configuration
- Maximum 1000 warnings allowed
- Zero errors policy
- Automatic fixing where possible: `npm run lint:fix`

### File Organization
```
src/
├── analysis/          # Token analysis and semantic chunking
├── cli/              # Command-line interface
├── clients/          # AI provider clients
├── commands/         # CLI command implementations  
├── core/            # Core orchestration logic
├── formatters/      # Output formatting
├── prompts/         # Prompt management and schemas
├── strategies/      # Review strategy implementations
├── types/           # TypeScript type definitions
└── utils/           # Utility functions and helpers
```

---

## 🧾 8. Documentation Standards

### Code Documentation
- JSDoc comments for all public functions and classes
- Type annotations for complex interfaces
- Examples in documentation where helpful

### Prompt Templates
All prompt templates must include YAML frontmatter:
```yaml
---
name: Review Type Name
description: Clear description of the review purpose
version: 1.0.0
author: AI Code Review Tool
lastModified: 2025-06-11T00:00:00.000Z
reviewType: type-name
language: language-code
tags:
  - tag1
  - tag2
---
```

### README Maintenance
- Keep feature list up to date
- Include examples for new capabilities
- Maintain version history with meaningful release notes

---

## 🚀 9. CI/CD & Automation

### Pre-commit Hooks
```bash
# Recommended pre-commit setup
npm run lint && npm run test && npm run build
```

### PNPM Scripts Reference
```bash
# Development
pnpm run dev           # Development server with ts-node
pnpm run local         # Local execution with path resolution

# Testing
pnpm test              # Full test suite
pnpm run test:watch    # Watch mode testing
pnpm run test:coverage # Coverage report

# Building
pnpm run build         # Production build
pnpm run build:types   # TypeScript declarations only
pnpm run quick-build   # Fast build for development

# Quality
pnpm run lint          # ESLint checking
pnpm run format        # Prettier formatting

# Validation
pnpm run validate:models  # Model configuration validation
pnpm run validate:prompts # Prompt template validation

# Utilities
pnpm run models:sync      # Update model mappings
pnpm run prepare-package  # Package for publishing
```

### Automated Checks
- TypeScript compilation
- ESLint validation  
- Test execution
- Prompt template validation
- Model configuration verification

---

## 📊 10. Project Metrics & Monitoring

### Key Performance Indicators
- Test coverage percentage
- Build success rate
- ESLint warning count (target: <500)
- Response time for different AI providers
- Token usage efficiency

### Quality Gates
- All tests must pass
- Zero TypeScript compilation errors
- ESLint warnings under configured limit
- Successful prompt validation
- Working CLI executable generation

---

## 🔗 11. Dependencies & Security

### Dependency Management
```bash
npm audit              # Security audit
npm update             # Update dependencies
npm outdated           # Check for outdated packages
```

### Security Practices
- Never commit API keys or secrets
- Use `.env.local` for local development
- Validate all external inputs
- Keep dependencies updated
- Regular security audits

### Major Dependencies
- **TypeScript**: Core language and type system
- **Vitest**: Testing framework
- **ESLint**: Code quality and linting
- **Zod**: Schema validation for review outputs
- **Handlebars**: Template engine for prompts
- **Various AI SDKs**: Provider-specific clients

---

## 📝 12. Troubleshooting Common Issues

### Build Failures
1. **TypeScript Errors**: Run `npm run build:types` to isolate
2. **Missing Dependencies**: Run `npm install` to sync
3. **Path Resolution**: Check `tsconfig.json` paths configuration

### Test Failures  
1. **API Key Issues**: Verify `.env.local` configuration
2. **Mock Problems**: Ensure test mocks match actual exports
3. **Timeout Issues**: Check network connectivity for integration tests

### CLI Issues
1. **Command Not Found**: Run `npm run postbuild` to link globally
2. **Permission Errors**: Verify executable permissions on `dist/index.js`
3. **Module Resolution**: Check relative vs absolute import paths
4. **⚠️ Duplicate Shebang Error**: If you see `SyntaxError: Invalid or unexpected token` with shebang line, check for duplicate shebangs:
   ```bash
   # Check first few lines of built CLI
   head -5 dist/index.js
   
   # Should see only ONE shebang line:
   #!/usr/bin/env node
   "use strict";
   
   # If you see TWO shebang lines, remove the duplicate:
   sed -i '2d' dist/index.js  # Remove line 2 if it's duplicate shebang
   ```
   **Root Cause**: Build process and prepare-package script both adding shebangs
   **Prevention**: The prepare-package script now checks for existing shebangs before adding

---

## 🎯 13. Contributing Guidelines

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Run full CI pipeline locally
4. Update documentation as needed
5. Create PR with clear description
6. Wait for CI validation
7. Address review feedback
8. Squash merge when approved

### Code Review Checklist
- [ ] Tests included and passing
- [ ] Documentation updated
- [ ] TypeScript compilation successful
- [ ] ESLint validation passed
- [ ] Breaking changes documented
- [ ] Version updated if needed

---

## 🔄 14. Maintenance Procedures

### Regular Maintenance Tasks
- **Weekly**: Dependency updates and security patches
- **Monthly**: Performance review and optimization
- **Quarterly**: Major dependency upgrades
- **As Needed**: Documentation updates and prompt improvements

### Version Management
- **Patch** (x.x.X): Bug fixes, minor improvements
- **Minor** (x.X.x): New features, new language support  
- **Major** (X.x.x): Breaking changes, architecture updates

---

This workflow ensures consistent development practices, reliable releases, and maintainable code quality for the AI Code Review tool.