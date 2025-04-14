# Version History

This document tracks the version history of the AI Code Review Tool.

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

## [1.5.3] - 2024-04-09

### Fixed
- Fixed npm registry caching issues with version reporting
- Improved standalone installation process
- Updated version reporting mechanism for better reliability

## [1.5.2] - 2024-04-09

### Fixed
- Fixed issue with --version flag not working in globally installed package
- Hardcoded version number in source code to ensure correct version is displayed
- Improved reliability of version reporting regardless of npm installation issues

## [1.5.1] - 2024-04-09

### Fixed
- Fixed issue with --version flag not working in globally installed package
- Updated package.json to ensure correct version is displayed when using --version flag

## [1.5.0] - 2024-04-08

### Added
- Implemented structured output with a well-defined schema for code reviews
- Enhanced interactive mode to display all issue details in structured format with code samples
- Improved support for all model providers (Anthropic, OpenAI, Gemini, and OpenRouter)

### Fixed
- Fixed bug in API client selection where dynamic imports were failing in development mode
- Updated imports in anthropicClient.ts to use direct imports instead of dynamic imports
- Added --transpile-only flag to ts-node for faster development builds

## [1.3.3] - 2024-04-08

### Fixed
- Fixed bug in API client selection where dynamic imports were failing in development mode
- Updated imports in anthropicClient.ts to use direct imports instead of dynamic imports
- Added --transpile-only flag to ts-node for faster development builds

## [1.3.2] - 2024-04-08

### Fixed
- Fixed bug in API client selection where dynamic imports were failing
- Fixed Anthropic API version to use the correct version (2023-06-01)

## [1.3.1] - 2024-04-08

### Changed
- Simplified model names in OpenRouter models to remove version-specific details
- Derived MODELS constant from MODEL_MAP instead of maintaining it separately
- Deprecated getModels() in favor of getModelsByProvider()

## [1.3.0] - 2024-04-08

### Added
- Added structured output format for code reviews
- Added support for parsing JSON responses wrapped in code blocks
- Added new structured review type definitions
- Added formatStructuredReviewAsMarkdown function to format structured reviews

## [1.2.2] - 2024-04-08

### Fixed
- Fixed "Invalid model adapter: gemini" error when using Gemini models
- Updated Gemini client to use the correct API name from the model map
- Added proper API version handling for Gemini models that require v1beta API
- Improved error messages for model adapter validation
- Updated prompts to explicitly instruct AI models not to repeat instructions
- Added stronger system prompts to all AI clients to prevent instruction repetition
- Fixed import path in apiKeyValidator.ts
- Updated all clients to use the formatSingleFileReviewPrompt and formatConsolidatedReviewPrompt functions from promptFormatter.ts
- Fixed issue where AI models were not receiving the file content to review
- Updated OpenAI client to use the formatSingleFileReviewPrompt and formatConsolidatedReviewPrompt functions
- Added debug logging to the Anthropic client to help diagnose API issues
- Fixed Anthropic client to use the correct model name from the model map
- Fixed Anthropic API version to use the correct version (2023-06-01)

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

## [1.1.31] - 2024-04-08

### Added
- Added comprehensive JSDoc comments to key functions and classes
- Added detailed documentation for core modules and complex logic
- Added examples and parameter descriptions to important functions
- Added missing `sanitizeFilename` function implementation

### Changed
- Reorganized utility modules to reduce duplication and improve maintainability
- Consolidated model-related utilities in `src/clients/utils/`
- Consolidated API utilities in `src/utils/api/`
- Consolidated sanitization utilities in `src/utils/parsing/`
- Created clear directory structure with appropriate subdirectories
- Added index files for easy importing of utility modules

### Fixed
- Fixed failing tests in the sanitizer module
- Fixed import paths to match the new directory structure
- Updated test files to work with the new module organization

## [1.1.30] - 2024-04-07

### Fixed
- Fixed issue with Gemini 2.5 Pro model generating section headers in Hindi
- Updated all review prompts to explicitly specify English output
- Added language specification to ensure consistent output format
- Improved prompt clarity for all review types

## [1.1.29] - 2024-04-07

### Added
- Added `--listmodels` flag to display all available models
- Implemented comprehensive model listing utility
- Added detailed information about model availability based on API keys
- Included context window sizes and descriptions for all models
- Grouped models by provider for better organization

## [1.1.28] - 2024-04-07

### Added
- Added OpenAI API key configuration to .env.example
- Added direct OpenAI models to the model structure
- Updated API utilities to support OpenAI as a provider
- Added detailed documentation for OpenAI models
- Improved model selection with OpenAI support

## [1.1.27] - 2024-04-07

### Added
- Implemented provider-specific token and cost estimators
- Added separate estimators for Gemini, Anthropic, OpenAI, and OpenRouter
- Created an estimator factory for selecting the appropriate estimator
- Updated pricing information based on official sources
- Enhanced estimation output with provider information
- Improved model name handling with provider prefixes

## [1.1.26] - 2024-04-07

### Improved
- Added explicit check for `tsconfig.json` configuration in review prompts
- Enhanced TypeScript-specific features references with concrete examples
- Added comprehensive guidance on using the base prompt template
- Made checklist items more action-oriented for clearer guidance
- Improved context clarity with specific examples
- Implemented fixes based on AI code review feedback

## [1.1.25] - 2024-04-07

### Added
- Added support for Markdown (.md) files in code reviews
- Expanded file filtering to include documentation files
- Improved documentation file handling in the review process

## [1.1.24] - 2024-04-07

### Updated
- Made base prompts language-agnostic to support multiple programming languages
- Updated TypeScript-specific prompts with TypeScript-focused instructions
- Improved language-specific prompt organization
- Enhanced prompt loading to support language-specific directories
- Added TypeScript-specific best practices and patterns to prompts

## [1.1.23] - 2024-04-07

### Updated
- Updated token cost estimation with latest pricing from official sources
- Added support for new Gemini 2.5 models
- Added tiered pricing for models with context-dependent pricing
- Improved cost estimation accuracy for all supported models
- Enhanced model pricing documentation with source references

## [1.1.22] - 2024-04-06

### Added
- Added `--language` flag to specify the programming language for code reviews
- Created language-specific prompt directory structure
- Moved existing prompts to the TypeScript directory
- Added centralized prompt loading utility
- Improved prompt loading with language-specific paths and fallbacks
- Added language-specific instructions in prompts

## [1.1.21] - 2024-04-06

### Added
- Added `--estimate` flag to calculate token usage and cost estimates without performing a review
- Created new utility module for token estimation and pricing
- Implemented estimation logic based on file content and review type
- Added detailed output for token usage and cost estimates
- Improved token counting with review-specific overhead calculations

## [1.1.20] - 2024-04-06

### Improved
- Refactored code structure for better organization and maintainability
- Created dedicated modules for CLI argument parsing, file discovery, and review orchestration
- Simplified the main reviewCode.ts file to follow the Single Responsibility Principle
- Updated PROJECT.md with accurate environment variable documentation
- Added yargs for more robust command-line argument parsing
- Improved error handling and logging throughout the codebase

## [1.1.19] - 2024-04-06

### Added
- Added structured schema for code review output in interactive mode
- Implemented file-by-file processing for multiple files in interactive mode
- Added detailed JSON schema instructions in AI prompts
- Enhanced output formatting with code samples and actionable suggestions
- Improved parsing and display of structured review results

## [1.1.18] - 2024-04-06

### Improved
- Enhanced interactive mode to show ALL issues by default
- Removed the need to specify a priority filter in interactive mode
- Improved user experience by making all suggestions visible immediately
- Added better default behavior for interactive review sessions

## [1.1.17] - 2024-04-06

### Fixed
- Removed incorrect model validation warning in Anthropic client
- Fixed model validation to only check models against their respective providers
- Improved model validation logic to prevent misleading warnings
- Enhanced adapter-specific model validation

## [1.1.16] - 2024-04-06

### Fixed
- Removed incorrect preference for OpenRouter over other API providers
- Updated model selection logic to be truly model-agnostic
- Fixed misleading comments about API provider preferences
- Ensured consistent model selection based on environment variables

## [1.1.15] - 2024-04-06

### Improved
- Refactored review handlers into separate files for better code organization
- Created dedicated modules for each review type (consolidated, architectural, individual)
- Improved code maintainability by reducing file sizes and separating concerns
- Enhanced module structure for better testability and future extensions

## [1.1.14] - 2024-04-06

### Added
- Added centralized logging system with support for different log levels
- Added environment variable control for log level (AI_CODE_REVIEW_LOG_LEVEL)
- Added colored and formatted log output with timestamps
- Added support for module-specific loggers with prefixes

## [1.1.13] - 2024-04-06

### Fixed
- Added missing Anthropic API key check in getApiKeyType function
- Ensured consistent API key type detection across the codebase
- Fixed return type of getApiKeyType function to include 'Anthropic'

## [1.1.12] - 2024-04-06

### Fixed
- Improved issue extraction in interactive mode to handle different AI response formats
- Added more flexible section detection for priority levels
- Enhanced parsing of issue blocks to better identify file paths and code snippets

## [1.1.11] - 2024-04-06

### Fixed
- Fixed inconsistent model name display in console output
- Ensured the same model name is displayed in all messages
- Removed misleading "Trying to generate review with..." message

## [1.1.10] - 2024-04-06

### Fixed
- Removed misleading auto-fix functionality that attempted to automatically implement AI suggestions
- Updated prompt templates to clarify that the tool provides suggestions only, not automatic fixes
- Added clear messaging that the tool is not agentic and cannot automatically apply changes
- Improved documentation to set correct expectations about the tool's capabilities

## [1.1.9] - 2024-04-06

### Fixed
- Fixed inconsistent model name display in console output
- Added unit tests for model name display
- Ensured user-friendly model names are used in all output messages

## [1.1.8] - 2024-04-06

### Fixed
- Updated Gemini model names to use the correct API model names
- Added support for all current Gemini models (2.5, 2.0, and 1.5 series)
- Fixed model mapping to ensure compatibility with the Google AI API
- Updated documentation with accurate model names and descriptions

## [1.1.7] - 2024-04-06

### Fixed
- Fixed incorrect model name for Gemini Flash (restored to gemini-2.0-flash)
- Updated model name validation to support the correct Gemini models

## [1.1.6] - 2024-04-06

### Fixed
- Fixed model name format for Gemini 2.5 Pro
- Updated model name validation to support the latest Gemini models
- Improved error handling for model API calls

## [1.1.5] - 2024-04-06

### Fixed
- Fixed model adapter detection in Anthropic client
- Prevented Anthropic client from initializing when using other model types
- Improved error handling for model selection

## [1.1.4] - 2024-04-06

### Fixed
- Fixed bug where prompt templates were not found when installed as an npm package
- Updated path resolution to use the package directory instead of the current working directory

## [1.1.3] - 2024-04-06

### Changed
- Explicitly configured package to publish to npm registry
- Fixed installation issues in projects with React dependencies

## [1.1.2] - 2024-04-06

### Changed
- Published to npm registry for better compatibility
- Fixed installation issues in projects with React dependencies

## [1.1.1] - 2024-04-06

### Changed
- Added wildcard peer dependency for React to improve compatibility with React projects
- Fixed installation issues in projects with React dependencies

## [1.1.0] - 2024-04-06

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
- First stable release with NPM package support
- Support for OpenRouter API (Claude, GPT-4, and other models) via environment variables
- API connection testing to verify API keys before running reviews
- Support for reviewing entire directories and implementing fixes automatically
- Interactive mode for processing review results
- Automatic implementation of high priority fixes
- Prompt-based confirmation for medium and low priority fixes
- Memory-optimized processing for large codebases
- Improved file path handling and error recovery
- Custom context files support via AI_CODE_REVIEW_CONTEXT environment variable

### Changed
- Renamed to "ai-code-review" for NPM package
- Updated command structure to use `ai-code-review [target]`
- Changed environment variable prefix from CODE_REVIEW to AI_CODE_REVIEW
- Changed output directory from ai-code-review/[project-name] to ai-code-review-docs
- Improved output file naming with AI model and target name in the filename
- Added model configuration via environment variables
- Improved documentation for NPM package usage
- Reorganized prompt templates in the prompts/ directory
- Enhanced token counting and cost estimation for multiple AI models

## [0.9.0] - 2024-04-04

### Added
- Support for both `GOOGLE_AI_STUDIO_KEY` and `GOOGLE_GENERATIVE_AI_KEY` environment variables (prioritizing GOOGLE_AI_STUDIO_KEY)
- Detailed debugging information for environment variable loading
- Fallback to `.env` when `.env.local` is not found
- Support for including project documentation (README.md, PROJECT.md, PROGRESS.md) in the AI context
- New command-line option `--include-project-docs` (enabled by default)
- Support for reviewing the current project using 'self' or '.' as the project name
- Model testing utility to verify model availability
- Support for gemini-2.5-pro-exp-03-25 model using v1beta API
- Fallback to gemini-2.0-flash and gemini-1.5-pro models

### Changed
- Updated to use available Gemini AI models with robust fallback mechanism
- Added support for v1beta API to access the latest Gemini models
- Implemented proper API calls with configuration parameters based on official documentation
- Added safety settings and generation configuration for better results
- Improved environment variable loading with better error handling
- Updated command structure to use `yarn dev code-review [project] [file|directory]`
- Enhanced documentation in README.md, PROJECT.md, and .env.example

### Fixed
- Removed hardcoded API key from geminiClient.ts
- Fixed issues with loading environment variables from .env.local

## [0.8.0] - 2023-12-15

### Added
- Cost estimation for API usage (tokens and USD)
- Support for both Markdown and JSON output formats
- Mock responses when API key is not available

### Changed
- Enhanced architectural reviews to provide consolidated output
- Improved file filtering to respect .gitignore patterns
- Updated output directory structure to `ai-code-review/[project-name]/`

## [0.7.0] - 2023-11-10

### Added
- Support for different review types (architectural, quick-fixes, security, performance)
- Specialized prompt templates for each review type
- Option to include test files in reviews

### Changed
- Improved command-line interface with more options
- Enhanced error handling for API calls

## [0.6.0] - 2023-10-05

### Added
- Initial integration with Google Gemini API
- Basic code parsing for different file types
- File system utilities for handling files and directories

### Changed
- Migrated from prototype to TypeScript implementation
- Established project structure and architecture

## [0.5.0] - 2023-09-01

### Added
- Project documentation (README.md, PROJECT.md)
- Initial command-line interface design
- Basic project structure

### Changed
- Defined core components and responsibilities
- Established development practices and coding standards

## [0.1.0] - 2023-07-25

### Added
- Initial project setup
- Basic concept and requirements gathering
- Technology stack selection
