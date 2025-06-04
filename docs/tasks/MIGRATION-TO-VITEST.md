# Migration from Jest to Vitest

## Overview
This document outlines the migration from Jest to Vitest for the test suite in the ai-code-review project.

**Status**: 🚀 **IN PROGRESS** - Phase 1 Complete, Phase 2 In Progress  
**GitHub Issue**: [#50](https://github.com/bobmatnyc/ai-code-review/issues/50)  
**Feature Branch**: `feature/migrate-to-vitest`

## Motivation
- **Performance**: Vitest offers better performance and faster test execution compared to Jest
- **Modern JavaScript Support**: Better support for ES modules and TypeScript
- **Vite Integration**: More seamless integration with Vite-based projects
- **Security**: Addresses potential security vulnerabilities in older test frameworks
- **Developer Experience**: Improved developer experience with faster feedback loops

## Performance Improvement
**Test execution time: 21.4s → 2.98s (7x faster!)**

## Migration Plan

### Phase 1: Preparation ✅ COMPLETE
- [x] Audit current test coverage and identify key test patterns
- [x] Document Jest-specific features currently in use
- [x] Create a vitest configuration file (`vitest.config.ts`)
- [x] Update package.json with vitest scripts
- [x] Upgrade Vitest to latest version (3.2.1)
- [x] Add @vitest/ui for enhanced testing experience

### Phase 2: Implementation 🔄 IN PROGRESS
- [x] Install required dependencies (`vitest`, any needed plugins)
- [x] Migrate test configurations
- [x] Convert 2 test files to Vitest syntax (rateLimiter, treeGenerator)
- [ ] **24 test files remaining** that need Jest syntax conversion
- [ ] Address any Jest-specific features that need alternatives in Vitest
- [ ] Ensure all tests pass with Vitest

### Phase 3: Completion 📋 PENDING
- [ ] Remove Jest dependencies from package.json
- [ ] Remove Jest configuration files (jest.config.js, babel.config.js)
- [ ] Update documentation references
- [ ] Update CI/CD pipelines
- [ ] Verify coverage reporting works correctly

## Jest to Vitest Conversion Pattern

### Common Syntax Changes
```typescript
// OLD (Jest)
import { jest } from '@jest/globals';
jest.mock('module');
const mockFn = jest.fn();
jest.spyOn(object, 'method');
jest.clearAllMocks();
jest.requireMock('module');

// NEW (Vitest)
import { vi } from 'vitest';
vi.mock('module');
const mockFn = vi.fn();
vi.spyOn(object, 'method');
vi.clearAllMocks();
vi.hoisted(() => vi.importMock('module'));
```

### Mock Configuration Changes
```typescript
// OLD (Jest)
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn()
  }
}));

// NEW (Vitest)
vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn()
  }
}));
```

### File Header Updates
```typescript
// OLD
/**
 * This module provides Jest tests for...
 */

// NEW
/**
 * This module provides Vitest tests for...
 */
```

## Test Files Status

### ✅ Converted (2/36)
- `src/__tests__/rateLimiter.test.ts`
- `src/__tests__/treeGenerator.test.ts`

### 🔄 Partially Converted (1/36)
- `src/__tests__/fileSystem.test.ts`

### ❌ Need Conversion (24/36)
- `src/__tests__/cli/argumentParser.test.ts` (partially started)
- `src/__tests__/cli/confirmOption.test.ts` (partially started)
- `src/__tests__/cli/argumentMapping.test.ts`
- `src/__tests__/cli/argumentMapping.simple.test.ts`
- `src/__tests__/core/fileDiscovery.test.ts`
- `src/__tests__/core/reviewOrchestratorConfirm.test.ts`
- `src/__tests__/commands/testBuild.test.ts`
- `src/__tests__/commands/testModel.test.ts`
- `src/__tests__/files/smartFileSelector.test.ts`
- `src/__tests__/prompts/templatedBundledPrompts.test.ts`
- `src/__tests__/strategies/*.test.ts` (4 files)
- `src/__tests__/utils/*.test.ts` (2 files)
- `src/__tests__/validatePath.test.ts`
- `src/__tests__/reviewParser.test.ts`
- `src/__tests__/modelNameDisplay.test.ts`
- `src/__tests__/analysis/*.test.ts` (2 files)
- `src/__tests__/integration/reviewFormatting.test.ts`

### ✅ No Changes Needed (9/36)
- Tests that don't use Jest-specific syntax

## Estimated Timeline
- **Phase 1**: ✅ Complete (2 hours)
- **Phase 2**: 🔄 In Progress (4-6 hours estimated for remaining conversions)
- **Phase 3**: 📋 Pending (1-2 hours for cleanup)

**Total estimated effort**: 6-8 hours

## Additional Resources
- [Vitest Documentation](https://vitest.dev/)
- [Jest to Vitest Migration Guide](https://vitest.dev/guide/migration.html)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)

## Notes
- Vitest is mostly compatible with Jest's API, making migration straightforward
- Main challenge is bulk syntax conversion across multiple files
- Performance improvement is significant (7x faster execution)
- Configuration is much simpler without Babel complexity
- ESM support is native and works better than Jest