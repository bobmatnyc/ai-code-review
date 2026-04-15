# Prompt System Investigation — Phase 2 Scope (Issue #90)

**Date**: 2026-04-15
**Scope**: Consolidate 3 prompt systems → 1 (HBS-only)
**Related**: Issue #90, Phase 2

---

## 1. What is in `src/prompts/bundledPrompts.ts`?

**File**: `/Users/masa/Projects/ai-code-review/src/prompts/bundledPrompts.ts`
**Lines**: 1,645

### Exported keys (namespace → review types)

| Namespace key | Review types contained |
|---|---|
| `generic` | `architectural`, `quick-fixes`, `consolidated`, `security`, `performance`, `unused-code`, `best-practices`, `evaluation`, `comprehensive`, `coding-test` |
| `typescript` | `architectural`, `best-practices`, `comprehensive`, `coding-test` |
| `typescript:react` | `best-practices` |
| `dart:flutter` | `best-practices`, `architectural`, `comprehensive` |
| `python` | `consolidated`, `architectural` |
| `dart` | `best-practices`, `comprehensive` |

**Total unique review type strings with bundled content**: `architectural`, `quick-fixes`, `consolidated`, `security`, `performance`, `unused-code`, `best-practices`, `evaluation`, `comprehensive`, `coding-test` (10 core types)

**Key exported symbols**:
- `bundledPrompts` — the raw Record object
- `USE_TEMPLATE_SYSTEM = true` — master flag, already set to use HBS
- `getBundledPrompt(reviewType, language?, framework?)` — lookup function

### How it is consumed

Consumers (grep result on `bundledPrompts|getBundledPrompt|USE_TEMPLATE_SYSTEM`):
- `/Users/masa/Projects/ai-code-review/src/prompts/PromptManager.ts` — imports `getBundledPrompt`, calls it at steps 3a, 3b, 3c of fallback chain
- `/Users/masa/Projects/ai-code-review/src/utils/promptTemplateManager.ts` — imports `checkTemplatesAvailability` + `getPromptTemplate` which `getBundledPrompt` delegates to first
- `/Users/masa/Projects/ai-code-review/src/__tests__/bundledPrompts.test.ts` — unit tests
- `/Users/masa/Projects/ai-code-review/src/__tests__/prompts/templatedBundledPrompts.test.ts` — integration tests

---

## 2. HBS template inventory vs bundled prompts

### `promptText/` directory layout

```
promptText/
  languages/
    generic/      — 14 .hbs files
    typescript/   — 13 .hbs files
    python/       —  7 .hbs files
    ruby/         —  7 .hbs files
    go/           —  7 .hbs files
    php/          —  7 .hbs files
    dart/         —  4 .hbs files
    java/         —  1 .hbs file  (best-practices only)
    rust/         —  1 .hbs file  (best-practices only)
  frameworks/
    flutter/      —  6 .hbs files
    react/        —  1 .hbs file  (best-practices only)
    nextjs/       —  1 .hbs file  (best-practices only)
    angular/      —  1 .hbs file
    django/       —  1 .hbs file
    fastapi/      —  1 .hbs file
    flask/        —  1 .hbs file
    laravel/      —  1 .hbs file
    pyramid/      —  1 .hbs file
    vue/          —  1 .hbs file
  common/
    comprehensive-review.hbs
    output-formats/  (3 partials)
    css-frameworks/  (2 partials)
    variables/       (2 JSON data files)
  schema/
    prompt-frontmatter.schema.json
```

### Coverage gap matrix: bundled namespaces vs HBS equivalents

#### `generic` namespace (10 review types in bundled)

| Review type | HBS at `languages/generic/` | Gap? |
|---|---|---|
| `architectural` | `architectural-review.hbs` | Covered |
| `quick-fixes` | `quick-fixes-review.hbs` | Covered |
| `consolidated` | `consolidated-review.hbs` | Covered |
| `security` | `security-review.hbs` | Covered |
| `performance` | `performance-review.hbs` | Covered |
| `unused-code` | `unused-code-review.hbs` | Covered |
| `best-practices` | `best-practices.hbs` | Covered |
| `evaluation` | `evaluation.hbs` | Covered |
| `comprehensive` | NOT in `languages/generic/` — only in `common/comprehensive-review.hbs` | **PARTIAL** — templateLoader lookup won't find it via normal path |
| `coding-test` | `coding-test.hbs` | Covered |

Note: `code-tracing-unused-code`, `focused-unused-code`, `ai-integration`, `cloud-native`, `developer-experience` exist as HBS in `languages/generic/` but have **no bundled prompt counterpart** — these are HBS-only already.

#### `typescript` namespace (4 review types in bundled)

| Review type | HBS at `languages/typescript/` | Gap? |
|---|---|---|
| `architectural` | `architectural-review.hbs` | Covered |
| `best-practices` | `best-practices.hbs` | Covered |
| `comprehensive` | `consolidated-review.hbs` exists but NOT `comprehensive.hbs` | **GAP** |
| `coding-test` | `coding-test.hbs` | Covered |

#### `typescript:react` namespace (1 review type in bundled)

| Review type | HBS at `frameworks/react/` | Gap? |
|---|---|---|
| `best-practices` | `best-practices.hbs` | Covered |

#### `dart:flutter` namespace (3 review types in bundled)

| Review type | HBS at `frameworks/flutter/` | Gap? |
|---|---|---|
| `best-practices` | `best-practices.hbs` | Covered |
| `architectural` | `architectural.hbs` | Covered (note: filename is `architectural.hbs` not `architectural-review.hbs`) |
| `comprehensive` | `comprehensive.hbs` | Covered |

#### `python` namespace (2 review types in bundled)

| Review type | HBS at `languages/python/` | Gap? |
|---|---|---|
| `consolidated` | NOT present — python has `architectural-review.hbs`, `best-practices.hbs`, `evaluation.hbs`, `performance-review.hbs`, `quick-fixes-review.hbs`, `security-review.hbs`, `unused-code-review.hbs` | **GAP** — no `consolidated-review.hbs` for python |
| `architectural` | `architectural-review.hbs` | Covered |

#### `dart` namespace (2 review types in bundled)

| Review type | HBS at `languages/dart/` | Gap? |
|---|---|---|
| `best-practices` | `best-practices.hbs` | Covered |
| `comprehensive` | `comprehensive.hbs` | Covered |

---

## 3. Summary of gaps (highest migration risk)

These bundled prompt keys have **no matching HBS template** and would break if bundled strings are removed:

| Bundled key | Review type | Risk | Notes |
|---|---|---|---|
| `generic.comprehensive` | `comprehensive` | HIGH | `common/comprehensive-review.hbs` exists but is not on the `languages/generic/` lookup path used by `loadPromptTemplate()` |
| `typescript.comprehensive` | `comprehensive` | HIGH | No `promptText/languages/typescript/comprehensive.hbs` |
| `python.consolidated` | `consolidated` | HIGH | No `promptText/languages/python/consolidated-review.hbs` |

**Lower risk (covered by HBS generics if language-specific falls through)**:
- `dart.best-practices`, `dart.comprehensive` — HBS files exist at `languages/dart/`
- All `flutter` entries — HBS exists in `frameworks/flutter/`
- All `typescript:react` — HBS exists in `frameworks/react/`

---

## 4. How `PromptManager.ts` / `PromptBuilder.ts` works

**Files**:
- `/Users/masa/Projects/ai-code-review/src/prompts/PromptManager.ts`
- `/Users/masa/Projects/ai-code-review/src/prompts/PromptBuilder.ts`
- `/Users/masa/Projects/ai-code-review/src/utils/templateLoader.ts`
- `/Users/masa/Projects/ai-code-review/src/utils/promptTemplateManager.ts`

### Complete fallback chain in `PromptManager.getPromptTemplate()`

```
1. PromptCache hit?  → return cached prompt
2. options.promptFile?  → load from disk, return
3. customTemplates (registered programmatically)?
   a. with framework key
   b. with language key
4. getBundledPrompt()  ← PRIMARY SOURCE
   a. getBundledPrompt calls checkTemplatesAvailability() + getPromptTemplate()  (HBS system)
      i.  loadPromptTemplate(name, language, framework)
          - Try: frameworks/{framework}/{reviewType}.hbs
          - Try: languages/{language}/{reviewType}.hbs
          - Try: languages/generic/{reviewType}.hbs
   b. If HBS not found → falls back to bundledPrompts[namespace][reviewType] string literal
5. Generic bundled prompt (no language)
6. templates (custom .md files loaded from FS) — LAST RESORT, rarely hit
7. throw Error
```

Key insight: `getBundledPrompt()` **already delegates to HBS first** (because `USE_TEMPLATE_SYSTEM = true`). The bundled string literals are already a fallback, not the primary path. The whole chain works end-to-end now.

### `PromptBuilder.ts` role

`PromptBuilder` is a component-composition helper (position: start/middle/end, priority ordering). It is **not involved in template loading** — it assembles fragments after `PromptManager` has already resolved the base prompt. It also applies provider-specific `PromptStrategy` formatting. Low coupling to the consolidation effort.

### Template variable system in `processPromptTemplate()`

`PromptManager.processPromptTemplate()` detects HBS vs legacy by sniffing for `{{#if` / `{{/if` / `{{languageInstructions}}`. It then:
- For HBS: populates `templateVars` object, calls `Handlebars.compile(template)(vars)`
- For legacy: does string `.replace('{{SCHEMA_INSTRUCTIONS}}', ...)` etc.

HBS templates use `{{#if languageInstructions}}{{{languageInstructions}}}{{/if}}` pattern (triple-brace for unescaped).

---

## 5. Legacy `src/prompts/templates/*.md` files

**Location**: `/Users/masa/Projects/ai-code-review/src/prompts/templates/`

**Files** (3 total):
- `quick-fixes-review.md` — v1.0.0, TypeScript-tagged, uses `{{LANGUAGE_INSTRUCTIONS}}` / `{{SCHEMA_INSTRUCTIONS}}` placeholders
- `security-review.md` — v1.0.0, TypeScript-tagged, same placeholder pattern
- `extract-patterns-review.md` — v2.0.0, TypeScript-tagged, uses `{{LANGUAGE_INSTRUCTIONS}}` but no `{{SCHEMA_INSTRUCTIONS}}`

**Are they imported anywhere?** No. Grep for `from.*prompts/templates` returns zero matches. They are loaded dynamically at runtime only if `PromptManager.loadTemplates()` is called on a directory containing them. The comment in `PromptManager.ts` states: "IMPORTANT: This method is only for loading CUSTOM templates. Core prompts are bundled." These files are effectively **orphaned**. They are never loaded in practice because the resolution chain hits a bundled prompt first.

**Relationship to HBS counterparts**:
- `quick-fixes-review.md` — HBS equivalent: `languages/generic/quick-fixes-review.hbs` (v2.0.0, much more detailed)
- `security-review.md` — HBS equivalent: `languages/generic/security-review.hbs`
- `extract-patterns-review.md` — HBS equivalent: `languages/typescript/extract-patterns-review.hbs`

The `.md` files are an older, shorter version of the same prompts. They are safe to delete.

---

## 6. YAML frontmatter in HBS templates

**Schema file**: `/Users/masa/Projects/ai-code-review/promptText/schema/prompt-frontmatter.schema.json`

### Required fields (from schema)

```yaml
name: string (5–100 chars)
description: string (10–500 chars)
version: string (semver pattern \d+\.\d+\.\d+)
author: string (must equal "AI Code Review Tool")
reviewType: enum (architectural|best-practices|quick-fixes|security|performance|unused-code|consolidated|evaluation|extract-patterns|coding-test|ai-integration|cloud-native|developer-experience)
language: enum (generic|typescript|javascript|python|java|csharp|go|rust|ruby|php|swift|kotlin)
tags: array[string] (1–10 items, unique)
lastModified: string (YYYY-MM-DD pattern)
```

### Optional fields

```yaml
framework: enum (react|vue|angular|svelte|nextjs|nuxt|express|fastapi|django|flask|spring|laravel|rails)
complexity: enum (basic|intermediate|advanced|expert)
estimatedTokens: integer (100–10000)
aliases: array[string]
dependencies: array[string]
```

### Example (from `languages/generic/quick-fixes-review.hbs`)

```yaml
---
name: Generic Quick Fixes Review
description: Immediate improvements with high impact and low effort for any programming language
version: 2.0.0
author: AI Code Review Tool
reviewType: quick-fixes
language: generic
tags:
  - quick-fixes
  - refactoring
  - code-quality
  - immediate-wins
  - low-effort
lastModified: '2025-08-16'
---
```

### Existing validation

**None** implemented in code. The schema JSON exists at `promptText/schema/prompt-frontmatter.schema.json` but there is no runtime validator that reads it. `templateLoader.ts` parses the `.hbs` file as-is via Handlebars — the YAML frontmatter is simply included in the raw template string passed to `Handlebars.compile()`. The frontmatter is NOT stripped before compilation, meaning it appears in rendered output verbatim unless Handlebars happens to treat `---` blocks as comments (it does not — they are rendered as-is).

This is a validation gap: malformed frontmatter will silently produce incorrect output.

---

## 7. Recommended smallest-change consolidation path

### Phase 2 implementation order (lowest risk first)

**Step 1 — Resolve the 3 coverage gaps** (creates HBS parity before removing bundled strings)

1. Create `promptText/languages/generic/comprehensive-review.hbs` — OR move/symlink `common/comprehensive-review.hbs` into `languages/generic/`. The `templateLoader.loadPromptTemplate()` lookup path only checks `languages/generic/`, not `common/`.
2. Create `promptText/languages/typescript/comprehensive.hbs` (map to template file name `comprehensive` per `reviewTypeMapping`). Note: the mapping in `promptTemplateManager.ts` does NOT include `comprehensive` — add it to `reviewTypeMapping`.
3. Create `promptText/languages/python/consolidated-review.hbs` for the Python consolidated prompt.

**Step 2 — Add `comprehensive` to `reviewTypeMapping`**

In `/Users/masa/Projects/ai-code-review/src/utils/promptTemplateManager.ts`, the `reviewTypeMapping` object currently has no `comprehensive` entry. Add:
```typescript
comprehensive: 'comprehensive-review',  // or 'comprehensive', check actual filenames
```

**Step 3 — Add frontmatter validation**

Add a lightweight validator in `templateLoader.ts` that:
- Strips the YAML frontmatter block before Handlebars compilation (prevents it rendering in output)
- Optionally validates required fields against the schema

**Step 4 — Build `UnifiedPromptManager` interface**

Thin wrapper that:
- Always delegates to `getPromptTemplate()` (HBS path)
- Throws immediately if template not found (no bundled-string fallback)
- Exposes the same signature as current `getBundledPrompt` for drop-in replacement

**Step 5 — Remove bundled string literals**

Only safe after all HBS coverage gaps are confirmed closed by tests. The `bundledPrompts` Record object (lines 22–1585 of `bundledPrompts.ts`) can be deleted. The `getBundledPrompt` function body simplifies to just calling `getPromptTemplate()`.

**Step 6 — Delete legacy `.md` templates**

Safe to delete immediately (not imported anywhere):
- `src/prompts/templates/quick-fixes-review.md`
- `src/prompts/templates/security-review.md`
- `src/prompts/templates/extract-patterns-review.md`

---

## 8. Key file paths for Phase 2

| Purpose | Path |
|---|---|
| Bundled strings to remove | `src/prompts/bundledPrompts.ts` |
| Primary HBS loader | `src/utils/templateLoader.ts` |
| HBS→bundled bridge | `src/utils/promptTemplateManager.ts` |
| PromptManager (fallback chain) | `src/prompts/PromptManager.ts` |
| PromptBuilder (composition) | `src/prompts/PromptBuilder.ts` |
| Frontmatter schema | `promptText/schema/prompt-frontmatter.schema.json` |
| Legacy .md templates (orphaned) | `src/prompts/templates/` (3 files) |
| Migration status doc | `promptText/MIGRATION-PLAN.md` |
| Tests | `src/__tests__/bundledPrompts.test.ts`, `src/__tests__/prompts/templatedBundledPrompts.test.ts` |

---

## 9. Migration risk summary

| Risk | Description | Mitigation |
|---|---|---|
| HIGH | `generic.comprehensive` has no `languages/generic/` HBS path | Create file + add `reviewTypeMapping` entry |
| HIGH | `typescript.comprehensive` has no HBS file | Create `languages/typescript/comprehensive.hbs` |
| HIGH | `python.consolidated` has no HBS file | Create `languages/python/consolidated-review.hbs` |
| MEDIUM | Frontmatter not stripped before HBS compilation | Add frontmatter stripper in `templateLoader.ts` |
| MEDIUM | No runtime frontmatter validation | Implement validator using existing schema JSON |
| LOW | `dart:flutter` naming (e.g., `architectural.hbs` vs `architectural-review.hbs`) | Verify `reviewTypeMapping` handles both filenames |
| LOW | Legacy `.md` files confuse contributors | Delete them (safe — not loaded in practice) |
