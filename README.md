# AI Code Review v4.3.0

A TypeScript-based tool for automated code reviews using Google's Gemini AI models, Anthropic Claude models (including Claude 4), OpenAI models, and OpenRouter API with LangChain integration for enhanced prompt management.

## What's New in v4.3.0

### New Features in v4.3.0
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

### Improvements in v4.3.0
- **Testing Strategy**: Comprehensive testing framework implementation
  - Achieved 96.8% test pass rate (482/498 tests)
  - 100% of test files passing (46/46)
  - Enhanced coverage configuration for core code
- **CI/CD Infrastructure**: Improved versioning and release automation
  - Better version management across the codebase
  - Enhanced build and deployment processes

## What's New in v4.2.0

### New Features in v4.2.0
- **Evaluation Review Type**: Comprehensive code review with developer skill assessment
  - Performs thorough code review PLUS developer assessment in one analysis
  - Analyzes coding skill level: Beginner/Intermediate/Advanced/Expert
  - Detects AI assistance likelihood and professional maturity
  - Includes meta coding quality indicators (documentation, testing, workflow)
  - Structured schema output for consistent evaluation results
- **Golang Language Support**: Comprehensive support for Go/Golang projects
  - Golang-specific prompt templates for all review types
  - Idiomatic Go pattern analysis and best practices
  - Go project type detection and file filtering
  - Concurrency, interface design, and error handling expertise
- **Enhanced Grading System**: Academic-style grading for consolidated reviews
  - A+ to F grading scale for code quality assessment
  - Multiple grade categories: functionality, code quality, documentation, testing
  - Integrated into multi-file review workflows

## What's New in v4.1.x

### Changed in v4.1.0
- **Deprecated** `--individual` flag (single-file behavior is automatic based on target)
- **Repurposed** `-i` as alias for `--interactive` mode for better user experience
- **Simplified** codebase by removing redundant individual file review logic

### Fixed in v4.0.2
- **🔧 Complete TypeScript Error Resolution**: Fixed all 15 TypeScript compilation errors that were preventing clean builds
  - Resolved parameter mismatches in TokenAnalysisOptions requiring reviewType and modelName
  - Fixed ReviewType casting issues with proper type assertions
  - Corrected function call signatures and missing object properties
- **🧹 Code Quality Improvements**: Achieved zero ESLint errors (373 warnings under configured limit)
  - Removed unused imports and variables across semantic analysis modules
  - Fixed type mismatches in ChunkGenerator and SemanticChunkingIntegration
  - Added proper SystemStats interface for better type safety
- **✅ Build Pipeline Stability**: Full compilation success with clean CI/CD pipeline
  - All TypeScript compilation now passes without errors
  - Build infrastructure fully operational and ready for production
  - Stable foundation for future v4.x releases

This release focuses on build stability and code quality, ensuring a solid foundation for the advanced semantic chunking features introduced in v4.0.0.

## Version History

### v4.0.2 (2025-01-21)
- **🔧 TypeScript Compilation**: Fixed all 15 TypeScript compilation errors in test files
- **🧹 Code Quality**: Eliminated all ESLint errors, cleaned up unused imports and variables
- **✅ Build Pipeline**: Achieved stable, error-free build process ready for production
- **🛠️ Type Safety**: Added proper interfaces and fixed type mismatches across codebase

### v4.0.0 (2025-06-04)
- **🧠 AI-Guided Semantic Chunking**: Revolutionary TreeSitter-based code analysis with 95%+ token reduction
- **🎯 Intelligent Strategies**: 5 chunking strategies optimized for different review types and code structures
- **⚡ Performance**: Solved context limit problems, reducing typical 196K+ token reviews to ~4K tokens
- **🔧 Environment Control**: New environment variables and CLI flags for semantic chunking control

### v3.2.15 (2025-06-01)
- **Re-added O3 Models**: Re-added support for OpenAI o3 and o3-mini reasoning models
- **Model Configuration**: Properly configured o3 models with max_completion_tokens parameter
- **Better Understanding**: The issue may have been with multi-pass consolidation, not the models themselves

### v3.2.14 (2025-06-01)
- **Multi-Pass Consolidation Fix**: Fixed issue where non-OpenAI providers were reviewing consolidation content as source code
- **Gemini Consolidation**: Improved consolidation logic for Gemini and other providers to properly merge multi-pass results
- **Better Error Handling**: Added fallback consolidation when AI consolidation fails

### v3.2.13 (2025-06-01)
- **Environment Override Fix**: Fixed project .env.local not overriding tool's environment variables
- **Project Priority**: Ensured project-level .env.local files properly override tool installation settings
- **Debug Logging**: Added detailed environment variable tracing to diagnose loading issues

### v3.2.12 (2025-06-01)
- **CLI Fix**: Fixed -m option not overriding environment variable
- **Environment Loading**: Improved priority order - CLI > project .env files > system env

### v3.2.11 (2025-06-01)
- **OpenAI Model Removal**: Removed o3 and o3-mini models per issue #44 (generating generic advice instead of analyzing code)
- **Test Updates**: Fixed model counts in tests after removal

### v3.2.10 (2025-05-29)
- **Documentation Updates**: Comprehensive README updates with full version history
- **Build Process**: Enhanced publishing checklist

### v3.2.9 (2025-05-28)
- **Claude 4 Model Support**: Added Anthropic's latest Claude 4 Opus and Sonnet models with 200K context windows
- **Fixed Provider Display**: Resolved issue where Anthropic models showed "Gemini" as provider
- **Improved Cost Estimation**: Fixed token/cost calculation accuracy and display clarity

### v3.2.8 (2025-05-21)
- **Critical Version Fix**: Fixed CLI reporting incorrect version (3.0.3 instead of actual version)
- **Version Management**: Added comprehensive version management documentation

### v3.2.7 (2025-05-22)
- **OpenAI Model Cleanup**: Removed non-working reasoning models (o3, o4-mini, o4-mini-high)
- **API Stability**: Cleaned up OpenAI client to only include publicly available models

### v3.2.6 (2025-05-22)
- **New OpenAI Models**: Added o3, o4-mini, and o4-mini-high reasoning models (later removed in v3.2.7)

### v3.2.5 - v3.2.3 (2025-05-22)
- **Type Safety Improvements**: Comprehensive TypeScript strictness improvements
- **Security Enhancements**: Replaced `any` types with proper interfaces
- **CI/CD Improvements**: Fixed all lint errors and test failures
- **Smart File Selection**: Added .eslintignore and tsconfig.json support

### v3.2.2 - v3.2.0 (2025-05-21)
- **JSON Configuration**: Added support for external config files
- **Framework Templates**: Added specialized templates for Angular, Vue, Django, Laravel
- **CI Integration**: Added `npm run ci:local` for pre-push validation
- **Handlebars Templates**: Migrated prompt system to Handlebars for better maintainability

### v3.1.0 (2025-05-20)
- **Enhanced Prompts**: Improved prompt templates with YAML metadata
- **Dependency Analysis**: Added dependency-cruiser and ts-prune integration
- **Multi-Language Support**: Added specialized prompts for Ruby/Rails, Python, PHP, Golang

## What's New in v3.0.2

### Improvements in v3.0.2

- **Better Default Behavior**: Automatically uses current directory when no target path is provided
- **Clearer Output**: Fixed issues with undefined review titles and model information
- **Improved Logging**: Added informative logs when using default paths
- **Fixed Multi-Pass Reviews**: Resolved JSON parsing errors in multi-pass reviews with code blocks
- **Enhanced Regex**: Improved patterns for extracting JSON from various code block formats
- **More Robust**: Enhanced error handling for missing data in review results

## What's New in v3.0.1

### Added in v3.0.1

- **Enhanced Review Structure**: Added grade section to OpenAI reviews
- **Consistent Formatting**: All model providers now use consistent review format with grades
- **Detailed Grading**: Added granular grade categories covering functionality, code quality, documentation, etc.

## What's New in v3.0.0

### Major Features in v3.0.0

- **Smart Multi-Pass Reviews**: Added intelligent confirmation for multi-pass reviews showing token usage, estimated passes, and cost
- **Improved CLI Experience**: Enhanced command-line interface with better organization and clearer documentation
- **Enhanced Model Support**: Updated support for the latest Gemini 2.5 Pro models and API specifications
- **Comprehensive Test Suite**: Added extensive test coverage for command-line options

### Added in v3.0.0

- **Multi-Pass Confirmation**: Added interactive confirmation before proceeding with multi-pass reviews
- **--no-confirm Flag**: Skip confirmation for multi-pass reviews when automated processing is needed
- **Cost Estimation**: Show detailed token usage and cost estimates before large multi-pass operations
- **Improved Documentation**: Better organized and more detailed command documentation

## What's New in v2.2.0

### Added in v2.2.0

- **Ruby/Rails Support**: Complete support for Ruby and Ruby on Rails projects
  - Specialized Ruby/Rails prompt templates for all review types
  - Rails-specific best practices and conventions
  - Ruby project type detection for framework-aware analysis
  - Support for Ruby-specific file extensions and directory structures
  - Comprehensive Rails security review capabilities
  - Performance analysis focused on ActiveRecord and Rails optimizations

- **Enhanced Reviews**: Added file list and comprehensive dependency security analysis
  - Automatically includes a list of all files analyzed in architectural reviews
  - Performs security vulnerability analysis on package dependencies
  - Detects technology stack (Next.js, Laravel, Django, Rails, etc.) for framework-specific analysis
  - Identifies security issues with severity ratings, CVE IDs, and recommended updates
  - Improves visibility into what was examined during the review
  - See [ENHANCED_REVIEW.md](ENHANCED_REVIEW.md), [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md), and [STACK_DETECTION.md](STACK_DETECTION.md) for usage details

## What's New in v2.1.1

### Fixes and Improvements in v2.1.1

- **Enhanced Metadata Headers**: Added comprehensive metadata headers to each review with model details, token usage, cost, tool version, and command options used to generate the review
  - Markdown reviews now include a detailed metadata table
  - JSON reviews contain a structured metadata object
  - Both formats capture timestamp, model information, token usage, and command details
- **Ruby/Rails Support**: Added specialized Ruby/Rails review capabilities
  - Language-specific prompt templates for more accurate Ruby/Rails reviews
  - Ruby/Rails project type detection for framework-aware analysis
  - Support for Ruby-specific file extensions (.rb, .rake, .gemspec, .ru, .erb)
  - Rails-specific directory exclusions for better performance
- **Version Display**: Added version display at startup for easier version identification
- **Enhanced Python Support**: Improved Python file detection and enhanced file globbing patterns
- **Better Path Display**: Fixed issue where review output did not show full directory path
- **Improved Installation**: Added global installation utilities to prevent conflicts
- **Troubleshooting**: Added `./scripts/fix-global-command.sh` script to quickly resolve global installation issues
- **Fixed Sanitization**: Improved content sanitization to properly preserve newlines and tabs

### Major Features in v2.1.0

- **Automatic Language Detection**: Automatically detects Ruby, Python, PHP, Golang, TypeScript, and JavaScript projects
- **Multi-Language Support**: Added specialized prompts for Ruby/Rails, Python, PHP, and Golang code review
- **Dependency Analysis**: Added dependency-cruiser integration for architectural reviews
- **Static Code Analysis**: Added ts-prune and eslint integration for unused code detection
- **Enhanced Prompts**: Improved prompt templates with standardized YAML metadata
- **TypeScript Focus**: Added specialized TypeScript architectural review prompt

### Major Features in v2.0.0
- **Stable Release**: Version 2.0.0 marks the first stable release with all major features complete
- **LangChain Integration**: Added LangChain for enhanced prompt management, templating, and chain capabilities
- **New Review Types**: Added 'unused-code' review type to identify and suggest removal of dead code
- **Improved Prompts**: Enhanced prompt templates with LangChain, including few-shot learning and structured output
- **Structured Schemas**: Created detailed Zod schemas for all review types to enable more structured and consistent output
- **Enhanced TypeScript Support**: Added TypeScript-specific templates and analyzers for better static analysis
- **Model Testing**: Added new commands to test individual models (`model-test`) and verify all models on build
  - Test specific models with `ai-code-review model-test gemini:gemini-2.5-pro`
  - Test all models from a provider with `ai-code-review model-test -p gemini`
  - Test all available models with `ai-code-review model-test --all`
  - Verify models during build with `ai-code-review test-build`

### Other Improvements

- **Fixed Unit Tests**: Ensured compatibility with the latest dependencies
- **Improved Jest Configuration**: Added proper handling for ESM modules
- **Removed Prettier Checking**: Improved developer experience by removing Prettier from the test process
- **Fixed ESLint Issues**: Added p-limit dependency to fix ESLint errors
- **Model Listing Feature**: Added `--models` flag to list all supported models with their configuration names
- **Improved Error Handling**: Enhanced error handling and recovery mechanisms
- **Debug Logging Control**: Suppressed DEBUG logging messages in production builds
- **Performance Optimizations**: Improved memory usage and processing speed
- **Build Verification**: Added automatic model testing during build process

## What's New in v1.3.2

- **Fixed API Client Selection**: Fixed bug in dynamic imports for API clients
- **Fixed Anthropic API Version**: Updated Anthropic API version to use the correct version

## What's New in v1.3.1

- **Simplified Model Names**: Removed version-specific details from model names for better usability
- **Improved Model Management**: Derived model lists from a single source of truth
- **Structured Output**: Added structured JSON output format for code reviews
- **Enhanced Formatting**: Improved formatting of review results with priority-based grouping

## What's New in v1.3.0

- **Structured Output Format**: Added structured JSON output for code reviews
- **JSON Parsing**: Added support for parsing JSON responses wrapped in code blocks
- **New Type Definitions**: Added structured review type definitions
- **Improved Formatting**: Added formatStructuredReviewAsMarkdown function

## What's New in v1.2.0

- **Multi-Provider Support**: Added support for multiple AI providers (Google, Anthropic, OpenAI, OpenRouter)
- **Token and Cost Estimation**: Implemented comprehensive token and cost estimation for all supported models
- **Model Listing**: Added `--listmodels` flag to display all available models
- **Improved Code Organization**: Reorganized utility modules to reduce duplication and improve maintainability
- **Enhanced Documentation**: Added detailed JSDoc comments to key functions and classes
- **Bug Fixes**: Fixed various issues including language output problems and failing tests

## Overview

This tool analyzes code from specified files or directories in sibling projects and generates structured code evaluations. It leverages Google's Gemini AI models, Anthropic Claude models, and OpenRouter API to provide insightful feedback on code quality, best practices, and potential improvements. With support for multiple AI models, you can choose the best model for your specific needs.

## Features

- **Multiple Review Types**: Focus on different aspects of code quality:
  - **quick-fixes**: Fast issue identification and recommendations
  - **architectural**: Deep structural analysis and design patterns
  - **security**: Security vulnerability detection and remediation
  - **performance**: Performance bottleneck identification
  - **unused-code**: Dead code detection and cleanup recommendations
  - **focused-unused-code**: Focused unused code analysis
  - **code-tracing-unused-code**: Code tracing for unused code detection
  - **improved-quick-fixes**: Enhanced quick fixes with better suggestions
  - **consolidated**: Consolidated review combining multiple approaches
  - **evaluation**: Comprehensive code evaluation
  - **extract-patterns**: Code pattern analysis and best practice suggestions
- **Interactive Mode**: Process review results interactively, implementing fixes based on priority
- **Automatic Fixes**: Automatically implement high priority fixes without manual intervention
- **Prompt-Based Fixes**: Confirm and apply medium and low priority fixes with user input
- **Directory Support**: Review entire directories and their subdirectories in one command
- **Consolidated Reviews**: Generate a single comprehensive review for multiple files
- **Project Context**: Include project documentation in the review context
- **Multiple AI Models**: Support for Google's Gemini models, Anthropic Claude models, and OpenRouter API (Claude, GPT-4, etc.)
- **Model Listing**: List all available models with the `--listmodels` flag
- **Token and Cost Estimation**: Estimate token usage and cost with the `--estimate` flag
- **Customizable**: Configure review types, output formats, and prompt templates
- **GitHub Projects Integration**: Sync PROJECT.md content with GitHub Projects for better project management
- **Memory Optimized**: Process large codebases efficiently with optimized memory usage
- **Error Recovery**: Robust error handling with graceful recovery
- **Code Focus**: Analyzes executable code files only, excluding configuration and documentation files

## Security Best Practices

**⚠️ IMPORTANT: Never commit real API keys to your repository!**

- Always use environment variables for API keys
- Add `.env.local` to your `.gitignore` file
- Use placeholder values in example files (like `your_api_key_here`)
- Review code before committing to ensure no secrets are included
- Consider using secret scanning tools in your CI/CD pipeline

## Quick Start

**New to AI Code Review?** Check out our [Quick Start Guide](docs/QUICK_START.md) for a 5-minute setup.

## Installation

### Global Installation

```bash
# Using pnpm (recommended)
pnpm add -g @bobmatnyc/ai-code-review

# Using npm (alternative)
npm install -g @bobmatnyc/ai-code-review
```

### Local Installation

```bash
# Using pnpm (recommended)
pnpm add -D @bobmatnyc/ai-code-review

# Using npm (alternative)
npm install --save-dev @bobmatnyc/ai-code-review
```

### API Key Setup

Create a `.env.local` file in your project root with your API keys:

```
# Required: Model selection
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
# or
# AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-opus
# or
# AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus

# Required: API key for the selected model type
# For Google Gemini models
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# For OpenRouter models (Claude, GPT-4, etc.)
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# For direct Anthropic Claude models
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

You can get API keys from:
- [Google AI Studio](https://makersuite.google.com/) for Gemini models
- [OpenRouter](https://openrouter.ai/) for access to Claude, GPT-4, and other models
- [Anthropic](https://console.anthropic.com/) for direct access to Claude models

## Usage

### Command Line

```bash
# Global installation
ai-code-review [target] [options]

# Local installation with pnpm
pnpm exec ai-code-review [target] [options]

# Local installation with npm
npx ai-code-review [target] [options]

# Note: The tool only works within the current project
# If no target is specified, it defaults to the current directory (".")
```

### Examples

```bash
# Review a single file in the current project
ai-code-review src/index.ts

# Review the current directory (two equivalent commands)
ai-code-review
ai-code-review .

# Review an entire directory with interactive mode
ai-code-review src/utils --interactive

# Perform an architectural review with file list and dependency security analysis
ai-code-review src --type architectural

# Review a Ruby on Rails application with Rails-specific analysis
ai-code-review app --type architectural --language ruby

# Find security vulnerabilities in a Rails application with package security analysis
ai-code-review app --type security
ai-code-review app/controllers --type security --language ruby

# Find unused code that can be safely removed
ai-code-review src --type unused-code

# Use specific review types
ai-code-review src --type focused-unused-code
ai-code-review src --type code-tracing-unused-code
ai-code-review src --type improved-quick-fixes
ai-code-review src --type consolidated
ai-code-review src --type evaluation
ai-code-review src --type extract-patterns

# Include test files in the review
ai-code-review src --include-tests

# Specify output format (markdown or json)
ai-code-review src/index.ts --output json

# Specify output directory for review results
ai-code-review src --output-dir ./reviews

# Use specific model
ai-code-review src --model anthropic:claude-4-sonnet

# List all available models
ai-code-review --listmodels

# List all supported models with their configuration names
ai-code-review --models

# Test a specific model
ai-code-review test-model --model gemini:gemini-2.5-pro

# Test all models for a specific provider
ai-code-review test-model --provider anthropic

# Test all available models
ai-code-review test-model --all

# Estimate token usage and cost without performing a review
ai-code-review src/utils --estimate

# Skip confirmation for multi-pass reviews
ai-code-review src/utils --no-confirm

# Use multi-pass review for large codebases
ai-code-review src --multi-pass

# Force single-pass review
ai-code-review src --force-single-pass

# Test API connections before review
ai-code-review src --test-api

# Enable interactive mode
ai-code-review src --interactive

# Check the version of the tool
ai-code-review --version

# Show version information
ai-code-review --show-version

# Run in debug mode for additional logging
ai-code-review src/utils --debug

# Specify programming language and framework
ai-code-review src --language typescript --framework next.js

# Use configuration file
ai-code-review src --config .ai-code-review.yaml
```

### Options

```
Options:
  # Basic Options
  -t, --type <type>       Type of review (choices: quick-fixes, architectural, security, performance, unused-code, focused-unused-code, code-tracing-unused-code, improved-quick-fixes, consolidated, evaluation, extract-patterns) (default: "quick-fixes")
  -o, --output <format>   Output format (markdown, json) (default: "markdown")
  --output-dir <dir>      Directory to save review output
  -m, --model <model>     Model to use for the review (format: provider:model) (default: "gemini:gemini-2.5-pro")
  -v, --version           Output the current version
  --show-version          Show version information (default: false)
  -h, --help              Display help information
  --debug                 Enable debug logging (default: false)

  # Processing Options
  --include-tests         Include test files in the review (default: false)
  --include-project-docs  Include project documentation in the review context (default: true)
  --include-dependency-analysis Include dependency analysis in the review (default: false)
  --enable-semantic-chunking Enable semantic chunking for intelligent code analysis (default: true)
  
  # Execution Options
  -i, --interactive       Run in interactive mode, processing review results in real-time (default: false)
  --test-api              Test API connections before running the review (default: false)
  --estimate              Estimate token usage and cost without performing the review (default: false)
  
  # Multi-pass Options
  --multi-pass            Use multi-pass review for large codebases (default: false)
  --force-single-pass     Force single-pass review even if token analysis suggests multiple passes are needed (default: false)
  --context-maintenance-factor Context maintenance factor for multi-pass reviews (0-1) (default: 0.15)
  
  # Configuration Options
  --no-confirm            Skip confirmation prompts (default: false)
  --language <language>   Specify the programming language (auto-detected if not specified)
  --framework <framework> Specify the framework (auto-detected if not specified)
  --config <path>         Path to JSON configuration file
  
  # Model and Information Options
  --listmodels            List available models based on configured API keys (default: false)
  --models                List all supported models and their configuration names (default: false)
  
  # API Key Options
  --google-api-key <key>  Google API key for Gemini models
  --openrouter-api-key <key> OpenRouter API key
  --anthropic-api-key <key> Anthropic API key for Claude models
  --openai-api-key <key>  OpenAI API key for GPT models
```

### Model Testing Options

```
Command: test-model
Description: Test the configured model with a simple prompt

Options:
  -m, --model <model>     Model to test (format: provider:model) (default: "gemini:gemini-2.5-pro")
  --google-api-key <key>  Google API key for Gemini models
  --openrouter-api-key <key> OpenRouter API key
  --anthropic-api-key <key> Anthropic API key for Claude models
  --openai-api-key <key>  OpenAI API key for GPT models
  -h, --help              Display help information

Command: test-build
Description: Test the build by running a simple command

Options:
  -h, --help              Display help information
```

## Output

Review results are stored in the `ai-code-review-docs/` directory. For consolidated reviews, the output follows this naming pattern:

```
ai-code-review-docs/[ai-model]-[review-type]-[file-or-directory-name]-[date].md
```

For example:

```
ai-code-review-docs/openai-gpt-4o-quick-fixes-review-src-2024-04-06.md
ai-code-review-docs/gemini-1.5-pro-architectural-review-src-utils-2024-04-06.md
```

When reviewing a single file, the output filename will include the specific file name:

```
ai-code-review-docs/[ai-model]-[review-type]-[file-name]-[date].md
```

### Review Output Format

Each review includes comprehensive metadata in a standardized format:

#### Markdown Format

```markdown
# Code Review: /path/to/reviewed/file

> **Review Type**: quick-fixes
> **Generated**: April 18, 2025, 3:45:27 PM
> **Reviewed**: /path/to/reviewed/file

---

## Metadata
| Property | Value |
|----------|-------|
| Review Type | quick-fixes |
| Generated At | April 18, 2025, 3:45:27 PM EDT |
| Model Provider | OpenAI |
| Model Name | gpt-4o |
| Input Tokens | 12,345 |
| Output Tokens | 2,456 |
| Total Tokens | 14,801 |
| Estimated Cost | $0.0295 |
| Tool Version | 2.1.1 |
| Command Options | --type=quick-fixes --output=markdown |

[Review content here...]

---

*Generated by Code Review Tool using OpenAI (gpt-4o)*
```

#### JSON Format

When using `--output json`, the review includes a structured metadata object:

```json
{
  "filePath": "/path/to/reviewed/file",
  "reviewType": "quick-fixes",
  "content": "...",
  "timestamp": "2025-04-18T15:45:27.123Z",
  "modelUsed": "openai:gpt-4o",
  "toolVersion": "2.1.1",
  "commandOptions": "--type=quick-fixes --output=json",
  "meta": {
    "model": {
      "provider": "OpenAI",
      "name": "gpt-4o",
      "fullName": "OpenAI (gpt-4o)"
    },
    "review": {
      "type": "quick-fixes",
      "path": "/path/to/reviewed/file",
      "generatedAt": "2025-04-18T15:45:27.123Z",
      "formattedDate": "April 18, 2025, 3:45:27 PM EDT"
    },
    "cost": {
      "inputTokens": 12345,
      "outputTokens": 2456,
      "totalTokens": 14801,
      "estimatedCost": 0.0295,
      "formattedCost": "$0.0295"
    },
    "tool": {
      "version": "2.1.1",
      "commandOptions": "--type=quick-fixes --output=json"
    }
  }
}
```

This enhanced metadata makes it easier to track and analyze reviews, understand the context in which they were generated, and reproduce the same review conditions if needed.

## Configuration

### Customizing Prompts

You can customize the review process in several ways:

#### Prompt Templates

The tool comes with built-in prompt templates in the `prompts/templates/` directory:

- `quick-fixes-review.md` - For quick fixes reviews
- `security-review.md` - For security reviews
- `architectural-review.md` - For architectural reviews
- `performance-review.md` - For performance reviews

#### Custom Prompt Templates

You can create your own prompt templates and use them with the `--prompt` flag. Custom templates should include metadata in YAML format at the top of the file:

```markdown
---
name: Custom Security Review
description: A custom prompt template for security-focused code reviews
version: 1.0.0
author: Your Name
reviewType: security
language: typescript
tags: security, custom
---

# Security Code Review

Please review the following code for security vulnerabilities:

{{LANGUAGE_INSTRUCTIONS}}

## Output Format

Please provide your findings in the following format:

1. **Vulnerability**: Description of the vulnerability
2. **Severity**: High/Medium/Low
3. **Location**: File and line number
4. **Recommendation**: How to fix the issue

{{SCHEMA_INSTRUCTIONS}}
```

#### Prompt Fragments

You can inject custom fragments into the prompt with the `--prompt-fragment` flag:

```bash
ai-code-review src/index.ts --prompt-fragment "Focus on performance issues"
```

You can also specify the position of the fragment with the `--prompt-fragment-position` flag (start, middle, or end):

```bash
ai-code-review src/index.ts --prompt-fragment "Focus on security issues" --prompt-fragment-position start
```

#### Model-Specific Strategies

You can use model-specific prompt strategies with the `--prompt-strategy` flag:

```bash
ai-code-review src/index.ts --prompt-strategy anthropic
```

Available strategies:
- `anthropic` - Optimized for Claude models
- `gemini` - Optimized for Gemini models
- `openai` - Optimized for GPT models
- `langchain` - Uses LangChain for enhanced prompt management

The LangChain strategy is particularly useful for complex reviews that benefit from:
- Structured output with Zod schemas
- Few-shot learning with examples
- Chain-based reasoning

```bash
# Use LangChain for an unused code review
ai-code-review src/utils --type unused-code --prompt-strategy langchain

# Use LangChain for quick fixes with enhanced prompts
ai-code-review src/components --type quick-fixes --prompt-strategy langchain
```

### Separate Writer Model for Consolidation

For multi-pass reviews and report consolidation, you can specify a separate model for the final report generation. This is useful for optimizing costs by using a more powerful model for code analysis and a cheaper/faster model for report writing.

#### Using Writer Model

There are two ways to specify a writer model:

1. **Via Command Line:**
   ```bash
   # Use Claude Opus for analysis, Haiku for report writing
   ai-code-review . --model anthropic:claude-3-opus --writer-model anthropic:claude-3-haiku
   
   # Use GPT-4 for analysis, GPT-4o-mini for consolidation
   ai-code-review . --model openai:gpt-4 --writer-model openai:gpt-4o-mini
   ```

2. **Via Environment Variable:**
   ```bash
   # In your .env.local file
   AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus
   AI_CODE_REVIEW_WRITER_MODEL=anthropic:claude-3-haiku
   ```

#### Benefits

- **Cost Optimization**: Report consolidation primarily involves summarization and formatting, not deep code analysis. A cheaper model can handle this effectively with 10-20x cost savings.
- **Performance**: Faster models can speed up the consolidation phase without sacrificing quality.
- **Flexibility**: Use the best model for each task - powerful models for understanding code, efficient models for writing reports.

#### How It Works

1. The primary model (specified by `--model` or `AI_CODE_REVIEW_MODEL`) performs the code analysis
2. For multi-pass reviews, each pass uses the primary model
3. The writer model (specified by `--writer-model` or `AI_CODE_REVIEW_WRITER_MODEL`) consolidates the results into the final report
4. If no writer model is specified, the primary model is used for all tasks

### GitHub Projects Integration

You can sync GitHub projects to local directory for better project management:

```bash
# Sync GitHub projects to local directory
ai-code-review sync-github-projects --token <token> --org <org> --output-dir ./projects
```

### Available Subcommands

1. **`ai-code-review code-review [target]`** - Run a code review on the specified target (default)
2. **`ai-code-review test-model`** - Test the configured model with a simple prompt
3. **`ai-code-review test-build`** - Test the build by running a simple command
4. **`ai-code-review sync-github-projects`** - Sync GitHub projects to local directory
5. **`ai-code-review generate-config`** - Generate a sample configuration file

#### sync-github-projects Options
- **`--token <token>`** - GitHub token [required]
- **`--org <org>`** - GitHub organization [required]
- **`--output-dir <dir>`** - Output directory (default: "./github-projects")

#### generate-config Options
- **`-o, --output <path>`** - Output file path for the configuration
- **`-f, --format <format>`** - Configuration file format (choices: yaml, json) (default: "yaml")
- **`--force`** - Overwrite existing configuration file (default: false)

Generate a sample configuration file:
```bash
# Generate YAML configuration
ai-code-review generate-config --output .ai-code-review.yaml --format yaml

# Generate JSON configuration
ai-code-review generate-config --output .ai-code-review.json --format json
```

### Environment Variables

All environment variables use the `AI_CODE_REVIEW_` prefix:

```bash
# API Keys
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here

# Model Configuration
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
AI_CODE_REVIEW_WRITER_MODEL=openai:gpt-4o-mini

# Debug Options
AI_CODE_REVIEW_LOG_LEVEL=info
```

#### Global Installation

When installed globally, you can use the setup script to create your `.env.local` file:

```bash
# If installed via pnpm
pnpm exec @bobmatnyc/ai-code-review/scripts/setup-env.js

# If installed via npm
npx @bobmatnyc/ai-code-review/scripts/setup-env.js

# If installed via Homebrew
node /opt/homebrew/lib/node_modules/@bobmatnyc/ai-code-review/scripts/setup-env.js
```

The script will guide you through setting up your API keys and will place the `.env.local` file in the correct directory.

#### Quick Fix for Environment Errors in Global Installation

If you're seeing errors about missing `.env` or `.env.local` files when running the globally installed tool, use this quick fix script:

```bash
# Download and run the fix script
curl -O https://raw.githubusercontent.com/bobmatnyc/ai-code-review/develop/scripts/global-env-fix.js
node global-env-fix.js

# You may need to run with sudo if permission errors occur
sudo node global-env-fix.js
```

This script will patch the global installation to avoid errors when environment files are missing and help you set up your API keys properly.

Alternatively, you can manually place your `.env.local` file in one of these locations:

1. If you installed via npm:
   ```
   /path/to/global/node_modules/@bobmatnyc/ai-code-review/.env.local
   ```

2. If you installed via Homebrew:
   ```
   /opt/homebrew/lib/node_modules/@bobmatnyc/ai-code-review/.env.local
   ```

3. Or, you can set the `AI_CODE_REVIEW_DIR` environment variable to specify the directory containing your `.env.local`:
   ```bash
   export AI_CODE_REVIEW_DIR=/path/to/your/config/directory
   ```

> **Important**: The tool first looks for `.env.local` in its own installation directory, not in the target project being reviewed. This allows you to keep your API keys in one place and review any project without modifying it.

# Model configuration
# Specify which model to use for code reviews using the format provider:model
# The tool will automatically map this to the correct API model name
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
# or
# AI_CODE_REVIEW_MODEL=openai:gpt-4o
# or
# AI_CODE_REVIEW_MODEL=anthropic:claude-4-opus

# Optionally specify a different model for report consolidation/writing
# This allows using a cheaper/faster model for the final report generation
AI_CODE_REVIEW_WRITER_MODEL=openai:gpt-4o-mini

# See the Supported Models section for all available models and their API mappings

# Custom context files
# Comma-separated list of file paths to include as context for the code review
AI_CODE_REVIEW_CONTEXT=README.md,docs/architecture.md,src/types.ts

# See the Supported Models section below for all available models
```

> Note: For backward compatibility, the tool also supports the old `CODE_REVIEW` prefix for environment variables, but the `AI_CODE_REVIEW` prefix is recommended.

## Supported Models

### Model Mapping System

The tool uses a centralized model mapping system that automatically converts user-friendly model names to provider-specific API formats. This ensures that you can use consistent model names across different providers without worrying about the specific API requirements of each provider.

For example, when you specify `anthropic:claude-3-opus` as your model, the tool automatically maps this to the correct API model name `claude-3-opus-20240229` when making requests to the Anthropic API.

The model mapping system provides the following benefits:

- **Consistent Model Names**: Use the same model naming convention across all providers
- **Automatic API Format Conversion**: No need to remember provider-specific model formats
- **Centralized Configuration**: All model mappings are defined in a single location for easy maintenance
- **Extensible**: New models can be added easily without changing the core code

You can see all available models and their mappings by running `ai-code-review --listmodels`.

### Google Models

| Model Name | Description | Context Window | API Key Required |
|------------|-------------|----------------|------------------|
| `gemini:gemini-2.5-pro` | Production-ready advanced reasoning model **(DEFAULT)** | 1M tokens | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-2.5-pro-preview` | Most advanced reasoning and multimodal capabilities | 1M tokens | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-2.0-flash` | Fast, efficient model with strong performance | 1M tokens | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-2.0-flash-lite` | Ultra-fast, cost-efficient model | 1M tokens | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-1.5-pro` | Previous generation large context model | 1M tokens | `AI_CODE_REVIEW_GOOGLE_API_KEY` |
| `gemini:gemini-1.5-flash` | Previous generation fast model | 1M tokens | `AI_CODE_REVIEW_GOOGLE_API_KEY` |

### OpenRouter Models

| Model Name | Description | Context Window | API Key Required |
|------------|-------------|----------------|------------------|
| `openrouter:anthropic/claude-4-opus` | Access Claude 4 Opus through OpenRouter | 200K tokens | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:anthropic/claude-4-sonnet` | Access Claude 4 Sonnet through OpenRouter | 200K tokens | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:openai/gpt-4o` | Access GPT-4o through OpenRouter | 128K tokens | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:google/gemini-2.5-pro` | Access Gemini 2.5 Pro through OpenRouter | 1M tokens | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:meta-llama/llama-3.3-70b` | Open source alternative | 131K tokens | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |
| `openrouter:anthropic/claude-3-haiku` | Fast, affordable model | 200K tokens | `AI_CODE_REVIEW_OPENROUTER_API_KEY` |

### Anthropic Models

| Model Name | Description | Context Window | API Key Required |
|------------|-------------|----------------|------------------|
| `anthropic:claude-4-opus` | Most capable Claude model with superior reasoning | 200K tokens | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |
| `anthropic:claude-4-sonnet` | Balanced performance and cost for code review | 200K tokens | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |
| `anthropic:claude-3.5-sonnet` | Enhanced Claude 3 with improved capabilities | 200K tokens | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |
| `anthropic:claude-3-opus` | DEPRECATED: Migrate to Claude 4 Opus | 200K tokens | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |
| `anthropic:claude-3-sonnet` | Previous generation balanced model | 200K tokens | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |
| `anthropic:claude-3.5-haiku` | Fast, cost-effective model | 200K tokens | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |
| `anthropic:claude-3-haiku` | DEPRECATED: Migrate to Claude 3.5 Haiku | 200K tokens | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` |

### OpenAI Models

| Model Name | Description | Context Window | API Key Required |
|------------|-------------|----------------|------------------|
| `openai:gpt-4o` | Multimodal model with vision capabilities | 128K tokens | `AI_CODE_REVIEW_OPENAI_API_KEY` |
| `openai:gpt-4.1` | Latest GPT-4 with improved reasoning | 128K tokens | `AI_CODE_REVIEW_OPENAI_API_KEY` |
| `openai:gpt-4.5` | DEPRECATED: Migrate to GPT-4.1 | 128K tokens | `AI_CODE_REVIEW_OPENAI_API_KEY` |
| `openai:gpt-4-turbo` | Fast GPT-4 variant | 128K tokens | `AI_CODE_REVIEW_OPENAI_API_KEY` |
| `openai:gpt-3.5-turbo` | Fast, cost-effective model | 16K tokens | `AI_CODE_REVIEW_OPENAI_API_KEY` |
| `openai:o3` | Advanced reasoning model | 100K tokens | `AI_CODE_REVIEW_OPENAI_API_KEY` |
| `openai:o3-mini` | Efficient reasoning model | 60K tokens | `AI_CODE_REVIEW_OPENAI_API_KEY` |

### Extending the Model Mapping System

If you need to add support for a new model or update an existing model mapping, you can modify the `MODEL_MAP` in `src/clients/utils/modelMaps.ts`. The model mapping system uses a simple key-value structure where the key is the user-friendly model name (e.g., `anthropic:claude-3-opus`) and the value contains the API-specific details:

```typescript
export const MODEL_MAP: Record<string, ModelMapping> = {
  'anthropic:claude-3-opus': {
    apiName: 'claude-3-opus-20240229',  // The actual API model name
    displayName: 'Claude 3 Opus',       // Human-readable name
    provider: 'anthropic',              // Provider identifier
    contextWindow: 200000,              // Context window size in tokens
    description: 'Claude 3 Opus - Anthropic\'s most powerful model',
    apiKeyEnvVar: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY'  // Required API key
  },
  // Add more models here...
};
```

After adding a new model mapping, you can use it by setting the `AI_CODE_REVIEW_MODEL` environment variable to the new model key.

### Model Mapping Utility Functions

The model mapping system provides several utility functions that you can use in your code:

```typescript
// Get the API name for a model key
const apiName = getApiNameFromKey('anthropic:claude-3-opus');
// Returns: 'claude-3-opus-20240229'

// Get the full model mapping
const modelMapping = getModelMapping('anthropic:claude-3-opus');
// Returns: { apiName: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus', ... }

// Get all models for a provider
const anthropicModels = getModelsByProvider('anthropic');
// Returns: ['anthropic:claude-3-opus', 'anthropic:claude-3-sonnet', ...]

// Parse a model string
const { provider, modelName } = parseModelString('anthropic:claude-3-opus');
// Returns: { provider: 'anthropic', modelName: 'claude-3-opus' }

// Get the full model key from provider and model name
const fullModelKey = getFullModelKey('anthropic', 'claude-3-opus');
// Returns: 'anthropic:claude-3-opus'
```

These utility functions make it easy to work with the model mapping system in your code.

## Code Tracing for Unused Code Detection

The tool includes a powerful code tracing feature for identifying unused code with high confidence. This feature uses a multi-pass approach to analyze code dependencies and references, providing detailed evidence for each element identified as unused.

### How Code Tracing Works

The code tracing feature follows a comprehensive approach:

1. **Entry Point & Dependency Mapping**: Identifies all entry points to the codebase and maps module dependencies
2. **Reference Tracing**: Finds all references to each code element throughout the codebase
3. **Verification & Confidence Assessment**: Evaluates evidence and assigns confidence levels (high, medium, low)

### Using Code Tracing

To enable code tracing:

```bash
# Basic unused code detection
ai-code-review src --type unused-code

# Enhanced detection with deep code tracing
ai-code-review src --type unused-code --trace-code
```

### Code Tracing Benefits

- **High Confidence Detection**: Thorough evidence collection ensures recommendations are reliable
- **Detailed Evidence**: Each element includes complete evidence chain showing why it's unused
- **Risk Assessment**: Evaluates potential risks of removing each element
- **Removal Scripts**: Automatically generates scripts for safely removing unused code
- **Edge Case Detection**: Considers special cases like dynamic imports and reflection patterns

### Confidence Levels

Code tracing assigns confidence levels to each finding:

- **High**: Clear evidence the element is never referenced (safe to remove)
- **Medium**: Likely unused but with some uncertainty (verify before removing)
- **Low**: Possibly unused but with significant uncertainty (requires further investigation)

## Testing API Connections

You can test your API connections to verify that your API keys are valid and working correctly:

```bash
# Test the configured model
ai-code-review test-model

# Test a specific model
ai-code-review test-model --model anthropic:claude-4-sonnet

# Test API connections before running a review
ai-code-review src --test-api
```

This will test connections to the configured API providers and provide detailed feedback on the status of each connection.

## Requirements

- Node.js >= 16.0.0
- Google Generative AI API key or OpenRouter API key

## License

MIT
