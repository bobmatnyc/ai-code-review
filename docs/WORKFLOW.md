# 🔁 AI Code Review Tool - Development Workflow

**Version**: 2.0
**Updated**: 2025-06-27
**Repository**: https://github.com/bobmatnyc/ai-code-review.git

This document contains the complete workflow procedures for the AI Code Review tool project, a TypeScript-based CLI tool for automated code reviews using multiple AI providers (Gemini, Claude, OpenAI, OpenRouter).

## 📋 Project Management with Track Down

This project uses **Track Down**, a markdown-based project tracking system that treats project management artifacts as code. All project tracking is maintained in versioned markdown files within the repository, enabling the same collaborative patterns used for source code to apply to project management.

### Track Down Benefits
- Version-controlled project history with full audit trail
- Offline-capable project management
- Tool-agnostic implementation using standard markdown
- Seamless integration with existing development workflows
- Zero external dependencies or hosted services required

### Track Down File Structure

```
ai-code-review/
├── trackdown/
│   ├── BACKLOG.md              # Central tracking file
│   ├── ROADMAP.md              # High-level planning
│   ├── RETROSPECTIVES.md       # Sprint retrospectives
│   ├── METRICS.md              # Project metrics/reports
│   ├── templates/
│   │   ├── epic-template.md
│   │   ├── story-template.md
│   │   └── task-template.md
│   ├── archive/
│   │   └── completed-sprints/
│   └── scripts/
│       ├── status-report.py
│       ├── backlog-parser.py
│       └── metrics-generator.py
└── docs/WORKFLOW.md            # This file
```

## 📋 Prerequisites

This project uses **pnpm** as the package manager. Make sure you have pnpm installed:

```bash
# Install pnpm globally (recommended method)
corepack enable
corepack prepare pnpm@latest --activate

# Alternative: Install via npm
npm install -g pnpm

# Or enable Corepack (recommended)
corepack enable
```

---

## 🔧 1. Development Environment Setup

### Prerequisites
- Node.js >= 18.0.0
- npm (or pnpm for some operations)
- API keys for at least one AI provider

### Local Setup
```bash
# Clone the repository
git clone https://github.com/bobmatnyc/ai-code-review.git
cd ai-code-review

# Install dependencies (using pnpm)
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run tests to verify setup
pnpm test

# Build the project
pnpm run build
```

### Required Environment Variables
Create `.env.local` with at least one AI provider:
```bash
# Choose one or more providers
AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
GOOGLE_API_KEY=your_google_api_key

# OR
AI_CODE_REVIEW_MODEL=anthropic:claude-3.5-sonnet
ANTHROPIC_API_KEY=your_anthropic_api_key

# OR  
AI_CODE_REVIEW_MODEL=openai:gpt-4o
OPENAI_API_KEY=your_openai_api_key

# OR
AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3.5-sonnet
OPENROUTER_API_KEY=your_openrouter_api_key
```

---

## 🔁 2. Track Down Project Management Workflow

### Daily Workflow with Track Down

1. **Morning Standup Reference**
   ```bash
   # Review current sprint section in BACKLOG.md
   cat trackdown/BACKLOG.md | grep -A 20 "Current Sprint"

   # Update task statuses based on progress
   # Move checkboxes as work progresses
   # Add technical notes and discoveries
   ```

2. **Work Item Updates**
   - Move checkboxes from `[ ]` to `[x]` as work progresses
   - Add technical notes and discoveries inline
   - Update time estimates if significantly off
   - Reference work items in commit messages

3. **End-of-Day Sync**
   ```bash
   # Commit BACKLOG.md changes with descriptive messages
   git add trackdown/BACKLOG.md
   git commit -m "trackdown: update US-001 status to in-progress, add technical notes"
   git push origin feature-branch
   ```

### Work Item Naming Conventions

- **Epics:** EP-XXX (EP-001, EP-002...)
- **User Stories:** US-XXX (US-001, US-002...)
- **Tasks:** T-XXX (T-001, T-002...)
- **Bugs:** BUG-XXX (BUG-001, BUG-002...)
- **Spikes:** SP-XXX (SP-001, SP-002...)

### Status Values

- `Backlog` - Not yet prioritized
- `Ready` - Prioritized and ready for development
- `In Progress` - Currently being worked on
- `In Review` - Under code/design review
- `Testing` - In QA testing phase
- `Done` - Completed and deployed
- `Blocked` - Cannot proceed due to dependencies

### Priority Levels

- `Critical` - Production issues, security vulnerabilities
- `High` - Key features, important bug fixes
- `Medium` - Standard features and improvements
- `Low` - Nice-to-have features, technical debt

## 🔁 3. Git Workflow & Version Control

### Commit Standards
Follow [Conventional Commits](https://www.conventionalcommits.org/) with Track Down integration:

```
<type>(optional-scope): short summary

[optional body]

Closes: US-001
References: EP-001
```

**Valid types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`

**Examples:**
- `feat(evaluation): add developer skill assessment review type`

  `Closes: US-015`
  `References: EP-003`

- `fix(golang): correct Go project type detection`

  `Closes: BUG-002`

### Branch Naming with Work Item References
```bash
feature/US-001-evaluation-review-type
fix/BUG-002-golang-file-detection
chore/T-005-update-dependencies
docs/US-020-workflow-documentation
```

### Local Development Workflow
```bash
# Start from main
git checkout main
git pull origin main

# Create feature branch with work item reference
git checkout -b feature/US-001-new-feature

# Make changes and commit frequently with work item references
git add .
git commit -m "feat(scope): add initial implementation

Partial work on US-001. Added basic structure and tests.
References: EP-001"

# Update Track Down status
# Edit trackdown/BACKLOG.md to mark US-001 as "In Progress"

# Keep up to date
git fetch origin
git rebase origin/main

# Push and create PR
git push -u origin feature/US-001-new-feature
```

### Pull Request Integration with Track Down

Use this template for PRs:

```markdown
## Related Work Items
- Closes US-001
- References EP-001

## Changes Made
- Implemented user registration API endpoint
- Added input validation for email and password
- Created user model with password hashing

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing completed

## Documentation
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Work item updated with completion notes

## Track Down Updates
- [ ] BACKLOG.md updated with completion status
- [ ] Technical notes added to work item
- [ ] Next steps identified for related work items
```

---

## 🧪 4. Testing & Quality Assurance

### Full CI Pipeline
Before committing or publishing, always run:

```bash
# Complete validation pipeline
pnpm run lint          # ESLint validation
pnpm test              # Full test suite with vitest
pnpm run build         # TypeScript compilation and bundling
pnpm run validate:prompts  # Validate prompt templates
```

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: API client and workflow testing  
- **Prompt Validation**: Template syntax and metadata validation
- **Model Tests**: Live API testing (when keys available)

### Coverage Requirements
- Minimum 80% test coverage for new features
- All public APIs must have tests
- Critical paths (review orchestration, client selection) require comprehensive testing

---

## 📦 5. Building & Packaging

### Development Build
```bash
npm run dev        # Run with ts-node for development
npm run local      # Run with tsconfig-paths for module resolution
```

### Production Build
```bash
npm run build      # Full production build with tests
npm run quick-build # Fast build without tests (development only)
```

### Package Preparation
```bash
npm run prepare-package  # Complete package preparation for publishing
```

This script:
1. Cleans previous builds
2. Runs full test suite
3. Builds TypeScript with type definitions
4. Creates executable CLI with shebang
5. Validates package.json structure
6. Syncs model mappings and version

**⚠️ Known Issue**: Watch for duplicate shebang lines in `dist/index.js`. If you encounter `SyntaxError: Invalid or unexpected token` when running the CLI, check for and remove duplicate shebang lines (see Troubleshooting section).

---

## 📋 6. Release Process with Track Down Integration

### Pre-Release Checklist
1. **Track Down Sprint Completion**:
   ```bash
   # Review current sprint completion in BACKLOG.md
   # Move completed items to archive
   # Update ROADMAP.md with progress
   # Generate sprint retrospective in RETROSPECTIVES.md
   ```

2. **Version Management**:
   ```bash
   # Update version in package.json
   npm version [patch|minor|major]

   # Version is automatically synced during build
   # Update version in trackdown/ROADMAP.md
   ```

3. **Documentation Updates**:
   - Update README.md with new features
   - Update CHANGELOG.md with release notes
   - Verify all prompt templates have correct metadata
   - Update trackdown/METRICS.md with release metrics

4. **Quality Verification**:
   ```bash
   npm run lint && npm run test && npm run build
   ```

5. **Package Preparation**:
   ```bash
   npm run prepare-package
   ```

### Publishing to NPM
```bash
# Verify you're logged into npm
npm whoami

# Publish to npm registry
npm publish

# Or using pnpm (alternative)
pnpm publish
```

### Release Tags with Track Down Updates
```bash
# Tag the release
git tag -a v4.2.0 -m "Release version 4.2.0: evaluation review and Golang support"
git push origin v4.2.0

# Update Track Down post-release
# Mark release epic as complete in BACKLOG.md
# Archive completed sprint in trackdown/archive/
# Update ROADMAP.md with next quarter planning
```

---

## 🎯 7. Feature Development Guidelines with Track Down

### Track Down Work Item Creation Process

#### Finding Next Available Work Item Numbers
Before creating new work items, find the next available numbers:

```bash
# Find next epic number
grep -o "EP-[0-9]\+" trackdown/BACKLOG.md | sort -V | tail -1
# Example output: EP-006, so next would be EP-007

# Find next user story number
grep -o "US-[0-9]\+" trackdown/BACKLOG.md | sort -V | tail -1
# Example output: US-014, so next would be US-015

# Find next task number
grep -o "T-[0-9]\+" trackdown/BACKLOG.md | sort -V | tail -1
```

#### Using Templates
Use the provided templates for consistency:

```bash
# Copy epic template
cp trackdown/templates/epic-template.md temp-epic.md
# Edit temp-epic.md with your epic details
# Copy content to appropriate section in BACKLOG.md

# Copy user story template
cp trackdown/templates/story-template.md temp-story.md
# Edit temp-story.md with your story details
# Copy content to appropriate section in BACKLOG.md
```

1. **Epic Planning**: Create high-level epic in `trackdown/BACKLOG.md`
   ```markdown
   ### Epic: Test Coverage Enhancement (EP-007)
   **Status:** Ready
   **Priority:** High
   **Target:** Q3 2025

   Improve test coverage across all core modules to ensure reliability and maintainability.

   **Stories:** US-015, US-016, US-017, US-018
   ```

2. **User Story Breakdown**: Define specific user stories under the epic
   ```markdown
   ### **[US-015]** API Client Test Coverage Enhancement

   **Type:** User Story
   **Epic:** EP-007 Test Coverage Enhancement
   **Priority:** High
   **Story Points:** 8
   **Assignee:** @bobmatnyc
   **Status:** Ready

   **User Story:**
   As a developer, I want comprehensive test coverage for API clients so that external integrations are reliable and well-tested.

   **Acceptance Criteria:**
   - [ ] AnthropicClient has >80% test coverage
   - [ ] GoogleClient has >80% test coverage
   - [ ] OpenAIClient has >80% test coverage
   - [ ] OpenRouterClient has >80% test coverage
   - [ ] Error handling scenarios are tested
   - [ ] Mock strategies are consistent across clients

   **Technical Notes:**
   - Current API client coverage is only 3.16%
   - Focus on error handling and retry logic
   - Use consistent mocking patterns
   ```

#### Updating Work Item Status During Development
Update work item status as you progress:

```bash
# When starting work
# Change status from "Ready" to "In Progress" in BACKLOG.md
# Add your name as assignee if not already assigned

# During development - add technical notes
# Add discoveries, challenges, or implementation details to the work item

# When creating PR
# Change status to "In Review"
# Reference work item in PR title and description

# When completed
# Change status to "Done"
# Add completion date
# Add final technical notes and lessons learned
```

### Adding New Review Types with Track Down
1. **Create Work Item**: Add user story to `trackdown/BACKLOG.md`
2. **Create Schema**: Define Zod schema in `src/prompts/schemas/`
3. **Create Prompts**: Add language-specific templates in `promptText/languages/`
4. **Update Types**: Add to `ReviewType` enum in `src/types/review.ts`
5. **Update CLI**: Add to argument parser choices
6. **Add Tests**: Create comprehensive test coverage
7. **Update Docs**: Document in README.md and examples
8. **Update Track Down**: Mark story as complete, add technical notes

### Adding Language Support with Track Down
1. **Create Work Item**: Add language support story to backlog
2. **Prompt Templates**: Create templates in `promptText/languages/[language]/`
3. **Project Detection**: Update `src/utils/detection/projectTypeDetector.ts`
4. **File Filtering**: Update `src/utils/files/fileFilters.ts`
5. **Language Detection**: Update language mapping functions
6. **Testing**: Add language-specific test cases
7. **Track Down Updates**: Document implementation notes and completion

### Adding AI Provider Support with Track Down
1. **Create Epic**: Add provider support epic to roadmap
2. **Break Down Stories**: Create individual stories for each component
3. **Client Implementation**: Create in `src/clients/implementations/`
4. **Model Maps**: Update `src/clients/utils/modelMaps/data/`
5. **Factory Registration**: Update client factory
6. **Error Handling**: Implement provider-specific error patterns
7. **Cost Estimation**: Add to estimator factory
8. **Track Down Completion**: Update all related work items

---

## 🔍 8. Code Quality Standards

### TypeScript Requirements
- Strict mode enabled (`tsconfig.json`)
- No `any` types (prefer `unknown` or proper interfaces)
- Complete JSDoc documentation for public APIs
- Consistent import/export patterns

### ESLint Configuration
- Maximum 1000 warnings allowed
- Zero errors policy
- Automatic fixing where possible: `npm run lint:fix`

### File Organization
```
src/
├── analysis/          # Token analysis and semantic chunking
├── cli/              # Command-line interface
├── clients/          # AI provider clients
├── commands/         # CLI command implementations  
├── core/            # Core orchestration logic
├── formatters/      # Output formatting
├── prompts/         # Prompt management and schemas
├── strategies/      # Review strategy implementations
├── types/           # TypeScript type definitions
└── utils/           # Utility functions and helpers
```

---

## 🧾 9. Documentation Standards

### Code Documentation
- JSDoc comments for all public functions and classes
- Type annotations for complex interfaces
- Examples in documentation where helpful

### Prompt Templates
All prompt templates must include YAML frontmatter:
```yaml
---
name: Review Type Name
description: Clear description of the review purpose
version: 1.0.0
author: AI Code Review Tool
lastModified: 2025-06-11T00:00:00.000Z
reviewType: type-name
language: language-code
tags:
  - tag1
  - tag2
---
```

### README Maintenance
- Keep feature list up to date
- Include examples for new capabilities
- Maintain version history with meaningful release notes

---

## 🚀 10. CI/CD & Automation with Track Down Integration

### Pre-commit Hooks with Track Down Validation
```bash
# Recommended pre-commit setup with Track Down validation
npm run lint && npm run test && npm run build

# Optional: Validate Track Down files
python trackdown/scripts/backlog-validator.py
```

### Track Down Automation Scripts

**Status Report Generator** (`trackdown/scripts/status-report.py`):
```bash
# Generate weekly status report from BACKLOG.md
python trackdown/scripts/status-report.py > weekly-report.md
```

**Metrics Collection** (`trackdown/scripts/metrics-generator.py`):
```bash
# Auto-update metrics and generate reports
python trackdown/scripts/metrics-generator.py
```

### PNPM Scripts Reference
```bash
# Development
pnpm run dev           # Development server with ts-node
pnpm run local         # Local execution with path resolution

# Testing
pnpm test              # Full test suite
pnpm run test:watch    # Watch mode testing
pnpm run test:coverage # Coverage report

# Building
pnpm run build         # Production build
pnpm run build:types   # TypeScript declarations only
pnpm run quick-build   # Fast build for development

# Quality
pnpm run lint          # ESLint checking
pnpm run format        # Prettier formatting

# Validation
pnpm run validate:models  # Model configuration validation
pnpm run validate:prompts # Prompt template validation

# Utilities
pnpm run models:sync      # Update model mappings
pnpm run prepare-package  # Package for publishing
```

### Automated Checks
- TypeScript compilation
- ESLint validation
- Test execution
- Prompt template validation
- Model configuration verification
- Track Down backlog format validation
- Work item metadata completeness check

---

## 📊 11. Project Metrics & Monitoring with Track Down

### Key Performance Indicators
- Test coverage percentage
- Build success rate
- ESLint warning count (target: <500)
- Response time for different AI providers
- Token usage efficiency
- **Track Down Metrics:**
  - Sprint velocity (story points completed per sprint)
  - Cycle time from "Ready" to "Done"
  - Sprint commitment accuracy
  - Defect rate (bugs per story points delivered)

### Quality Gates
- All tests must pass
- Zero TypeScript compilation errors
- ESLint warnings under configured limit
- Successful prompt validation
- Working CLI executable generation
- **Track Down Quality Gates:**
  - All committed work items have required metadata
  - Sprint goals clearly defined and tracked
  - Work item status accurately reflects progress

---

## 🔗 12. Dependencies & Security

### Dependency Management
```bash
npm audit              # Security audit
npm update             # Update dependencies
npm outdated           # Check for outdated packages
```

### Security Practices
- Never commit API keys or secrets
- Use `.env.local` for local development
- Validate all external inputs
- Keep dependencies updated
- Regular security audits

### Major Dependencies
- **TypeScript**: Core language and type system
- **Vitest**: Testing framework
- **ESLint**: Code quality and linting
- **Zod**: Schema validation for review outputs
- **Handlebars**: Template engine for prompts
- **Various AI SDKs**: Provider-specific clients

---

## 📝 13. Troubleshooting Common Issues

### Build Failures
1. **TypeScript Errors**: Run `npm run build:types` to isolate
2. **Missing Dependencies**: Run `npm install` to sync
3. **Path Resolution**: Check `tsconfig.json` paths configuration

### Test Failures  
1. **API Key Issues**: Verify `.env.local` configuration
2. **Mock Problems**: Ensure test mocks match actual exports
3. **Timeout Issues**: Check network connectivity for integration tests

### CLI Issues
1. **Command Not Found**: Run `npm run postbuild` to link globally
2. **Permission Errors**: Verify executable permissions on `dist/index.js`
3. **Module Resolution**: Check relative vs absolute import paths
4. **⚠️ Duplicate Shebang Error**: If you see `SyntaxError: Invalid or unexpected token` with shebang line, check for duplicate shebangs:
   ```bash
   # Check first few lines of built CLI
   head -5 dist/index.js
   
   # Should see only ONE shebang line:
   #!/usr/bin/env node
   "use strict";
   
   # If you see TWO shebang lines, remove the duplicate:
   sed -i '2d' dist/index.js  # Remove line 2 if it's duplicate shebang
   ```
   **Root Cause**: Build process and prepare-package script both adding shebangs
   **Prevention**: The prepare-package script now checks for existing shebangs before adding

---

## 🎯 14. Contributing Guidelines with Track Down

### Pull Request Process with Track Down Integration
1. Create feature branch from main with work item reference
2. Implement changes with tests
3. Update Track Down work item status throughout development
4. Run full CI pipeline locally
5. Update documentation as needed
6. Create PR with Track Down work item references
7. Wait for CI validation
8. Address review feedback
9. Update Track Down with completion notes
10. Squash merge when approved
11. Mark work item as "Done" in Track Down

### Code Review Checklist
- [ ] Tests included and passing
- [ ] Documentation updated
- [ ] TypeScript compilation successful
- [ ] ESLint validation passed
- [ ] Breaking changes documented
- [ ] Version updated if needed
- [ ] **Track Down Requirements:**
  - [ ] Work item referenced in PR
  - [ ] Work item status updated to "In Review"
  - [ ] Technical notes added to work item
  - [ ] Acceptance criteria verified
  - [ ] Related work items identified for future sprints

---

## 🔄 15. Maintenance Procedures with Track Down

### Regular Maintenance Tasks
- **Daily**: Update work item statuses in Track Down
- **Weekly**:
  - Dependency updates and security patches
  - Generate Track Down status reports
  - Review and groom upcoming stories in backlog
- **Monthly**:
  - Performance review and optimization
  - Archive completed sprints in Track Down
  - Review and update Track Down templates
- **Quarterly**:
  - Major dependency upgrades
  - Major roadmap reviews in Track Down
  - Team retrospectives on project management approach
- **As Needed**: Documentation updates and prompt improvements

### Version Management with Track Down Integration
- **Patch** (x.x.X): Bug fixes, minor improvements
  - Update related bug work items to "Done"
  - Add patch notes to METRICS.md
- **Minor** (x.X.x): New features, new language support
  - Complete feature epics in Track Down
  - Update ROADMAP.md with delivered capabilities
- **Major** (X.x.x): Breaking changes, architecture updates
  - Archive major version epic
  - Plan next major version in ROADMAP.md

### Track Down Maintenance Procedures

**Sprint Planning Process:**
1. **Sprint Preparation**
   - Review and groom upcoming stories in backlog
   - Estimate story points for unestimated items
   - Identify dependencies and risks

2. **Sprint Commitment**
   - Move committed stories to "Current Sprint" section
   - Set sprint goal and success criteria
   - Update sprint number and dates in BACKLOG.md

3. **Sprint Execution**
   - Daily updates to story status
   - Add sub-tasks as implementation details emerge
   - Track blockers and impediments

**Sprint Retrospective Process:**
1. Archive completed sprint in `trackdown/archive/completed-sprints/`
2. Update `trackdown/RETROSPECTIVES.md` with lessons learned
3. Update velocity metrics in `trackdown/METRICS.md`
4. Plan improvements for next sprint

---

## 🎯 16. Track Down Implementation Checklist

To fully implement Track Down in this project, complete these setup tasks:

### Phase 1: Foundation Setup ✅
- [x] Create `trackdown/` directory structure
- [x] Initialize `trackdown/BACKLOG.md` with current project status
- [x] Create `trackdown/ROADMAP.md` with quarterly planning
- [x] Set up `trackdown/templates/` with work item templates
- [x] Migrate any existing GitHub issues to Track Down format

### Phase 2: Automation Setup ✅
- [x] Implement `trackdown/scripts/backlog-validator.py`
- [x] Create `trackdown/scripts/status-report.py`
- [x] Set up `trackdown/scripts/metrics-generator.py`
- [x] Configure Git hooks for Track Down validation
- [x] Update CI/CD pipeline to include Track Down checks

### Phase 3: Team Adoption 🚧
- [x] Train team on Track Down workflow
- [x] Establish daily/weekly Track Down update routines
- [x] Create first sprint in Track Down format
- [ ] Begin using work item references in commits and PRs

### Phase 4: Optimization 📋
- [ ] Implement advanced metrics collection
- [ ] Create dashboard generation scripts
- [ ] Integrate with existing development tools
- [ ] Refine process based on team feedback

---

This workflow ensures consistent development practices, reliable releases, and maintainable code quality for the AI Code Review tool, while leveraging Track Down for comprehensive project management that scales with the development team.