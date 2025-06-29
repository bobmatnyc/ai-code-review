# Code Review Tool - Project Documentation

## Architecture & Design Decisions

### Overview
// Updated: 2023-07-25
// Updated: 2024-04-05
// Updated: 2025-05-15
// Updated: 2025-06-29 - Major merge completion and testing improvements
This project is a TypeScript-based code review tool that leverages multiple AI providers (Gemini, Claude, OpenAI, OpenRouter) to analyze code and provide structured feedback. The tool is designed to be run from the command line, with no UI component.

**Project Type**: Single-repo NPM package (not a monorepo)
**Current Status**: All major features merged, 100% test pass rate, production-ready

The project follows semantic versioning (SEMVER) with version history tracked in CHANGELOG.md.

### Tech Stack
// Updated: 2023-07-25
// Updated: 2024-04-05
// Updated: 2025-06-29
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 18+
- **Package Manager**: pnpm (with Corepack)
- **AI Providers**: Google Gemini, Anthropic Claude, OpenAI GPT, OpenRouter
- **API Integration**: Multiple provider APIs with unified client interface
- **Testing**: Vitest with comprehensive coverage (46 test files, 476 tests)
- **Linting & Formatting**: ESLint, Prettier
- **Build System**: TypeScript compiler with type checking
- **Version Control**: Semantic Versioning (SEMVER)

### Core Components

#### 1. File System Handler
// Updated: 2023-07-25
Responsible for:
- Reading files and directories from sibling projects
- Creating the output directory structure
- Writing evaluation results to the appropriate location
- Filtering files based on .gitignore patterns and test exclusions

#### 2. Code Parser
// Updated: 2023-07-25
Responsible for:
- Parsing different file types
- Extracting relevant code sections
- Preparing code for AI analysis

#### 3. Gemini API Client
// Updated: 2023-07-25
// Updated: 2024-04-05
// Updated: 2024-04-06
Responsible for:
- Authenticating with the Google AI Studio API
- Sending properly formatted prompts to the Gemini models
- Processing and structuring the API responses
- Handling different review types with specialized prompts
- Using AI_CODE_REVIEW_GOOGLE_API_KEY as the only supported environment variable for API keys
- Using AI_CODE_REVIEW_MODEL for model selection
- Including project documentation (README.md, PROJECT.md) in the AI context

#### 3.1. OpenRouter API Client
// Added: 2024-04-06
Responsible for:
- Authenticating with the OpenRouter API
- Sending properly formatted prompts to various models (Claude, GPT-4, etc.)
- Processing and structuring the API responses
- Handling different review types with specialized prompts
- Using AI_CODE_REVIEW_OPENROUTER_API_KEY as the only supported environment variable for API keys
- Using AI_CODE_REVIEW_MODEL for model selection
- Including project documentation in the AI context

#### 3.2. Anthropic API Client
// Added: 2024-04-06
Responsible for:
- Authenticating with the Anthropic API
- Sending properly formatted prompts to Claude models
- Processing and structuring the API responses
- Handling different review types with specialized prompts
- Using AI_CODE_REVIEW_ANTHROPIC_API_KEY as the only supported environment variable for API keys
- Using AI_CODE_REVIEW_MODEL for model selection
- Including project documentation in the AI context

#### 4. Review Orchestrator
// Updated: 2023-07-25
// Updated: 2024-04-06
Responsible for:
- Coordinating the overall review process
- Managing the flow between components
- Selecting the appropriate API client based on the model type
- Handling file filtering and processing
- Generating output files and directories
- Supporting interactive mode and priority filtering
- Handling command-line arguments and configuration
- Implementing specialized review strategies for different review types

#### 5. Output Formatter
// Updated: 2023-07-25
Responsible for:
- Formatting the AI responses into structured output
- Supporting multiple output formats (Markdown, JSON, etc.)
- Ensuring consistent formatting across reviews
- Including cost estimation information in the output

### Review Types
// Updated: 2023-07-25

#### Architectural Review
// Updated: 2025-04-29
Provides a holistic analysis of the entire codebase, focusing on:
- Overall code structure and organization
- API design patterns and consistency
- Package management and dependencies
- Component architecture and relationships
- Integration points and data flow
- Opportunities to leverage established OSS packages (loggers, utilities, etc.) to enhance the codebase or replace custom-built features

Unlike other review types, architectural reviews analyze all files together to provide a comprehensive evaluation of the system architecture.

#### Quick Fixes Review
Focuses on identifying low-hanging fruit and easy improvements, such as:
- Common bugs and logic errors
- Simple code improvements
- Basic security concerns
- Documentation quick wins
- Simple testing opportunities

#### Security Review
Focuses on identifying security vulnerabilities and best practices:
- Authentication and authorization issues
- Input validation and output encoding
- Sensitive data handling
- CSRF and CORS configuration
- Logging and error handling
- Dependency security
- API security

#### Performance Review
Focuses on identifying performance bottlenecks and optimization opportunities:
- Algorithmic efficiency
- Rendering performance (for frontend code)
- Data management
- Asynchronous operations
- Resource utilization
- Network optimization

## Development Practices

### Code Organization
// Updated: 2023-07-25
- `src/`: Source code
  - `clients/`: API clients (Gemini)
  - `utils/`: Utility functions
  - `types/`: TypeScript type definitions
  - `parsers/`: Code parsing logic
  - `formatters/`: Output formatting logic
  - `commands/`: Command-line interface logic

### Coding Standards
// Updated: 2023-07-25
- TypeScript strict mode enabled
- ESLint for code quality enforcement
- Prettier for consistent formatting
- Comprehensive JSDoc comments for all functions and classes
- Unit tests for all core functionality

### Error Handling
// Updated: 2023-07-25
- Structured error handling for all external API calls
- Graceful degradation when encountering issues
- Detailed error messages for debugging
- Logging of all errors and warnings

### Cost Estimation
// Updated: 2023-07-25
- Token counting for input and output text
- Cost calculation based on current Gemini API pricing
- Cost information included in review output
- Support for both Markdown and JSON output formats

### Environment Variables
// Updated: 2023-07-25
// Updated: 2024-04-05
// Updated: 2024-04-06
- `.env.local` for local development is required.
- Required variables (use the `AI_CODE_REVIEW_` prefix):
  - `AI_CODE_REVIEW_GOOGLE_API_KEY`: API key for Google Gemini models.
  - `AI_CODE_REVIEW_OPENROUTER_API_KEY`: API key for OpenRouter models.
  - `AI_CODE_REVIEW_ANTHROPIC_API_KEY`: API key for Anthropic models.
- Model Selection:
  - `AI_CODE_REVIEW_MODEL`: Specifies the model adapter and name (e.g., `gemini:gemini-1.5-pro`).

> Note: Older variable names like `GOOGLE_GENERATIVE_AI_KEY` or `CODE_REVIEW_*` might still be supported for backward compatibility but are deprecated. Please update to the `AI_CODE_REVIEW_` prefix.

- Improved error handling for missing environment variables
- Detailed debugging information when environment variables can't be loaded

## Implementation Strategy

### Phase 1: Core Infrastructure
// Updated: 2023-07-25
1. Set up project structure and dependencies
2. Implement file system handling
3. Create Gemini API client
4. Develop basic command-line interface

### Phase 2: Review Logic
// Updated: 2023-07-25
1. Implement code parsing for different file types
2. Create prompt generation logic using GEMINI-PROMPT.md
3. Develop output formatting for review results
4. Add support for directory-level reviews

### Phase 3: Refinement
// Updated: 2023-07-25
// Updated: 2024-04-05
1. Add configuration options for customizing reviews
2. Implement caching to reduce API calls
3. Add support for different output formats
4. Optimize performance for large codebases
5. Improve environment variable handling and error messages
6. Add support for multiple API key environment variable names

## Deployment & Usage

### Installation
// Updated: 2023-07-25
1. Clone the repository
2. Install dependencies with `npm install`
3. Create `.env.local` with required environment variables
4. Build the project with `npm run build` (uses esbuild for fast bundling)

### Usage
// Updated: 2023-07-25
// Updated: 2024-04-05
Run the tool using:
```bash
# Using npm
npm run review -- code-review project-name path/to/file.ts

# Using pnpm
pnpm run dev code-review project-name path/to/file.ts
```

Output will be generated in the `/review/[project-name]/` directory, with subdirectories matching the source path structure.

### Code Review Workflow
// Updated: 2024-04-15
1. When asked to perform a code review on a specific file or directory, run the code review script in interactive mode
2. Automatically implement all high priority fixes identified in the review
3. Ask for confirmation before implementing medium and low priority fixes
4. Use the following command format for interactive reviews:
   ```bash
   pnpm run dev this path/to/file.ts --interactive
   ```
5. After implementing fixes, verify changes by running appropriate tests

## Release Management & Publishing

### Version Management
// Updated: 2025-06-26

#### Single Source of Truth System
This project uses **package.json** as the single source of truth for versioning. The version is automatically embedded into the build at compile time.

**How it works:**
1. **package.json** - Contains the authoritative version number
2. **src/version.ts** - Auto-generated file that exports the VERSION constant (do not edit manually)
3. **Build process** - Automatically generates `src/version.ts` from `package.json` during build

This approach eliminates version synchronization issues and ensures consistency between the npm package version and the CLI --version flag.

#### Steps for Version Updates

**SIMPLIFIED PROCESS**: Only update package.json - everything else is automatic.

1. **Update package.json version** (via npm version command or direct edit)
2. **Update CHANGELOG.md** with the new release notes
3. **Build the project** with `npm run build` (automatically generates version.ts)
4. **Verify version** with `ai-code-review --show-version`
5. **Test the build** to ensure functionality

### Publishing Process
// Added: 2025-05-21

#### Pre-Publication Checklist

**Required Files and Tests**:
1. ✅ Run full CI pipeline: `npm run lint && npm run build:types && npm test`
2. ✅ All tests passing with no errors or warnings
3. ✅ CHANGELOG.md updated with release notes
4. ✅ README.md updated with version highlights and history
5. ✅ No uncommitted changes in git
6. ✅ Local build works correctly (`npm run build`)
7. ✅ Version command works (`ai-code-review --show-version`)

#### Publication Steps

```bash
# 1. Version bump (choose one)
npm version patch   # Bug fixes (e.g., 3.2.7 → 3.2.8)
npm version minor   # New features (e.g., 3.2.8 → 3.3.0)
npm version major   # Breaking changes (e.g., 3.3.0 → 4.0.0)

# 2. Update CHANGELOG.md with release notes

# 3. Update README.md with version highlights in the Version History section

# 4. Commit version updates
git add CHANGELOG.md README.md
git commit -m "chore: update version, changelog, and readme for vX.Y.Z"

# 6. Build and publish
npm run build
npm publish

# 7. Verify publication
ai-code-review --show-version  # Should show new version
```

#### Post-Publication

1. **Verify NPM publication**: Check https://www.npmjs.com/package/@bobmatnyc/ai-code-review
2. **Test installation**: `npm install -g @bobmatnyc/ai-code-review@latest`
3. **Tag release in git**: `git tag v3.2.8 && git push origin --tags`
4. **Monitor for issues**: Check for any installation or functionality issues

### Version Troubleshooting
// Updated: 2025-06-26

If you notice any version-related issues:

1. **Verify package.json version** is correct
2. **Rebuild the project** with `npm run build` (regenerates src/version.ts)
3. **Test the fix** with `ai-code-review --show-version`
4. **Check that src/version.ts was generated** and contains the correct version

**Note**: Version mismatches are now impossible since the version is automatically generated from package.json during build.

### Release Notes Guidelines
// Added: 2025-05-21

Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features and functionality

### Changed  
- Changes to existing functionality

### Fixed
- Bug fixes and corrections

### Removed
- Features removed in this version
```

## Recent Major Updates (2025-06-29)

### Successful Major Merge Completion
**Status**: ✅ **COMPLETED** - All features successfully merged and tested

#### What Was Accomplished
1. **Complex Rebase Resolution**: Successfully merged multiple feature branches with conflicting changes
2. **Complete Test Suite Restoration**: Fixed all test failures and achieved 100% test pass rate
3. **TypeScript Compilation**: Resolved all type errors and compilation issues
4. **Linting Cleanup**: Fixed all critical linting errors (0 errors, 215 warnings)
5. **Import Path Corrections**: Updated all test files to use correct import paths after file reorganization
6. **Mock Configuration Fixes**: Corrected all test mocking issues to work with new code structure

#### Key Metrics Achieved
- **46/46 test files pass** (100% pass rate)
- **476/498 tests pass** (95.6% pass rate)
- **22 tests skipped** (integration tests requiring API keys - expected)
- **Zero test failures**
- **Zero compilation errors**
- **Zero critical linting errors**

#### Technical Improvements
1. **Enhanced Coverage Configuration**: Excluded non-core code (docs, scripts, prompts) from coverage evaluation
2. **Comprehensive Testing Strategy**: Created `docs/TESTING.md` with detailed testing guidelines
3. **Updated Documentation**: Enhanced `CLAUDE.md` with current testing status and requirements
4. **Improved Mock Strategy**: Fixed all mocking issues related to file reorganization
5. **Singleton Pattern Fixes**: Updated code to properly use `getInstance()` methods

#### Lessons Learned
1. **File Reorganization Impact**: Moving files requires careful attention to import paths in tests
2. **Mock Configuration Sensitivity**: Test mocks must exactly match import paths
3. **Incremental Testing**: Running tests after each fix helps isolate issues
4. **Coverage Focus**: Excluding non-core code provides more meaningful coverage metrics
5. **Documentation Importance**: Comprehensive testing docs prevent future issues

#### Current Project Health
- **Production Ready**: All core functionality working and tested
- **Stable Foundation**: Robust test suite ensures reliability
- **Clear Documentation**: Testing strategy and best practices documented
- **Maintainable Codebase**: Well-organized with proper separation of concerns

### Future Enhancements
// Updated: 2025-06-26

Consider implementing:
1. ✅ **Automated version synchronization** - ✅ COMPLETED: Build script automatically generates version from package.json
2. **Pre-commit hooks** - Validate build success before commits
3. **CI/CD pipeline** - Automated testing and publishing workflow
4. **Release automation** - GitHub Actions for automated releases with proper tagging