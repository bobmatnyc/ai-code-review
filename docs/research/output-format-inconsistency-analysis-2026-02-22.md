# Output Format Inconsistency Analysis Across Prompt Templates

**Date**: 2026-02-22
**Scope**: All review type prompts in bundledPrompts.ts, generic HBS templates, and output format templates
**Status**: ACTIONABLE -- inconsistencies found requiring standardization

---

## Executive Summary

There are **significant and systemic inconsistencies** in output format specifications across the 15+ review types. The codebase has **two parallel prompt systems** (bundled TypeScript prompts and HBS templates) that have diverged substantially, with the HBS templates (v2.0.0) being more mature and structured than the bundled fallbacks. The key inconsistencies fall into four categories:

1. **Output Format Type**: Some templates request structured JSON, others request Markdown, and some request free text with minimal structure.
2. **Severity Scales**: At least 5 different severity/priority scales are used across templates.
3. **Issue Structure**: Fields per finding vary from 3 to 12+ across review types.
4. **Grading/Scoring**: Three different grading systems are used (A+ to F, 1-10 numeric, 0.0-1.0 decimal) with no consistency.

Additionally, `promptText/common/output-formats/standard-review-format.hbs` exists but is **NOT a true standard** -- it is a simple 5-field Handlebars partial with framework-specific placeholders, not a comprehensive output format specification.

---

## Comparison Table: Output Formats by Review Type

### Legend
- **BP** = Bundled Prompt (src/prompts/bundledPrompts.ts)
- **HBS** = Handlebars Template (promptText/languages/generic/*.hbs)
- **OFT** = Output Format Template (promptText/common/output-formats/*.hbs)

### Master Comparison

| Review Type | Source | Output Format | Severity Scale | Issue Fields | Grading System | Has JSON Schema | Confidence Score |
|---|---|---|---|---|---|---|---|
| **architectural** | BP | Free Markdown (6 sections) | None | 6 narrative sections | None | No | No |
| **architectural** | HBS v2.0 | **Structured JSON** | None (uses complexity levels) | 12+ fields in JSON | 0.0-1.0 overallScore + Maintainability Index | Yes | Yes (0.89) |
| **quick-fixes** | BP | Markdown list | High/Medium/Low | 5 fields (Issue/Impact/Fix/Code/Priority) | None | No | No |
| **quick-fixes** | HBS v2.0 | **Structured JSON** | HIGH/MEDIUM/LOW + BUG_FIX categories | 12+ fields with nested objects | None (uses impactLevel) | Yes | Yes (0.92) |
| **consolidated** | BP | Markdown sections | (implied) High/Medium/Low | 5 fields (Issue/File/Location/Fix/Impact) | A+ to F (academic, 7 categories) | No | No |
| **consolidated** | HBS v2.0 | **Structured JSON** | CRITICAL severity | 4+ fields in criticalFindings | A+ to F with GPA (8 weighted categories) | Yes | Yes (0.88) |
| **consolidated** | OFT | Markdown sections | High/Medium/Low | 5 fields (Issue/File/Location/Fix/Impact) | A+ to F (7 categories, no weights) | No | No |
| **security** | BP | Markdown list | (implied) risk level | 5 fields (Vulnerability/Impact/Remediation/Code/Standard) | None | No | No |
| **security** | HBS v2.0 | **Structured JSON** | CRITICAL/HIGH/MEDIUM/LOW/INFO | 12+ fields with OWASP mapping | None (uses overallRiskLevel) | Yes | Yes (0.85+) |
| **performance** | BP | Markdown list | (implied) priority | 5 fields (Issue/Impact/Optimization/Code/Measurement) | None | No | No |
| **performance** | HBS v2.0 | **Structured JSON** | CRITICAL/HIGH/MEDIUM/LOW | 12+ fields with complexity analysis | 0.0-1.0 overallScore | Yes | Yes (0.88) |
| **unused-code** | BP | Markdown list | Confidence: High/Medium/Low | 6 fields (Element/Location/Evidence/Confidence/Recommendation/Code) | None | No | No |
| **unused-code** | HBS v2.0 | **Structured JSON** | MEDIUM severity + confidence levels | 10+ fields with evidence chains | None | Yes | Yes (0.95+) |
| **best-practices** | BP | Markdown list | (implied) impact | 4 fields (Issue/Impact/Recommendation/Reference) | None | No | No |
| **best-practices** | HBS v2.0 | **Structured JSON** | CRITICAL/HIGH/MEDIUM/LOW/INFO | 12+ fields with metrics | 0.0-1.0 overallQualityScore | Yes | Yes (0.85) |
| **evaluation** | BP | **Rigid Markdown** (exact headers required) | 1-10 numeric + A/B/C/D/F grades | 20+ prescribed sections | 1-10 competency + A-F quality grades | No | No |
| **evaluation** | HBS v1.0 | **Rigid Markdown** (exact headers required) | 1-10 numeric + A/B/C/D/F grades | 20+ prescribed sections | 1-10 competency + A-F quality grades | No | No |
| **coding-test** | BP | Markdown sections | 1-10 scale per criterion | 5 scored sections + metrics | 1-10 weighted (30/25/20/15/10) | No | No |
| **coding-test** | HBS v1.0 | Markdown sections | Numeric/100 + 1-10 per criterion | 5 scored sections + metrics + AI detection | Numeric/100 with passing threshold | No | No |
| **comprehensive** | BP only | Free Markdown (4 sections) | None | 4 analysis frameworks | None | No | No |
| **ai-integration** | HBS v1.0 | **Structured JSON** | HIGH severity in findings | 10+ fields | 0.0-1.0 score per category | Yes | Yes (0.85) |
| **cloud-native** | HBS v1.0 | **Structured JSON** | HIGH severity in findings | 10+ fields | 0.0-1.0 score per category | Yes | Yes (0.88) |
| **developer-experience** | HBS v1.0 | **Structured JSON** | MEDIUM severity in findings | 10+ fields | 0.0-1.0 score per category | Yes | Yes (0.82) |
| **focused-unused-code** | HBS v1.0 | **Structured Markdown** (6 exact sections) | Confidence: High/Medium/Low | 4 fields per item | None | No | No |
| **code-tracing-unused** | HBS v1.0 | **Structured Markdown** (by confidence level) | Confidence: HIGH/MEDIUM/LOW | 4 fields per item + evidence chain | None | No | No |

---

## Detailed Inconsistency Analysis

### 1. Output Format Type (Critical Inconsistency)

**Three distinct format philosophies exist:**

| Format Type | Used By | Count |
|---|---|---|
| **Structured JSON** (with JSON schema example) | HBS v2.0: architectural, quick-fixes, consolidated, security, performance, unused-code, best-practices, ai-integration, cloud-native, developer-experience | 10 |
| **Free/Narrative Markdown** | All bundled prompts (BP), comprehensive (BP only) | 9 |
| **Rigid Prescribed Markdown** (exact headers) | evaluation (both BP and HBS), coding-test (both), focused-unused-code, code-tracing-unused | 4 |

**Impact**: The bundled prompts (fallback path) will produce completely different output structure than the HBS templates for the same review type. Downstream parsers and formatters would need to handle both.

### 2. Severity/Priority Scales (Major Inconsistency)

At least **5 different scales** are in use:

| Scale | Templates Using It |
|---|---|
| **CRITICAL/HIGH/MEDIUM/LOW/INFO** (5-level) | security HBS, best-practices HBS |
| **CRITICAL/HIGH/MEDIUM/LOW** (4-level) | performance HBS, cloud-native HBS |
| **HIGH/MEDIUM/LOW** (3-level) | quick-fixes BP, consolidated BP/OFT, all prioritization sections in HBS |
| **1-10 numeric** | evaluation (both), coding-test (both) |
| **No severity at all** | architectural BP, comprehensive BP, best-practices BP |

**Additionally**, many HBS templates use a **dual system**: `severity` on individual findings + `priority` in recommendations (immediate/shortTerm/longTerm/preventive), which is actually a different dimension but can confuse consumers.

### 3. Issue/Finding Structure (Major Inconsistency)

**Bundled Prompts (minimal, 3-6 fields):**
```
1. Issue/Vulnerability/Element: description
2. Impact: explanation
3. Fix/Remediation/Recommendation: guidance
4. Code Example: before/after (sometimes)
5. Priority/Confidence: rating (sometimes)
6. Security Standard/Best Practice Reference: link (sometimes)
```

**HBS v2.0 Templates (rich, 10-15 fields):**
```json
{
  "id": "PREFIX-001",
  "title": "string",
  "category": "ENUM",
  "severity": "ENUM",
  "confidence": 0.95,
  "location": {
    "file": "path",
    "lineStart": 42,
    "lineEnd": 45,
    "function": "name"
  },
  "description": "string",
  "impact": { /* nested object */ },
  "evidence": ["array"],
  "recommendation": {
    "priority": "ENUM",
    "effort": "ENUM",
    "steps": ["array"],
    "codeExample": "string"
  },
  "references": ["array"],
  "metrics": { /* nested object */ }
}
```

**ID Prefixes differ by review type (no standard):**
- Security: `SEC-001`
- Performance: `PERF-001`
- Quick Fixes: `QF-001`
- Best Practices: `BP-001`
- Unused Code: `UNUSED-001`, `UNREACHABLE-001`, `IMPORT-001`
- AI Integration: `AI-001`
- Cloud Native: `CN-001`
- Developer Experience: `DX-001`
- Consolidated: `CRIT-001`

### 4. Grading/Scoring Systems (Major Inconsistency)

**Three completely different grading systems:**

| System | Templates | Scale | Details |
|---|---|---|---|
| **Academic (A+ to F)** | consolidated (BP, HBS, OFT), evaluation (both) | Letter grades | 7-8 categories, weights differ between BP and HBS |
| **Numeric (1-10)** | evaluation (competency), coding-test (per criterion) | Integer | Weighted by criterion (30/25/20/15/10) |
| **Decimal (0.0-1.0)** | All HBS v2.0 templates | Float | Used as `overallScore`, `confidenceScore`, `score` per sub-area |

**Category weight inconsistencies in consolidated/grading:**

| Category | Consolidated HBS | Consolidated BP | Consolidated OFT |
|---|---|---|---|
| Functionality | 25% | Listed (no %) | Listed (no %) |
| Code Quality | 20% | Listed (no %) | Listed (no %) |
| Architecture | 15% | Not separate | Not separate |
| Documentation | 10% | Listed (no %) | Listed (no %) |
| Testing | 10% | Listed (no %) | Listed (no %) |
| Maintainability | 10% | Listed (no %) | Listed (no %) |
| Security | 5% | Listed (no %) | Listed (no %) |
| Performance | 5% | Listed (no %) | Listed (no %) |

### 5. Confidence Scoring (Moderate Inconsistency)

| Approach | Templates |
|---|---|
| **Numeric 0.0-1.0 confidence per finding** | All HBS v2.0 templates |
| **Categorical High/Medium/Low** | unused-code (both), focused-unused, code-tracing |
| **No confidence scoring** | All bundled prompts except unused-code, evaluation (has AI detection confidence only) |

### 6. Recommendation Structure (Moderate Inconsistency)

**HBS v2.0 templates use a consistent 4-tier pattern:**
```json
{
  "immediate": [],
  "shortTerm": [],
  "longTerm": [],
  "preventive": []
}
```

**Bundled prompts use varying patterns:**
- quick-fixes BP: "Group issues by priority" (no tiers)
- consolidated BP: "organized by priority" (no tiers)
- security BP: "prioritized list of issues" (no tiers)
- performance BP: "prioritized list of optimizations" (no tiers)
- best-practices BP: "Prioritize by impact" (no tiers)

### 7. Executive Summary Inclusion (Minor Inconsistency)

| Has Executive Summary | Templates |
|---|---|
| **Yes** | consolidated (all), coding-test (both), evaluation (both), all HBS v2.0 |
| **No** | architectural BP, quick-fixes BP, security BP, performance BP, unused-code BP, best-practices BP, comprehensive BP |

---

## Standard Output Format Template Analysis

### `promptText/common/output-formats/standard-review-format.hbs`

This file is **NOT a true standard format**. It contains only:

```handlebars
## Output Format

For each area of improvement you identify:

1. **Issue**: Clearly describe the {{framework}}-specific pattern or practice that could be improved
2. **Impact**: Explain why this matters for {{impactAreas}}
3. **Recommendation**: Provide specific, actionable guidance with {{framework}} code examples
4. **Package Recommendation**: When applicable, recommend specific versions of {{framework}} packages or tools
{{#if includeVersionCompatibility}}
5. **Version Compatibility**: Note which {{framework}} version(s) your recommendation applies to ({{versionsList}})
{{/if}}

Prioritize your recommendations by impact...
{{schemaInstructions}}
```

**Problems:**
1. Only 4-5 fields (missing: severity, location, confidence, evidence, effort)
2. Framework-specific (has `{{framework}}` placeholders) -- not generic
3. No severity scale defined
4. No grading system
5. No JSON structure
6. No executive summary
7. Not actually referenced by most templates

### `promptText/common/output-formats/consolidated-review.hbs`

This is a **complete standalone prompt**, not a reusable format partial. It defines its own grading system (A+ to F) with 7 categories and a specific output format with 5 issue fields.

### `promptText/common/output-formats/improved-unused-code-review.hbs`

Also a **complete standalone prompt**, not a reusable format partial. Has no structured output format at all -- just analysis methodology.

---

## BP vs HBS Divergence Summary

The bundled prompts and HBS templates have diverged so significantly that they produce incompatible outputs:

| Dimension | Bundled Prompts | HBS Templates |
|---|---|---|
| Format | Narrative Markdown | Structured JSON |
| Fields per finding | 3-6 | 10-15 |
| Severity | Inconsistent or absent | CRITICAL/HIGH/MEDIUM/LOW/INFO |
| Confidence | Mostly absent | 0.0-1.0 per finding |
| Executive summary | Mostly absent | Always present |
| Grading | Only in consolidated/evaluation | 0.0-1.0 scores in all v2.0 |
| ID system | None | PREFIX-NNN |
| Recommendations | Unstructured | 4-tier (immediate/short/long/preventive) |

---

## Recommendations

### Priority 1: Define a Universal Output Schema

Create a single JSON schema that ALL review types use, with optional sections:

```json
{
  "executiveSummary": { "overallScore": 0.0-1.0, "level": "ENUM", "confidenceScore": 0.0-1.0 },
  "grading": { /* optional, for review types that grade */ },
  "findings": [{ "id": "PREFIX-NNN", "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO", ... }],
  "recommendations": { "immediate": [], "shortTerm": [], "longTerm": [] },
  "metrics": { /* review-type-specific metrics */ }
}
```

### Priority 2: Standardize Severity Scale

Adopt **CRITICAL/HIGH/MEDIUM/LOW/INFO** (5-level) universally:
- CRITICAL = Production risk, security vulnerability, data loss
- HIGH = Significant quality/performance issue
- MEDIUM = Best practice violation, moderate impact
- LOW = Minor improvement, cosmetic
- INFO = Informational note, no action required

### Priority 3: Unify Grading System

Use **0.0-1.0 decimal scores** as the primary system (already used by most HBS v2.0 templates). Map to letter grades for display:
- 0.93+ = A+, 0.90-0.92 = A, 0.87-0.89 = A-
- etc.

### Priority 4: Update Bundled Prompts to Match HBS

The bundled prompts in `bundledPrompts.ts` are the fallback path but produce incompatible output. Either:
- (A) Update bundled prompts to match HBS v2.0 structure, or
- (B) Remove bundled prompts entirely and rely solely on HBS templates

### Priority 5: Replace standard-review-format.hbs

Create an actual reusable output format partial that can be included by all review types, containing the universal schema definition.

---

## Files Analyzed

- `/Users/masa/Projects/ai-code-review/src/prompts/bundledPrompts.ts` -- 10 generic + 6 TypeScript + 3 React + 3 Flutter + 3 Dart + 1 Python prompts
- `/Users/masa/Projects/ai-code-review/promptText/languages/generic/*.hbs` -- 14 generic HBS templates
- `/Users/masa/Projects/ai-code-review/promptText/common/output-formats/*.hbs` -- 3 output format files
