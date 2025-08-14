/**
 * @fileoverview System prompts for different model providers and review types.
 *
 * This module provides a collection of system prompts used for different
 * review types and model providers. It helps maintain consistency across
 * client implementations and reduce duplication.
 */

import type { ReviewOptions, ReviewType } from '../../types/review';

/**
 * Standard system prompt for code reviews
 * Instructs models to provide structured JSON output
 */
export const JSON_FORMAT_SYSTEM_PROMPT = `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

IMPORTANT: Your response MUST be in the following JSON format:

{
  "summary": "A brief summary of the code review",
  "issues": [
    {
      "title": "Issue title",
      "priority": "high|medium|low",
      "type": "bug|security|performance|maintainability|readability|architecture|best-practice|documentation|testing|other",
      "filePath": "Path to the file",
      "lineNumbers": "Line number or range (e.g., 10 or 10-15)",
      "description": "Detailed description of the issue",
      "codeSnippet": "Relevant code snippet",
      "suggestedFix": "Suggested code fix",
      "impact": "Impact of the issue"
    }
  ],
  "recommendations": [
    "General recommendation 1",
    "General recommendation 2"
  ],
  "positiveAspects": [
    "Positive aspect 1",
    "Positive aspect 2"
  ]
}

Ensure your response is valid JSON. Do not include any text outside the JSON structure.`;

/**
 * Markdown format system prompt for models that work better with Markdown
 * Used primarily for Gemini models
 */
export const MARKDOWN_FORMAT_SYSTEM_PROMPT = `You are a helpful AI assistant that provides code reviews. Focus on providing actionable feedback. Do not repeat the instructions in your response.

IMPORTANT: Format your response as a well-structured Markdown document with the following sections:

# Code Review

## Summary
A brief summary of the code review.

## Issues

### High Priority
For each high priority issue:
- Issue title
- File path and line numbers
- Description of the issue
- Code snippet (if relevant)
- Suggested fix
- Impact of the issue

### Medium Priority
(Same format as high priority)

### Low Priority
(Same format as high priority)

## General Recommendations
- List of general recommendations

## Positive Aspects
- List of positive aspects of the code

Ensure your response is well-formatted Markdown with proper headings, bullet points, and code blocks.`;

/**
 * System prompt for architectural reviews with dependency analysis
 * Used for reviews that need to analyze project dependencies
 */
export const ARCHITECTURAL_REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer specialized in architectural analysis. Your task is to analyze code architecture, identify issues, and provide recommendations. 
                    
ESSENTIAL TASK: For ALL major dependencies in the project, you MUST thoroughly check for:
1. Security vulnerabilities and CVEs
2. Version updates and recommendations 
3. Compatibility issues and breaking changes
4. Deprecation warnings
5. Maintenance status

Always include a dedicated "Dependency Security Analysis" section in your review that summarizes the findings from your dependency security checks. This is a critical part of the architectural review.`;

/**
 * System prompt extension for architectural reviews with diagram generation
 */
export const ARCHITECTURAL_DIAGRAM_PROMPT = `

ADDITIONAL REQUIREMENT: Generate Mermaid Architecture Diagrams

Please include one or more Mermaid diagrams in your review to visualize the architecture. Create diagrams that show:

1. **Component Architecture**: Show the main components/modules and their relationships
2. **Data Flow**: Illustrate how data flows through the system
3. **Dependencies**: Show external services, databases, and APIs
4. **Layered Architecture**: If applicable, show the layers (presentation, business logic, data access)

Use Mermaid syntax wrapped in triple backticks with 'mermaid' language identifier:

\`\`\`mermaid
graph TB
    subgraph "Your actual architecture here"
        Component1[Component Name]
        Component2[Another Component]
    end
    Component1 --> Component2
\`\`\`

Ensure the diagrams accurately reflect the analyzed codebase structure. Include multiple diagrams if needed to properly represent different architectural aspects.`;

/**
 * Get the appropriate system prompt for a given review type
 * @param reviewType The type of review to get the system prompt for
 * @param useMarkdown Whether to use Markdown formatting instead of JSON
 * @param options Optional review options for additional context
 * @returns The system prompt for the specified review type
 */
export function getSystemPrompt(
  reviewType: ReviewType,
  useMarkdown = false,
  options?: ReviewOptions,
): string {
  // For architectural reviews, use the architectural review system prompt
  if (reviewType === 'architectural') {
    let prompt = ARCHITECTURAL_REVIEW_SYSTEM_PROMPT;

    // Add diagram generation instructions if requested
    if (options?.diagram) {
      prompt += ARCHITECTURAL_DIAGRAM_PROMPT;
    }

    return prompt;
  }

  // For other reviews, use the standard system prompt (JSON or Markdown)
  return useMarkdown ? MARKDOWN_FORMAT_SYSTEM_PROMPT : JSON_FORMAT_SYSTEM_PROMPT;
}
