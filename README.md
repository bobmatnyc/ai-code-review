# AI Code Review v3.2.10

A TypeScript-based tool for automated code reviews using Google's Gemini AI models, Anthropic Claude models (including Claude 4), OpenAI models, and OpenRouter API with LangChain integration for enhanced prompt management.

## What's New in v3.2.9

### Added in v3.2.9
- **Claude 4 Model Support**: Added support for Anthropic's latest Claude 4 models
  - **Claude 4 Opus** (`anthropic:claude-4-opus`): Most capable model with 200K context window ($15/$75 per 1M tokens)
  - **Claude 4 Sonnet** (`anthropic:claude-4-sonnet`): Balanced model with 200K context window ($3/$15 per 1M tokens)
- **Fixed Provider Display**: Corrected issue where Anthropic models incorrectly showed "Gemini" as the provider
- **Improved Cost Calculations**: Fixed cost estimation to use correct API model identifiers
- **Enhanced Token Display**: Shows detailed input/output token breakdown in cost estimates
- **Better Multi-Pass Clarity**: Improved display of token usage in multi-pass reviews

See the [full release notes](docs/v3.2.9_release.md) and [Claude 4 quick reference](docs/claude-4-quick-reference.md) for details.

## Version History

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
- **Multi-Language Support**: Added specialized prompts for Ruby/Rails, Python, PHP

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

- **Automatic Language Detection**: Automatically detects Ruby, Python, PHP, TypeScript, and JavaScript projects
- **Multi-Language Support**: Added specialized prompts for Ruby/Rails, Python, and PHP code review
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
  - **Architectural**: Holistic review of code structure, APIs, and package organization
  - **Quick Fixes**: Identify low-hanging fruit and easy improvements
  - **Security**: Focus on security vulnerabilities and best practices
  - **Performance**: Identify performance bottlenecks and optimization opportunities
  - **Unused Code**: Identify and suggest removal of dead code, redundant functions, and unused variables with deep code tracing capabilities
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

## Installation

### Global Installation

```bash
npm install -g @bobmatnyc/ai-code-review
```

### Local Installation

```bash
npm install --save-dev @bobmatnyc/ai-code-review
```

### API Key Setup

Create a `.env.local` file in your project root with your API keys:

```
# Required: Model selection
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
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

# Local installation
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

# Use deep code tracing for high-confidence unused code detection
ai-code-review src --type unused-code --trace-code

# Use static analysis tools for unused code detection
ai-code-review src --type unused-code --use-ts-prune --use-eslint

# Use LangChain for enhanced prompt management
ai-code-review src --type quick-fixes --prompt-strategy langchain

# Include test files in the review
ai-code-review src --include-tests

# Specify output format (markdown or json)
ai-code-review src/index.ts --output json

# Disable including project documentation in the context (enabled by default)
ai-code-review src/index.ts --no-include-project-docs

# List all available models
ai-code-review --listmodels

# List all supported models with their configuration names
ai-code-review --models

# Test a specific model
ai-code-review model-test gemini:gemini-1.5-pro

# Test all models for a specific provider
ai-code-review model-test -p anthropic

# Test all available models
ai-code-review model-test --all

# Use a custom prompt template file
ai-code-review src/index.ts --prompt custom-prompt.md

# Add a custom prompt fragment
ai-code-review src/index.ts --prompt-fragment "Focus on performance issues"

# Specify the position of the prompt fragment
ai-code-review src/index.ts --prompt-fragment "Focus on security issues" --prompt-fragment-position start

# Use a specific prompt strategy
ai-code-review src/index.ts --prompt-strategy anthropic

# Estimate token usage and cost without performing a review
ai-code-review src/utils --estimate

# Skip confirmation for multi-pass reviews (automatically proceed when content exceeds context window)
ai-code-review src/utils --no-confirm

# Check the version of the tool
ai-code-review --version

# Run in debug mode for additional logging
ai-code-review src/utils --debug

# Run in quiet mode to suppress non-essential output
ai-code-review src/utils -q

# The AI model is configured in .env.local, not via command line
# See the Configuration section for details on setting up models
```

### Options

```
Options:
  # Basic Options
  -t, --type <type>       Type of review (architectural, quick-fixes, security, performance, unused-code) (default: "quick-fixes")
  -o, --output <format>   Output format (markdown, json) (default: "markdown")
  -i, --interactive       Process review results interactively (default: false)
  -e, --estimate          Estimate token usage and cost without performing the review (default: false)
  -v, --version           Output the current version
  -h, --help              Display help information

  # Review Content Options
  --include-tests         Include test files in the review (normally excluded by default) (default: false)
  -d, --include-project-docs  Include README.md and other project docs in the AI context for better understanding (default: true)
  --include-dependency-analysis Include dependency analysis in architectural reviews (default: true)
  -c, --consolidated      Generate a single consolidated review (default: true)
  --individual            Generate separate reviews for each file instead of one consolidated review (default: false)
  
  # Interactive Mode Options
  --auto-fix              Automatically implement high-priority fixes without confirmation in interactive mode (default: true)
  --prompt-all            Ask for confirmation on all fixes, including high priority ones (overrides --auto-fix) (default: false)
  
  # Model Options
  --listmodels            Display all available AI models based on your configured API keys (default: false)
  --models                Show all supported AI models and their configuration details, regardless of API key availability (default: false)
  --test-api              Verify AI provider API connections before starting the review (default: false)
  --writer-model <model>  Use a different model for report consolidation/writing (e.g., openai:gpt-4o-mini)
  --no-confirm            Skip confirmation for multi-pass reviews and proceed automatically (default: false)
  
  # Unused Code Detection Options (for --type unused-code)
  --trace-code            Enable deep code tracing for high-confidence unused code detection (default: false)
  --use-ts-prune          Use ts-prune static analysis to detect unused exports (default: false)
  --use-eslint            Use eslint static analysis to detect unused variables (default: false)
  
  # Prompt Customization Options
  --strategy              Custom review strategy to use (plugin name or path to plugin module)
  --prompt-file, --prompt Path to a custom prompt template file (overrides built-in prompts)
  --prompt-fragment       Custom instructions to inject into the AI prompt (focuses the review)
  --prompt-fragment-position Position of the prompt fragment (start, middle, end) (default: middle) 
  --prompt-strategy       Prompt formatting strategy to use (anthropic, gemini, openai, langchain)
  --use-cache             Enable prompt template caching for faster execution (use --no-use-cache to disable) (default: true)
  
  # Debug Options
  --debug                 Enable detailed debug logging for troubleshooting (default: false)
  -q, --quiet             Suppress non-essential output (default: false)
```

### Model Testing Options

```
Command: model-test [provider:model]
Description: Test AI models to verify API keys and model availability

Arguments:
  provider:model          Provider and model to test (e.g. gemini:gemini-1.5-pro, anthropic:claude-3-opus)

Options:
  --all                   Test all available models
  -p, --provider <provider>  Test all models for a specific provider
  -h, --help              Display help information

Command: test-build
Description: Test all AI models during build process

Options:
  --fail-on-error         Exit with error code if any model test fails
  --json                  Output results in JSON format
  -p, --provider <provider>  Test only models for a specific provider
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

If you use the `--individual` flag, each file will have its own review file with a path structure matching the source:

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

You can integrate your PROJECT.md file with GitHub Projects to better manage your project documentation and tasks. This allows you to maintain your project documentation in both Markdown format and in GitHub's project management interface.

```bash
# Update GitHub Project readme with PROJECT.md content
ai-code-review sync-github-projects --description-only

# Create GitHub Project items from PROJECT.md sections
ai-code-review sync-github-projects

# Sync GitHub Projects to PROJECT.md
ai-code-review sync-github-projects --direction from-github

# Specify project path
ai-code-review sync-github-projects --project-path /path/to/project
```

To use this feature, add the following to your `.env.local` file:

```
# GitHub API token for accessing GitHub Projects
GITHUB_TOKEN=your_github_token_here

# GitHub Project number (e.g., 1)
GITHUB_PROJECT_NUMBER=1

# GitHub owner (default: 'bobmatnyc')
GITHUB_OWNER=your_github_username
```

The recommended workflow is to:
1. First update the GitHub Project readme with your PROJECT.md content using the `--description-only` flag
2. Then use GitHub Projects to create and manage issues and tasks for ongoing work
3. Optionally sync back to PROJECT.md if you want to keep a local copy

### Environment Variables

Create a `.env.local` file in the AI Code Review tool directory with your API keys:

```
# For Google Gemini models
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here

# For OpenRouter models (Claude, GPT-4, etc.)
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here

# For Anthropic models directly
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here

# For OpenAI models directly
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here

# For dependency security analysis in architectural reviews
SERPAPI_KEY=your_serpapi_api_key_here
```

#### Global Installation

When installed globally, you can use the setup script to create your `.env.local` file:

```bash
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
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
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

### Gemini Models

| Model Name | Description | API Key Required | API Model Name |
|------------|-------------|------------------|----------------|
| `gemini:gemini-1.5-pro` | Recommended for most code reviews | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-1.5-pro` |
| `gemini:gemini-1.5-flash` | Faster but less detailed reviews | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-1.5-flash` |
| `gemini:gemini-2.5-pro` | Latest model with improved capabilities | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-2.5-pro` |
| `gemini:gemini-2.0-flash` | Balanced performance and quality | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-2.0-flash` |
| `gemini:gemini-pro` | Legacy model | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-pro` |
| `gemini:gemini-pro-latest` | Latest version of legacy model | `AI_CODE_REVIEW_GOOGLE_API_KEY` | `gemini-pro-latest` |

### OpenRouter Models

| Model Name | Description | API Key Required | API Model Name |
|------------|-------------|------------------|----------------|
| `openrouter:anthropic/claude-3-opus` | Highest quality, most detailed reviews | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `anthropic/claude-3-opus` |
| `openrouter:anthropic/claude-3-sonnet` | Good balance of quality and speed | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `anthropic/claude-3-sonnet` |
| `openrouter:anthropic/claude-3-haiku` | Fast, efficient reviews | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `anthropic/claude-3-haiku` |
| `openrouter:openai/gpt-4o` | OpenAI's latest model with strong code understanding | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `openai/gpt-4o` |
| `openrouter:openai/gpt-4-turbo` | Powerful model with good code analysis | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `openai/gpt-4-turbo` |
| `openrouter:google/gemini-1.5-pro` | Google's model via OpenRouter | `AI_CODE_REVIEW_OPENROUTER_API_KEY` | `google/gemini-1.5-pro` |

### Anthropic Models (Direct API)

| Model Name | Description | API Key Required | API Model Name |
|------------|-------------|------------------|----------------|
| `anthropic:claude-4-opus` | **NEW** - Most capable model with advanced reasoning | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-opus-4-20250514` |
| `anthropic:claude-4-sonnet` | **NEW** - Balanced model with enhanced capabilities | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| `anthropic:claude-3-opus` | Highest quality, most detailed reviews | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-3-opus-20240229` |
| `anthropic:claude-3.5-sonnet` | Improved version of Claude 3 Sonnet | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-3-5-sonnet-20241022` |
| `anthropic:claude-3-sonnet` | Good balance of quality and speed | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-3-sonnet-20240229` |
| `anthropic:claude-3.5-haiku` | Fast and lightweight model | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-3-5-haiku-20241022` |
| `anthropic:claude-3-haiku` | Fast, efficient reviews | `AI_CODE_REVIEW_ANTHROPIC_API_KEY` | `claude-3-haiku-20240307` |

### OpenAI Models (Direct API)

| Model Name | Description | API Key Required | API Model Name |
|------------|-------------|------------------|----------------|
| `openai:gpt-4-turbo` | Powerful model with good code analysis | `AI_CODE_REVIEW_OPENAI_API_KEY` | `gpt-4-turbo-preview` |
| `openai:gpt-4o` | OpenAI's latest model with strong code understanding | `AI_CODE_REVIEW_OPENAI_API_KEY` | `gpt-4o` |
| `openai:gpt-4` | Original GPT-4 model | `AI_CODE_REVIEW_OPENAI_API_KEY` | `gpt-4` |
| `openai:gpt-3.5-turbo` | Fast and cost-effective model | `AI_CODE_REVIEW_OPENAI_API_KEY` | `gpt-3.5-turbo` |

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
# Test API connections directly
ai-code-review test-api

# Test API connections before running a review
ai-code-review src --test-api
```

This will test connections to both Google Gemini API and OpenRouter API (if configured) and provide detailed feedback on the status of each connection.

## Requirements

- Node.js >= 16.0.0
- Google Generative AI API key or OpenRouter API key

## License

MIT
