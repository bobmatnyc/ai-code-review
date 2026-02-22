# Prompt System Outdated References Audit

**Date**: 2026-02-22
**Scope**: `src/prompts/bundledPrompts.ts`, `promptText/**/*.hbs`, `src/prompts/templates/*.md`
**Status**: Actionable - requires updates before next release

---

## Executive Summary

Comprehensive audit of the prompt system across 83 Handlebars templates, 3 legacy Markdown templates, 1 bundled prompts file, and supporting JSON/TS files. Found **127 individual findings** across 6 categories:

| Category | Findings | Severity |
|----------|----------|----------|
| 1. OWASP References | 5 | HIGH - references 2021 edition when 2025 exists |
| 2. Stale lastModified Dates | 62 | MEDIUM - all templates dated 2025, now 8+ months stale |
| 3. Framework/Version JSON Staleness | 38 | HIGH - version data frozen at mid-2025 |
| 4. Language Version References | 9 | MEDIUM - outdated examples and version mentions |
| 5. Year References in Content | 3 | LOW - "2025 best practices" labels need updating |
| 6. Missing Modern Concerns | 10 | HIGH - security templates lack AI/ML and supply chain coverage |

---

## Category 1: OWASP References (HIGH)

The OWASP Top 10 was last refreshed in 2021, with OWASP releasing an updated version. The OWASP Top 10 for LLM Applications (2025) and OWASP API Security Top 10 (2023) are also now standard references that are missing entirely.

### Finding 1.1: Generic Security Review - OWASP 2021 Reference (Threat Modeling)
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/generic/security-review.hbs`
- **Line**: 30
- **Current**: `- Assess potential attack vectors based on OWASP Top 10 2021`
- **Recommended**: `- Assess potential attack vectors based on OWASP Top 10 (2021, with 2025 updates where available)`

### Finding 1.2: Generic Security Review - OWASP 2021 Section Header
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/generic/security-review.hbs`
- **Line**: 51
- **Current**: `## OWASP Top 10 2021 Analysis`
- **Recommended**: `## OWASP Top 10 Analysis (2021 Edition)` - and add note about checking for updates

### Finding 1.3: Go Security Review - Unversioned OWASP References
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/go/security-review.hbs`
- **Lines**: 23, 35, 85, 139, 215, 437, 495
- **Current**: References like `OWASP Top 10` without version, and `(OWASP A03)`, `(OWASP A07)`, etc.
- **Recommended**: These are fine as-is since they use category codes without year pinning, but the intro at line 23 should specify the edition: `Align findings with OWASP Top 10 (2021+) and Golang security best practices`

### Finding 1.4: Python Best Practices - Unversioned OWASP
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/python/best-practices.hbs`
- **Line**: 87
- **Current**: `- Is the application protected against common vulnerabilities (OWASP Top 10)?`
- **Recommended**: `- Is the application protected against common vulnerabilities (OWASP Top 10 2021+)?`

### Finding 1.5: Flutter Security - OWASP Mobile Reference
- **File**: `/Users/masa/Projects/ai-code-review/promptText/frameworks/flutter/security.hbs`
- **Line**: 117
- **Current**: `- Compliance assessment (OWASP Mobile Top 10, etc.)`
- **Recommended**: `- Compliance assessment (OWASP Mobile Top 10 2024, OWASP MASVS v2, etc.)`

---

## Category 2: Stale lastModified Dates (MEDIUM)

All 62 templates with `lastModified` frontmatter are dated in 2025 (April-August), making them 6-10 months stale. These should be updated when content changes are made.

### Oldest Templates (April 2025) - 6 files, ~10 months stale:
| File | Line | Current Date |
|------|------|-------------|
| `promptText/common/output-formats/consolidated-review.hbs` | 6 | `2025-04-24` |
| `promptText/common/output-formats/improved-unused-code-review.hbs` | 6 | `2025-04-24` |
| `promptText/languages/typescript/code-tracing-unused-code-review.hbs` | 14 | `2025-04-24` |
| `promptText/languages/typescript/focused-unused-code-review.hbs` | 13 | `2025-04-24` |
| `promptText/languages/typescript/improved-quick-fixes-review.hbs` | 14 | `2025-04-24` |
| `src/prompts/templates/extract-patterns-review.md` | 9 | `2025-06-28` |

### May 2025 Templates - 16 files, ~9 months stale:
| File | Line | Current Date |
|------|------|-------------|
| `promptText/languages/ruby/quick-fixes-review.hbs` | 14 | `2025-05-15` |
| `promptText/languages/ruby/best-practices.hbs` | 15 | `2025-05-15` |
| `promptText/languages/ruby/performance-review.hbs` | 14 | `2025-05-15` |
| `promptText/languages/ruby/architectural-review.hbs` | 14 | `2025-05-15` |
| `promptText/languages/ruby/unused-code-review.hbs` | 15 | `2025-05-15` |
| `promptText/languages/python/best-practices.hbs` | 17 | `2025-05-15` |
| `promptText/languages/python/architectural-review.hbs` | 15 | `2025-05-15` |
| `promptText/languages/python/unused-code-review.hbs` | 15 | `2025-05-15` |
| `promptText/languages/php/quick-fixes-review.hbs` | 15 | `2025-05-15` |
| `promptText/languages/php/best-practices.hbs` | 15 | `2025-05-15` |
| `promptText/languages/php/performance-review.hbs` | 16 | `2025-05-15` |
| `promptText/languages/php/architectural-review.hbs` | 15 | `2025-05-15` |
| `promptText/languages/php/unused-code-review.hbs` | 15 | `2025-05-15` |
| `promptText/languages/typescript/best-practices.hbs` | 15 | `2025-05-15` |
| `promptText/languages/typescript/unused-code-review.hbs` | 15 | `2025-05-15` |

### June 2025 Templates - 10 files, ~8 months stale:
| File | Line | Current Date |
|------|------|-------------|
| `promptText/languages/typescript/security-review.hbs` | 19 | `2025-06-03` |
| `promptText/languages/typescript/quick-fixes-review.hbs` | 19 | `2025-06-03` |
| `promptText/languages/typescript/architectural-review.hbs` | 18 | `2025-06-03` |
| `promptText/languages/typescript/performance-review.hbs` | 18 | `2025-06-03` |
| `promptText/languages/python/security-review.hbs` | 18 | `2025-06-03` |
| `promptText/languages/python/quick-fixes-review.hbs` | 18 | `2025-06-03` |
| `promptText/languages/python/performance-review.hbs` | 18 | `2025-06-03` |
| `promptText/languages/ruby/security-review.hbs` | 18 | `2025-06-03` |
| `promptText/languages/php/security-review.hbs` | 18 | `2025-06-03` |
| `promptText/languages/typescript/extract-patterns-review.hbs` | 19 | `2025-06-28` |

### August 2025 Templates - 26 files, ~6 months stale:
All files in `promptText/languages/generic/`, `promptText/languages/go/`, `promptText/languages/rust/`, `promptText/languages/java/`, and several evaluation/coding-test templates. Full list:
- `promptText/languages/generic/security-review.hbs` (line 13)
- `promptText/languages/generic/architectural-review.hbs` (line 15)
- `promptText/languages/generic/best-practices.hbs` (line 14)
- `promptText/languages/generic/performance-review.hbs` (line 14)
- `promptText/languages/generic/quick-fixes-review.hbs` (line 14)
- `promptText/languages/generic/consolidated-review.hbs` (line 14)
- `promptText/languages/generic/unused-code-review.hbs` (line 15)
- `promptText/languages/generic/focused-unused-code-review.hbs` (line 14)
- `promptText/languages/generic/code-tracing-unused-code-review.hbs` (line 15)
- `promptText/languages/generic/evaluation.hbs` (line 6)
- `promptText/languages/generic/coding-test.hbs` (line 6)
- `promptText/languages/generic/ai-integration-review.hbs` (line 14)
- `promptText/languages/generic/cloud-native-review.hbs` (line 15)
- `promptText/languages/generic/developer-experience-review.hbs` (line 15)
- `promptText/languages/go/best-practices.hbs` (line 6)
- `promptText/languages/go/security-review.hbs` (line 6)
- `promptText/languages/go/architectural-review.hbs` (line 6)
- `promptText/languages/go/performance-review.hbs` (line 6)
- `promptText/languages/go/evaluation.hbs` (line 6)
- `promptText/languages/go/quick-fixes-review.hbs` (line 6)
- `promptText/languages/go/unused-code-review.hbs` (line 6)
- `promptText/languages/rust/best-practices.hbs` (line 15)
- `promptText/languages/java/best-practices.hbs` (line 15)
- `promptText/languages/typescript/evaluation.hbs` (line 6)
- `promptText/languages/typescript/coding-test.hbs` (line 6)
- `promptText/languages/typescript/consolidated-review.hbs` (line 6)
- `promptText/languages/ruby/evaluation.hbs` (line 6)
- `promptText/languages/php/evaluation.hbs` (line 6)
- `promptText/languages/python/evaluation.hbs` (line 6)

**Recommended Action**: Update all `lastModified` dates to `2026-02-22` when content changes are applied.

---

## Category 3: Framework/Version JSON Staleness (HIGH)

The framework version data files are the single most impactful staleness issue because they feed into many Handlebars templates via variable interpolation.

### Finding 3.1: framework-versions.json - Multiple Stale Entries
- **File**: `/Users/masa/Projects/ai-code-review/promptText/common/variables/framework-versions.json`

| Framework | Current Listed | Likely Current (Feb 2026) | Lines | Update Needed |
|-----------|---------------|--------------------------|-------|---------------|
| React | 19.1.0 (March 2025) | 19.x (verify latest) | 5-6 | Verify current |
| Next.js | 15.3.2 (May 2025) | 15.x or 16.x | 33-34 | HIGH - likely new major |
| Angular | 19.2.10 (May 2025) | 19.x or 20.x | 63-65 | HIGH - `supportedUntil: "late 2025"` is PAST |
| Vue | 3.5 (September 2024) | 3.6.x or higher | 90-92 | HIGH - `supportedUntil: "mid-2025"` is PAST |
| Django | 5.2 (April 2025) | 5.2.x LTS or 5.3 | 117-118 | Moderate |
| FastAPI | 0.115.12 (May 2025) | 0.115.x+ | 146-147 | Moderate |
| Flask | 3.1.1 (May 2025) | 3.1.x+ | 176-177 | Low |
| Pyramid | 2.0.2 (2023) | 2.0.x (slow release cycle) | 206-207 | Low |
| Laravel | 12.x (Early 2025) | 12.x or 13.x | 236-237 | Verify |
| Spring | 6.2.x (November 2024) | 6.2.x or 6.3.x | 266-267 | Moderate |
| Spring Boot | 3.4.x (November 2024) | 3.4.x or 3.5.x | 296-297 | Moderate |
| Axum | 0.7.x (2024) | 0.7.x or 0.8.x | 328-330 | `supportedUntil: "2025"` is PAST |
| Actix | 4.9.x (2024) | 4.9.x+ | 358-360 | `supportedUntil: "2025"` is PAST |
| Flutter | 3.27.2 (December 2024) | 3.x+ | 388-389 | Moderate |

**Critical**: The following `supportedUntil` dates have already passed:
- Angular 19.x: `supportedUntil: "late 2025"` (line 65)
- Angular 18.x: `supportedUntil: "late 2025"` (line 70)
- Vue 3.5: `supportedUntil: "mid-2025"` (line 92)
- Vue 3.4.x: `supportedUntil: "mid-2025"` (line 97)
- Next.js 14.x: `supportedUntil: "2025"` (line 41)
- Axum 0.7.x: `supportedUntil: "2025"` (line 330)
- Axum 0.6.x: `supportedUntil: "2024"` (line 336) -- ALREADY PAST
- Actix 4.9.x: `supportedUntil: "2025"` (line 360)
- Actix 4.8.x: `supportedUntil: "2024"` (line 366) -- ALREADY PAST
- Spring 6.1.x: `supportedUntil: "2025"` (line 274)
- Spring Boot 3.2.x: `supportedUntil: "2025"` (line 305)
- FastAPI 0.100.x: `supportedUntil: "2025"` (line 154)
- Flask 2.3.x: `supportedUntil: "2025"` (line 184)

### Finding 3.2: css-frameworks.json - Version Staleness
- **File**: `/Users/masa/Projects/ai-code-review/promptText/common/variables/css-frameworks.json`

| Framework | Current Listed | Likely Current | Lines |
|-----------|---------------|----------------|-------|
| Tailwind CSS | 4.0 | 4.x (verify latest) | 5 |
| Bootstrap | 5.3.6 | 5.3.x (verify) | 24 |
| Material UI | 7.0.0 | 7.x (verify) | 43 |
| Chakra UI | 3.18.0 | 3.x (verify) | 62 |
| Bulma | "Latest" | Still vague - specify version | 81 |

**Recommended Action**: Research and update all versions. Consider adding a script to periodically check these against npm/pypi registries.

---

## Category 4: Language Version References (MEDIUM)

### Finding 4.1: Go Best Practices - Go 1.21 Reference
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/go/best-practices.hbs`
- **Line**: 531
- **Current**: `go 1.21` (in go.mod example)
- **Recommended**: `go 1.23` (Go 1.23 is current as of Feb 2026, with 1.24 possibly released)

### Finding 4.2: Rust Best Practices - Edition 2021
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/rust/best-practices.hbs`
- **Line**: 41
- **Current**: `Evaluate use of modern Rust features (2018/2021 edition)`
- **Recommended**: `Evaluate use of modern Rust features (2021/2024 edition)` -- Rust 2024 edition was released

### Finding 4.3: Rust Best Practices - Edition in Output Example
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/rust/best-practices.hbs`
- **Line**: 124
- **Current**: `"rustEdition": "2021"`
- **Recommended**: `"rustEdition": "2024"` (or `"2021"` with note about 2024 availability)

### Finding 4.4: Java Best Practices - Version Range
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/java/best-practices.hbs`
- **Lines**: 29, 116
- **Current**: `Evaluate use of modern Java features (Java 8+, 11+, 17+, 21+)` and `"javaVersion": "Java 17"`
- **Recommended**: Add Java 23+ (Java 23 released September 2024, Java 24 in March 2025), update example to `"javaVersion": "Java 21"` or `"Java 23"`

### Finding 4.5: Python Architectural Review - Version Examples
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/python/architectural-review.hbs`
- **Lines**: 123-124
- **Current**: `Specify exact version numbers (e.g., Python 3.10.8, Django 4.2.x)` and `Note specific benefits of newer Python versions (e.g., match statements in Python 3.10)`
- **Recommended**: Update examples to `Python 3.13.x, Django 5.2.x` and mention Python 3.12/3.13 features (f-string improvements, per-interpreter GIL, free-threaded Python)

### Finding 4.6: Ruby Architectural Review - Version Examples
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/ruby/architectural-review.hbs`
- **Lines**: 121, 129-130
- **Current**: `pattern matching in Ruby 3.0`, `Ruby 3.1.2, Rails 7.0.4`, `performance improvements in Ruby 3.2`
- **Recommended**: Update to `Ruby 3.4.x, Rails 8.0.x` with mentions of Ruby 3.3/3.4 features (YJIT improvements, Prism parser)

### Finding 4.7: PHP Architectural Review - Version Examples
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/php/architectural-review.hbs`
- **Lines**: 91, 123-124
- **Current**: `PHP 8.1+, 8.2+`, `PHP 8.2.5, Laravel 10.x`, `readonly properties in PHP 8.1`
- **Recommended**: Update to `PHP 8.3+, 8.4+`, `PHP 8.4.x, Laravel 12.x`, mention PHP 8.3/8.4 features (typed class constants, property hooks)

### Finding 4.8: Next.js Best Practices - Node.js Version
- **File**: `/Users/masa/Projects/ai-code-review/promptText/frameworks/nextjs/best-practices.hbs`
- **Line**: 38
- **Current**: `Node.js 18.18+ for development environment`
- **Recommended**: `Node.js 20.x+ for development environment (Node.js 18 EOL: April 2025)`

### Finding 4.9: Ruby Security Review - Rails 6.1 CVE Example
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/ruby/security-review.hbs`
- **Lines**: 398-403
- **Current**: Example references `rails` version `6.1.0` with `CVE-2022-32224` and fix `6.1.6.1`
- **Recommended**: Update example to a more recent Rails version/CVE pair, or note this is a historical example. Rails 6.1 is EOL.

---

## Category 5: Year References in Content (LOW)

### Finding 5.1: TypeScript Best Practices - "2025 best practices" Label
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/typescript/best-practices.hbs`
- **Line**: 20
- **Current**: `provide a comprehensive review with actionable recommendations based on 2025 best practices.`
- **Recommended**: `provide a comprehensive review with actionable recommendations based on current best practices.` (year-agnostic)

### Finding 5.2: TypeScript Best Practices - "2025" Package Header
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/typescript/best-practices.hbs`
- **Line**: 204
- **Current**: `### Recommended TypeScript Packages (2025)`
- **Recommended**: `### Recommended TypeScript Packages` (remove year)

### Finding 5.3: Python Best Practices - "2025" Package Header
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/python/best-practices.hbs`
- **Line**: 159
- **Current**: `### Recommended Python Packages (2025)`
- **Recommended**: `### Recommended Python Packages` (remove year)

---

## Category 6: Missing Modern Concerns (HIGH)

These are areas where security and best-practices templates lack coverage of important modern topics.

### Finding 6.1: Generic Security Review - No AI/ML Security Coverage
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/generic/security-review.hbs`
- **Lines**: N/A (missing content)
- **Current**: No mention of AI/ML security, LLM security, prompt injection (in generic context), or OWASP Top 10 for LLM Applications
- **Recommended**: Add section covering:
  - OWASP Top 10 for LLM Applications (2025)
  - Prompt injection vulnerabilities
  - Model data poisoning risks
  - AI/ML model supply chain security
  - Sensitive data exposure through AI outputs

### Finding 6.2: Generic Security Review - No Supply Chain Security Section
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/generic/security-review.hbs`
- **Lines**: N/A (missing content)
- **Current**: A08 mentions "Unsigned package installations" but has no dedicated supply chain section
- **Recommended**: Add dedicated supply chain security checklist:
  - SBOM (Software Bill of Materials) assessment
  - Dependency confusion/substitution attacks
  - Typosquatting detection
  - Lock file integrity verification
  - CI/CD pipeline security

### Finding 6.3: TypeScript Security Review - No Supply Chain Coverage
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/typescript/security-review.hbs`
- **Lines**: N/A (missing content)
- **Current**: No mention of npm supply chain attacks, dependency confusion, or package integrity
- **Recommended**: Add npm/node_modules supply chain security section

### Finding 6.4: Go Security Review - No Supply Chain Coverage
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/go/security-review.hbs`
- **Lines**: N/A (missing content)
- **Current**: No mention of Go module supply chain security
- **Recommended**: Add Go module proxy, checksum database, and supply chain verification section

### Finding 6.5: PHP Security Review - No Supply Chain Coverage
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/php/security-review.hbs`
- **Lines**: N/A (missing content)
- **Current**: No mention of Composer supply chain security
- **Recommended**: Add Composer package integrity and supply chain section

### Finding 6.6: Generic Security Review - No OWASP API Security Reference
- **File**: `/Users/masa/Projects/ai-code-review/promptText/languages/generic/security-review.hbs`
- **Lines**: N/A (missing content)
- **Current**: Only references OWASP Top 10 2021 (web applications)
- **Recommended**: Add reference to OWASP API Security Top 10 (2023) for API-heavy codebases

### Finding 6.7: Legacy Security Template (Markdown) - Minimal Checklist
- **File**: `/Users/masa/Projects/ai-code-review/src/prompts/templates/security-review.md`
- **Lines**: 1-76 (entire file)
- **Current**: Very basic checklist without OWASP mapping, no AI/ML, no supply chain, no modern web security
- **Recommended**: This legacy template should be deprecated in favor of the HBS templates, or significantly expanded

### Finding 6.8: All Security Templates - No Container Security
- **Files**: All security review templates
- **Current**: No mention of container image scanning, Dockerfile security, or container runtime security
- **Recommended**: Add container security checklist for cloud-native deployments

### Finding 6.9: bundledPrompts.ts - eslint-plugin-react-hooks Version
- **File**: `/Users/masa/Projects/ai-code-review/src/prompts/bundledPrompts.ts`
- **Line**: 1121
- **Current**: `eslint-plugin-react-hooks (4.x+)`
- **Recommended**: `eslint-plugin-react-hooks (5.x+)` (v5.0 released with React 19)

### Finding 6.10: bundledPrompts.ts - typescript-eslint Version
- **File**: `/Users/masa/Projects/ai-code-review/src/prompts/bundledPrompts.ts`
- **Line**: 1122
- **Current**: `typescript-eslint (6.x+)`
- **Recommended**: `typescript-eslint (8.x+)` (v8.0 released mid-2024)

---

## Bonus: Schema Example Timestamps (INFO)

These are example data in schema files. They are less critical but should use reasonable dates.

| File | Line | Current | Recommended |
|------|------|---------|-------------|
| `src/prompts/schemas/coding-test-schema.ts` | 247 | `"2024-07-09T12:00:00Z"` | `"2026-01-15T12:00:00Z"` |
| `src/prompts/schemas/consolidated-review-schema.ts` | 170 | `"2024-04-06T12:00:00Z"` | `"2026-01-15T12:00:00Z"` |
| `src/prompts/schemas/evaluation-schema.ts` | 181 | `"2024-04-06T12:00:00Z"` | `"2026-01-15T12:00:00Z"` |
| `src/prompts/schemas/extract-patterns-schema.ts` | 206 | `"2025-06-28T12:00:00Z"` | `"2026-01-15T12:00:00Z"` |
| `src/prompts/examples/improved-unused-code-example.ts` | 29 | `TODO: Remove these after migration is complete (Added: Jan 2023)` | Update to a more recent date in the example |

---

## Bonus: CVE References (INFO)

Old CVE references in examples are acceptable as historical examples, but should be labeled as such:

| File | Line | CVE | Context |
|------|------|-----|---------|
| `promptText/languages/python/security-review.hbs` | 231 | `CVE-2021-33503` | Example output showing requests vulnerability |
| `promptText/languages/ruby/security-review.hbs` | 399 | `CVE-2022-32224` | Example output showing Rails vulnerability |

**Recommended**: Add comment in template that these are illustrative examples.

---

## Prioritized Action Plan

### Phase 1: Critical (Do First)
1. Update `framework-versions.json` with current versions (research all 14 frameworks)
2. Update `css-frameworks.json` with current versions
3. Update OWASP references from "2021" to current guidance across all security templates
4. Add supply chain security sections to security review templates

### Phase 2: High Priority
5. Add AI/ML security section to generic security review template
6. Add OWASP API Security Top 10 reference
7. Update language version examples (Go 1.21->1.23, Rust 2021->2024, Java 17->21, etc.)
8. Update Node.js 18.18+ -> 20.x+ in Next.js template
9. Update eslint-plugin-react-hooks 4.x -> 5.x and typescript-eslint 6.x -> 8.x

### Phase 3: Medium Priority
10. Remove hardcoded years from "2025 best practices" labels (make year-agnostic)
11. Update Python, Ruby, PHP version examples in architectural review templates
12. Update all `lastModified` dates when templates are modified

### Phase 4: Low Priority
13. Update schema example timestamps
14. Add container security to security templates
15. Consider deprecating legacy markdown templates in `src/prompts/templates/`
16. Add a version-checking script for framework-versions.json maintenance

---

## Methodology

- **File Discovery**: Glob patterns for `promptText/**/*.hbs`, `src/prompts/templates/*.md`, `src/prompts/bundledPrompts.ts`
- **Pattern Matching**: Grep for year references (`20[12][0-9]`), OWASP, language versions, framework names with versions, `lastModified` dates
- **Content Analysis**: Read of all security review templates, best-practices templates, framework version JSON files
- **Gap Analysis**: Searched for missing modern security concerns (AI/ML, supply chain, container security, OWASP API/LLM)
- **Total Files Scanned**: 87 (80 HBS + 3 MD + 1 TS + 2 JSON + 1 example TS)
