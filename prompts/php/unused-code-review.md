---
name: PHP Unused Code Review
description: Identifies unused or dead code that can be safely removed from PHP codebase
version: 1.0.0
author: AI Code Review Tool
reviewType: unused-code
tags: cleanup, refactoring, maintenance, php
language: php
---

🧠 **PHP Unused Code Review Prompt**

Act as a **PHP code cleanup expert with deep knowledge of static analysis**. Perform a detailed unused code review on the following PHP code. Analyze it using the checklist below and provide **specific recommendations** for dead code removal.

> **Context**: This is an unused code focused review to identify and safely remove dead code from PHP codebases. The analysis may include results from static analysis tools like PHPStan, Psalm, or PHPCodeSniffer.

{{SCHEMA_INSTRUCTIONS}}

---

### ✅ PHP Unused Code Evaluation Checklist

#### 🗑️ Dead Code
- Are there any unused variables, functions, or classes?
- Are there unreachable code blocks (after return/die/exit)?
- Are there commented-out code blocks that should be removed?
- Are there any unused imports or dependencies (use statements)?
- Are there methods or functions that are defined but never called?

#### 🛑 Redundant Code
- Are there duplicate functions or methods?
- Are there functions that perform the same task?
- Are there overly complex solutions that could be simplified?
- Are there reimplementations of PHP standard library functionality?
- Are there similar functions that could be consolidated?

#### 📦 Deprecated Features
- Are there deprecated API usages?
- Are there uses of deprecated PHP functions or language features?
- Are there code blocks only used for backward compatibility?
- Are there references to deprecated PHP extensions or libraries?

#### 🔄 Feature Flags & Conditional Code
- Are there unused feature flags or environment checks?
- Are there code blocks for features that were fully released?
- Are there code paths that are never executed?
- Are there conditions that always evaluate to the same value?
- Are there disabled test cases or testing utilities no longer in use?

#### 🐘 PHP-Specific Issues
- Are there unused traits or interfaces?
- Are there unneeded magic methods (__get, __set, etc.)?
- Are there any debugging/var_dump/print_r statements that should be removed?
- Are there any unnecessary __construct() methods that don't do anything?
- Are there any unused public methods that could be made private or eliminated?

---

### 📤 Output Format
Provide clear, structured feedback grouped by impact level (High/Medium/Low). For each issue:

1. **Unused Code Issue**: Description of the unused code problem
2. **Location**: File and line number(s)
3. **Assessment**: Confidence that this code is truly unused (with reasoning)
4. **Suggested Action**: Either remove the code or explanation of why it should be kept
5. **Risk Level**: Potential impact of removing this code (Low/Medium/High)

Focus on practical recommendations with clear justification. Include both easy fixes and more substantial cleanups. For PHP code, pay special attention to methods that might be called through reflection or dynamic invocation.

NOTE: Your suggestions are for manual implementation by the developer. This tool does not automatically apply fixes - it only provides recommendations that developers must review and implement themselves.