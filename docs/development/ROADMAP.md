# AI Code Review Tool — Roadmap

> Last Updated: 2024-04-17
> Updated: 2025-06-29 - Added test coverage improvement priority

This roadmap outlines the evolution of the AI Code Review Tool, focused on improving configurability, robustness, usability, and developer experience. Features are grouped by priority and phase.

This document works in conjunction with [INSTRUCTIONS.md](./INSTRUCTIONS.md), which defines the quality standards, coding practices, and documentation requirements for the project. While INSTRUCTIONS.md provides guidance on *how* to implement features, this roadmap defines *what* features to implement and *when*.

---

## ✅ Phase 1: Stabilization & Configuration 

**Goal**: Strengthen configuration, improve DX, and lay groundwork for extensibility.

**Success Metrics**:
- All configuration is centralized and type-safe
- Environment variables are properly documented
- CLI flags provide runtime flexibility
- Error messages are clear and actionable

- [x] Create `config/` module with schema validation (Zod) *(Implemented in v1.3.0: Created centralized config with type validation)*
- [x] Add `.env.example` with all supported variables *(Implemented in v1.2.0: Added comprehensive example with all environment variables)*
- [x] Migrate all API clients to use centralized config *(Implemented in v1.3.1: Unified client configuration across providers)*
- [x] Fail-fast validation for missing or invalid config *(Implemented in v1.3.0: Added validation checks at startup)*
- [x] CLI flags to override config/env settings at runtime *(Implemented in v1.3.0: Added support for command-line overrides)*
- [x] Add `bin` entry in `package.json` for CLI usage *(Implemented in v1.2.0: Enabled global installation via npm/yarn)*

---

## 🚧 Phase 2: Plugin & Strategy Architecture 

**Goal**: Make the review engine more composable, swappable, and testable.

**Success Metrics**:
- Review logic is decoupled from orchestration
- Custom review strategies can be added without modifying core code
- Strategy selection is available via CLI
- Unit tests cover all core strategies

**Dependencies**: Requires completion of Phase 1 configuration module for strategy selection.

- [x] Decouple review logic from orchestrator into `strategies/` *(Implemented: Created ReviewStrategy interface, base class, and concrete implementations for different review types)*
- [x] Support for user-defined review strategies via plugins *(Implemented: Created PluginManager and plugin interface for custom strategies)*
- [x] Add `--strategy` CLI flag to choose logic *(Implemented: Added CLI flag and updated StrategyFactory to support custom strategies)*
- [x] Move prompt templates to external files for better testing/versioning *(Implemented: Created PromptManager for loading templates with metadata from external files)*
- [x] Add unit tests for review strategies *(Implemented: Created test files for all strategy classes)*

---

## ✨ Phase 3: Prompt Enhancements

**Goal**: Add meta-prompting and user-defined prompts.

**Success Metrics**:
- Users can provide custom prompts via CLI
- Prompt improvements are cached for future use
- Model-specific prompt strategies are available
- Prompt quality improves over time through meta-prompting

**Dependencies**: Builds on Phase 2's strategy architecture for prompt strategy selection.

- [x] Implement meta-prompting layer for prompt optimization *(Implemented: Created PromptOptimizer class for analyzing and improving prompts)*
- [x] Add support for `--prompt [PROMPT].md` CLI flag *(Implemented: Added --prompt alias for --prompt-file flag)*
- [x] Allow injection of user prompts into the prompt builder *(Implemented: Added PromptBuilder class and --prompt-fragment flag)*
- [x] Cache improved prompts for reuse *(Implemented: Added PromptCache class for storing and retrieving optimized prompts)*
- [x] Expose model-specific prompt strategy selection *(Implemented: Added model-specific prompt strategies and --prompt-strategy flag)*

---

## 🚧 Phase 4: Review Output Enhancements 

**Goal**: Improve output quality, formatting, and traceability.

**Success Metrics**:
- All reviews include metadata (model, cost, timestamp)
- Original code context is preserved with suggestions
- Multiple output formats are supported (Markdown, HTML, CLI)
- Inline annotations match GitHub PR style

**Dependencies**: Can be developed in parallel with Phase 3, but benefits from Phase 2's strategy architecture.

- [x] Add static code analysis integration (ts-prune, eslint) *(Implemented in v2.1.0: Added ts-prune and eslint integration for unused code detection)*
- [x] Add dependency visualization integration *(Implemented in v2.1.0: Added dependency-cruiser integration for architectural reviews)*
- [x] Add metadata headers to each review (model, token cost, timestamp) *(Implemented in v2.1.1: Added comprehensive metadata headers with model details, token usage, cost, tool version, and command options)*
- [ ] Embed original code context alongside suggestions
- [ ] Include model confidence or explanation (if available)
- [ ] Support HTML and CLI-rendered output options
- [ ] Add inline annotations in markdown output (like GitHub PRs)
---

## 🎯 **NEXT PRIORITY: Phase 5: Test Coverage Enhancement**

**Goal**: Achieve comprehensive test coverage for all core functionality to ensure reliability and maintainability.

**Current Status** (as of 2025-06-29):
- ✅ **46/46 test files pass** (100% pass rate)
- ✅ **476/498 tests pass** (95.6% pass rate, 22 skipped for API integration)
- ✅ **Zero test failures** - all critical functionality working
- ✅ **Vitest framework implemented** with comprehensive configuration
- ✅ **Coverage exclusions configured** (docs, scripts, prompts excluded)

**Success Metrics**:
- **Core code coverage reaches 70%** for statements, branches, functions, and lines
- **API client implementations** have comprehensive test coverage (currently 3.16%)
- **Review strategies** are fully tested (currently 13.37%)
- **Error handling scenarios** are covered across all modules
- **Integration tests** cover complete user workflows

**Current Coverage Status**:
- **Statements**: 27.71% (target: 70%)
- **Branches**: 69.8% (close to target!)
- **Functions**: 42.31% (target: 70%)
- **Lines**: 27.71% (target: 70%)

**Priority Tasks**:
- [ ] **API Client Testing**: Add comprehensive tests for all API integrations
  - [ ] Test error handling and retry logic
  - [ ] Test rate limiting and timeout scenarios
  - [ ] Test response parsing and validation
  - [ ] Mock external API calls consistently

- [ ] **Review Strategy Testing**: Test core business logic
  - [ ] Test architectural review strategy
  - [ ] Test security review strategy
  - [ ] Test performance review strategy
  - [ ] Test quick-fixes review strategy

- [ ] **Error Handling Coverage**: Test edge cases and error scenarios
  - [ ] Test configuration loading failures
  - [ ] Test file system errors
  - [ ] Test network failures
  - [ ] Test invalid input handling

- [ ] **Integration Testing**: End-to-end workflow coverage
  - [ ] Test complete CLI workflows
  - [ ] Test multi-file processing
  - [ ] Test output generation
  - [ ] Test configuration scenarios

- [ ] **Entry Point Testing**: Test main application flows
  - [ ] Test index.ts and main entry points
  - [ ] Test CLI command routing
  - [ ] Test application initialization
  - [ ] Test graceful error handling

**Dependencies**: This phase builds on the solid testing foundation already established.

---

## 🔄 Phase 6: Future Enhancements

**Goal**: Advanced features and optimizations for mature product.

**Success Metrics**:
- Enhanced output formats and visualizations
- Advanced prompt optimization
- Performance improvements
- Extended platform support

**Future Tasks**:
- [ ] Support HTML and CLI-rendered output options
- [ ] Add inline annotations in markdown output (like GitHub PRs)
- [ ] Embed original code context alongside suggestions
- [ ] Include model confidence or explanation (if available)
- [ ] Advanced prompt optimization and caching
- [ ] Performance profiling and optimization

---

## 🧪 Ongoing: Quality, Testing & Docs

**Goal**: Maintain high quality standards and comprehensive documentation throughout development.

**Success Metrics**:
- ✅ All public functions have JSDoc comments
- ✅ Documentation is kept up-to-date with code changes
- ✅ Code follows consistent style and naming conventions
- 🎯 **Test coverage targets achieved** (Phase 5 priority)

**Cross-References**: See [INSTRUCTIONS.md](./INSTRUCTIONS.md) for detailed quality standards and [TESTING.md](../TESTING.md) for testing strategy.

**Completed**:
- [x] ✅ **Comprehensive testing framework** *(Implemented: Vitest with 46 test files, 476 tests)*
- [x] ✅ **Testing strategy documentation** *(Implemented: docs/TESTING.md with detailed guidelines)*
- [x] ✅ **Coverage configuration** *(Implemented: Proper exclusions and thresholds)*
- [x] ✅ **Type-check config and response shapes** *(Implemented: Full TypeScript strict mode)*
- [x] ✅ **JSDoc comments for public functions** *(Implemented: Comprehensive documentation)*
- [x] ✅ **Consistent error handling** *(Implemented: Graceful error handling across modules)*

**Ongoing Tasks**:
- [ ] Add CONTRIBUTING.md with dev setup and testing *(See INSTRUCTIONS.md: Documentation System)*
- [ ] Add architecture diagram to PROJECT.md *(See INSTRUCTIONS.md: Updating PROJECT.md)*
- [ ] Track usage patterns to inform future features
- [ ] Implement pre-commit hooks for linting and formatting *(See INSTRUCTIONS.md: Automation Support)*

