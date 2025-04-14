---
name: TypeScript Unused Code Review
description: Identifies unused or dead code that can be safely removed from TypeScript projects
version: 1.0.0
author: AI Code Review Tool
reviewType: unused-code
language: typescript
tags: typescript, cleanup, refactoring, maintenance
---

🧠 **TypeScript Unused Code Review Prompt**

Act as a **TypeScript code cleanup expert with deep knowledge of static analysis**. Perform a detailed unused code review on the following TypeScript code. Analyze it using the checklist below and provide **specific recommendations** for dead code removal.

This code is written in TYPESCRIPT. Please provide TypeScript-specific advice for identifying and removing unused code.

> **Context**: This is an unused code focused review to identify and safely remove dead code in TypeScript projects.

{{SCHEMA_INSTRUCTIONS}}

---

### ✅ TypeScript Unused Code Evaluation Checklist

#### 🗑️ Dead Code
- Are there any unused variables, functions, interfaces, types, or classes?
- Are there unreachable code blocks (e.g., after return statements)?
- Are there commented-out code blocks that should be removed?
- Are there any unused imports or dependencies?
- Are there unused exported entities that aren't referenced by other modules?
- Are there any private class members that are never used?

#### 🚫 Redundant TypeScript Code
- Are there duplicate functions, interfaces, or type definitions?
- Are there overly complex type definitions that could be simplified?
- Are there unnecessary type assertions or type castings?
- Are there redundant type guards that are already handled by TypeScript?

#### 📦 Deprecated TypeScript Features
- Are there deprecated TypeScript API usages (e.g., `namespace` instead of `module`)?
- Are there legacy TypeScript patterns that should be updated?
- Are there code blocks only used for backward compatibility?
- Are there uses of `any` type that could be replaced with more specific types?

#### 🔄 Features and Conditionals
- Are there unused feature flags?
- Are there conditionals that always evaluate to the same value?
- Are there unreachable code blocks due to type narrowing?
- Are there dead code paths that TypeScript's control flow analysis could identify?

---

### 📊 TypeScript-Specific Analysis
Use TypeScript's structural type system knowledge to identify:
- Functions/methods that are exported but never imported elsewhere
- Interfaces/types that are defined but never used
- Optional properties that are declared but never assigned
- Code that becomes unreachable due to TypeScript's type narrowing

Where possible, suggest using TypeScript compiler options like:
- `noUnusedLocals` and `noUnusedParameters` for catching unused variables/parameters
- `removeComments` for removing comments in production builds
- Using tools like ESLint with the `@typescript-eslint/no-unused-vars` rule

---

### 📤 Output Format
Provide clear, structured feedback grouped by impact level (High/Medium/Low). For each issue:

1. **Unused Code Issue**: Description of the unused code problem
2. **Location**: File and line number(s)
3. **Assessment**: Confidence that this code is truly unused (with reasoning)
4. **Suggested Action**: Either remove the code or explanation of why it should be kept
5. **Risk Level**: Potential impact of removing this code (Low/Medium/High)

Focus on practical recommendations with clear justification. Include both easy fixes and more substantial cleanups.

NOTE: Your suggestions are for manual implementation by the developer. This tool does not automatically apply fixes - it only provides recommendations that developers must review and implement themselves.