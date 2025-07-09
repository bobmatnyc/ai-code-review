# Extract Patterns Testing Suite

This directory contains the comprehensive testing suite for US-001 Phase 2: Extract Patterns Validation & Enhancement.

## Overview

The extract-patterns review type is designed to analyze codebases and extract detailed patterns, architecture, and design decisions for creating exemplar project libraries. Phase 2 focuses on validation, quality assessment, and real-world testing.

## Test Components

### 1. Real API Testing (`test-real-api.js`)

Tests the extract-patterns functionality with actual API calls to validate end-to-end functionality.

**Features:**
- Tests multiple model providers (Anthropic, OpenAI, Gemini)
- Validates output against schema requirements
- Measures performance and cost
- Tests different scales (single file, module, full codebase)

**Usage:**
```bash
pnpm run test:extract-patterns:real-api
```

### 2. Output Quality Validation (`validate-output-quality.js`)

Validates the quality of extract-patterns output using validation frameworks and quality metrics.

**Features:**
- Schema compliance validation
- Content quality assessment
- LangChain-inspired evaluation metrics
- Quality scoring and grading

**Usage:**
```bash
pnpm run test:extract-patterns:quality
```

### 3. External Project Testing (`test-external-projects.js`)

Tests pattern extraction on well-known TypeScript projects to benchmark effectiveness.

**Features:**
- Tests on popular open-source projects (TypeScript, VS Code, Nest.js, etc.)
- Pattern detection rate measurement
- Comparison against expected patterns
- Automated project downloading and testing

**Usage:**
```bash
pnpm run test:extract-patterns:external
```

### 4. Master Test Runner (`run-phase2-tests.js`)

Comprehensive test runner that executes all Phase 2 tests and generates completion reports.

**Features:**
- Prerequisite checking
- Sequential test execution with rate limiting
- Comprehensive reporting
- Phase 2 completion assessment

**Usage:**
```bash
pnpm run test:extract-patterns
```

## Prerequisites

Before running the tests, ensure you have:

1. **Built the project:**
   ```bash
   pnpm run build
   ```

2. **API Keys:** Set at least one of the following environment variables:
   - `AI_CODE_REVIEW_ANTHROPIC_API_KEY`
   - `AI_CODE_REVIEW_OPENAI_API_KEY`
   - `AI_CODE_REVIEW_GOOGLE_API_KEY`

3. **Environment file:** Create `.env.local` with your API keys:
   ```
   AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_key_here
   AI_CODE_REVIEW_OPENAI_API_KEY=your_key_here
   AI_CODE_REVIEW_GOOGLE_API_KEY=your_key_here
   ```

## Test Execution

### Quick Start

Run all Phase 2 tests:
```bash
pnpm run test:extract-patterns
```

### Individual Tests

Run specific test components:
```bash
# Real API testing only
pnpm run test:extract-patterns:real-api

# Quality validation only
pnpm run test:extract-patterns:quality

# External projects only (optional, time-intensive)
pnpm run test:extract-patterns:external
```

### Advanced Options

Include optional tests (external projects):
```bash
node scripts/tests/extract-patterns/run-phase2-tests.js --include-optional
```

## Output Files

Test results are saved to:
- `ai-code-review-docs/extract-patterns-tests/` - Real API test results
- `ai-code-review-docs/quality-validation-tests/` - Quality validation results
- `ai-code-review-docs/external-project-tests/` - External project test results

## Validation Framework

The testing suite includes two validation systems:

### 1. Schema Validation (`ExtractPatternsValidator`)
- Validates output against the extract-patterns schema
- Checks for required fields and data types
- Assesses content quality and completeness
- Provides quality metrics and improvement suggestions

### 2. LangChain Evaluation (`LangChainEvaluator`)
- Evaluates patterns using LangChain-inspired methodology
- Assesses relevance, completeness, actionability, specificity, and novelty
- Provides letter grades (A-F) and detailed scoring
- Identifies strengths, weaknesses, and recommendations

## Pattern Database

The testing suite also validates the pattern database functionality:

### Features
- Pattern storage and retrieval
- Search and filtering capabilities
- Similarity analysis between projects
- Export functionality (JSON, CSV)
- Statistics and reporting

### Usage
The pattern database is tested as part of the master test runner and can be used to:
- Store extracted patterns for future reference
- Build a library of exemplar projects
- Compare patterns across different projects
- Generate insights about architectural trends

## Expected Results

### Quality Metrics
- **Completeness:** 80-100% (all required fields present)
- **Accuracy:** 75-95% (realistic metrics and specific examples)
- **Usefulness:** 70-90% (actionable insights and guidance)
- **Specificity:** 70-85% (concrete examples and details)

### Pattern Detection
- Should identify 2-5 architectural patterns per project
- Common patterns: Strategy, Factory, Observer, Dependency Injection
- Pattern examples should include specific file names or code references

### Performance
- Single file: ~$0.01, <30 seconds
- Module directory: ~$0.05, <60 seconds
- Full codebase: ~$0.20-1.00, <300 seconds

## Troubleshooting

### Common Issues

1. **No API keys found**
   - Ensure environment variables are set correctly
   - Check `.env.local` file exists and has valid keys

2. **Project not built**
   - Run `pnpm run build` before testing
   - Ensure `dist/` directory exists

3. **Rate limiting**
   - Tests include automatic delays between API calls
   - Reduce test frequency if encountering rate limits

4. **External project download failures**
   - Check internet connection
   - Some projects may have changed repository structure
   - External tests are optional and can be skipped

### Debug Mode

For detailed debugging, set environment variables:
```bash
DEBUG=ai-code-review:* pnpm run test:extract-patterns
```

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Include comprehensive error handling and validation
3. Add appropriate delays to avoid rate limiting
4. Update this README with new test descriptions
5. Ensure tests work with all supported model providers

## Phase 2 Completion Criteria

Phase 2 is considered complete when:

1. ✅ Real API testing passes for at least one model provider
2. ✅ Output quality validation shows "adequate" or better quality
3. ✅ Pattern database functionality works correctly
4. ✅ Validation frameworks provide meaningful feedback
5. ⚠️ External project testing (optional but recommended)

The master test runner will automatically assess Phase 2 completion status and provide next steps.
