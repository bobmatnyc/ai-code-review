# Version History

This document tracks the version history of the Code Review Tool.

## [0.9.0] - 2024-04-05

### Added
- Support for both `GOOGLE_GENERATIVE_AI_KEY` and `GOOGLE_AI_STUDIO_KEY` environment variables
- Detailed debugging information for environment variable loading
- Fallback to `.env` when `.env.local` is not found

### Changed
- Updated to use Gemini 2.5 Max model instead of Gemini 1.5 Pro
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
- Updated output directory structure to `/review/[project-name]/`

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
