# Research: Completion Tables HTML Rendering

**Date**: 2026-04-15
**Scope**: How markdown tables in review output can be rendered as HTML for web/GUI clients
**Classification**: Actionable

---

## 1. Where Tables Are Generated

### Metadata Table (always present in every review output)

**`src/formatters/utils/MetadataFormatter.ts`, line 52**

```typescript
let metadataSection = `## Metadata\n| Property | Value |\n|----------|-------|\n| Review Type | ${reviewType} |\n| Generated At | ${formattedDate} |\n| Model Provider | ${modelVendor} |\n| Model Name | ${modelName} |`;
```

Additional rows appended at lines 56–88:
- `| Detected Language | ... |`
- `| Detected Framework | ... |`
- `| CSS Frameworks | ... |`
- `| Input Tokens | ... |` through `| Estimated Cost | ... |`
- `| Multi-pass Review | ... |`
- `| Tool Version | ... |`
- `| Command Options | ... |`

This is the **primary completion/summary table** that appears in every output.

---

### Grading Table (consolidated reviews)

**`src/utils/review/consolidateReview.ts`, lines 763–771**

```
| Category | Grade | Justification |
|----------|-------|---------------|
| Functionality | B | ... |
| Code Quality | B- | ... |
...
```

This is a fallback table generated when multi-pass consolidation produces no parseable findings. It is hardcoded string content in the `createFallbackConsolidatedReview()` function.

---

### Inline Metadata Table in `formatSimpleMarkdown`

**`src/formatters/utils/MarkdownFormatters.ts`, lines 484–512**

```typescript
const modelMetadata = !metadataSection
  ? `## Metadata\n| Property | Value |\n|----------|-------|\n| Review Type | ${reviewType} |\n| Generated At | ... |\n| Model Provider | ${modelVendor} |\n| Model Name | ${modelName} |${cost ? `\n| Input Tokens | ... |` : ''}...`
  : '';
```

This is a secondary metadata table generated as fallback when no `metadataSection` is provided.

---

### Schema-based Review Metadata Table

**`src/formatters/utils/MarkdownFormatters.ts`, lines 616–622**

```typescript
metadataSection = `## Metadata\n| Property | Value |\n|----------|-------|\n| Review Type | ${reviewType} |\n| Generated At | ${formattedDate} |\n| Model Provider | ${modelVendor} |\n| Model Name | ${modelName} |`;
```

---

### No Tables in Prompt Templates

Checked all files under `promptText/` — no markdown table syntax in `.hbs` templates. Tables only appear in code-generated output, not from AI model responses passed through.

---

## 2. Current Output Pipeline

```
CLI / Library / MCP
       |
       v
orchestrateReview()          -- src/core/reviewOrchestrator.ts
       |
       v
ReviewResult { content, structuredData, outputFormat, ... }
       |
       v
formatReviewOutput(review, format)  -- src/formatters/outputFormatter.ts:30
       |
       +-- format === 'json'  --> formatAsJson()   -- utils/JsonFormatter.ts
       |
       +-- format === 'markdown' (default) --> formatAsMarkdown()  -- utils/MarkdownFormatters.ts
                                                      |
                                                      +--> formatMetadataSection()  [TABLES HERE]
                                                      +--> formatStructuredData()
                                                      +--> formatSimpleMarkdown()   [TABLES HERE]
                                                      +--> formatSchemaBasedReviewAsMarkdown() [TABLES HERE]
       |
       v
saveReviewOutput() / stdout / MCP tool response
```

### Web/Library path

`src/lib/index.ts:performCodeReview()` calls `orchestrateReview()` then returns the raw `ReviewResult` object. The `outputFormat` defaults to `'json'` for library mode (line 155). The raw `ReviewResult.content` field still contains markdown text with `| | |` tables embedded — the JSON wrapper only wraps metadata, not the content string.

### MCP path

`src/mcp/tools/CodeReviewTool.ts` accepts `outputFormat: 'markdown' | 'json'` (line 56–60), defaults to `'markdown'` (line 101). It calls `orchestrateReview()` and returns the result directly.

---

## 3. Format Switching Mechanism

### CLI flag

**`src/cli/argumentParser.ts`, line 98–103**:
```typescript
.option('output', {
  alias: 'o',
  describe: 'Output format (markdown or json)',
  choices: validOutputFormats,   // ['markdown', 'json']
  default: 'markdown',
})
```

### Config file

**`src/core/ConfigurationService.ts`, line 41**:
```typescript
outputFormat: z.enum(['markdown', 'json']).default('markdown'),
```

Priority chain at line 407–410:
```
CLI --output flag > AI_CODE_REVIEW_OUTPUT_FORMAT env var > project config file > default ('markdown')
```

### In `ReviewOptions` type

**`src/types/review.ts`, line 281**:
```typescript
outputFormat?: string;
```

The `output` property (not `outputFormat`) is the active CLI-facing field. `outputFormat` is the library-facing field.

**There is no `html` output format.** Only `'markdown'` and `'json'` exist.

---

## 4. What Needs to Change for HTML Table Rendering in Web Clients

### Option A: Add `'html'` as a third output format (full server-side rendering)

Requires changes at:

1. **`src/cli/argumentParser.ts` line 37**:
   ```typescript
   const validOutputFormats = ['markdown', 'json', 'html'];
   ```

2. **`src/core/ConfigurationService.ts` line 41**:
   ```typescript
   outputFormat: z.enum(['markdown', 'json', 'html']).default('markdown'),
   ```

3. **`src/formatters/outputFormatter.ts` line 44**:
   ```typescript
   if (format === 'json') return formatAsJson(review);
   if (format === 'html') return formatAsHtml(review);  // new branch
   return formatAsMarkdown(review);
   ```

4. **New file `src/formatters/utils/HtmlFormatters.ts`**: Mirror of `MarkdownFormatters.ts` that emits `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>` instead of `| col |` syntax.

   The two table-generating functions that must be HTML-ified:
   - `formatMetadataSection()` in `MetadataFormatter.ts:52` (every review)
   - `formatSimpleMarkdown()` metadata block in `MarkdownFormatters.ts:484`
   - `formatSchemaBasedReviewAsMarkdown()` in `MarkdownFormatters.ts:616`
   - Hardcoded grading table in `consolidateReview.ts:763`

---

### Option B: Post-process markdown to HTML in the library/web layer (no server changes)

The library already returns `ReviewResult` with `content` as a markdown string. A web consumer can pass that string through a markdown-to-HTML renderer (e.g. `marked`, `remark`, `markdown-it`) which natively converts `| col |` tables to `<table>` elements.

This requires **zero changes** to the core codebase. The web client just does:

```typescript
import { marked } from 'marked';
const result = await performCodeReview({ target, config });
const html = marked(result.content);  // tables become <table>...</table>
```

---

### Option C: Add `renderAsHtml` utility in library exports (thin wrapper)

Add to `src/lib/index.ts`:
```typescript
export function renderResultAsHtml(result: ReviewResult): string {
  const markdown = formatReviewOutput(result, 'markdown');
  return marked(markdown);  // or any markdown renderer
}
```

This keeps the core output pipeline untouched and provides a clean HTML entry point for web consumers.

---

## Summary Table

| Location | Table Type | Line(s) | Present In |
|----------|-----------|---------|------------|
| `src/formatters/utils/MetadataFormatter.ts` | Metadata (Property/Value) | 52, 56–88 | Every review |
| `src/formatters/utils/MarkdownFormatters.ts` | Metadata fallback | 484–512 | Simple markdown path |
| `src/formatters/utils/MarkdownFormatters.ts` | Metadata (schema) | 616–622 | Schema-based reviews |
| `src/utils/review/consolidateReview.ts` | Grading (Category/Grade) | 763–771 | Consolidated fallback |

The **only** format-switching hook is `formatReviewOutput()` at `src/formatters/outputFormatter.ts:30`. Adding `'html'` as a format there, or post-processing the markdown output in the consumer, are the two clean paths forward.
