# Prompts Directory

This directory contains reference prompt templates for AI-driven code reviews.

> **IMPORTANT**: As of version 2.0, all production prompts are now bundled directly in the codebase via `src/prompts/bundledPrompts.ts`. These file-based prompts are maintained primarily for reference and customization.

## Structure

- `/prompts/` (root): Language-agnostic prompt templates for different review types
- `/prompts/<language>/`: Language-specific overrides (typescript, python, php, ruby)
- `/prompts/reference/`: Historical/specialized prompt variants (not actively used)
- `/prompts/best-practices/`: Templates for best practices reviews by language

## Core Review Types

The system supports these review types (defined in `src/types/review.ts`):

1. `architectural` (alias: `arch`): High-level architecture and design patterns
2. `quick-fixes`: Simple, high-impact improvements
3. `security`: Security vulnerabilities and best practices
4. `performance`: Performance issues and optimizations
5. `consolidated`: Comprehensive review across all aspects
6. `unused-code`: Identification of dead/unused code
7. `code-tracing-unused-code`: Enhanced unused code detection with tracing
8. `best-practices`: Language-specific idioms and patterns

## Frontmatter Schema

Each prompt file begins with YAML frontmatter, delimited by `---`. Required fields:
- `name`: string, prompt display name
- `description`: string, one-line summary
- `version`: string, prompt template version
- `author`: string, template author
- `lastModified`: string, ISO date when the prompt was last updated
- `reviewType`: string, matching one of the core review types
- `tags`: array of strings, categorization tags

Example:
```yaml
---
name: Quick Fixes Review
description: Fast review focusing on low-hanging improvements
version: 1.0.0
author: AI Code Review Tool
lastModified: 2025-04-24T00:00:00.000Z
reviewType: quick-fixes
tags:
  - quick
  - fixes
  - improvements
---
```

## Placeholders

Prompts may include placeholders that are replaced at runtime:
- `{{LANGUAGE_INSTRUCTIONS}}`: Language-specific guidance
- `{{SPECIALIZATION}}`: Area of expertise
- `{{CONTEXT}}`: Contextual description
- `{{CHECKLIST}}`: Evaluation checklist items
- `{{OUTPUT_FORMAT}}`: Required output formatting
- `{{SCHEMA_INSTRUCTIONS}}`: Instructions for interactive mode

## Adding Custom Prompts

To add a custom prompt:

1. Create a new Markdown file in the appropriate directory
2. Include valid frontmatter with required fields
3. Reference it using the `--promptFile` option:

```bash
code-review --path /path/to/code --promptFile /path/to/custom-prompt.md
```

## Validation

Run `npm run validate:prompts` to check frontmatter consistency across all prompt files.