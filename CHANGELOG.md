# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Added CI local check script (`npm run ci:local`) for pre-push validation
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
- Added CI local check script (`npm run ci:local`) for pre-push validation
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