# Testing Strategy

This document outlines the comprehensive testing strategy for the AI Code Review project, including coverage goals, test types, and best practices.

## Overview

Our testing strategy focuses on ensuring reliability and maintainability of core functionality while providing comprehensive coverage of user-facing features.

### Current Test Status
- **46/46 test files pass** (100% pass rate)
- **482/498 tests pass** (96.8% pass rate)
- **22 tests skipped** (integration tests requiring API keys)
- **Zero test failures**

## Coverage Goals

### Core Code Coverage Targets
We exclude non-core code (docs, scripts, prompts) from coverage evaluation to focus on actual application logic:

**Target Coverage (Core Code Only):**
- **Statements**: 70%
- **Branches**: 70% 
- **Functions**: 70%
- **Lines**: 70%

### Coverage Exclusions
The following directories are excluded from coverage analysis:
- `docs/**` - Documentation
- `scripts/**` - Build and utility scripts
- `src/prompts/**` - Prompt templates and training data
- `**/examples/**` - Example code
- `**/debug/**` - Debug utilities
- `src/database/**` - Experimental database features
- `src/evaluation/**` - Experimental evaluation features

## Test Types

### 1. Unit Tests
**Purpose**: Test individual functions and classes in isolation

**Coverage Areas**:
- CLI argument parsing and validation
- File system operations
- Configuration management
- Model mapping and selection
- Token counting and analysis
- Path validation and sanitization

**Best Practices**:
- Mock external dependencies
- Test both success and error cases
- Use descriptive test names
- Group related tests in describe blocks

### 2. Integration Tests
**Purpose**: Test component interactions and workflows

**Coverage Areas**:
- File discovery and filtering
- Review strategy execution
- Output formatting and generation
- API client integrations (mocked)

**Best Practices**:
- Use realistic test data
- Mock external APIs consistently
- Test complete user workflows
- Verify data flow between components

### 3. End-to-End Tests
**Purpose**: Test complete user scenarios

**Coverage Areas**:
- CLI command execution
- Configuration loading
- File processing pipelines
- Output generation

**Best Practices**:
- Use temporary directories for file operations
- Clean up test artifacts
- Test with various project types
- Verify actual output files

### 4. API Integration Tests (Skipped in CI)
**Purpose**: Test real API integrations

**Coverage Areas**:
- Model API connections
- Rate limiting
- Error handling
- Response parsing

**Note**: These tests are skipped when API keys are not available, ensuring CI/CD reliability.

## Test Organization

### Directory Structure
```
src/__tests__/
├── analysis/           # Token and semantic analysis tests
├── cli/               # Command-line interface tests
├── clients/           # API client tests
├── core/              # Core functionality tests
├── detection/         # Project type and framework detection
├── files/             # File system and filtering tests
├── formatters/        # Output formatting tests
├── integration/       # Integration test suites
├── prompts/           # Prompt management tests
├── strategies/        # Review strategy tests
├── utils/             # Utility function tests
└── setup.ts          # Test setup and configuration
```

### Naming Conventions
- Test files: `*.test.ts`
- Test suites: Descriptive `describe()` blocks
- Test cases: Clear, action-oriented `it()` statements
- Mock files: `*.mock.ts` or inline mocks

## Mocking Strategy

### External Dependencies
- **API Clients**: Mock all external API calls
- **File System**: Use real file operations with temp directories
- **Configuration**: Mock environment variables and config files
- **Network**: Mock all HTTP requests

### Mock Patterns
```typescript
// Module mocking
vi.mock('../../utils/config', () => ({
  loadConfigSafe: vi.fn(() => ({ success: true, config: {} })),
  displayConfigError: vi.fn()
}));

// Function mocking
const mockFunction = vi.fn().mockResolvedValue(expectedResult);

// Singleton mocking
const mockInstance = { method: vi.fn() };
vi.spyOn(Class, 'getInstance').mockReturnValue(mockInstance);
```

## Test Data Management

### Test Fixtures
- Store reusable test data in `__tests__/fixtures/`
- Use factory functions for generating test objects
- Keep test data minimal and focused

### Temporary Files
- Use `fs.mkdtemp()` for temporary directories
- Clean up in `afterEach()` or `afterAll()` hooks
- Never commit test output files

## Continuous Integration

### Test Execution
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Run specific test file
pnpm test src/__tests__/cli/argumentParser.test.ts

# Watch mode for development
pnpm run test:watch
```

### CI Requirements
- All tests must pass
- No test failures allowed
- Skipped tests are acceptable for API integration tests
- Coverage reports generated for analysis

## Development Workflow

### Before Committing
1. Run full test suite: `pnpm test`
2. Check coverage: `pnpm run test:coverage`
3. Ensure no test failures
4. Add tests for new functionality

### Adding New Tests
1. Identify the appropriate test category
2. Create test file in correct directory
3. Follow naming conventions
4. Include both success and error cases
5. Mock external dependencies appropriately

### Debugging Tests
1. Use `test.only()` to focus on specific tests
2. Add `console.log()` statements for debugging
3. Use `--reporter=verbose` for detailed output
4. Check mock configurations for integration issues

## Quality Metrics

### Well-Tested Areas (>80% coverage)
- CLI argument parsing (84.01%)
- Model maps & configuration (99.61%)
- Review context management (96.23%)
- File system utilities (100%)
- Framework detection (87.63%)

### Areas Needing Improvement (<70% coverage)
- API client implementations
- Review strategy execution
- Error handling scenarios
- Edge case coverage

## Best Practices

### Test Writing
- **Arrange, Act, Assert**: Structure tests clearly
- **One assertion per test**: Keep tests focused
- **Descriptive names**: Make test intent clear
- **Independent tests**: No test dependencies

### Maintenance
- **Regular cleanup**: Remove obsolete tests
- **Update mocks**: Keep mocks in sync with implementations
- **Review coverage**: Monitor coverage trends
- **Refactor tests**: Keep test code clean and maintainable

## Tools and Configuration

### Testing Framework
- **Vitest**: Fast, modern testing framework
- **Node environment**: Tests run in Node.js context
- **TypeScript support**: Full TypeScript integration

### Coverage Tools
- **V8 coverage provider**: Built-in Node.js coverage
- **Multiple reporters**: Text, JSON, and HTML reports
- **Threshold enforcement**: Automatic coverage validation

### Mock Libraries
- **Vitest mocks**: Built-in mocking capabilities
- **Module mocking**: Automatic mock generation
- **Spy functions**: Function call tracking and verification

---

For more information about specific test implementations, see the individual test files in `src/__tests__/`.
