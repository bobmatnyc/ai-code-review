# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.4.6] - 2025-08-17

### Fixed
- **Model Maps Synchronization**: Fixed model-maps.js generation during build process
  - Resolved issue where model data files were not found during sync-model-maps.js execution
  - Ensured model-maps.js is properly generated with current model mappings
  - Improved build process reliability for model synchronization

## [4.4.5] - 2025-08-17

### Improved
- **Documentation Consistency**: Comprehensive documentation review and updates
  - Updated all version references to v4.4.5 across README.md, INSTALL.md, and CLAUDE.md
  - Added complete v4.4.5 feature documentation with Unified Client System details
  - Updated model references to current recommended versions (gemini-2.5-pro, claude-4-sonnet)
  - Enhanced CLAUDE.md with comprehensive project context and development guidelines
- **Review Types Documentation**: Updated to reflect all current review types
  - Added missing review types: best-practices, ai-integration, cloud-native, developer-experience
  - Removed outdated improved-quick-fixes reference (now mapped to quick-fixes)
  - Updated CLI options documentation to match current implementation
- **Command Documentation**: Fixed CLI command examples and references
  - Corrected model-test command examples and documentation
  - Updated CLI options to reflect all 15 current review types
  - Validated all documented commands work correctly with current implementation
- **Project Organization**: Enhanced documentation structure and clarity
  - Added README to ai-code-review-docs/ explaining generated output directory
  - Maintained excellent 2-click navigation structure in docs/
  - Ensured all documentation reflects current v4.4.5 codebase

### Fixed
- **Documentation Accuracy**: All documented features now match current implementation
- **Version Consistency**: Eliminated version mismatches across documentation files
- **CLI Examples**: Fixed outdated command examples and option references

## [4.4.4] - 2025-08-16

### Added
- **Unified Client System**: New architecture for API client management
  - BaseApiClient interface for consistent client behavior
  - UnifiedClientFactory for streamlined client creation
  - OpenAIApiClient implementation with enhanced error handling
  - Improved configuration service for client settings
- **Build Number Tracking**: Comprehensive build tracking system
  - Automatic build number incrementation during builds
  - Build metadata tracking with timestamps
  - Enhanced version reporting with build information
- **Enhanced Consolidation Service**: Improved multi-pass review consolidation
  - Dedicated ConsolidationService for better separation of concerns
  - Enhanced error handling and fallback mechanisms
  - Improved AI-powered consolidation with better prompt handling
- **New Prompt Templates**: Extended prompt template library
  - AI Integration Review template for AI-assisted development analysis
  - Cloud Native Review template for cloud architecture assessment
  - Developer Experience Review template for DX evaluation
  - Java and Rust language-specific best practices templates
- **Prompt Schema Validation**: JSON schema for prompt frontmatter validation
  - Structured validation for prompt metadata
  - Consistent prompt template format enforcement
  - Enhanced prompt development workflow

### Improved
- **Documentation Organization**: Comprehensive documentation restructuring
  - Moved all documentation files to dedicated docs/ directory
  - Enhanced documentation for unified client system
  - Improved build number tracking documentation
  - Better organization of migration guides and architectural docs
- **Code Quality**: Enhanced testing and validation
  - New unit tests for consolidation bug fixes
  - Improved test coverage for unified client system
  - Enhanced validation scripts for prompt templates
- **Project Structure**: Cleaner codebase organization
  - Replaced old task management system with new tickets/ structure
  - Removed temporary debug files and test directories
  - Better separation of concerns in core services

### Fixed
- **Consolidation Bug**: Fixed issue where consolidation instructions were treated as source code
  - Consolidation prompts now properly passed in projectDocs.readme field
  - Empty string passed as fileContent to prevent code wrapping
  - Enhanced test coverage to prevent regression
- **Token Analysis**: Improved token counting and analysis accuracy
- **Client Factory**: Enhanced client creation and initialization logic

### Removed
- **Legacy Task System**: Removed old tasks/ directory structure
- **Debug Files**: Cleaned up temporary debug and test files
- **Duplicate Documentation**: Consolidated documentation in docs/ directory

## [4.3.1] - 2025-07-09

### Fixed
- **CLI Documentation Accuracy**: Comprehensive documentation improvements for better user experience
  - Updated README.md CLI options section with accurate flag descriptions and examples
  - Fixed QUICK_START.md command syntax examples to match actual CLI behavior
  - Standardized environment variable references across all documentation
  - Corrected package manager references to use consistent pnpm commands
  - Updated version references throughout documentation to reflect current state
  - Enhanced CLI help text alignment with actual command functionality

## [4.3.0] - 2025-06-30

### Added
- **Prompt Template Manager**: Handlebars integration for dynamic prompt templates
  - Support for conditional logic and loops in prompts
  - Partial template support for reusable components
  - Helper functions for common operations
- **Extract Patterns Review Type**: Phase 2 implementation with validation & enhancement
  - Pattern validation and quality scoring
  - Structured output for detected patterns
  - Enhanced pattern extraction capabilities
- **Output Directory Override**: New `--output-dir` flag for custom review output locations
  - Flexible file organization for review results
  - Maintains backward compatibility with default locations
- **YAML Configuration Support**: `.ai-code-review.yaml` configuration files
  - Human-readable configuration format
  - JSON configuration still supported for backward compatibility
  - Automatic configuration file discovery

### Improved
- **Testing Strategy**: Comprehensive testing framework implementation
  - Achieved 96.8% test pass rate (482/498 tests)
  - 100% of test files passing (46/46)
  - Enhanced coverage configuration for core code
- **CI/CD Infrastructure**: Improved versioning and release automation
  - Better version management across the codebase
  - Enhanced build and deployment processes

## [4.2.2] - 2025-06-11

### Fixed
- **Evaluation Prompt Instructions**: Strengthened evaluation prompts to prevent improvement suggestions
  - Added CRITICAL, FORBIDDEN, and FINAL REMINDER directives to ensure pure developer assessment
  - Prevents AI models from suggesting code improvements when evaluation is requested
  - Ensures focus remains on skill assessment, AI assistance detection, and professional maturity

### Improved
- **Semantic Chunking Optimization**: Significantly reduced API calls through better batch consolidation
  - Now attempts to fit all threads in a single batch when possible
  - Smart merging of smaller semantic groups to minimize batch count
  - Increased thread limit per batch from 15 to 30
  - Example: 21 threads now consolidate into 1 batch instead of 3 (67% reduction in API calls)

## [4.2.1] - 2025-06-11

### Fixed
- **Missing Evaluation Prompt**: Added evaluation review type to bundled prompts
  - Fixes "No prompt template found for evaluation" error when using npx or published package
  - Evaluation review type was defined but not accessible in bundled prompts
  - Now includes comprehensive developer skill assessment framework in bundled prompts

## [4.2.0] - 2025-06-11

### Added
- **Evaluation Review Type**: New developer skill assessment and AI assistance detection
  - Analyzes coding skill level: Beginner/Intermediate/Advanced/Expert
  - Detects AI assistance likelihood and professional maturity
  - Includes meta coding quality indicators (documentation, testing, workflow)
  - Structured schema output for consistent evaluation results
- **Golang Language Support**: Comprehensive support for Go/Golang projects
  - Golang-specific prompt templates for all review types (architectural, quick-fixes, security, performance, unused-code, best-practices, evaluation)
  - Idiomatic Go pattern analysis and best practices
  - Go project type detection and file filtering (.go, go.mod, go.sum)
  - Concurrency, interface design, and error handling expertise
- **Enhanced Grading System**: Academic-style grading for consolidated reviews
  - A+ to F grading scale for code quality assessment
  - Multiple grade categories: functionality, code quality, documentation, testing, maintainability, security, performance
  - Integrated into multi-file review workflows

### Updated
- Version bumped to 4.2.0 to reflect significant new functionality
- README.md updated with new features and supported languages
- Documentation enhanced to include evaluation review type and Golang support

## [4.1.2] - 2025-06-07

### Fixed
- Updated README header to show correct version number

## [4.1.1] - 2025-06-07

### Fixed
- Removed duplicate `-i` flag documentation in README

## [4.1.0] - 2025-06-07

### Changed
- Repurposed `-i` as alias for `--interactive` instead of `--individual`
  - The `-i` shorthand now maps to `--interactive` for better user experience
  - Interactive mode can now be invoked with both `-i` and `--interactive` flags

### Deprecated
- **DEPRECATED**: `--individual` flag is now deprecated and will be removed in a future version
  - Single-file behavior is automatically determined by the target
  - The flag currently has no effect as the functionality is automatic
  - IndividualReviewStrategy and related code have been removed internally

### Improved
- Simplified codebase by removing redundant individual file review mode logic
- Better user experience with `-i` now intuitively mapping to interactive mode
- Cleaner architecture without unnecessary strategy implementations

## [4.0.2] - 2025-01-21

### Fixed
- **🔧 TypeScript Compilation Errors**
  - Fixed all 15 TypeScript compilation errors in test files
  - Resolved TokenAnalysisOptions parameter mismatches with required reviewType and modelName
  - Fixed ReviewType casting issues with proper 'as const' assertions
  - Added missing multiPass property to test options objects
  - Fixed estimateMultiPassReviewCost function calls with correct parameter structure
  - Fixed readline.createInterface() calls with proper input/output arguments
  - Fixed Interface mocking with proper type assertions

- **🧹 Code Quality Improvements**
  - Eliminated all ESLint errors (0 errors, 373 warnings under limit)
  - Removed unused imports and variables across semantic analysis modules
  - Fixed type mismatches in ChunkGenerator and SemanticChunkingIntegration
  - Cleaned up unused interfaces and code structure
  - Added proper SystemStats interface for getStats return type

- **✅ Build Pipeline**
  - All TypeScript compilation now passes cleanly
  - ESLint shows 0 errors with warnings under configured limit
  - Core build infrastructure fully operational
  - Ready for stable v4.0.1 publication

## [4.0.0] - 2025-06-04

### Added
- **🧠 AI-Guided Semantic Chunking with TreeSitter Integration**
  - Real AST parsing for TypeScript, JavaScript, Python, Ruby using TreeSitter
  - Intelligent code structure boundaries preserving functions/classes/modules
  - AI-guided chunking strategy selection based on review type and code complexity
  - 95%+ token reduction (from 196K+ to ~4K tokens in typical cases)
  - Context limit problem resolution - no more 200K token failures
- **Environment Variable Control for Semantic Chunking**
  - New `AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING` environment variable (default: true)
  - CLI flag override: `--enable-semantic-chunking` for runtime control
  - Configuration precedence: CLI flag > env var > default
  - Debug logging for chunking decisions and environment variable status
- **5 Intelligent Chunking Strategies**
  - `individual`: Each declaration reviewed separately (high complexity code)
  - `grouped`: Related small declarations together (utility functions)
  - `hierarchical`: Classes with their methods (object-oriented code)
  - `functional`: Related business logic grouped (feature-based code)
  - `contextual`: Preserves import/dependency context (complex dependencies)
- **Review Type Optimization**
  - Architectural reviews → hierarchical chunking for class structures
  - Security reviews → contextual chunking for data flow analysis
  - Performance reviews → functional chunking for execution paths
  - Quick-fixes → individual chunking for focused analysis
- **Robust 4-Level Fallback System**
  - Semantic chunking (TreeSitter + AI-guided) → Line-based chunking (500-line chunks) → Individual file processing → Emergency fallback
  - Graceful degradation ensures no review failures
- **Comprehensive Documentation**
  - Complete semantic chunking guide (`SEMANTIC_CHUNKING.md`)
  - Technical implementation status (`TREESITTER_IMPLEMENTATION_STATUS.md`)
  - Environment variable documentation in `.env.example` and `.env.sample`
  - Updated `PROJECT.md` with configuration details

### Changed
- **Dramatically Improved Review Quality**
  - 22% more comprehensive output (3,592 vs 2,925 tokens)
  - Concrete code examples with before/after patterns
  - Context-aware analysis understanding project architecture
  - Specific technical recommendations vs generic suggestions
- **Enhanced Performance**
  - 40-100ms analysis time with TreeSitter parsing
  - Significant API cost reduction through token efficiency
  - Reliable operation for large codebases that previously failed
- **Better Code Structure Analysis**
  - Real syntax tree understanding vs text-based chunking
  - Preserved semantic relationships between code elements
  - Intelligent boundary detection at function/class levels

### Technical Details
- **New Dependencies**: tree-sitter family for AST parsing
- **New Module**: `src/analysis/semantic/` with complete semantic analysis system
- **88+ Tests**: Comprehensive test suite with 92% pass rate
- **Zero Breaking Changes**: Fully backward compatible
- **Multi-Language Support**: TypeScript, JavaScript, Python, Ruby with extensible framework

### Performance Metrics
- **Token Reduction**: 95.8% improvement (196K → 4K tokens)
- **Context Usage**: 99.8% improvement (>200K → 0.35% utilization)
- **Cost Efficiency**: Successful processing at $0.011 vs previous failures
- **Analysis Speed**: 38ms average processing time
- **Quality Score**: ⭐⭐⭐⭐⭐ across all metrics (content, technical depth, actionability)

## [3.3.0] - 2025-06-03

### Added
- **Enhanced model registry system** with comprehensive metadata and pricing information
  - Tiered pricing support for usage-based models (Gemini 1.5/2.5, Claude models)
  - Deprecation tracking with automated migration guidance
  - Model categorization (REASONING, CODING, GENERAL) for smart recommendations
  - Provider feature detection (prompt caching, tool calling, etc.)
  - Modular file structure with 100% backwards compatibility
- Enhanced prompt templates with comprehensive OWASP-aligned security reviews
- Added structured architectural review templates with SOLID principles evaluation
- Improved Python and TypeScript performance and quick-fixes prompts with industry best practices
- Added OSS integration opportunity analysis in architectural reviews
- New documentation organization with logical subdirectories (api/, development/, guides/)

### Fixed
- Resolved all TypeScript compilation errors for improved type safety
- Fixed missing CliOptions interface that extends ReviewOptions
- Enhanced CostInfo interface with multi-pass review properties
- Converted tokenAnalysis.d.ts from ambient module to proper TypeScript module
- Updated Jest configuration for reorganized test file structure
- Fixed Handlebars template syntax conflicts with Laravel Blade syntax

### Changed
- Reorganized documentation structure with README and subdirectories
- Added TypeScript path aliases for cleaner import statements
- Enhanced prompt validation with frontmatter metadata
- Improved build process with version and model map synchronization
- Updated package.json scripts for better automation

## [3.2.15] - 2025-06-01

### Added
- Re-added support for OpenAI o3 and o3-mini reasoning models
  - These models may have been incorrectly removed in v3.2.11
  - The issue may have been with the multi-pass consolidation rather than the models themselves
  - Re-added to modelConfigRegistry, modelMaps, and openaiEstimator
  - Updated tests to reflect 7 OpenAI models total

### Changed
- o3 models now use 'max_completion_tokens' parameter instead of 'max_tokens'
- o3 models do not support temperature, top_p, frequency_penalty, or presence_penalty parameters

## [3.2.14] - 2025-06-01

### Fixed
- Fixed multi-pass consolidation for non-OpenAI providers (Gemini, Anthropic, etc.)
- Fixed issue where consolidation content was being reviewed as source code instead of being properly merged
- Improved consolidation approach to use generateReview method with custom prompts for better results
- Added fallback consolidation mechanism when AI consolidation fails

### Changed
- Modified consolidation logic to avoid passing review results as source files
- Used architectural review type for consolidation to ensure comprehensive analysis
- Added special handling for providers that don't support generateReview method

## [3.2.13] - 2025-06-01

### Fixed
- Fixed project .env.local not properly overriding tool's environment variables
- Added `override: true` option to dotenv.config() to ensure project settings take precedence
- Fixed environment variable loading order to respect project-level configuration
- Added detailed ENV-TRACE logging to show when environment variables are changed

### Added
- Enhanced environment variable tracing showing before/after values when loading .env files
- Added project .env.local loading before configuration initialization

## [3.2.12] - 2025-06-01

### Fixed
- Fixed CLI model option (-m) not overriding environment variable
- Fixed incorrect model name display in logs and estimation output
- Improved environment variable loading priority order:
  - CLI options (highest priority)
  - Project-level .env.local and .env files
  - Tool installation directory .env.local
  - System environment variables (lowest priority)

## [3.2.11] - 2025-06-01

### Removed
- Removed support for OpenAI o3 and o3-mini models per issue #44
  - These models were generating generic advice instead of analyzing actual code
  - Removed from modelConfigRegistry, modelMaps, and openaiEstimator
  - Updated tests to reflect the removal

### Fixed
- Fixed OpenAI model count in tests from 7 to 5 after removing o3 models

## [3.2.10] - 2025-05-29

### Changed
- Updated README.md with comprehensive version history from v3.0.2 to v3.2.9
- Added README updates to the publishing checklist in PROJECT.md
- Fixed import statement in anthropicEstimator.ts (replaced require with import)

### Fixed
- Documentation on npm registry now includes complete version history and Claude 4 model information

## [3.2.9] - 2025-05-28

### Added
- Added support for Claude 4 Opus and Claude 4 Sonnet models
  - Claude 4 Opus: Most capable model with 200K context window ($15/$75 per 1M tokens)
  - Claude 4 Sonnet: Balanced model with 200K context window ($3/$15 per 1M tokens)
- Added automatic model detection from environment variable AI_CODE_REVIEW_MODEL

### Fixed
- Fixed provider display showing "Gemini" instead of "Anthropic" when using Claude models
- Fixed cost calculation to use correct API identifiers from modelMaps
- Improved token and cost estimation display to show input/output token breakdown
- Fixed mismatch between displayed tokens and calculated cost in estimation mode
- Corrected Claude 4 model identifiers to match Anthropic API format
- Updated ApiClientSelector to include provider prefix in modelName for all providers

### Changed
- Enhanced estimation display to show actual tokens contributing to cost calculation
- Improved multi-pass review token information clarity

## [3.2.8] - 2025-05-21

### Fixed
- Fixed critical version mismatch bug where CLI reported version 3.0.3 instead of the correct package.json version
- Updated hardcoded VERSION constant in src/index.ts to match package.json version
- Fixed --show-version flag to display accurate version information

### Added  
- Added comprehensive version management documentation to PROJECT.md
- Documented critical steps for version updates to prevent future synchronization issues
- Added troubleshooting guide for version mismatch detection

## [3.2.7] - 2025-05-22

### Fixed
- Removed non-working OpenAI reasoning models (o3, o4-mini, o4-mini-high) that are not yet available in the public API
- Cleaned up OpenAI client by removing special handling for o4-mini-high model
- Updated model registry and tests to reflect working OpenAI models only (5 OpenAI models total)
- Resolved "Failed after retries" error for o4-mini-high model by removing it from available models

## [3.2.6] - 2025-05-22

### Added
- Added OpenAI's new reasoning models: o3, o4-mini, and o4-mini-high
- All new models support tool calling and have appropriate context window sizes
- Updated model registry with correct API identifiers for the new models

### Fixed
- Fixed incorrect o1-mini mapping for o4-mini-high model (now uses correct o4-mini-high identifier)
- Updated OpenAI client to use actual model names instead of incorrect mappings
- Updated tests to reflect the new model count (8 OpenAI models total)

## [3.2.5] - 2025-05-22

### Fixed
- Fixed critical issue with OpenAI o4-mini-high model in the OpenAI client
- Added proper model name mapping from o4-mini-high to o4-mini for API calls
- Added required response_format parameter for the o4-mini-high model
- Fixed tool calling paths to properly handle the o4-mini-high model

## [3.2.4] - 2025-05-22

### Added
- Added support for OpenAI's o4-mini-high model
- Updated model registry and tests to include the new model
- Set context window size to 128000 and enabled tool calling support
- Added comprehensive test coverage for the new model

## [3.2.3] - 2025-05-22

### Fixed
- Fixed failing tests in smartFileSelector.test.ts
- Enhanced matchesTsConfig to better handle src/**/* patterns
- Improved path handling for test cases to ensure proper matching
- Fixed variable declaration issues (changed let to const) in smart file selection
- Resolved variable redeclaration issue in unusedDependencies.ts
- Addressed unused variable warnings across multiple files

## [3.2.2] - 2025-05-22

### Fixed
- Merged all type safety and security improvements into main branch
- Resolved import path conflicts for proper code organization
- Ensured consistent error handling across API clients
- Fixed test suite with proper mocking implementations
- Consolidated model mapping fixes for all API providers

## [3.2.1] - 2025-05-22

### Fixed
- Improved type safety in type declaration files by replacing `any` types with proper interfaces
- Added null/undefined checks to prevent potential runtime errors
- Fixed property name inconsistency in configManager between openrouter and openRouter
- Corrected string | undefined type issues in API clients with proper null checks
- Fixed optional chaining usage in templateLoader.ts 
- Added proper type conversion in LangChainUtils for examples
- Added proper API response interfaces to improve type checking
- Fixed model mapping issue where `gemini-2.5-pro` was not properly mapped to `gemini-2.5-pro-preview-05-06`
- Fixed JSON output formatting in quick-fixes and other review types
- Fixed consolidated review to use markdown format instead of JSON
- Simplified model selection logic to use only configured models without fallbacks
- Fixed CI workflow issues including build scripts, module resolution, and lint errors
- Updated package scripts from pnpm to npm for consistency
- Removed automatic Gemini fallback in IndividualReviewStrategy - now fails gracefully with helpful error messages
- Fixed failing tests in reviewOrchestratorConfirm.test.ts related to prompt confirmation and multipass reviews
- Fixed import path issues in rateLimiter.test.ts after API utils refactoring
- Fixed nested test structure issues that were causing Jest failures
- Fixed issues with process.exit mocking in test environment
- Fixed module import circular dependencies in various tests
- Fixed mocking issues with fileSystem and dynamically imported modules
- Fixed PHP framework detection test to match actual behavior
- Fixed bundledPrompts test to accommodate new Python-specific prompts
- Fixed argumentParser.test.ts worker process exceptions by simplifying test cases
- Fixed type error in LangChainPromptStrategy.ts by safely accessing filePath property
- Enhanced TypeScript configuration with stricter compiler options
- Added explicit interfaces for API responses instead of using 'any' types
- Improved error handling in critical operations with proper validation and recovery options
- Implemented a centralized configuration system to eliminate hardcoded values
- Fixed TypeScript errors caused by stricter compiler options (noUnusedParameters, noUnusedLocals, etc.)
- Fixed error in reviewOrchestrator.ts from imports being used before their declaration
- Fixed potential null reference errors in templateLoader.ts
- Fixed undefined handling in anthropicApiClient.ts retry mechanism
- Fixed null/undefined type safety issues in TokenAnalyzer.ts and TokenTracker.ts
- Fixed API model name checking in anthropicApiClient.ts to properly handle undefined values
- Fixed templateLoader.ts to handle undefined language and framework parameters
- Fixed reviewOrchestrator.ts to safely access potentially undefined properties
- Fixed property name discrepancy in configManager.ts between type definition and implementation
- Disabled noUncheckedIndexedAccess to optimize type safety vs. development experience
- Removed unused variable 'providerForProperty' in configManager.ts
- Removed unused imports from pathValidator in FileReader.ts
- Removed unused property 'reviewType' in streamHandler.ts
- Removed unused fs import in PathGenerator.ts
- Fixed `any` type usage in templateLoader.ts with proper type definitions
- Fixed unused imports in reviewOrchestrator.ts (formatEstimation, printCurrentModel, detectPrimaryLanguage, formatMultiPassEstimation)
- Fixed `any` types in anthropicApiClient.ts with more specific Record<string, unknown> types
- Fixed templateLoader.test.ts mock implementation to correctly handle withFileTypes option
- Fixed hard-coded template directory path in templateLoader.ts to use configManager
- Fixed hard-coded debug mode check in responseProcessor.ts to use configManager
- Updated anthropicApiClient.ts to use configManager for more consistent configuration handling

## [3.2.0] - 2025-05-21

### Added
- Implemented JSON configuration file support via configFileManager
- Added command-line option to specify config file path (--config)
- Added command-line option to generate sample config (--generate-config)
- Implemented full smart file selection functionality with support for:
  - .gitignore patterns (previously implemented)
  - .eslintignore patterns (new)
  - tsconfig.json configuration (new)
- Added proper documentation for smart file selection
- Comprehensive framework-specific best practices templates for Angular, Vue, Django, and Laravel
- Improved JSON output formatting for interactive mode responses
- Added support for structured JSON responses in review results
- Added automatic detection and parsing of JSON content in review outputs
- Added CI local check script (`pnpm run ci:local`) for pre-push validation
- Enhanced workflow instructions in INSTRUCTIONS.md with CI best practices
- Added CI data collection for all review types with per-file error counts
- Integrated TypeScript and ESLint error counts into code review prompts
- Added structured API response interfaces in new `apiResponses.ts` module
- Implemented a configManager singleton for centralized configuration access
- Enabled TypeScript's noUnusedLocals and noUnusedParameters for improved code quality
- Added comprehensive configuration interfaces with Zod validation schema
- Added configuration types for API keys, endpoints, rate limits, and token usage
- Implemented smart file selection using project configuration files:
  - Uses tsconfig.json for TypeScript project filtering
  - Respects .eslintignore patterns in addition to .gitignore
  - Improves review focus on relevant files
- Integrated configManager with templateLoader for dynamic template directory resolution
- Added template cache clearing functionality to support configuration changes at runtime

### Fixed
- Implemented missing features that were mentioned in CHANGELOG but not fully implemented
- Fixed JSON configuration file handling for consistent configuration management
- Fixed smart file selection to correctly use project configuration files

### Changed
- Updated INSTRUCTIONS.md to emphasize CI checks before closing tickets
- Added detailed CI troubleshooting guide and common issue prevention
- Changed workflow commands from pnpm to npm throughout documentation
- Added explicit documentation against automatic fallback strategies - user configuration must be respected
- Fixed regex-based model extraction in favor of direct model passing
- Improved error handling for structured JSON responses
- Updated Gemini client to properly request structured JSON when in interactive mode
- Enhanced review parser to handle language-specific code blocks without treating them as JSON
- Improved output formatter to automatically detect and format JSON responses as markdown
- Updated default model to Gemini 2.5 Pro Preview throughout the codebase
- Simplified consolidation logic to use configured model directly without special selection

## [3.1.0] - 2025-05-20

### Added
- Comprehensive framework-specific best practices templates for Angular, Vue, Django, and Laravel
- Improved JSON output formatting for interactive mode responses
- Added support for structured JSON responses in review results
- Added automatic detection and parsing of JSON content in review outputs
- Added CI local check script (`pnpm run ci:local`) for pre-push validation
- Enhanced workflow instructions in INSTRUCTIONS.md with CI best practices
- Added CI data collection for all review types with per-file error counts
- Integrated TypeScript and ESLint error counts into code review prompts
- Added structured API response interfaces in new `apiResponses.ts` module
- Implemented a configManager singleton for centralized configuration access
- Enabled TypeScript's noUnusedLocals and noUnusedParameters for improved code quality
- Added comprehensive configuration interfaces with Zod validation schema
- Added configuration types for API keys, endpoints, rate limits, and token usage
- Implemented smart file selection using project configuration files:
  - Uses tsconfig.json for TypeScript project filtering
  - Respects .eslintignore patterns in addition to .gitignore
  - Improves review focus on relevant files
- Integrated configManager with templateLoader for dynamic template directory resolution
- Added template cache clearing functionality to support configuration changes at runtime

### Fixed
- Fixed model mapping issue where `gemini-2.5-pro` was not properly mapped to `gemini-2.5-pro-preview-05-06`
- Fixed JSON output formatting in quick-fixes and other review types
- Fixed consolidated review to use markdown format instead of JSON
- Simplified model selection logic to use only configured models without fallbacks
- Fixed CI workflow issues including build scripts, module resolution, and lint errors
- Updated package scripts from pnpm to npm for consistency
- Removed automatic Gemini fallback in IndividualReviewStrategy - now fails gracefully with helpful error messages
- Fixed failing tests in reviewOrchestratorConfirm.test.ts related to prompt confirmation and multipass reviews
- Fixed import path issues in rateLimiter.test.ts after API utils refactoring
- Fixed nested test structure issues that were causing Jest failures
- Fixed issues with process.exit mocking in test environment
- Fixed module import circular dependencies in various tests
- Fixed mocking issues with fileSystem and dynamically imported modules
- Fixed PHP framework detection test to match actual behavior
- Fixed bundledPrompts test to accommodate new Python-specific prompts
- Fixed argumentParser.test.ts worker process exceptions by simplifying test cases
- Fixed type error in LangChainPromptStrategy.ts by safely accessing filePath property
- Enhanced TypeScript configuration with stricter compiler options
- Added explicit interfaces for API responses instead of using 'any' types
- Improved error handling in critical operations with proper validation and recovery options
- Implemented a centralized configuration system to eliminate hardcoded values
- Fixed TypeScript errors caused by stricter compiler options (noUnusedParameters, noUnusedLocals, etc.)
- Fixed error in reviewOrchestrator.ts from imports being used before their declaration
- Fixed potential null reference errors in templateLoader.ts
- Fixed undefined handling in anthropicApiClient.ts retry mechanism
- Fixed null/undefined type safety issues in TokenAnalyzer.ts and TokenTracker.ts
- Fixed API model name checking in anthropicApiClient.ts to properly handle undefined values
- Fixed templateLoader.ts to handle undefined language and framework parameters
- Fixed reviewOrchestrator.ts to safely access potentially undefined properties
- Fixed property name discrepancy in configManager.ts between type definition and implementation
- Disabled noUncheckedIndexedAccess to optimize type safety vs. development experience
- Removed unused variable 'providerForProperty' in configManager.ts
- Removed unused imports from pathValidator in FileReader.ts
- Removed unused property 'reviewType' in streamHandler.ts
- Removed unused fs import in PathGenerator.ts
- Fixed `any` type usage in templateLoader.ts with proper type definitions
- Fixed unused imports in reviewOrchestrator.ts (formatEstimation, printCurrentModel, detectPrimaryLanguage, formatMultiPassEstimation)
- Fixed `any` types in anthropicApiClient.ts with more specific Record<string, unknown> types
- Fixed templateLoader.test.ts mock implementation to correctly handle withFileTypes option
- Fixed hard-coded template directory path in templateLoader.ts to use configManager
- Fixed hard-coded debug mode check in responseProcessor.ts to use configManager
- Updated anthropicApiClient.ts to use configManager for more consistent configuration handling

### Changed
- Updated INSTRUCTIONS.md to emphasize CI checks before closing tickets
- Added detailed CI troubleshooting guide and common issue prevention
- Changed workflow commands from pnpm to npm throughout documentation
- Added explicit documentation against automatic fallback strategies - user configuration must be respected
- Fixed regex-based model extraction in favor of direct model passing
- Improved error handling for structured JSON responses
- Updated Gemini client to properly request structured JSON when in interactive mode
- Enhanced review parser to handle language-specific code blocks without treating them as JSON
- Improved output formatter to automatically detect and format JSON responses as markdown
- Updated default model to Gemini 2.5 Pro Preview throughout the codebase
- Simplified consolidation logic to use configured model directly without special selection

## [3.0.4] - 2025-05-15

### Added
- Added AI-powered dependency analysis for architectural reviews
- Implemented project structure and import/export analysis without external dependencies
- Added detailed directory and package.json analysis for architectural insights
- Added framework detection and framework-specific best practices templates
- Added version and package recommendation support for different frameworks
- Added language and framework auto-detection with confidence scoring
- Added CSS framework detection (TailwindCSS, Bootstrap, Material UI, etc.)
- Added framework version detection from package.json, composer.json, etc.
- Added support for framework-specific prompt fragments in reviews
- Added detected frameworks and versions in review metadata section
- Added unit tests for CSS framework detection
- Updated all framework best practices prompts with latest version information
- Added version-specific best practices for both latest and previous supported versions
- Added CSS framework information with version numbers (Tailwind CSS v4.0, Bootstrap v5.3.6, Material UI v7.0.0, Chakra UI v3.18.0, etc.)
- Added framework-specific CSS integration recommendations

### Changed
- Removed dependency on dependency-cruiser for architectural reviews
- Implemented AI-based approach for analyzing project dependencies and structure
- Enhanced dependency analysis to work without requiring external tools
- Enhanced prompt system to prioritize framework-specific templates when available
- Improved review output to include framework detection information

### Fixed
- Fixed installation issues caused by dependency-cruiser conflicts
- Removed potential NPM dependency conflicts during installation

## [3.0.3] - 2025-05-15

### Fixed
- Fixed metadata display in multi-pass review consolidation
- Added missing model information in review headers and metadata section
- Improved fallback mechanism for multi-pass review consolidation
- Enhanced error handling and logging for Gemini API consolidation
- Fixed "Model: AI" placeholder with actual model provider information

## [3.0.2] - 2025-05-15

### Added
- Added explicit default to current directory (".") when no target path is provided
- Added informative logging when defaulting to current directory
- Enhanced debug output to indicate when path defaulting occurs
- Improved diagnostic logging for JSON parsing failures

### Fixed
- Fixed issues with undefined code review titles and model information display
- Fixed JSON parsing errors in multi-pass reviews with code blocks containing language markers
- Improved regex patterns for extracting JSON content from various code block formats
- Added robust null/undefined checks for review path and model information
- Enhanced error handling for missing fields in review results

## [3.0.1] - 2025-05-15

### Added
- Added grade section to OpenAI reviews for consistent formatting with other model providers
- Enhanced structured review output to include grade categories (functionality, code quality, documentation, testing, etc.)
- Improved review formatting for better readability and consistency across all model providers

### Fixed
- Fixed missing grade section in OpenAI model reviews

## [3.0.0] - 2025-05-14

### Added
- **Multi-Pass Review Confirmation**: Added confirmation step for multi-pass reviews showing token usage, estimated passes, and cost.
- **--no-confirm Flag**: Added a new flag to skip the confirmation step for multi-pass reviews.
- **Command Documentation**: Improved documentation and organization of command-line options in README.
- **Comprehensive Tests**: Added unit tests for command-line options including the new confirmation feature.
- **Future Migration Plan**: Created a plan for migrating from Jest to Vitest in a future release.

### Changed
- **Improved CLI Options**: Enhanced clarity and consistency of all command-line option descriptions.
- **Command Grouping**: Reorganized CLI options documentation into logical groups for better usability.
- **Model Mapping**: Updated Gemini model mappings to use the latest API identifiers.

### Fixed
- **JSON Parsing**: Fixed JSON parsing in responses that use language-specific code blocks.
- **API Versioning**: Fixed issues with API version selection in different model providers.

## [2.2.0] - 2025-05-06

### Added
- Enhanced dependency analysis with automated vulnerability checks
- Added improved dependency scanning capabilities
- Added stack-aware package analysis for better context
- Added SERP API integration for security vulnerability intelligence
- Added tooling for enhanced dependency analysis

### Fixed
- Fixed issue where Gemini reviews were returning JSON format instead of Markdown
- Modified the prompt instructions in GeminiClient to explicitly request Markdown output
- Ensured consistent output format across all model providers (Gemini, Anthropic, OpenAI)

## [2.1.9] - 2025-05-05

### Fixed
- Fixed critical bug in global CLI installation where the executable was missing the shebang line
- Modified build process to ensure shebang line is always included in the bundled output
- Improved global installation reliability across different environments

## [2.1.8] - 2025-05-05

### Fixed
- Fixed issue #10: Implement prompt bundling to ensure all prompts are properly included in the package
- Enhanced INSTRUCTIONS.md with better formatting, table of contents, and AI assistant guidelines
- Added wrapper scripts to fix shebang line issues in CLI installations
- Improved error handling for missing prompts with clearer diagnostics
- Added robust testing for bundled prompt templates
- Fixed minor issues with model validation during builds
- Enhanced error reporting for missing API keys

## [2.1.7] - 2025-05-02

### Fixed
- Fixed Gemini model registry to use the correct model name (gemini-1.5-pro instead of gemini-2.5-pro)
- Added pre-packaging model validation to ensure all models are available and correctly configured
- Added validation script to test models against their respective APIs
- Updated package manager from yarn to pnpm for better compatibility

## [2.1.6] - 2025-05-02

### Fixed
- Fixed prompt template loading issues with architectural reviews
- Improved template discovery to properly handle language-specific templates
- Added bundled templates to ensure they're available in the package
- Enhanced error handling for missing templates with better fallback mechanisms
- Updated documentation with clearer instructions for template customization

## [2.1.5] - 2025-04-29

### Added
- Enhanced architectural review prompts to evaluate opportunities for leveraging established OSS packages
- Added specific checks in architectural reviews to identify where existing libraries could replace custom implementations
- Updated prompts for all supported languages (TypeScript, Python, PHP, Ruby)

### Changed
- Updated PROJECT.md with new architectural review capabilities

## [2.1.4] - 2025-04-24

### Fixed
- Fixed module resolution error for import of `modelMaps` in Anthropic client under development mode.

## [2.1.3] - 2025-04-18

### Fixed
- Fixed Ruby project signatures in enhanced project type detection module
- Updated all enhancement modules to maintain feature parity with main codebase

## [2.1.2] - 2025-04-18

### Added
- Added Ruby/Rails prompt suite with specialized prompts for all review types
- Added Ruby/Rails test project with typical Rails application structure
- Added Ruby project type detection for better language-specific analysis
- Enhanced Ruby file extensions support (.rb, .rake, .gemspec, .ru, .erb)
- Added Ruby-specific directory exclusions (vendor, tmp) to improve performance

### Changed
- Updated file globbing patterns to include Ruby file extensions
- Improved project type detection system to accurately identify Ruby on Rails projects

## [2.1.1] - 2025-04-18

### Added
- Added comprehensive metadata headers to each review with model details, token usage, cost, tool version, and command options
- Added support for both Markdown table format and structured JSON metadata
- Added test script to verify metadata headers implementation
- Added Ruby/Rails prompt suite with specialized prompts for all review types
- Added Ruby/Rails test project with typical Rails application structure
- Added Ruby project type detection for better language-specific analysis
- Improved debugging for file extension detection with detailed logging
- Added version display at startup
- Added automatic global installation linking after build (postbuild script)
- Enhanced global installation script to handle both npm link and npm install -g scenarios
- Added cleanup routine to remove conflicting installations from different package managers
- Added dedicated `fix-global-command.sh` script to quickly resolve installation issues

### Changed
- Enhanced file globbing patterns to better support Python and Ruby file extensions
- Added Ruby-specific file extensions (.rb, .rake, .gemspec, .ru, .erb)
- Added Ruby-specific directory exclusions (vendor, tmp) to improve performance
- Improved logging with stats about file types detected
- Added postbuild script to ensure global command always uses latest build
- Improved date formatting in review outputs for better readability
- Enhanced the ReviewResult interface with new metadata properties

### Fixed
- Fixed content sanitization to properly preserve newlines and tabs in the review content
- Fixed issue where review output did not show full directory path
- Fixed Python file detection in mixed language projects
- Fixed TypeScript errors in fileFilters.debug.ts
- Fixed console output to focus on INFO level logs by default
- Fixed global installation issues where old builds were used instead of latest
- Fixed debug logging to use proper logger instead of console.log

## [2.1.0] - 2024-04-17

### Added

- Added Python and PHP prompt subdirectories for language-specific code reviews
- Added automatic programming language detection based on project files and structure
- Expanded file extension support to include Python, PHP, and other major programming languages
- Added environment variable loading prioritization to use the tool's own .env file
- Improved global installation environment handling with better directory detection
- Improved error messages for missing .env files and API keys
- Added setup-env.js script to help configure API keys for global installations
- Added support for AI_CODE_REVIEW_DIR environment variable to specify config location
- Added dependency-cruiser integration for architectural reviews
- Added ts-prune and eslint integration for unused code detection
- Added standardized YAML metadata to all prompt templates
- Added specialized TypeScript architectural review prompt
- Added new CLI options: `--include-dependency-analysis`, `--use-ts-prune`, and `--use-eslint`

### Changed
- Enhanced architectural review to analyze dependency structure
- Improved prompt templates with consistent formatting
- Made prompt loading more robust with consistent metadata

### Fixed
- Fixed TypeScript compilation errors in ProjectDocs interface
- Fixed dependency issues with chalk library

## [2.0.0] - 2024-04-15

### Added
- LangChain integration for enhanced prompt management and templating
- New unused-code review type with deep code tracing
- Structured schemas for all review types
- Enhanced TypeScript-specific templates
- Model testing command with comprehensive provider and model support

### Changed
- Complete codebase reorganization with strategy pattern
- Standardized prompt templates and loading system
- Enhanced error handling and recovery mechanisms

## [1.9.4] - 2024-04-13

### Added
- Added deep code tracing for high-confidence unused code detection with the `--trace-code` option
- Added LangChain integration for enhanced prompt management and structured output
- Added the 'unused-code' review type for identifying and suggesting removal of dead code
- Added multi-pass analysis for code tracing to identify unused code with high confidence
- Added detailed evidence collection and confidence assessment for unused code detection

### Changed
- Enhanced unused code detection to provide more comprehensive evidence and confidence levels
- Improved review formatter to display evidence for each unused code element
- Updated documentation with detailed information about code tracing capabilities

## [1.9.3] - 2024-04-10

### Fixed
- Suppressed DEBUG logging messages in production builds
- Changed directory not found warnings to debug level messages for plugins and templates directories
- Enforced minimum log level of INFO in production builds

## [1.9.2] - 2024-04-10

### Fixed
- Fixed issue where the review output showed the review type instead of the actual file path in the "Reviewed" field
- When reviewing the current directory, now shows the full path with "(Current Directory)" appended

## [1.9.1] - 2024-04-10

### Added
- Added `--models` flag to list all supported models and their configuration names
- Restored full list of models that were previously removed
- Added unit test to check the number of models and throw an error if models are accidentally removed

### Fixed
- Fixed issue where most models were accidentally removed from the model map
- Updated tests to match the current model structure

## [1.7.2] - 2024-04-10

### Fixed
- Ensured proper executable permissions for CLI binary
- Verified shebang line is present in compiled output

## [1.7.1] - 2024-04-10

### Fixed
- Fixed package.json bin field format to properly support CLI usage
- Improved npm package configuration for better compatibility

## [1.7.0] - 2024-04-10

### Fixed
- Fixed npm registry synchronization issues
- Ensured version command works correctly across all npm mirrors

## [1.6.0] - 2024-04-10

### Changed
- Significant version bump to ensure all users get the latest version with the --version flag fix
- Improved handling of command-line arguments to prioritize version display

## [1.5.5] - 2024-04-10

### Fixed
- Fixed issue with --version flag trying to initialize models before displaying version

## [1.5.4] - 2024-04-10

### Added
- Added reviewed file/directory path to the review output header for better identification

## [1.5.3] - 2024-04-10

### Fixed
- Fixed various issues with model initialization and error handling

## [1.5.0] - 2024-04-10

### Added
- Implemented a well-defined schema for code review output
- Enhanced interactive mode to display all issue details in a structured format
- Added centralized model mapping system for consistent model naming
- Added support for user-defined prompt templates and fragments
- Added model-specific prompt strategies for optimized prompts
- Added prompt caching for improved performance

### Changed
- Reorganized review logic into strategy pattern for better extensibility
- Improved model support for all providers (Anthropic, OpenAI, Gemini, OpenRouter)
- Enhanced documentation with detailed model mapping information

### Fixed
- Fixed model mapping issue where model names weren't properly converted to API formats
- Fixed development mode bug in API client selection
- Fixed imports in anthropicClient.ts to use direct imports

## [1.2.0] - 2024-04-08

### Added
- Added support for multiple AI providers (Google, Anthropic, OpenAI, OpenRouter)
- Added comprehensive token and cost estimation for all supported models
- Added model listing feature with `--listmodels` flag
- Added detailed JSDoc comments to key functions and classes
- Added support for Markdown (.md) files in code reviews

### Changed
- Reorganized utility modules to reduce duplication and improve maintainability
- Consolidated model-related utilities in `src/clients/utils/`
- Consolidated API utilities in `src/utils/api/`
- Consolidated sanitization utilities in `src/utils/parsing/`
- Created clear directory structure with appropriate subdirectories
- Made base prompts language-agnostic to support multiple programming languages
- Enhanced interactive mode to show ALL issues by default

### Fixed
- Fixed issue with Gemini 2.5 Pro model generating section headers in Hindi
- Fixed failing tests in the sanitizer module
- Fixed import paths to match the new directory structure
- Fixed model validation to only check models against their respective providers
- Fixed incorrect preference for OpenRouter over other API providers

## [1.1.0] - 2024-04-07

### Added
- Direct Anthropic API support for Claude models
- New environment variable AI_CODE_REVIEW_ANTHROPIC_API_KEY for Anthropic API access
- Support for anthropic:claude-3-opus-20240229, anthropic:claude-3-sonnet-20240229, and anthropic:claude-3-haiku-20240307 models
- Updated documentation with Anthropic API information

### Changed
- Standardized on AI_CODE_REVIEW_* prefix for all environment variables
- Improved error handling for missing API keys
- Enhanced model selection logic to support multiple clients
- Updated .env.example with Anthropic models and API key information

## [1.0.5] - 2024-04-06

### Fixed
- Fixed model selection to respect the adapter specified in AI_CODE_REVIEW_MODEL
- Updated API key selection logic to prioritize the model adapter specified in environment variables
- Fixed issue where OpenRouter was always used when both API keys were available

## [1.0.4] - 2024-04-06

### Fixed
- Fixed model selection to correctly use the preferred model specified in environment variables
- Fixed inconsistency between displayed model name and actual model used for API calls

## [1.0.3] - 2024-04-06

### Fixed
- Fixed package structure to include tests directory in the published package
- Updated package.json files field to ensure all necessary files are included

## [1.0.2] - 2024-04-06

### Fixed
- Fixed module import paths to correctly handle API connection tests
- Improved error handling for environment variable loading

## [1.0.1] - 2024-04-06

### Fixed
- Fixed environment variable handling to properly recognize AI_CODE_REVIEW_GOOGLE_GENERATIVE_AI_KEY
- Improved error messages to show all supported environment variable formats
- Added backward compatibility for legacy environment variable names
- Updated warning messages to provide clearer guidance on API key configuration

## [1.0.0] - 2024-04-06

### Added
- First stable release of the AI Code Review tool
- Support for OpenRouter API (Claude, GPT-4, and other models) via environment variables
- API connection testing to verify API keys before running reviews
- Support for reviewing entire directories and implementing fixes automatically
- Interactive mode for processing review results
- Automatic implementation of high priority fixes
- Prompt-based confirmation for medium and low priority fixes
- Memory-optimized processing for large codebases
- Improved file path handling and error recovery
- NPM package support for easy installation
- Custom context files support via AI_CODE_REVIEW_CONTEXT environment variable

### Changed
- Standardized environment variable naming with AI_CODE_REVIEW prefix
- Changed output directory from ai-code-review/[project-name] to ai-code-review-docs
- Improved output file naming with AI model and target name in the filename
- Updated command structure to use `ai-code-review [target]`

## [0.9.0] - 2024-04-04

### Added
- Initial release of the AI Code Review tool
- Support for multiple review types (architectural, quick-fixes, security, performance)
- Interactive mode for processing review results
- Automatic implementation of high priority fixes
- Consolidated review mode for multiple files
- Project documentation context inclusion
- Custom output formats (markdown, json)
- Comprehensive error handling and logging
- Rate limiting for API requests
- Cost estimation for API usage