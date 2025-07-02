/**
 * @fileoverview Anthropic tool calling handler implementation
 *
 * This module provides a tool calling handler specifically for Anthropic Claude models.
 */

import type { FunctionToolDefinition, ToolCallingHandler, ToolCallResult } from './toolCalling';

/**
 * Implementation of ToolCallingHandler for Anthropic models
 */
export class AnthropicToolCallingHandler implements ToolCallingHandler {
  /**
   * Prepare tool definitions for Anthropic API
   * @param tools The tools to prepare
   * @returns The tools formatted for Anthropic
   */
  prepareTools(tools: FunctionToolDefinition[]): any[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required || [],
      },
    }));
  }

  /**
   * Process tool calls from Anthropic response
   * @param data The Anthropic response data
   * @returns Processed tool calls and response message
   */
  processToolCallsFromResponse(data: any): {
    toolCalls: Array<{
      id?: string;
      name: string;
      arguments: any;
    }>;
    responseMessage: string;
  } {
    // Check if there are any tool calls in the response
    if (!data.content || !Array.isArray(data.content)) {
      return {
        toolCalls: [],
        responseMessage: '',
      };
    }

    const toolCalls: Array<{
      id?: string;
      name: string;
      arguments: any;
    }> = [];

    let responseMessage = '';

    // Process the content blocks
    data.content.forEach((block: any) => {
      if (block.type === 'text') {
        responseMessage += block.text;
      } else if (block.type === 'tool_use') {
        try {
          // Extract the tool call
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input,
          });
        } catch (error) {
          console.error('Error processing Anthropic tool call:', error);
        }
      }
    });

    return {
      toolCalls,
      responseMessage,
    };
  }

  /**
   * Create a request with tool results for Anthropic
   * @param conversation The conversation so far
   * @param toolResults The results of the tool calls
   * @returns The updated conversation
   */
  createToolResultsRequest(
    conversation: Array<{
      role: string;
      content: string | null;
      toolCalls?: any;
      toolCallId?: string;
      name?: string;
    }>,
    toolResults: ToolCallResult[],
  ): any {
    // For Anthropic, we need to create a new set of messages
    const messages = [...conversation];

    // Add tool results for each tool call
    toolResults.forEach((result) => {
      messages.push({
        role: 'assistant',
        content: null,
        toolCallId: result.toolName, // Using toolName as ID for simplicity
        name: result.toolName,
      });

      messages.push({
        role: 'tool',
        content: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
        name: result.toolName,
      });
    });

    return messages;
  }
}

/**
 * Anthropic tool calling handler singleton instance
 */
export const anthropicToolCallingHandler = new AnthropicToolCallingHandler();
