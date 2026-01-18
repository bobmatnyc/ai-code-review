# Pre-Commit Hook Configuration Issues Analysis

**Date**: 2026-01-17
**Research Type**: Configuration Investigation
**Classification**: Actionable - requires fixes

---

## Executive Summary

Investigation identified **4 distinct issues** in the pre-commit hook configuration. Two are **blocking** (prevent commits), one causes an **infinite loop**, and one is a **false positive warning**. All issues have clear root causes and straightforward fixes.

---

## Issue 1: detect-secrets Missing Baseline File

### Status: BLOCKING (High Priority)

### Root Cause
The `detect-secrets` hook is configured to use a baseline file (`.secrets.baseline`) that does not exist:

```yaml
# .pre-commit-config.yaml lines 106-111
- repo: https://github.com/Yelp/detect-secrets
  rev: v1.4.0
  hooks:
    - id: detect-secrets
      args: ['--baseline', '.secrets.baseline']
      exclude: package-lock\.json
```

**Error message**: `error: argument --baseline: Invalid path: .secrets.baseline`

### Impact
- Every commit attempt fails with this error
- No way to bypass without creating the baseline or removing the hook

### Recommended Fix

**Option A: Create the baseline file (Recommended)**
```bash
# Install detect-secrets if not present
pip install detect-secrets

# Generate baseline for the entire repository
detect-secrets scan > .secrets.baseline

# Optionally audit the baseline to mark false positives
detect-secrets audit .secrets.baseline
```

**Option B: Remove the baseline requirement**
```yaml
- repo: https://github.com/Yelp/detect-secrets
  rev: v1.4.0
  hooks:
    - id: detect-secrets
      exclude: package-lock\.json
      # Remove args line entirely
```

**Recommendation**: Option A is preferred for security. A baseline file allows tracking known false positives and ensures new secrets are detected.

---

## Issue 2: env-var-check False Positive

### Status: WARNING (Low Priority)

### Root Cause
The `env-var-check` hook uses a grep pattern that matches `AI_CODE_REVIEW_*` variables (which contain `CODE_REVIEW_`):

```yaml
# .pre-commit-config.yaml lines 55-62
- id: env-var-check
  name: Environment variable validation
  entry: bash -c 'if grep -r "CODE_REVIEW_" src/ --include="*.ts" --include="*.js"; then echo "... deprecated CODE_REVIEW_* ..."; exit 1; fi'
```

**Problem**: Pattern `CODE_REVIEW_` matches:
- `AI_CODE_REVIEW_GOOGLE_API_KEY` (intended, current)
- `AI_CODE_REVIEW_MODEL` (intended, current)
- `CODE_REVIEW_MODEL` (deprecated, should be caught)

The pattern is too broad and catches the intended prefix `AI_CODE_REVIEW_*`.

### Impact
- Hook always reports "deprecated" variables even though they're correct
- Can cause confusion and false commit failures

### Recommended Fix

**Option A: Use negative lookbehind (if grep supports -P)**
```yaml
- id: env-var-check
  name: Environment variable validation
  entry: bash -c 'if grep -rP "(?<!AI_)CODE_REVIEW_" src/ --include="*.ts" --include="*.js"; then echo "..."; exit 1; fi'
```

**Option B: Use word boundary matching (Recommended)**
```yaml
- id: env-var-check
  name: Environment variable validation
  entry: bash -c 'if grep -rE "(^|[^_A-Z])CODE_REVIEW_" src/ --include="*.ts" --include="*.js"; then echo "... deprecated CODE_REVIEW_* environment variables. Use AI_CODE_REVIEW_* instead."; exit 1; fi'
```

**Option C: Exclude AI_ prefix explicitly**
```yaml
- id: env-var-check
  name: Environment variable validation
  entry: bash -c 'if grep -r "CODE_REVIEW_" src/ --include="*.ts" --include="*.js" | grep -v "AI_CODE_REVIEW_"; then echo "..."; exit 1; fi'
```

**Recommendation**: Option C is simplest and most portable across different grep implementations.

---

## Issue 3: build-check Causes Infinite Loop

### Status: BLOCKING (Critical Priority)

### Root Cause
The `build-check` hook runs `pnpm run quick-build` which:
1. Calls `scripts/increment-build-number.js`
2. Modifies `build-number.json` and `src/version.ts`
3. Triggers pre-commit hooks again (because files changed)
4. Hook detects `.json` files changed, runs build again
5. Infinite loop

```yaml
# .pre-commit-config.yaml lines 87-93
- id: build-check
  name: Build validation
  entry: pnpm run quick-build
  language: system
  files: \.(ts|js|json)$  # <-- Triggers on .json files
  pass_filenames: false
```

The `files` pattern includes `.json`, so when `build-number.json` is modified by the build, it triggers another build.

### Impact
- Commit process enters infinite loop
- User must Ctrl+C to abort
- Cannot complete commits without disabling the hook

### Recommended Fix

**Option A: Exclude build-number.json from the hook (Recommended)**
```yaml
- id: build-check
  name: Build validation
  entry: pnpm run quick-build
  language: system
  files: \.(ts|js)$  # Remove json from pattern
  exclude: build-number\.json|src/version\.ts
  pass_filenames: false
```

**Option B: Add build-number.json to .gitignore**
```gitignore
# Build artifacts that should not be tracked
build-number.json
```

Then remove from git tracking:
```bash
git rm --cached build-number.json
```

**Option C: Remove the build-check hook entirely**
Build validation should happen in CI, not during commits. Running a full build on every commit is slow and counterproductive.

**Recommendation**: Option C (remove hook) is the best approach. Build validation belongs in CI pipelines, not pre-commit hooks. Pre-commit should be fast (<5 seconds). Running `quick-build` is too slow for every commit.

---

## Issue 4: end-of-file-fixer Modifies build-number.json

### Status: WARNING (Medium Priority)

### Root Cause
`build-number.json` is tracked in git and doesn't have a trailing newline, so `end-of-file-fixer` adds one:

```yaml
# .pre-commit-config.yaml lines 11-12
- id: end-of-file-fixer
  exclude: '\.md$'
```

The hook is not excluding `build-number.json`, so it modifies it on every commit.

### Impact
- Creates additional changes during commit
- Combined with Issue 3, contributes to the infinite loop
- Causes unexpected file modifications

### Recommended Fix

**Option A: Exclude build-number.json from end-of-file-fixer**
```yaml
- id: end-of-file-fixer
  exclude: '\.md$|build-number\.json'
```

**Option B: Add newline to build-number.json (in increment-build-number.js)**
```javascript
// Change line 57 in scripts/increment-build-number.js
fs.writeFileSync(buildNumberPath, JSON.stringify(buildInfo, null, 2) + '\n');
```

**Option C: Stop tracking build-number.json (Recommended)**
This file is a build artifact and should not be in version control.

**Recommendation**: Option C. `build-number.json` is generated during builds and should be in `.gitignore`.

---

## Priority Order for Fixes

| Priority | Issue | Type | Effort | Impact |
|----------|-------|------|--------|--------|
| 1 | build-check infinite loop | BLOCKING | Low | Critical - cannot commit |
| 2 | detect-secrets missing baseline | BLOCKING | Low | Critical - cannot commit |
| 3 | end-of-file-fixer build-number.json | WARNING | Low | Medium - causes confusion |
| 4 | env-var-check false positive | WARNING | Low | Low - just noise |

---

## Recommended Implementation Plan

### Phase 1: Unblock Commits (Immediate)

1. **Remove build-check hook** from `.pre-commit-config.yaml`
   - This hook is counterproductive for pre-commit
   - Build validation should be in CI

2. **Create .secrets.baseline file**
   ```bash
   pip install detect-secrets
   detect-secrets scan > .secrets.baseline
   ```

3. **Add build-number.json to .gitignore**
   ```bash
   echo "build-number.json" >> .gitignore
   git rm --cached build-number.json
   ```

### Phase 2: Clean Up Warnings (Next)

4. **Fix env-var-check pattern**
   Update to exclude `AI_CODE_REVIEW_*` matches

5. **Update end-of-file-fixer exclusions**
   Add any other generated files that shouldn't be modified

### Phase 3: Documentation (Optional)

6. **Document pre-commit setup** in CLAUDE.md
   - Explain which hooks are enabled
   - Note any known limitations

---

## Files Requiring Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `.pre-commit-config.yaml` | Modify | Remove build-check, fix env-var-check |
| `.gitignore` | Add | Include `build-number.json` |
| `.secrets.baseline` | Create | Generate with detect-secrets scan |
| `build-number.json` | Remove from git | `git rm --cached` |

---

## Additional Observations

### build-number.json Should Not Be Tracked

Currently `build-number.json` is:
- Tracked in git (has commit history)
- Modified on every build
- Causes merge conflicts when multiple people build

This is a design issue. Build numbers should either:
1. Not be tracked in git (recommended)
2. Only be updated during releases (not every build)

### quick-build Is Too Heavy for Pre-commit

`pnpm run quick-build` runs:
- TypeScript compilation
- esbuild bundling
- Multiple scripts

This can take 30+ seconds, which is too slow for pre-commit. Pre-commit hooks should complete in under 5 seconds for good developer experience.

---

## Conclusion

The pre-commit configuration has several issues that prevent normal commit workflow. The most critical is the `build-check` infinite loop, followed by the missing `.secrets.baseline` file. Both can be fixed with minimal effort. The remaining issues are warnings that should be addressed but are not blocking.

**Estimated fix time**: 15-30 minutes for all issues.
