---
name: Review Output Formatting Issues
about: Fix formatting issues in review output files
title: 'Fix review output formatting issues - remove inline ciData JSON and improve metadata display'
labels: 'bug, enhancement, formatting'
assignees: ''

---

## Problem Description

The review output files have formatting issues that make them difficult to read:

1. **Inline ciData JSON**: The entire ciData JSON (containing all TypeScript errors for every file) is being displayed inline in the command options, making the metadata section extremely verbose and hard to read.

2. **Command Options Display**: The command options in the metadata section include internal data structures that shouldn't be displayed to users.

## Example of Current Issue

In file: `ai-code-review-docs/quick-fixes-review-current-dir-gemini-gemini-2-5-pro-2025-06-03T22-45-16-778Z.md`

```
| Command Options | `--type=quick-fixes --output=markdown --model=gemini:gemini-2.5-pro --includeProjectDocs --contextMaintenanceFactor=0.15 --language=typescript --framework=none --ciData='{"typeCheckErrors":47,"lintErrors":0,"typeCheckOutput":"...HUNDREDS OF LINES OF JSON..."}' |
```

## Expected Behavior

The command options should only display user-provided CLI options, not internal data structures:

```
| Command Options | `--type=quick-fixes --output=markdown --model=gemini:gemini-2.5-pro --includeProjectDocs --contextMaintenanceFactor=0.15 --language=typescript --framework=none` |
```

## Root Cause

1. The `ConsolidatedReviewStrategy` adds the entire ciData object to the options: `options.ciData = ciData`
2. The `ReviewGenerator` serializes ALL options (including internal ones) into the commandOptions string

## Proposed Solution

1. **Filter out internal options**: Modify `ReviewGenerator.ts` to exclude internal options like `ciData` from the commandOptions serialization
2. **Add type safety**: Update the `ReviewOptions` interface to properly type the ciData property
3. **Consider alternative approaches**: 
   - Store ciData separately in the review metadata
   - Only include a summary of CI data (e.g., error counts) instead of full details

## Implementation Details

### Files to Modify

1. `src/core/ReviewGenerator.ts` - Add filter to exclude internal options
2. `src/types/review.ts` - Add ciData property to ReviewOptions interface
3. `src/strategies/ConsolidatedReviewStrategy.ts` - Document the ciData addition

### Code Changes

Already implemented in commit [commit-hash]:

```typescript
// ReviewGenerator.ts
.filter(([key, value]) => {
  // Filter out internal options and undefined values
  if (key.startsWith('_') || value === undefined) return false;
  
  // Filter out ciData which can be very large
  if (key === 'ciData') return false;
  
  // ... rest of filters
})
```

## Testing

1. Run a review with TypeScript errors present
2. Verify the output file's metadata section doesn't contain inline ciData JSON
3. Verify all user-provided options are still displayed correctly
4. Check that CI data is still available to the review process (just not displayed)

## Additional Considerations

- Should we display a summary of CI data (e.g., "47 TypeScript errors, 0 lint errors") in the metadata?
- Should other internal options be filtered out?
- Consider creating a separate "Internal Metadata" section for debugging purposes