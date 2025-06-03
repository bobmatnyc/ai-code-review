# 🔧 INSTRUCTIONS (AI Code Review CLI Tool)

**Version**: 2.1
**Updated**: 5-27-2025

## 📋 Changelog

### Version 2.1 (5-27-2025)
- **Project Focus**: Updated documentation to reflect single-package CLI tool architecture
- **Stack Alignment**: Removed Next.js/React references, added Node.js CLI and AI integration guidelines
- **Package Structure**: Clarified single repository purpose for npm package distribution
- **Future Extensions**: Documented strategy for web apps and extensions as separate repositories

### Version 2.0 (5-21-2025)
- **Package Manager**: Migrated from npm to pnpm for better performance and disk efficiency
- **Documentation Structure**: Extracted workflow procedures to separate `WORKFLOW.md` document
- **GitHub Integration**: Added GitHub API commands for milestone management (gh CLI doesn't support milestones)
- **Logging**: Updated to universal logger pattern with Pino structured logging
- **Project Organization**: Moved all documentation to `docs/` directory

### Version 1.0 (5-05-2025)
- Initial comprehensive development guidelines
- GitHub-centric workflow with Issues and Milestones
- Design document requirements and CI/CD procedures

---

## 📌 1. Agent Protocol & Execution Flow

**Who this is for**: AI agents and human developers collaborating on the `@bobmatnyc/ai-code-review` npm package - a TypeScript CLI tool for AI-powered code reviews.

### ✅ Protocol Summary

1. **Validate assumptions** – ask clarifying questions before proceeding.
2. **Implement with simplicity** – prefer minimal, working code.
3. **Test and lint rigorously** – `pnpm run lint && pnpm run build:types && pnpm test`.
4. **Verify CI checks before closing tickets** – run full CI pipeline locally.
5. **Document intent** – not just behavior.
6. **Confirm before architectural shifts or abstractions.**

> You are expected to follow all rules by default. No mocks, hacks, or shortcuts unless explicitly approved.

---

## 🧠 2. Core Principles

* **Build real, test real** – avoid mocks unless directed.
* **Simplicity > Cleverness** – prefer straight-line solutions.
* **Validate all assumptions** – ask before introducing new paradigms.
* **Single package focus** – maintain clear boundaries between CLI and library usage.
* **Document clearly** – capture why, not just how.
* **No implicit fallbacks** – when configurations fail, fail gracefully with clear errors. Never automatically fall back to different services.

---

## 🛠️ 3. Stack-Specific Directives

### TypeScript

* Must use `strict: true` config (`tsconfig.json`).
* Avoid `any`. Prefer `unknown`, generics, or well-defined types.
* Use `Pick`, `Partial`, `Required`, etc. to reduce duplication.
* All functions and exports must use **JSDoc** with type annotations.

### Node.js CLI Development

* Use ES modules with proper `import`/`export` syntax.
* Handle process signals gracefully (`SIGINT`, `SIGTERM`).
* Provide clear error messages with actionable guidance.
* Support both programmatic usage (as library) and CLI usage.
* Use commander.js for CLI argument parsing with proper validation.

### AI Integration

* Implement proper retry logic with exponential backoff.
* Handle rate limiting gracefully with user feedback.
* Validate API responses before processing.
* Provide cost estimation before expensive operations.
* Support multiple AI providers with consistent interfaces.

### Package Distribution

* Ensure the package works both as a global CLI tool and as a library dependency.
* Include proper shebang lines for CLI executables.
* Bundle all necessary assets (prompts, templates) in the published package.
* Maintain backward compatibility for public APIs.

---

## 📦 4. Single Package Workflow

### Project Structure

```
/
├── src/                    # Source code
│   ├── core/              # Core review logic
│   ├── clients/           # AI provider clients
│   ├── strategies/        # Review strategies
│   ├── prompts/           # Prompt templates
│   ├── utils/             # Utility functions
│   └── index.ts           # CLI entry point
├── dist/                  # Build output
├── prompts/               # Bundled prompt templates
├── docs/                  # Documentation
├── scripts/               # Build and utility scripts
└── package.json           # Package configuration
```

### Package Management

* Use `pnpm` for package management, builds, tests, and CI (configured in package.json).
* `pnpm run lint && pnpm run build:types && pnpm test` required before merge.
* Feature branches only. Use squash merges.
* Run full CI checks locally before pushing: `pnpm run ci:local`

### NPM Package Focus

This repository has a single, focused purpose: building and maintaining the `@bobmatnyc/ai-code-review` npm package. The package serves dual purposes:

1. **CLI Tool**: Direct execution via the published binary
2. **Library**: Importable modules for integration into other applications

Future extensions (web apps, VS Code extensions, GitHub Actions) should consume this package as a dependency rather than being included in this repository.

---

## ✅ 5. Best Practices

* Use modern, community-validated standards.
* Prefer mature, well-supported libraries.
* Explain any deviations from best practices.
* Confirm before changing behavior, logic, or architecture.

---

## 🧪 6. Testing Standards

* All utilities and APIs must have unit tests.
* Use **Jest** (`pnpm test`).
* Minimum 80% coverage unless annotated with `@low-test-priority`.
* Avoid snapshots unless explicitly justified.
* Prefer real API interactions over mocks.
* Ensure all mocked modules match actual export signatures.

---

## ⚙️ 7. CI / DevOps

* Pre-commit hooks must run lint, type-check, and tests.
* Do not merge if any check fails.
* Verify CI status before closing any ticket.
* Secrets must go in `.env.local` – never hardcoded.
* All API clients must include comments: purpose, inputs, outputs.

### CI Pre-flight Checklist

Before pushing changes or closing tickets:

1. **Run full CI locally:**
   ```bash
   pnpm run lint
   pnpm run build:types
   pnpm test
   pnpm run build
   ```

2. **Fix all errors before pushing** – don't rely on CI to catch issues
3. **Verify pnpm-lock.yaml** is up to date: `pnpm install`
4. **Check for unused imports** – remove them to avoid lint errors
5. **Verify module case sensitivity** – ensure all imports match actual filenames

---

## 📘 8. Documentation

* Document *intent* as well as behavior.
* Use JSDoc with full TypeScript annotations.
* Comment all API interactions clearly.

---

## 🔭 9. Code Quality & Workflow

* Run linting and type checks after every change.
* Build and verify tests before handing off code.
* Follow existing conventions and naming patterns.
* Fix all lint/type errors before pushing changes.

### Common Issues to Watch For

1. **Module Resolution:**
   - Use exact case for imports (e.g., `pathValidator.ts` not `PathValidator.ts`)
   - Export all utilities from their index files
   - Ensure mocked modules in tests match actual exports

2. **TypeScript Compilation:**
   - Remove unused imports immediately
   - Use proper types, avoid `any`
   - Ensure all files are included in `tsconfig.json`

3. **Package Management:**
   - Always run `pnpm install` after changing dependencies
   - Keep `pnpm-lock.yaml` synchronized
   - Use pnpm for all package management operations

### Fallback Behavior

1. **API Client Selection:**
   - Never implement automatic fallbacks between AI services
   - If the user's configured service is unavailable, fail with a clear error
   - List all available options in error messages
   - Fallback strategies must be explicitly configured by the user

2. **Configuration Failures:**
   - When required environment variables are missing, fail immediately
   - Provide specific guidance on which variables need to be set
   - Never assume a default service or configuration
   - Always respect user intent - if they configured Service A, never use Service B

3. **Error Messages:**
   - Include actionable steps to resolve configuration issues
   - List specific environment variables needed
   - Provide example values or formats where appropriate

---

## 📝 10. Design Documents

Design documents live in `docs/design/` and are required for all substantial features, architecture changes, or systems work. They provide a persistent source of truth for human and AI collaborators.

### 📌 Purpose

Design docs should:
- Capture **intent** and **trade-offs** before implementation.
- Guide decisions, discussions, and downstream work (testing, docs, API boundaries).
- Serve as onboarding material for new engineers or agents picking up the system.

### 📄 Structure

```md
# Feature Name or System Title

## Summary
What is this and why are we doing it?

## Problem
The pain point, friction, or opportunity this addresses.

## Goals & Non-goals
Explicit scope boundaries.

## Product Considerations
User needs, performance, accessibility, regulatory impacts.

## Technical Design
Architecture, key components, protocols, libraries, and rationale.

## Implementation Plan
Phased rollout or sequencing steps.

## Open Questions
Unresolved items or future revisits.

## References
Link related issues, PRs, or past work.
```

### 🔗 Workflow Expectations

- Each major issue in `PROJECT.md` **must reference a design doc** in `docs/design/` unless trivial.
- GitHub Issues proposing large features must either embed or link to the doc.
- Revisit/update the design doc post-launch with a closing summary.

---

## 🔁 11. Development Workflow

**For complete workflow procedures, see [`docs/WORKFLOW.md`](./WORKFLOW.md)**

### Quick Reference

- **Git Workflow**: Feature branches, conventional commits, squash merges
- **Issue Tracking**: GitHub Issues with structured labels and milestones
- **Milestones**: Use GitHub API for creation (gh CLI doesn't support milestones)
- **Design Docs**: Required for major features in `docs/design/`

### Milestone API Commands

```bash
# Create milestone via GitHub API
gh api repos/OWNER/REPO/milestones --method POST \
  --field title='Phase Name' \
  --field description='Phase description' \
  --field due_on='2025-12-31T23:59:59Z'

# Assign issue to milestone
gh issue edit ISSUE_NUMBER --milestone 'Phase Name'
```

See `docs/WORKFLOW.md` for complete procedures, templates, and examples.

---

## 🚀 12. Quick Reference: CI Commands

Run these commands before pushing any changes:

```bash
# Full CI check (run all in sequence)
pnpm run lint          # Check code style
pnpm run build:types   # Check TypeScript types
pnpm test             # Run all tests
pnpm run build        # Build the project

# Fix common issues
pnpm install          # Sync pnpm-lock.yaml
pnpm run lint:fix     # Auto-fix lint issues (if available)

# Verify everything at once
pnpm run ci:local     # Run full CI pipeline locally (if configured)
```

---

## 👁️ Final Note

This document provides the core development principles and standards.
For complete workflow procedures, issue management, and Git practices, see [`docs/WORKFLOW.md`](./WORKFLOW.md).

Issues aren't just tasks—they're **shared context**.
Design docs make that context durable.

Write them like you're briefing a future teammate (or future you).
Clear standards and thoughtful docs create speed later.