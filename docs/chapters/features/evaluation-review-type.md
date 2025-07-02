# Evaluation Review Type

## Overview

The **Evaluation** review type is a unique, dual-purpose analysis that combines comprehensive code review with developer skill assessment. Unlike other review types that focus solely on code improvements, the evaluation review provides insights into both the code quality AND the developer behind the code.

## What It Does

### 1. Comprehensive Code Review
First and foremost, the evaluation performs a thorough code review that includes:
- Code quality assessment
- Pattern analysis
- Best practices adherence
- Structural analysis
- Technical debt identification

### 2. Developer Skill Assessment
In addition to reviewing the code, it assesses the developer's:
- **Skill Level**: Beginner, Intermediate, Advanced, or Expert
- **Experience Indicators**: Based on code patterns, complexity handling, and technical choices
- **Professional Maturity**: Junior, Mid-level, Senior, or Lead level indicators

### 3. AI Assistance Detection
The evaluation analyzes code patterns to determine:
- Likelihood of AI assistance (High/Medium/Low/Minimal)
- Specific patterns suggesting AI involvement
- Natural coding style indicators

### 4. Meta Coding Quality
Assessment of broader development practices:
- Documentation quality
- Testing approach
- Code maintenance practices
- Collaboration indicators

## When to Use Evaluation

The evaluation review type is particularly useful for:

1. **Code Audits**: When you need both code quality assessment and developer capability insights
2. **Team Assessments**: Understanding the skill distribution in your development team
3. **Hiring Decisions**: Evaluating code samples from candidates
4. **Training Needs**: Identifying areas where developers might benefit from additional training
5. **AI Detection**: Understanding if submitted code was primarily human-written or AI-assisted

## Example Usage

```bash
# Evaluate a specific file
ai-code-review --type evaluation src/utils/dataProcessor.ts

# Evaluate an entire project
ai-code-review --type evaluation ./my-project

# Save evaluation results
ai-code-review --type evaluation --output-dir ./evaluations ./src
```

## Output Format

The evaluation provides structured output including:
- Traditional code review findings
- Developer skill assessment with confidence levels
- AI assistance likelihood analysis
- Professional maturity indicators
- Meta coding quality metrics
- Overall developer profile summary

## Key Differentiator

Unlike other review types that focus on "what to improve", the evaluation review answers two questions:
1. **"How good is this code?"** (traditional code review)
2. **"Who wrote this code and what's their skill level?"** (developer assessment)

This dual analysis makes it invaluable for understanding both code quality and developer capabilities in a single review pass.