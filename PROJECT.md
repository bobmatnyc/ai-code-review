# Code Review Tool - Project Documentation

## Architecture & Design Decisions

### Overview
// Updated: 2023-07-25
// Updated: 2024-04-05
This project is a TypeScript-based code review tool that leverages Google's Gemini AI models to analyze code in sibling projects and provide structured feedback. The tool is designed to be run from the command line, with no UI component.

The project follows semantic versioning (SEMVER) with version history tracked in VERSION.md.

### Tech Stack
// Updated: 2023-07-25
// Updated: 2024-04-05
- **Language**: TypeScript
- **Runtime**: Node.js
- **AI Model**: Google Gemini AI (1.5 Pro or Pro)
- **API Integration**: Google AI Studio API
- **Testing**: Vitest
- **Linting & Formatting**: ESLint, Prettier
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
Responsible for:
- Authenticating with the Google AI Studio API
- Sending properly formatted prompts to the Gemini 2.5 Max model
- Processing and structuring the API responses
- Handling different review types with specialized prompts
- Supporting both GOOGLE_GENERATIVE_AI_KEY and GOOGLE_AI_STUDIO_KEY for backward compatibility
- Including project documentation (README.md, PROJECT.md, PROGRESS.md) in the AI context

#### 4. Review Orchestrator
// Updated: 2023-07-25
Responsible for:
- Coordinating the overall review process
- Managing the flow between components
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
Provides a holistic analysis of the entire codebase, focusing on:
- Overall code structure and organization
- API design patterns and consistency
- Package management and dependencies
- Component architecture and relationships
- Integration points and data flow

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
- `.env.local` for local development
- Required variables (either one is sufficient):
  - `GOOGLE_GENERATIVE_AI_KEY`: API key for Google Generative AI
  - `GOOGLE_AI_STUDIO_KEY`: Alternative name for the API key (supported for backward compatibility)
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
4. Build the project with `npm run build`

### Usage
// Updated: 2023-07-25
// Updated: 2024-04-05
Run the tool using:
```bash
# Using npm
npm run review -- code-review project-name path/to/file.ts

# Using yarn
yarn dev code-review project-name path/to/file.ts
```

Output will be generated in the `/review/[project-name]/` directory, with subdirectories matching the source path structure.

### Code Review Workflow
// Updated: 2024-07-10
1. When asked to perform a code review on a specific file or directory, run the code review script in interactive mode
2. Automatically implement all high priority fixes identified in the review
3. Ask for confirmation before implementing medium and low priority fixes
4. Use the following command format for interactive reviews:
   ```bash
   yarn review this path/to/file.ts --interactive
   ```
5. After implementing fixes, verify changes by running appropriate tests
