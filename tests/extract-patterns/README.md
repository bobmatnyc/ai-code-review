# Extract Patterns Phase 2 Testing Framework

This directory contains the comprehensive testing framework for Phase 2 of the Extract Patterns review type implementation (US-002). The framework validates the quality, accuracy, and usefulness of pattern extraction through multiple testing approaches.

## 🎯 Phase 2 Objectives

Phase 2 focuses on validation and quality assurance:

1. **Real API Testing**: Validate functionality with actual API calls
2. **Output Quality Validation**: Ensure comprehensive and accurate pattern extraction
3. **LangChain Evaluation**: Apply evaluation metrics for pattern quality
4. **External Project Testing**: Test on well-known TypeScript projects
5. **Pattern Database**: Create searchable library of extracted patterns

## 📁 Framework Components

### Core Test Scripts

- **`phase2-test-runner.js`** - Main orchestrator for all Phase 2 tests
- **`real-api-test.js`** - Real API testing with multiple models
- **`output-validator.js`** - Output quality validation framework
- **`langchain-evaluation.js`** - LangChain-style evaluation metrics
- **`external-project-test.js`** - External project testing framework
- **`pattern-database.js`** - Pattern storage and retrieval system

### Supporting Files

- **`README.md`** - This documentation file
- **Test results** - Generated in `test-results/` directory
- **Pattern database** - SQLite database in `data/patterns.db`

## 🚀 Quick Start

### Prerequisites

1. **API Keys**: Set up environment variables for the models you want to test:
   ```bash
   export AI_CODE_REVIEW_ANTHROPIC_API_KEY="your-key"
   export AI_CODE_REVIEW_OPENAI_API_KEY="your-key"
   export AI_CODE_REVIEW_GOOGLE_API_KEY="your-key"
   ```

2. **Dependencies**: Ensure all dependencies are installed:
   ```bash
   pnpm install
   ```

3. **Build**: Build the project:
   ```bash
   pnpm build
   ```

### Run Complete Phase 2 Testing

```bash
# Run all test suites
node tests/extract-patterns/phase2-test-runner.js

# Run with specific model
node tests/extract-patterns/phase2-test-runner.js --model anthropic:claude-3-opus

# Quick testing (skip external projects)
node tests/extract-patterns/phase2-test-runner.js --quick

# Store patterns in database
node tests/extract-patterns/phase2-test-runner.js --store-patterns
```

### Run Individual Test Suites

```bash
# Real API testing only
node tests/extract-patterns/phase2-test-runner.js --suite api

# Output validation only
node tests/extract-patterns/phase2-test-runner.js --suite validation

# LangChain evaluation only
node tests/extract-patterns/phase2-test-runner.js --suite evaluation

# External project testing only
node tests/extract-patterns/phase2-test-runner.js --suite external

# Pattern database testing only
node tests/extract-patterns/phase2-test-runner.js --suite database
```

## 📋 Individual Test Components

### 1. Real API Testing (`real-api-test.js`)

Tests extract-patterns functionality with real API calls.

```bash
# Test with default model
node tests/extract-patterns/real-api-test.js

# Test with specific model
node tests/extract-patterns/real-api-test.js --model openai:gpt-4

# Test all available models
node tests/extract-patterns/real-api-test.js --all-models

# Test specific target
node tests/extract-patterns/real-api-test.js --target src/strategies/
```

**Features:**
- Multi-model testing support
- Cost estimation and duration tracking
- Interactive mode validation
- Comprehensive error handling

### 2. Output Validation (`output-validator.js`)

Validates the quality and structure of extract-patterns output.

```bash
# Validate a review file
node tests/extract-patterns/output-validator.js path/to/review.md
```

**Validation Criteria:**
- Required sections presence
- Content length and depth
- Code snippet coverage
- Quality indicators
- Red flag detection
- TypeScript-specific analysis

### 3. LangChain Evaluation (`langchain-evaluation.js`)

Applies LangChain-style evaluation metrics to assess pattern quality.

```bash
# Evaluate a review file
node tests/extract-patterns/langchain-evaluation.js path/to/review.md

# Save evaluation results
node tests/extract-patterns/langchain-evaluation.js path/to/review.md --output results.json
```

**Evaluation Metrics:**
- **Relevance** (25%): How relevant patterns are to the codebase
- **Completeness** (25%): How complete the analysis is
- **Accuracy** (25%): How accurate technical details are
- **Usefulness** (15%): How useful for replication
- **Clarity** (10%): How clear and understandable

### 4. External Project Testing (`external-project-test.js`)

Tests pattern extraction on well-known TypeScript projects.

```bash
# Test specific project
node tests/extract-patterns/external-project-test.js --project nest

# Test all projects
node tests/extract-patterns/external-project-test.js --all

# Test with cleanup
node tests/extract-patterns/external-project-test.js --project vscode --cleanup
```

**Supported Projects:**
- **vscode**: Visual Studio Code
- **typescript**: TypeScript compiler
- **nest**: NestJS framework
- **angular**: Angular framework
- **react**: React library

### 5. Pattern Database (`pattern-database.js`)

Stores and organizes extracted patterns in a searchable database.

```bash
# Store patterns from a review file
node tests/extract-patterns/pattern-database.js store path/to/review.md

# Search patterns
node tests/extract-patterns/pattern-database.js search "typescript patterns"

# List all patterns
node tests/extract-patterns/pattern-database.js list

# Compare patterns
node tests/extract-patterns/pattern-database.js compare pattern1 pattern2
```

**Database Features:**
- SQLite-based storage
- Full-text search capabilities
- Pattern categorization
- Similarity detection
- Export functionality

## 📊 Test Results and Reporting

### Result Structure

All tests generate structured results with:
- Success/failure status
- Performance metrics
- Quality scores
- Detailed findings
- Recommendations
- Artifacts (outputs, reports, data)

### Output Locations

- **Test Results**: `test-results/extract-patterns/`
- **Phase 2 Results**: `test-results/phase2/`
- **Pattern Database**: `data/patterns.db`
- **External Projects**: `test-results/external-projects/`

### Report Formats

- **JSON**: Machine-readable detailed results
- **Console**: Human-readable summary and progress
- **Markdown**: Generated review outputs
- **SQLite**: Searchable pattern database

## 🎯 Success Criteria

### Phase 2 Passing Thresholds

- **Real API Testing**: Successful completion without errors
- **Output Validation**: ≥70% validation score
- **LangChain Evaluation**: ≥70% overall score
- **External Project Testing**: ≥60% pattern match score
- **Pattern Database**: Successful storage and retrieval

### Quality Indicators

- Comprehensive section coverage
- Accurate technical details
- Relevant code examples
- Clear explanations
- Actionable recommendations
- No red flags or uncertainty language

## 🔧 Configuration

### Environment Variables

```bash
# API Keys
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your-anthropic-key
AI_CODE_REVIEW_OPENAI_API_KEY=your-openai-key
AI_CODE_REVIEW_GOOGLE_API_KEY=your-google-key

# Model Selection
AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus

# Database Configuration (optional)
PATTERN_DB_PATH=./data/patterns.db
```

### Test Configuration

Modify test parameters in the respective scripts:
- Model selection
- Output directories
- Validation thresholds
- External project list
- Database settings

## 🚨 Troubleshooting

### Common Issues

1. **Missing API Keys**: Ensure environment variables are set
2. **Build Errors**: Run `pnpm build` before testing
3. **Permission Errors**: Check file/directory permissions
4. **Memory Issues**: Large projects may require increased Node.js memory
5. **Network Issues**: External project cloning requires internet access

### Debug Mode

Enable verbose logging:
```bash
DEBUG=ai-code-review:* node tests/extract-patterns/phase2-test-runner.js
```

### Cleanup

Remove temporary files and databases:
```bash
rm -rf test-results/
rm -rf data/patterns.db
rm -rf temp-external-projects/
```

## 📈 Performance Expectations

### Typical Test Durations

- **Real API Testing**: 30-60 seconds
- **Output Validation**: 1-5 seconds
- **LangChain Evaluation**: 1-5 seconds
- **External Project Testing**: 5-15 minutes per project
- **Pattern Database**: 1-10 seconds

### Resource Requirements

- **Memory**: 2-4 GB for large external projects
- **Disk**: 100-500 MB for temporary files
- **Network**: Required for external project cloning
- **API Costs**: $0.01-$1.00 per test run (depending on model and scope)

## 🔄 Continuous Integration

The Phase 2 testing framework is designed for CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run Extract Patterns Phase 2 Tests
  run: |
    node tests/extract-patterns/phase2-test-runner.js --quick
  env:
    AI_CODE_REVIEW_ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## 📚 Further Reading

- [Extract Patterns Implementation](../../src/strategies/ExtractPatternsReviewStrategy.ts)
- [Prompt Templates](../../promptText/languages/typescript/extract-patterns-review.hbs)
- [Schema Definitions](../../src/prompts/schemas/extract-patterns-schema.ts)
- [US-002 Issue](https://github.com/bobmatnyc/ai-code-review/issues/55)

---

**Note**: This testing framework is part of the Phase 2 implementation for US-002. It validates the extract-patterns functionality and ensures production readiness for pattern extraction and analysis.
