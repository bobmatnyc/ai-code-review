/**
 * @fileoverview OpenAI tool calling handler implementation
 *
 * This module provides a tool calling handler specifically for OpenAI models.
 */

import type { FunctionToolDefinition, ToolCallingHandler, ToolCallResult } from './toolCalling';

/**
 * Implementation of ToolCallingHandler for OpenAI models
 */
export class OpenAIToolCallingHandler implements ToolCallingHandler {
  /**
   * Prepare tool definitions for OpenAI API
   * @param tools The tools to prepare
   * @returns The tools formatted for OpenAI
   */
  prepareTools(tools: FunctionToolDefinition[]): any[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Process tool calls from OpenAI response
   * @param data The OpenAI response data
   * @returns Processed tool calls and response message
   */
  processToolCallsFromResponse(data: any): {
    toolCalls: Array<{
      id: string;
      name: string;
      arguments: any;
    }>;
    responseMessage: string;
  } {
    // Check if there are any tool calls in the response
    if (!data.choices?.[0]?.message?.tool_calls?.length) {
      return {
        toolCalls: [],
        responseMessage: data.choices?.[0]?.message?.content || '',
      };
    }

    // Process the tool calls
    const toolCalls = data.choices[0].message.tool_calls.map((toolCall: any) => {
      try {
        // Parse the arguments as JSON
        const args = JSON.parse(toolCall.function.arguments);
        return {
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: args,
        };
      } catch (error) {
        // If parsing fails, return the raw arguments
        return {
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        };
      }
    });

    return {
      toolCalls,
      responseMessage: data.choices[0].message.content || '',
    };
  }

  /**
   * Create a request with tool results for OpenAI
   * @param conversation The conversation so far
   * @param toolResults The results of the tool calls
   * @returns The updated conversation
   */
  createToolResultsRequest(
    conversation: Array<{
      role: string;
      content: string | null;
      tool_calls?: any[];
      tool_call_id?: string;
      name?: string;
    }>,
    toolResults: ToolCallResult[],
  ): any {
    // Get the last message with tool calls
    const lastMessage = conversation[conversation.length - 1];

    if (!lastMessage.tool_calls) {
      throw new Error('Last message does not contain tool calls');
    }

    // Create tool result messages for each tool call
    const toolResultMessages = toolResults.map((result) => {
      // Find the tool call ID that corresponds to this tool name
      const toolCall = lastMessage.tool_calls?.find((tc) => {
        try {
          return tc.function.name === result.toolName;
        } catch (e) {
          return false;
        }
      });

      if (!toolCall) {
        throw new Error(`Could not find tool call for tool name: ${result.toolName}`);
      }

      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
      };
    });

    // Return the updated messages
    return [...conversation, ...toolResultMessages];
  }
}

/**
 * OpenAI tool calling handler singleton instance
 */
export const openAIToolCallingHandler = new OpenAIToolCallingHandler();
