# Remaining TypeScript Errors

This document outlines the remaining TypeScript errors that need to be fixed after the implementation of stricter compiler options in `tsconfig.json`.

## Background

We've updated the TypeScript configuration to use stricter compiler options, including:
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `useUnknownInCatchVariables: true`
- `noUncheckedIndexedAccess: true`

These options have revealed a number of type safety issues throughout the codebase that need to be addressed.

## Current Status

The initial work resolved several TypeScript errors in key files:
- Fixed import order in `reviewOrchestrator.ts`
- Fixed unused imports in `anthropicApiClient.ts`
- Fixed potential null/undefined issues in `templateLoader.ts`
- Added proper null checks in various locations
- Created proper interfaces for API responses and configuration

However, a significant number of TypeScript errors remain to be fixed.

## Remaining Issues

The remaining issues can be categorized as follows:

1. **Undefined/null checks**: Many places need explicit null/undefined checks due to `noUncheckedIndexedAccess` and stricter typing.
   - The most common issue is the "Object is possibly 'undefined'" error
   - Several "Type 'string | undefined' is not assignable to type 'string'" errors

2. **Unused variables and imports**: Many files have unused variables or imports.
   - Delete or use these variables/imports
   - For imports that are needed for type information only, use type-only imports

3. **Function return types**: Many functions are missing explicit return type annotations.

4. **Explicit 'any' types**: Need to replace `any` with proper explicit types throughout the codebase.

5. **Type coercion issues**: Several places have type mismatches between string and number.

## Files with Most Issues

The following files have the most TypeScript errors:
1. `src/clients/geminiClient.ts`
2. `src/clients/openaiClient.ts`
3. `src/clients/openRouterClient.ts`
4. `src/utils/detection/frameworkDetector.ts`
5. `src/utils/review/reviewExtraction.ts`
6. `src/analysis/tokens/TokenAnalyzer.ts` and `TokenTracker.ts`

## Approach

1. Start with files that have the most errors and/or are most critical
2. Use pattern-based fixes for common issues (e.g., adding null checks)
3. Ensure changes preserve existing behavior
4. Add appropriate tests for any behavior changes
5. Update documentation for any significant changes

## Success Criteria

- All TypeScript compiler errors resolved
- Code builds without errors using `npm run build:types`
- All tests pass with `npm test`
- No regression in behavior or performance