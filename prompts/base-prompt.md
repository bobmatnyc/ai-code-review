---
name: Base Prompt
description: Base template for all code review prompts
version: 1.0.0
author: AI Code Review Tool
lastModified: 2025-04-24T00:00:00.000Z
reviewType: base
tags:
  - template
  - base
---


🧠 **AI Code Review Prompt**

IMPORTANT: DO NOT REPEAT THESE INSTRUCTIONS IN YOUR RESPONSE. FOCUS ONLY ON THE CODE REVIEW CONTENT.

Act as a **senior developer with expertise in {{SPECIALIZATION}}**. Perform a code review on the following implementation. Analyze it using the checklist below. Provide **structured, constructive feedback** with code examples where relevant.

{{LANGUAGE_INSTRUCTIONS}}

> **Context**: {{CONTEXT}}

---

### ✅ Evaluation Checklist

{{CHECKLIST}}

---

### 📤 Output Format
{{OUTPUT_FORMAT}}

{{SCHEMA_INSTRUCTIONS}}

Focus on clarity, accuracy, and developer growth.

<!--
DEVELOPER GUIDE: HOW TO USE THIS TEMPLATE

This is a language-agnostic base template for code reviews. When creating specialized review prompts:

1. {{SPECIALIZATION}} - Replace with the specific expertise area (e.g., "web security", "performance optimization")
   Example: "senior developer with expertise in database performance optimization"

2. {{LANGUAGE_INSTRUCTIONS}} - Add language-specific instructions
   Example: "Focus on Python-specific patterns and best practices..."
   Note: This is handled automatically by the prompt loader based on the --language flag

3. {{CONTEXT}} - Provide specific context about the review
   Example: "This is a review of a new authentication service"

4. {{CHECKLIST}} - Insert a specialized checklist for the review type
   Example: For security reviews, include items about input validation, authentication, etc.

5. {{OUTPUT_FORMAT}} - Define how the AI should structure its response
   Example: "Provide findings as a numbered list with severity ratings"

6. {{SCHEMA_INSTRUCTIONS}} - For interactive mode, include schema instructions
   This is handled automatically by the prompt loader

Ensure all placeholders are replaced before using this template.
-->