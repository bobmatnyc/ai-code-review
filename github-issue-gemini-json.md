# 🐛 Gemini Reviews Return JSON Instead of Markdown Format

## Description
When running code reviews with Gemini models (particularly gemini-2.5-pro), the output is returned in JSON format instead of the expected Markdown format that other models provide. This makes the review output harder to read and inconsistent with other model outputs.

## Steps to Reproduce
1. Set up environment with a Gemini API key
2. Run a code review targeting any project: `ai-code-review /path/to/project --model gemini-2.5-pro`
3. Check the generated output file in the `ai-code-review-docs` directory

## Current Behavior
The review file contains output in JSON format, similar to:
```json
{
  "review": {
    "summary": "The codebase has several opportunities for improvement...",
    "issues": [
      {
        "title": "API Request Logic in User Component",
        "description": "The User component contains direct API request logic...",
        "severity": "medium",
        "suggested_fix": "Extract the API request logic into a separate service...",
        "file_path": "src/components/User.tsx",
        "line_numbers": "15-32"
      },
      ...
    ]
  }
}
```

## Expected Behavior
The output should be formatted as Markdown, similar to the output from Claude or OpenAI models:

```markdown
# Code Review: Quick Fixes

## Summary
The codebase has several opportunities for improvement...

## Issues

### 🟡 Medium: API Request Logic in User Component
**File:** src/components/User.tsx (lines 15-32)

**Description:** The User component contains direct API request logic...

**Suggested Fix:** Extract the API request logic into a separate service...
```

## Possible Causes
This is likely related to how the Gemini prompt is constructed. In the Gemini client, there may be instructions that explicitly ask for JSON format or the handling of the Gemini response isn't properly converting structured format to Markdown.

Looking at the codebase, it's likely the issue is in:
- `src/clients/geminiClient.ts` - Where Gemini API requests are constructed
- `src/prompts/strategies/GeminiPromptStrategy.ts` - Where Gemini-specific prompt formatting happens
- `src/formatters/outputFormatter.ts` - Where response formatting occurs

## Additional Information
- This issue only occurs with Gemini models
- The JSON format is consistent, suggesting it's by design but inconsistent with other models
- The content of the review is correct, just formatted differently

## Environment
- Version: 2.1.9
- Model: gemini-2.5-pro
- OS: macOS