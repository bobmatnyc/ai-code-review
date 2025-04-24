# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
