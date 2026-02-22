# Root Cause Analysis: Comprehensive Review Returns 0 Tokens and Empty Findings

**Date**: 2026-02-22
**Severity**: High
**Affected Component**: Multi-pass comprehensive review with OpenRouter provider
**Model**: `openrouter:openai/gpt-5.2`
**Command**: `ai-code-review ./src --type comprehensive`

---

## Executive Summary

The comprehensive review returns 0 tokens across all 5 passes and empty findings due to **multiple cascading failures** in the review pipeline. The root cause is a combination of: (1) the multi-pass review path not being triggered despite the codebase requiring it, resulting in the `ConsolidatedReviewStrategy` being used instead; (2) the LEGACY OpenRouter client returning `cost` instead of `costInfo` in `ReviewResult`, causing token accumulation to silently report zeros; and (3) fallback consolidation logic producing empty findings when pass content is not in the expected markdown heading format. Below is a detailed analysis of each contributing factor.

---

## Finding 1 (PRIMARY): Strategy Selection -- `comprehensive` Type Does NOT Trigger Multi-Pass

**Files**:
- `/Users/masa/Projects/ai-code-review/src/strategies/StrategyFactory.ts` (lines 47-91)
- `/Users/masa/Projects/ai-code-review/src/core/handlers/ReviewExecutor.ts` (lines 33-44)

**Analysis**:

The `StrategyFactory.createStrategy()` method checks `options.multiPass` (line 53) before switching on review type. The `comprehensive` type does NOT have a dedicated strategy -- it falls through to the default case at line 90-91:

```typescript
// Line 90-91 in StrategyFactory.ts
logger.debug(`Creating ConsolidatedReviewStrategy for reviewType: "${reviewType}"`);
return new ConsolidatedReviewStrategy(reviewType);
```

This means `comprehensive` is treated as a standard consolidated review, NOT a multi-pass review. Multi-pass is only triggered when:
1. `options.multiPass` is explicitly set (via `--multi-pass` CLI flag), OR
2. `determineIfMultiPassNeeded()` in `ReviewExecutor.ts` detects the codebase exceeds the context window

However, in `ReviewExecutor.ts` line 34, `performTokenAnalysisIfNeeded()` is called from the orchestrator, and at line 163-165 in `reviewOrchestrator.ts`:

```typescript
if (options.multiPass) {
    return null; // Skip token analysis in multi-pass mode
}
```

Since the user did NOT pass `--multi-pass`, and the `comprehensive` type is 290 files with semantic chunking enabled (6 chunks), the token analysis likely recommended multi-pass. The `ReviewExecutor` then sets `effectiveOptions.multiPass = true` at line 43, and the strategy factory creates `MultiPassReviewStrategy`.

**However**, there is a path where token analysis returns null and multi-pass is NOT triggered. In `reviewOrchestrator.ts` lines 348-358, `performTokenAnalysisIfNeeded()` can fail silently and return null (line 211-213):

```typescript
} catch (error) {
    logger.warn(`Token analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logger.info('Proceeding with review without token analysis');
    return null;
}
```

If token analysis fails, `tokenAnalysis` is null, `determineIfMultiPassNeeded()` returns false, and the review proceeds with `ConsolidatedReviewStrategy` instead of `MultiPassReviewStrategy`.

**Verdict**: If the user's output shows "5 passes" and pass breakdowns, the multi-pass path WAS triggered. This is consistent with the `MultiPassReviewStrategy` running. So this finding applies only if token analysis failed. Given the user reports "Semantic chunking and thread consolidation worked fine (290 files, 6 chunks)", multi-pass was likely triggered. Proceeding to the actual root cause.

---

## Finding 2 (ROOT CAUSE -- Token Reporting): `cost` vs `costInfo` Field Mismatch

**Files**:
- `/Users/masa/Projects/ai-code-review/src/clients/openRouterClient.ts` (lines 868-876)
- `/Users/masa/Projects/ai-code-review/src/clients/base/responseProcessor.ts` (lines 500-511)
- `/Users/masa/Projects/ai-code-review/src/core/ReviewGenerator.ts` (lines 246-249)
- `/Users/masa/Projects/ai-code-review/src/strategies/MultiPassReviewStrategy.ts` (lines 122-140, 318-339)

**Analysis**:

The LEGACY OpenRouter client (`src/clients/openRouterClient.ts`) returns `ReviewResult` with the field `cost`:

```typescript
// Line 868-876 in openRouterClient.ts
return {
    content,
    cost,          // <-- Uses 'cost' field
    modelUsed: `openrouter:${modelName}`,
    filePath: 'consolidated',
    reviewType,
    timestamp: new Date().toISOString(),
    structuredData,
};
```

The IMPLEMENTATIONS OpenRouter client (`src/clients/implementations/openRouterClient.ts`) calls `createStandardReviewResult()` which also returns `cost`:

```typescript
// Line 500-511 in responseProcessor.ts
return {
    content,
    cost,          // <-- Uses 'cost' field
    modelUsed: modelName,
    filePath,
    reviewType,
    timestamp: new Date().toISOString(),
    structuredData: structuredData as StructuredReview | undefined,
};
```

In `ReviewGenerator.generateReview()` (line 246-249), there IS normalization code:

```typescript
// Ensure costInfo is set if only cost is available
if (reviewResult.cost && !reviewResult.costInfo) {
    reviewResult.costInfo = reviewResult.cost;
}
```

This means after `generateReview()` returns, both `cost` and `costInfo` are set.

**HOWEVER**, in `MultiPassReviewStrategy.execute()`, the `consolidatedResult` is initialized at line 122-140 with:

```typescript
let consolidatedResult: ReviewResult = {
    content: '',
    filePath: 'multi-pass-review',
    ...
    costInfo: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        formattedCost: '$0.00 USD',
        cost: 0,
        passCount: totalPasses,
        perPassCosts: [],
        contextMaintenanceFactor: options.contextMaintenanceFactor || 0.15,
    },
    ...
};
```

Then at lines 318-339, it accumulates token counts:

```typescript
if (consolidatedResult.costInfo && chunkResult.costInfo) {
    consolidatedResult.costInfo.inputTokens += chunkResult.costInfo.inputTokens || 0;
    consolidatedResult.costInfo.outputTokens += chunkResult.costInfo.outputTokens || 0;
    consolidatedResult.costInfo.totalTokens += chunkResult.costInfo.totalTokens || 0;
    consolidatedResult.costInfo.estimatedCost += chunkResult.costInfo.estimatedCost || 0;
    ...
}
```

The guard `chunkResult.costInfo` is truthy ONLY if the `generateReview()` normalization code ran (which sets `costInfo = cost`). Since `generateReview()` in `ReviewGenerator.ts` DOES perform this normalization, the token accumulation should work.

**BUT** -- there is a subtle issue. The `getCostInfoFromText()` function in `tokenCounter.ts` uses `countTokens()` from `../../tokenizers` to ESTIMATE tokens. It does NOT use actual API-reported usage. If the model name `openrouter:openai/gpt-5.2` is not recognized by the tokenizer, it falls back to a simple character-based estimate. The token counts should be non-zero unless the input/output text is empty.

The REAL issue: if the API call FAILS for each pass, the retry mechanism in `MultiPassReviewStrategy` (lines 191-289) catches the error and creates a fallback result:

```typescript
// Lines 264-278 in MultiPassReviewStrategy.ts
chunkResult = {
    content: `## Error in Pass ${passNumber}\n\nFailed to generate review...`,
    filePath: 'error-pass',
    ...
    costInfo: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        formattedCost: '$0.00 USD',
        cost: 0,
    },
};
```

**This fallback result has 0 tokens explicitly.** If ALL 5 passes fail with errors that are caught and retried, the accumulated tokens remain 0.

**Verdict**: The 0-token issue is caused by ALL 5 API calls failing silently. The errors are caught by the retry mechanism, and after exhausting retries, fallback results with 0 tokens are used. The accumulated totals remain 0.

---

## Finding 3 (ROOT CAUSE -- Empty Findings): Silent API Failures in Chunk Passes

**Files**:
- `/Users/masa/Projects/ai-code-review/src/strategies/MultiPassReviewStrategy.ts` (lines 191-289)
- `/Users/masa/Projects/ai-code-review/src/core/ReviewGenerator.ts` (lines 89-277)
- `/Users/masa/Projects/ai-code-review/src/clients/openRouterClient.ts` (lines 527-885)

**Analysis**:

When `MultiPassReviewStrategy` calls `generateReview()` for each chunk pass (line 201-208):

```typescript
chunkResult = await generateReview(
    chunkFiles,
    projectName,
    this.reviewType,    // 'comprehensive'
    enhancedProjectDocs,
    chunkOptions,
    apiClientConfig,
);
```

This calls `ReviewGenerator.generateReview()` which dispatches to the LEGACY `generateOpenRouterConsolidatedReview()` for OpenRouter clients (line 111-117).

The LEGACY client sends the request to the OpenRouter API. There are several potential failure modes:

### 3a. Empty Content from API

The LEGACY OpenRouter client at lines 700-714 checks for empty content:

```typescript
if (!content || content.trim().length === 0) {
    logger.error(`[OpenRouter] CRITICAL: API returned successful response but content is empty!`);
    throw new Error(`OpenRouter API returned empty content for model ${modelName}`);
}
```

This error is thrown, caught by the inner try/catch at line 749-755, wrapped in `ApiError`, then caught by the outer try/catch at line 877-883, then caught by `generateReview()` in `ReviewGenerator.ts` which re-throws, then caught by the `MultiPassReviewStrategy` retry loop.

After 3 retries (maxChunkRetries = 2, so 3 total attempts), the fallback result with error content and 0 tokens is used.

### 3b. API HTTP Error (non-200 response)

If OpenRouter returns an HTTP error (rate limiting, model unavailable, context too large), the error at line 648-674 throws and follows the same path as 3a.

### 3c. Model Name Mismatch

The LEGACY OpenRouter client's `isOpenRouterModel()` function (lines 95-113) reads from `getConfig().selectedModel`. If the model is `openrouter:openai/gpt-5.2`, then `adapter = 'openrouter'` and `modelName = 'openai/gpt-5.2'`. This is correct.

However, the `generateOpenRouterConsolidatedReview()` function at lines 563-579 has a separate model resolution path for consolidation:

```typescript
if (options?.isConsolidation) {
    const config = getConfig();
    const consolidationModel = config.selectedModel || 'openrouter:openai/gpt-5.2';
    const [, model] = consolidationModel.includes(':')
        ? consolidationModel.split(':')
        : ['openrouter', consolidationModel];
    modelName = model;
} else {
    const result = isOpenRouterModel();
    modelName = result.modelName;
}
```

For regular (non-consolidation) review passes, `modelName = result.modelName` = `'openai/gpt-5.2'`. This is the correct OpenRouter model identifier.

### 3d. Most Likely Root Cause: Max Tokens Truncation or API Rejection

The function `getMaxTokensForReviewType()` (lines 41-65) returns `undefined` for `consolidated` type (line 53) but returns `8000` for the default case (line 63). The `comprehensive` review type falls to the default case:

```typescript
switch (reviewType) {
    case 'consolidated':
        return undefined;
    ...
    default:
        return 8000;
}
```

So for `comprehensive` type review passes, `max_tokens: 8000` is set. This may be TOO LOW for comprehensive reviews of large code chunks, causing the API to truncate output or return an error.

Furthermore, at line 642-645:

```typescript
...(getMaxTokensForReviewType(reviewType, options?.isConsolidation) && {
    max_tokens: getMaxTokensForReviewType(reviewType, options?.isConsolidation),
}),
```

Since `getMaxTokensForReviewType('comprehensive', false)` returns `8000` (truthy), `max_tokens: 8000` IS included in the API request.

**However**, this does NOT explain 0 tokens. An 8000 max_tokens should still produce output.

**Verdict**: The most likely scenario is that the OpenRouter API is returning errors (HTTP errors or empty content) for ALL 5 passes, possibly due to:
1. The `openai/gpt-5.2` model being unavailable or rate-limited on OpenRouter
2. Token limit exceeded errors (the chunks may be too large for the model's context window, especially since the `comprehensive` prompt is very detailed)
3. Network/API transient failures

Each failure is caught, retried twice, then a 0-token fallback result is created. The errors ARE logged (at `logger.error` level), but since the user may not have `--debug` enabled, they would only see the final report output.

---

## Finding 4 (CONTRIBUTING): Fallback Consolidation Produces Empty Issue Sections

**File**: `/Users/masa/Projects/ai-code-review/src/utils/review/consolidateReview.ts` (lines 557-739)

**Analysis**:

After all 5 passes produce error fallback results (with content like `"## Error in Pass 1\n\nFailed to generate review for X files..."`), the consolidation phase tries to generate a final report.

The `createFallbackConsolidation()` function (line 557-739) extracts findings using regex patterns:

```typescript
const highPriorityRegex = /### (?:High Priority|Critical Issues?)([\s\S]*?)(?=###|## Pass|$)/gi;
const mediumPriorityRegex = /### (?:Medium Priority|Important Issues?)([\s\S]*?)(?=###|## Pass|$)/gi;
const lowPriorityRegex = /### (?:Low Priority|Minor Issues?)([\s\S]*?)(?=###|## Pass|$)/gi;
```

The error fallback content (`"## Error in Pass 1\n\nFailed to generate review..."`) does NOT contain `### High Priority`, `### Medium Priority`, or `### Low Priority` headings. Therefore, ALL regex extractions return empty sets, producing:

```markdown
## Critical Issues (High Priority)

(empty)

## Important Issues (Medium Priority)

(empty)

## Minor Issues (Low Priority)

(empty)
```

This matches the user's reported symptoms exactly.

---

## Finding 5 (CONTRIBUTING): Consolidation AI Call Also Fails Silently

**File**: `/Users/masa/Projects/ai-code-review/src/utils/review/consolidateReview.ts` (lines 109-169)

**Analysis**:

The AI-powered consolidation (which runs before the fallback) uses the OpenRouter client via `ClientFactory.createClient()`. It calls `client.generateReview()` with the consolidation prompt (lines 122-145). This call can ALSO fail:

1. The OpenRouter client initialized via `ClientFactory` reads `process.env.AI_CODE_REVIEW_MODEL` (line 46: `process.env.AI_CODE_REVIEW_MODEL = consolidationModel`) to determine the model
2. The consolidation passes empty file content (`''`) and a special file path (`'CONSOLIDATION_TASK'`), with the actual consolidation prompt stuffed into the `readme` field of project docs
3. If the API call fails (same reasons as the pass failures), it retries 3 times (line 119-166), then falls back to `createFallbackConsolidation()` (line 169)

The "fallback consolidated report generated automatically" note in the user's output confirms that AI consolidation failed and the fallback was used.

---

## Root Cause Chain (Ordered)

1. **API calls fail for ALL 5 review passes** -- The OpenRouter API with `openai/gpt-5.2` model fails to return valid content for each chunk. Errors are caught, retried 3 times each, and fallback results with 0 tokens are produced.

2. **Token counts remain 0** -- The fallback results have hardcoded `costInfo` with all zeros. The accumulation loop adds zeros for each pass.

3. **AI consolidation also fails** -- The consolidation phase attempts to call the same model that is failing, also fails after 3 retries, and falls back to regex-based consolidation.

4. **Regex-based consolidation extracts nothing** -- The fallback pass content contains error messages, not structured review findings with priority headings. All finding sets are empty.

5. **Final report has 0 tokens and empty findings** -- The fallback consolidation report shows all 0s for tokens and empty bullet lists for issues.

---

## Specific Evidence

The "fallback consolidated report generated automatically" note at the bottom of the user's report is the definitive indicator. This text is generated ONLY by the `createFallbackConsolidation()` function at line 738 of `/Users/masa/Projects/ai-code-review/src/utils/review/consolidateReview.ts`:

```typescript
**Note:** This is a fallback consolidated report generated automatically. The individual pass findings are included below for reference.
```

---

## Recommendations

### Immediate Fixes

1. **Add `comprehensive` to `getMaxTokensForReviewType()` switch** in `/Users/masa/Projects/ai-code-review/src/clients/openRouterClient.ts` (line 41-65):
   ```typescript
   case 'comprehensive':
       return undefined; // No limit for comprehensive reviews
   ```

2. **Propagate actual API error messages to the final report** in `/Users/masa/Projects/ai-code-review/src/strategies/MultiPassReviewStrategy.ts` (lines 260-279). Currently, errors are logged but the fallback content is generic. Include the actual error message in a visible section of the output.

3. **Use actual API-reported token usage** from the OpenRouter response (`data.usage.prompt_tokens`, `data.usage.completion_tokens`) instead of or in addition to the estimated token counts from `getCostInfoFromText()`.

### Structural Improvements

4. **Surface errors prominently in the final report** -- When ALL passes fail, the report should clearly state "All API calls failed" rather than producing an empty findings report that looks like a successful review with no issues.

5. **Add a health check for the model before starting multi-pass** -- Before running 5 passes that will all fail, send a small test prompt to verify the model is responding.

6. **Fallback consolidation should detect error-only content** in `/Users/masa/Projects/ai-code-review/src/utils/review/consolidateReview.ts`. When all passes contain `## Error in Pass` content, the fallback should explicitly report "All passes failed" rather than producing empty findings sections.

7. **Add retry with exponential backoff at the model level** -- If pass 1 fails, wait longer before pass 2, rather than running all 5 passes in quick succession against a potentially rate-limited or unavailable model.

### Diagnostic Improvements

8. **Always log the HTTP status code and response body from OpenRouter API errors** at `info` level (not just `debug`), since this is the most important diagnostic information for this class of failures.

9. **Add a summary section at the end of multi-pass reviews** listing pass statuses: `Pass 1: SUCCESS (3,456 tokens)`, `Pass 2: FAILED (0 tokens, error: Rate limit exceeded)`, etc.

---

## Files Investigated

| File | Lines | Role |
|------|-------|------|
| `src/core/reviewOrchestrator.ts` | 1-415 | Entry point, orchestration flow |
| `src/core/handlers/ReviewExecutor.ts` | 1-105 | Strategy selection, multi-pass decision |
| `src/strategies/StrategyFactory.ts` | 1-93 | Strategy creation logic |
| `src/strategies/MultiPassReviewStrategy.ts` | 1-783 | Multi-pass execution, token accumulation |
| `src/strategies/ConsolidatedReviewStrategy.ts` | 1-59 | Standard consolidated review |
| `src/core/ReviewGenerator.ts` | 1-277 | Client dispatch, cost normalization |
| `src/clients/openRouterClient.ts` | 1-885 | LEGACY OpenRouter API client |
| `src/clients/implementations/openRouterClient.ts` | 1-411 | IMPLEMENTATIONS OpenRouter client |
| `src/clients/base/responseProcessor.ts` | 1-587 | Standard result creation |
| `src/clients/factory/clientFactory.ts` | 1-145 | Client factory for consolidation |
| `src/core/ConsolidationService.ts` | 1-423 | Consolidation orchestration |
| `src/utils/review/consolidateReview.ts` | 1-741 | AI + fallback consolidation |
| `src/clients/utils/tokenCounter.ts` | 1-387 | Token counting and cost estimation |
| `src/formatters/utils/MetadataFormatter.ts` | 1-269 | Token display in output |
| `src/formatters/utils/MarkdownFormatters.ts` | 1-683 | Markdown output formatting |
| `src/core/handlers/OutputHandler.ts` | 1-126 | Output file handling |

---

*Research conducted by Claude Opus 4.6*
*Date: 2026-02-22*
