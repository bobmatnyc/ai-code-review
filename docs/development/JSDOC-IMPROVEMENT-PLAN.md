# JSDoc Documentation Improvement Plan

This document outlines a systematic plan for improving documentation across the ai-code-review codebase.

## Priority Areas

Based on analysis of the codebase, the following components need documentation improvements, listed in priority order:

### 1. Core Strategy Classes (High Priority)

The strategy classes in `src/strategies/` implement the core review logic and need comprehensive documentation:

- [x] `UnusedCodeReviewStrategy.ts` (Completed)
- [ ] `FocusedUnusedCodeReviewStrategy.ts`
- [ ] `CodeTracingUnusedCodeReviewStrategy.ts` 
- [ ] `ArchitecturalReviewStrategy.ts`
- [ ] `ConsolidatedReviewStrategy.ts`
- [ ] `ImprovedQuickFixesReviewStrategy.ts`
- [ ] `IndividualReviewStrategy.ts`

### 2. Client Implementation Classes (High Priority)

The AI client implementations in `src/clients/implementations/` need better documentation:

- [ ] `openaiClient.ts`
- [ ] `anthropicClient.ts`
- [ ] `geminiClient.ts`
- [ ] `openRouterClient.ts`

### 3. Utility Files (Medium Priority)

The utility files in `src/utils/` need improved documentation:

- [x] `tokenCounter.ts` (Completed)
- [ ] `fileSystem.ts`
- [ ] `projectDocs.ts`
- [ ] `reviewParser.ts`
- [ ] `reviewActionHandler.ts`
- [ ] `rateLimiter.ts`
- [ ] `sanitizer.ts`

### 4. Formatter Files (Medium Priority)

The formatter files in `src/formatters/` need improved documentation:

- [ ] `outputFormatter.ts`
- [ ] `architecturalReviewFormatter.ts`
- [ ] `unusedCodeFormatter.ts`
- [ ] `codeTracingUnusedCodeFormatter.ts`
- [ ] `focusedUnusedCodeFormatter.ts`

### 5. Type Definitions (Medium Priority)

The type definition files in `src/types/` need improved documentation:

- [ ] `review.ts`
- [ ] `common.ts`
- [ ] `reviewSchema.ts`
- [ ] `structuredReview.ts`

### 6. Command Implementations (Low Priority)

The command implementation files in `src/commands/` need improved documentation:

- [ ] `reviewCode.ts`
- [ ] `listModels.ts`
- [ ] `testModel.ts`
- [ ] `testBuild.ts`
- [ ] `syncGithubProjects.ts`

## Documentation Guidelines

All documentation should follow the templates in `JSDOC-TEMPLATE.md`. Specifically:

1. **File Headers**: Each file should have a comprehensive header describing its purpose, responsibilities, and role in the system.

2. **Class Documentation**: Each class should have documentation that explains its purpose, behavior, and provides usage examples.

3. **Method Documentation**: All public methods should have detailed documentation including parameter descriptions, return values, and examples for complex methods.

4. **Interface Documentation**: All interfaces should document their purpose and the meaning of their properties and methods.

5. **Parameter and Return Types**: Use JSDoc type annotations consistently for all parameters and return values.

## Implementation Plan

The documentation improvements should be implemented in phases:

### Phase 1: Core Strategy Classes
- Document all strategy classes following the pattern established for UnusedCodeReviewStrategy.ts
- Focus on key public methods and their parameters/return values
- Add examples for complex methods

### Phase 2: Client Implementation Classes
- Document all client implementation classes with emphasis on their API interaction patterns
- Clearly document authentication, request/response handling, and error management
- Add examples for common use cases

### Phase 3: Utility and Formatter Files
- Improve documentation for utility and formatter files
- Focus on public API methods and their usage patterns
- Add examples for complex utility functions

### Phase 4: Type Definitions and Commands
- Enhance documentation for type definitions and command implementations
- Focus on providing context and explaining relationships between types
- Document command behavior and configuration options

## Progress Tracking

As documentation is improved, mark items as completed in this document:

- [x] `src/utils/tokenCounter.ts`
- [x] `src/strategies/UnusedCodeReviewStrategy.ts`
- [ ] ...

## Best Practices for New Code

All new code contributed to the project should follow these documentation standards from the start. Code reviewers should check for proper documentation before approving pull requests.