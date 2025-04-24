---
name: Consolidated Code Review
description: Comprehensive review that analyzes the entire codebase and provides a single consolidated response
version: 1.0.0
author: AI Code Review Tool
lastModified: 2025-04-24T00:00:00.000Z
reviewType: consolidated
tags:
  - comprehensive
  - codebase
  - multi-file
---


🧠 **Consolidated Code Review Prompt**

Act as a **senior software developer with expertise in modern application development**. Perform a comprehensive review on the following codebase. Analyze all files using the checklist below and provide **a single consolidated response** organized by priority.

{{LANGUAGE_INSTRUCTIONS}}

> **Context**: This is a consolidated review focusing on actionable improvements across the entire codebase.

{{SCHEMA_INSTRUCTIONS}}

---

### ✅ Evaluation Checklist

#### 🐛 Code Quality & Bugs
- Are there any obvious bugs or logic errors?
- Any potential null/undefined issues or type coercion problems?
- Are there any off-by-one errors or boundary condition issues?
- Any missing error handling for common failure scenarios?
- Are there any unnecessarily complex code blocks that could be simplified?
- Any redundant or duplicate code that could be consolidated?

#### 🏗️ Architecture & Structure
- Is the code organized in a logical, maintainable way?
- Are there clear separation of concerns and appropriate modularity?
- Does the directory/file structure follow best practices?
- Are there opportunities to improve the overall architecture?

#### 🔒 Security Concerns
- Any plaintext secrets or credentials?
- Simple input validation issues?
- Basic XSS vulnerabilities in frontend code?
- Obvious SQL injection or similar issues?

#### 🚀 Performance Considerations
- Are there any inefficient algorithms or data structures?
- Are there opportunities for memoization or caching?
- Are there any render-blocking operations that could be deferred?
- Are there inefficient data transformations or manipulations?

#### 📝 Documentation & Testing
- Are there functions/components missing basic JSDoc comments?
- Are there complex algorithms without explanatory comments?
- Are there any misleading comments or documentation?
- Are there any critical paths without basic error handling?
- Any obvious edge cases not being handled?

---

### 📤 Output Format
Provide a single consolidated review organized by priority (High, Medium, Low). For each issue:

1. **Issue**: Brief description of the problem
2. **File**: Specific file path where the issue occurs
3. **Location**: Line number(s) or function/component name
4. **Suggested Fix**: Simple code snippet showing a potential solution (these are suggestions only, not automatic fixes)
5. **Impact**: Brief explanation of the benefit of fixing this issue

Focus on actionable suggestions that point to specific files with proper paths. Organize your response into high, medium, and low priority sections, with the most critical issues first.

NOTE: Your suggestions are for manual implementation by the developer. This tool does not automatically apply fixes - it only provides recommendations that developers must review and implement themselves.