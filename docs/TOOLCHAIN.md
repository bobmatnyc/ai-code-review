# 🔧 AI Code Review - Comprehensive Toolchain Guide

**Purpose**: Complete toolchain mastery for the AI Code Review project - technical configurations, tools, frameworks, and standards.

**Updated**: 2025-07-09  
**Version**: 1.1 (Biome Toolchain Migration)

---

## 📋 Table of Contents

1. [Runtime Environment](#-runtime-environment)
2. [Package Management](#-package-management)
3. [TypeScript Configuration](#-typescript-configuration)
4. [Testing Framework](#-testing-framework)
5. [Code Quality Tools](#-code-quality-tools)
6. [Build System](#-build-system)
7. [AI Provider SDKs](#-ai-provider-sdks)
8. [Development Tools](#-development-tools)
9. [CI/CD Integration](#-cicd-integration)
10. [Troubleshooting](#-troubleshooting)

---

## 🚀 Runtime Environment

### Node.js Requirements
```bash
# Required Node.js version
node --version  # Must be >= 18.0.0

# Check npm registry access
npm config get registry  # Should be https://registry.npmjs.org/

# Verify package manager
corepack enable          # Enable Corepack for pnpm
pnpm --version          # Should show pnpm version
```

### Environment Variable Loading
The project uses a sophisticated environment loading system via `src/utils/envLoader.ts`:

```typescript
// Environment variables with AI_CODE_REVIEW_ prefix
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key  
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key

// Model selection format: provider:model-name
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro

// Configuration options
AI_CODE_REVIEW_LOG_LEVEL=info
AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING=true
AI_CODE_REVIEW_DIR=/custom/directory
```

### Environment File Priority
1. `.env.local` (highest priority - development)
2. `.env` (production/shared settings)
3. System environment variables
4. Default values in code

---

## 📦 Package Management

### PNPM Configuration
The project exclusively uses **pnpm** with Corepack:

```bash
# Enable Corepack (recommended method)
corepack enable
corepack prepare pnpm@latest --activate

# Verify setup
pnpm --version
pnpm config get registry
```

### Package.json Scripts Reference
```json
{
  "scripts": {
    // Development
    "dev": "ts-node src/index.ts",
    "local": "node -r tsconfig-paths/register dist/index.js",
    
    // Building
    "build": "tsc && npm run postbuild",
    "build:types": "tsc --noEmit",
    "quick-build": "tsc --build --incremental",
    "postbuild": "node scripts/prepare-package.sh",
    
    // Testing
    "test": "vitest run",
    "test:watch": "vitest watch", 
    "test:coverage": "vitest run --coverage",
    
    // Quality
    "lint": "biome check src/ --diagnostic-level=error",
    "lint:fix": "biome check src/ --write",
    "format": "biome format src/ --write",
    "format:check": "biome format src/",
    
    // Validation
    "validate:models": "node scripts/validate-models.js",
    "validate:prompts": "node scripts/validate-prompts.js",
    
    // Utilities
    "models:sync": "node scripts/sync-model-maps.js",
    "prepare-package": "bash scripts/prepare-package.sh"
  }
}
```

### Dependency Categories

#### Core Dependencies
- **@anthropic-ai/sdk**: Anthropic Claude API client
- **@google/generative-ai**: Google Gemini API client  
- **openai**: OpenAI GPT API client
- **handlebars**: Template engine for prompts
- **zod**: Schema validation for review outputs

#### Development Dependencies
- **typescript**: Core TypeScript compiler
- **vitest**: Testing framework
- **@biomejs/biome**: Unified linting and formatting toolchain (10x faster than ESLint+Prettier)
- **ts-node**: TypeScript execution for development

---

## 📝 TypeScript Configuration

### tsconfig.json Analysis
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022", "DOM"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,                    // CRITICAL: Strict mode enabled
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,               // Generate .d.ts files
    "declarationMap": true,            // Source maps for declarations
    "sourceMap": true,                 // Debug source maps
    "paths": {                         // Module path mapping
      "@/*": ["./src/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Type Safety Standards
- **No `any` types**: Use `unknown`, proper interfaces, or generics
- **Strict null checks**: Handle undefined/null explicitly
- **Complete JSDoc**: All public functions require documentation
- **Interface over type**: Prefer interfaces for object shapes

### Module Resolution
The project uses path mapping for clean imports:
```typescript
// Good: Using path mapping
import { ReviewType } from '@/types/review';
import { logger } from '@/utils/logger';

// Avoid: Relative paths for distant modules  
import { ReviewType } from '../../../types/review';
```

---

## 🧪 Testing Framework

### Vitest Configuration (vitest.config.mjs)
```javascript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'docs/**',
        'scripts/**', 
        'src/prompts/**',
        '**/examples/**',
        '**/debug/**',
        'src/database/**',
        'src/evaluation/**'
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/utils': resolve(__dirname, './src/utils')
    }
  }
});
```

### Test Categories and Standards

#### Unit Tests
**Location**: `src/__tests__/`  
**Pattern**: `*.test.ts`  
**Purpose**: Test individual functions and classes

```typescript
// Example test structure
describe('ArgumentParser', () => {
  describe('parseArguments', () => {
    it('should parse review type correctly', () => {
      // Test implementation
    });
    
    it('should handle invalid arguments gracefully', () => {
      // Error case testing
    });
  });
});
```

#### Integration Tests  
**Pattern**: `*.integration.test.ts`  
**Purpose**: Test component interactions
```typescript
// Mock external dependencies
vi.mock('@anthropic-ai/sdk');
vi.mock('@google/generative-ai');
```

#### API Integration Tests
**Pattern**: `*.real.test.ts`  
**Purpose**: Test real API connections (skipped without keys)

```typescript
describe.skipIf(!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY)('Real API tests', () => {
  // Tests that require actual API keys
});
```

### Mocking Strategy
```typescript
// Mock external APIs consistently
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: 'mocked response' }]
      })
    }
  }))
}));
```

---

## 🎯 Code Quality Tools

### Biome Configuration
The project uses **Biome** as a unified linting and formatting toolchain, providing 10x faster performance than ESLint+Prettier:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.6/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/__tests__/**"],
    "ignoreUnknown": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "warn",
        "noImplicitAnyLet": "error"
      },
      "style": {
        "noInferrableTypes": "error",
        "useTemplate": "warn",
        "useImportType": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedFunctionParameters": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always",
      "quoteProperties": "asNeeded",
      "bracketSameLine": false,
      "bracketSpacing": true,
      "arrowParentheses": "always"
    }
  }
}
```

### Biome Commands
```bash
# Linting
pnpm run lint                    # Check for linting errors
pnpm run lint:fix                # Auto-fix linting issues

# Formatting
pnpm run format                  # Format code (write mode)
pnpm run format:check            # Check formatting without writing

# Combined workflow
biome check src/ --write         # Lint and format in one command
```

### Quality Gates
- **Biome**: 0 linting errors, warnings minimized
- **TypeScript**: 0 compilation errors
- **Tests**: 100% pass rate for available tests
- **Coverage**: 70%+ for core code (excluding docs, scripts, prompts)

### Performance Benefits
- **10x faster** than ESLint+Prettier combination
- **Unified toolchain** - single tool for linting and formatting
- **Zero configuration** - works out of the box with sensible defaults
- **Git integration** - respects .gitignore and VCS settings
- **Import organization** - automatic import sorting and optimization

---

## 🏗️ Build System

### Build Process Flow
```bash
# 1. TypeScript compilation
tsc                              # Compile src/ to dist/

# 2. Post-build processing  
node scripts/prepare-package.sh  # Add shebang, fix permissions

# 3. Validation
./dist/index.js --version       # Verify executable
pnpm run validate:models        # Verify configurations
```

### Output Structure
```
dist/
├── index.js                    # Main CLI executable (with shebang)
├── index.d.ts                  # Type definitions
├── cli/                        # Compiled CLI modules
├── clients/                    # Compiled client modules
├── utils/                      # Compiled utilities
└── types/                      # Compiled type definitions
```

### Build Troubleshooting
```bash
# Common build issues and fixes
rm -rf dist/ && pnpm run build           # Clean build
head -5 dist/index.js                    # Check for duplicate shebangs
chmod +x dist/index.js                   # Fix permissions if needed
```

---

## 🤖 AI Provider SDKs

### Google Gemini Integration
```typescript
// Client configuration
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new GoogleGenerativeAI(apiKey);
const model = client.getGenerativeModel({ 
  model: 'gemini-2.5-pro',
  generationConfig: {
    temperature: 0.1,
    topP: 0.8,
    maxOutputTokens: 8192
  }
});
```

### Anthropic Claude Integration
```typescript
// Client configuration
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY,
});

// Message format
const response = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 8192,
  temperature: 0.1,
  messages: [{ role: 'user', content: prompt }]
});
```

### OpenAI Integration
```typescript
// Client configuration
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AI_CODE_REVIEW_OPENAI_API_KEY,
});

// Chat completion format
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.1,
  max_tokens: 8192
});
```

### OpenRouter Integration
```typescript
// Client configuration (OpenAI-compatible)
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY,
});
```

### Model Selection System
```typescript
// Model format: provider:model-name
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
AI_CODE_REVIEW_MODEL=anthropic:claude-3-5-sonnet
AI_CODE_REVIEW_MODEL=openai:gpt-4o
AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-5-sonnet
```

---

## 🔧 Development Tools

### File Discovery System
```typescript
// Smart file selection patterns
const filePatterns = {
  typescript: ['**/*.ts', '**/*.tsx'],
  javascript: ['**/*.js', '**/*.jsx'],
  python: ['**/*.py'],
  go: ['**/*.go'],
  php: ['**/*.php'],
  ruby: ['**/*.rb']
};

// Exclusion patterns
const excludePatterns = [
  'node_modules/**',
  'dist/**',
  'coverage/**',
  '**/*.test.*',
  '**/*.spec.*'
];
```

### Project Type Detection
```typescript
// Framework detection logic
const detectors = {
  react: () => existsSync('package.json') && readFileSync('package.json').includes('react'),
  nextjs: () => existsSync('next.config.js') || existsSync('next.config.mjs'),
  vue: () => existsSync('vue.config.js') || existsSync('nuxt.config.js'),
  angular: () => existsSync('angular.json'),
  django: () => existsSync('manage.py'),
  laravel: () => existsSync('artisan')
};
```

### Prompt Template System
```handlebars
{{!-- Handlebars template example --}}
# Code Review: {{reviewType}}

## Project Context
- **Framework**: {{framework}}
- **Language**: {{language}} 
- **Files Analyzed**: {{fileCount}}

## Analysis
{{#each files}}
### {{path}}
{{content}}
{{/each}}
```

---

## 🔄 CI/CD Integration

### Local CI Pipeline
```bash
# Complete validation pipeline (run before commits)
pnpm run lint          # Biome linting and formatting check
pnpm run build:types   # TypeScript compilation check  
pnpm test              # Full test suite execution
pnpm run validate:prompts  # Template validation
pnpm run validate:models   # Model configuration check
```

### GitHub Actions Integration
```yaml
# Example workflow integration
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: corepack enable
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run build:types  
      - run: pnpm test
```

### Pre-commit Hooks
```bash
# Setup pre-commit validation
echo '#!/bin/bash
pnpm run lint && pnpm run build:types && pnpm test
' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## 🚨 Troubleshooting

### Common Issues and Solutions

#### Build Failures
```bash
# Issue: TypeScript compilation errors
pnpm run build:types  # Isolate TypeScript issues
tsc --listFiles       # Debug module resolution

# Issue: Missing dependencies  
rm -rf node_modules pnpm-lock.yaml
pnpm install         # Clean dependency installation

# Issue: Duplicate shebang in executable
head -5 dist/index.js           # Check for duplicates
sed -i '2d' dist/index.js       # Remove duplicate if found
```

#### Test Failures
```bash
# Issue: API key missing for integration tests
cp .env.example .env.local      # Create local environment
# Add actual API keys to .env.local

# Issue: Mock failures after refactoring
pnpm test -- --reporter=verbose  # Get detailed test output
# Update mocks to match new import paths

# Issue: Path resolution in tests
# Verify vitest.config.mjs has correct alias configuration
```

#### CLI Issues
```bash
# Issue: Command not found
npm run postbuild              # Ensure executable is prepared
chmod +x dist/index.js         # Fix permissions

# Issue: Module resolution errors
node -r tsconfig-paths/register dist/index.js --version  # Debug resolution

# Issue: Environment variables not loading
node -e "console.log(process.env)" | grep AI_CODE_REVIEW  # Verify env vars
```

#### API Connection Issues
```bash
# Issue: API authentication failures
ai-code-review . --debug       # Enable debug logging
# Check API key format and permissions

# Issue: Rate limiting
ai-code-review . --estimate    # Check token usage before execution
# Consider using lower-cost models for development
```

### Development Workflow Issues
```bash
# Issue: Tests pass locally but fail in CI
pnpm test              # Verify local test success
# Check for environment-specific dependencies

# Issue: Linting errors
pnpm run lint:fix      # Auto-fix where possible using Biome
# Manually address remaining issues

# Issue: Coverage below threshold
pnpm run test:coverage  # Generate coverage report
# Add tests for uncovered code paths
```

### Performance Troubleshooting
```bash
# Issue: Slow startup
node --prof dist/index.js --version  # Profile startup performance
# Optimize import structure if needed

# Issue: Memory usage
node --inspect dist/index.js         # Enable debugging
# Monitor memory usage during execution

# Issue: Large output files
ls -la ai-code-review-docs/          # Check output file sizes
# Consider chunking for large codebases
```

---

## 🔗 Quick Reference

### Daily Commands
```bash
# Development cycle
pnpm run dev                    # Development execution
pnpm run test:watch            # Continuous testing
pnpm run lint                  # Biome linting and formatting check

# Before commit
pnpm run lint && pnpm run build:types && pnpm test

# Debugging
ai-code-review . --debug       # Debug mode
ai-code-review . --estimate    # Token estimation
ai-code-review . --listmodels  # Available models
```

### File Locations
- **Main entry**: `src/index.ts`
- **Type definitions**: `src/types/`
- **Client implementations**: `src/clients/implementations/`
- **Configuration loading**: `src/utils/envLoader.ts`
- **Test setup**: `src/__tests__/setup.ts`
- **Build configuration**: `tsconfig.json`, `vitest.config.mjs`

### Environment Setup
```bash
# Minimal setup for new developers
git clone <repository>
cd ai-code-review
corepack enable
pnpm install
cp .env.example .env.local
# Add at least one AI provider API key
pnpm test                      # Verify setup
```

---

This toolchain guide provides complete technical mastery for the AI Code Review project. For development workflow and business context, see `docs/WORKFLOW.md` and `docs/PROJECT.md` respectively.