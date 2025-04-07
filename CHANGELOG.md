# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
