---
template_type: "bug"
version: "1.0"
created: "2025-06-27"
---

# Bug Report Template

## **[BUG-XXX]** Bug Title

**Type:** Bug  
**Epic:** EP-XXX Epic Name (if part of larger initiative)  
**Priority:** Critical | High | Medium | Low  
**Severity:** Critical | High | Medium | Low  
**Story Points:** [1, 2, 3, 5, 8]  
**Assignee:** @username  
**Reporter:** @username  
**Status:** Backlog | Ready | In Progress | In Review | Testing | Done | Blocked  
**Sprint:** [Sprint Number]  

### Bug Description
Clear and concise description of what the bug is and its impact.

### Steps to Reproduce
1. Step 1: Detailed action
2. Step 2: Detailed action
3. Step 3: Detailed action
4. Observe the issue

### Expected Behavior
Clear description of what should happen.

### Actual Behavior
Clear description of what actually happens.

### Environment
- **OS:** [e.g., macOS 15.5, Windows 11, Ubuntu 22.04]
- **Node.js version:** [e.g., 18.17.0, 20.5.0]
- **Package manager:** [e.g., npm 9.8.1, pnpm 8.6.12]
- **Tool version:** [e.g., v3.2.15]
- **Shell:** [e.g., bash, zsh, PowerShell]

### Error Logs
```
Paste relevant error logs, stack traces, or console output here
```

### Screenshots/Videos
If applicable, add screenshots or videos to help explain the problem.

### Impact Assessment
- **User Impact:** How many users are affected
- **Business Impact:** Effect on business operations
- **Workaround Available:** Yes/No - describe if yes
- **Data Loss Risk:** Yes/No - describe if yes

### Root Cause Analysis
- **Suspected Cause:** Initial hypothesis
- **Investigation Notes:** Findings during investigation
- **Confirmed Cause:** Final determination of root cause

### Fix Strategy
- **Approach:** How the bug will be fixed
- **Files Affected:** List of files that need changes
- **Testing Strategy:** How to verify the fix works
- **Regression Risk:** Potential for introducing new issues

### Acceptance Criteria
- [ ] Bug no longer reproduces with original steps
- [ ] Fix doesn't break existing functionality
- [ ] Appropriate tests added to prevent regression
- [ ] Documentation updated if needed
- [ ] Fix verified in staging environment

### Definition of Done
- [ ] Root cause identified and documented
- [ ] Fix implemented and code reviewed
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Fix deployed to production
- [ ] Issue verified as resolved

### Related Issues
- Duplicate of: BUG-XXX
- Related to: US-XXX, BUG-XXX
- Blocks: US-XXX, T-XXX

### GitHub References
- Original GitHub issue: #XXX
- Related pull requests: #XXX, #XXX

### Labels/Tags
Based on GitHub issue labels:
- bug | critical | security | performance
- error-handling | dependencies | architectural-review
- prompt-handling | output-formatting | testing

---

## Priority Guidelines

### Critical
- System crashes or data loss
- Security vulnerabilities
- Complete feature failure
- Affects all users

### High
- Major feature malfunction
- Affects many users
- No reasonable workaround
- Performance degradation

### Medium
- Minor feature issues
- Affects some users
- Workaround available
- Cosmetic issues with functional impact

### Low
- Cosmetic issues
- Edge case scenarios
- Affects few users
- Enhancement requests

## Usage Instructions

1. Copy this template to create a new bug report
2. Replace BUG-XXX with the next available bug number
3. Fill in all sections with detailed information
4. Assign priority and severity based on impact
5. Add the bug to the appropriate section in BACKLOG.md
6. Update status as investigation and fix progress
7. Close when verified as resolved
