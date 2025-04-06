# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-04-05

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
- Standardized environment variable naming with CODE_REVIEW prefix

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
