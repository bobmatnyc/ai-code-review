/**
 * @fileoverview Type definitions for AI API responses.
 *
 * This module defines type interfaces for API responses from various AI providers
 * (OpenAI, Anthropic, Google, etc.) to ensure type safety when interacting with
 * external APIs and processing their responses.
 */

/**
 * Common structure for AI model responses in JSON format
 * This matches the schema expected in the AI prompt instructions for structured output
 */
export interface AIJsonResponse {
  review?: {
    version?: string;
    timestamp?: string;
    files?: Array<{
      filePath?: string;
      issues?: Array<{
        id?: string;
        priority?: string;
        description?: string;
        location?: {
          startLine?: number;
          endLine?: number;
        };
        currentCode?: string;
        suggestedCode?: string;
        explanation?: string;
      }>;
    }>;
    summary?: {
      grade?: string;
      highPriorityIssues?: number;
      mediumPriorityIssues?: number;
      lowPriorityIssues?: number;
      totalIssues?: number;
    };
    positiveAspects?: string[];
    recommendations?: string[];
  };
}

/**
 * Gemini API Response Interface
 */
export interface GeminiApiResponse {
  response: {
    text: () => string;
    promptFeedback?: {
      blockReason?: string;
      safetyRatings?: Array<{
        category: string;
        probability: string;
      }>;
    };
  };
}

/**
 * Anthropic API Response Interface
 */
export interface AnthropicApiResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  id: string;
  stop_reason?: string;
  stop_sequence?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * OpenAI API Response Interface
 */
export interface OpenAIApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter API Response Interface
 * Similar to OpenAI but might have additional fields
 */
export interface OpenRouterApiResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
