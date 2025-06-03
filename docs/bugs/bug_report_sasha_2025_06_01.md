# Bug Report - AI Code Review Tool Issues

**Reported by:** Aleksander Dietrichson (Sasha)  
**Email:** dietrichson@gmail.com  
**Date:** June 3, 2025, 10:27 AM (UTC-3)  
**Priority:** High  
**Status:** New  
**Tool:** ai-code-review  

## Issue Summary
AI code review tool has multiple output format issues and incorrect token limit handling when used for security reviews with Gemini model.

## Detailed Description
User ran the ai-code-review tool twice for a security review of a NestJS migration project and encountered several issues:

1. **Broken Markdown Output**: When running with `--type security`, the tool produced a markdown file with a JSON block that starts but doesn't close properly, resulting in malformed output.

2. **JSON Output File Not Saved**: When switching to `--output json` format, the tool reported saving the review output to a file but the output wasn't actually saved. The JSON file that exists appears to contain only the input sent to the AI, not the review results.

3. **Incorrect Token Limit Behavior**: Tool insisted on using a phased review citing token limits despite using Google Gemini, which has a 1M context window that should accommodate the review without phasing.

## Steps to Reproduce
1. Install ai-code-review tool
2. Run security review: `ai-code-review --type security` on a NestJS project
3. Observe broken JSON block in markdown output
4. Run same review with JSON output: `ai-code-review --type security --output json`
5. Check output file - should contain only input data, not review results
6. Notice tool forces phased review despite Gemini's large context window

## Expected Behavior
- **Markdown Output**: Should produce properly formatted markdown with correctly closed JSON blocks
- **JSON Output**: Should save complete review results to the specified JSON file without overwriting
- **Token Handling**: Should utilize Gemini's full 1M context window without unnecessary phasing

## Actual Behavior
- **Markdown Output**: Contains unclosed JSON blocks making the output malformed
- **JSON Output**: File contains input data only; actual review output not saved (possibly overwritten or access denied)
- **Token Handling**: Incorrectly triggers phased review mode citing non-existent token limitations

## Environment Information
- **System:** macOS (inferred from `/Users/sasha/` path)
- **Project Type:** NestJS migration project  
- **AI Model:** Google Gemini 2.5 Pro Preview
- **Tool:** ai-code-review (version not specified)
- **Working Directory:** `/Users/sasha/briteclass_2/`

## Technical Details
### Log Output
```
173 │ [2025-06-03T12:36:16.258Z] INFO Review saved to: 
/Users/sasha/briteclass_2/ai-code-review-docs/security-review-nest-app-google-gemini-
│ 2-5-pro-preview-2025-06-03T12-35-32-961Z.json
174 │ [2025-06-03T12:36:16.259Z] INFO Review output saved to: 
/Users/sasha/briteclass_2/ai-code-review-docs/security-review-nest-app-google-
│ gemini-2-5-pro-preview-2025-06-03T12-35-32-961Z.json
```

### File Naming Pattern
- Output files follow pattern: `security-review-nest-app-google-gemini-2-5-pro-preview-YYYY-MM-DDTHH-MM-SS-sssZ.json`
- Same filename used for both "Review saved" and "Review output saved" (potential collision)

### Attachments Mentioned
- User attached files for review (not accessible via email)
- JSON file containing input data (mentioned as looking like "input sent to the AI")

## Impact Assessment
- **User Impact:** High - User cannot get properly formatted review output for security assessment
- **Business Impact:** High - Security review tool malfunction could delay critical security audits
- **Security Concern:** User discovered "gaping hole" in production legacy app but cannot properly document findings due to tool issues
- **Data Loss:** Review output being lost/overwritten prevents proper security documentation

## Root Cause Hypotheses
1. **File Collision**: Same filename used for input and output causing overwrite
2. **JSON Parsing**: Markdown formatter not properly closing JSON blocks
3. **Model Configuration**: Tool not properly configured for Gemini's token limits
4. **File Permissions**: Potential write access issues to output directory

## Suggested Next Steps
1. **Immediate Actions:**
   - [ ] **HIGH PRIORITY**: Reproduce issue with Gemini model in development environment
   - [ ] Test with different AI models to isolate Gemini-specific issues
   - [ ] Verify file write permissions and collision handling
   - [ ] Review JSON block formatting in markdown output

2. **Investigation:**
   - [ ] Check output file naming logic for potential duplicates
   - [ ] Review Gemini token limit configuration vs. actual capabilities
   - [ ] Test markdown JSON block closing logic
   - [ ] Examine file write operations for race conditions

3. **Communication:**
   - [ ] Acknowledge receipt to Alexander (Bob already replied "Thanks! I'll take a look today")
   - [ ] Request additional details about file permissions if needed
   - [ ] Provide timeline for fix once root cause identified

## Technical Notes
- This appears to be a multi-faceted issue affecting both output formatting and file handling
- The security sensitivity (production vulnerability discovered) makes timely resolution important
- User chose not to create GitHub issue due to security implications
- Tool appears to have model-specific configuration issues with Gemini

## Assignment
- **Assigned to:** [Bob Matsuoka - investigating]
- **Due Date:** [To be determined based on investigation]
- **Labels:** [bug, high-priority, output-formatting, file-handling, gemini-model]

## Follow-up Required
- [ ] Test with sample NestJS project to reproduce
- [ ] Verify Gemini token limit configuration
- [ ] Check for file write collision handling
- [ ] Validate JSON block formatting in markdown output

---
**Reporter Contact:** aleksander.dietrichson@gmail.com  
**Internal Reference:** Email thread ID 19735f9df47c293e  
**Security Note:** Production vulnerability discovered - handle with appropriate confidentiality
