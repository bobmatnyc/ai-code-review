~/.../ai-code-review %gh issue create --title "🐛 Fix output format issues and token handling for Gemini 1.5 models" --body "## Summary
Multiple output format issues and incorrect token limit handling when used for security reviews with Gemini model.

## Problem
Based on bug report from Aleksander Dietrichson (Sasha) on June 3, 2025:

1. **Broken Markdown Output**: Tool produces markdown with unclosed JSON blocks, resulting in malformed output
2. **JSON Output File Not Saved**: JSON output contains only input data instead of review results
3. **Incorrect Token Limit Behavior**: Tool forces phased review despite Gemini 1.5's 1M context window

## Technical Details
- **System:** macOS
- **Project Type:** NestJS migration project  
- **AI Model:** Google Gemini 2.5 Pro Preview
- **Working Directory:** \`/Users/sasha/briteclass_2/\`

## Solution Implemented
✅ Fixed unclosed JSON blocks in Markdown output by improving JSON parsing and formatting
✅ Fixed JSON output file issue by ensuring unique filenames and preventing overwrites  
✅ Added proper detection of Gemini 1.5 models and their large context window
✅ Added \`--force-single-pass\` option to override chunking recommendations
✅ Improved logging throughout token analysis process
✅ Added safety margin factor for large context windows

## Files Changed
- \`src/formatters/outputFormatter.ts\`
- \`src/core/OutputManager.ts\`
- \`src/analysis/tokens/TokenAnalyzer.ts\`
- \`src/cli/argumentParser.ts\`
- \`src/types/review.ts\`
- \`src/core/reviewOrchestrator.ts\`

## Acceptance Criteria
- [x] Markdown output with proper JSON block formatting
- [x] JSON output saves complete review results without overwriting
- [x] Gemini 1.5 models use full 1M context window appropriately
- [x] New \`--force-single-pass\` flag available for user override
- [x] Improved debug logging for token analysis decisions

## References
- Bug report: \`docs/bugs/bug_report_sasha_2025_06_01.md\`
- Commits: \`447966e\`, \`37b4521\`" --label "type:bug,prio:high,status:completed" --assignee @me