/**
 * @fileoverview Base class for MCP tools
 *
 * This module provides the base class that all MCP tools should extend,
 * defining the common interface and shared functionality.
 */

import logger from '../../utils/logger';
import type { McpRequestContext, McpTool, ToolExecutionResult } from '../types';

/**
 * Base class for all MCP tools
 */
export abstract class BaseTool {
  protected name: string;
  protected description: string;
  protected inputSchema: McpTool['inputSchema'];

  constructor(name: string, description: string, inputSchema: McpTool['inputSchema']) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
  }

  /**
   * Get the tool definition for MCP
   */
  getDefinition(): McpTool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
    };
  }

  /**
   * Execute the tool with given arguments
   */
  async execute(args: any, context: McpRequestContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      logger.debug(`Executing ${this.name} with args:`, args);

      // Validate input arguments
      this.validateInput(args);

      // Execute the tool-specific logic
      const result = await this.executeImpl(args, context);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: {
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`Tool ${this.name} execution failed:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          executionTime,
        },
      };
    }
  }

  /**
   * Validate input arguments against the schema
   */
  protected validateInput(args: any): void {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid input: arguments must be an object');
    }

    // Check required properties
    if (this.inputSchema.required) {
      for (const required of this.inputSchema.required) {
        if (!(required in args)) {
          throw new Error(`Missing required parameter: ${required}`);
        }
      }
    }

    // Basic type validation for properties
    for (const [key, value] of Object.entries(args)) {
      if (key in this.inputSchema.properties) {
        const propertySchema = this.inputSchema.properties[key];
        this.validateProperty(key, value, propertySchema);
      }
    }
  }

  /**
   * Validate a single property against its schema
   */
  protected validateProperty(key: string, value: any, schema: any): void {
    if (schema.type) {
      const expectedType = schema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (expectedType !== actualType) {
        throw new Error(`Invalid type for ${key}: expected ${expectedType}, got ${actualType}`);
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      throw new Error(`Invalid value for ${key}: must be one of ${schema.enum.join(', ')}`);
    }
  }

  /**
   * Tool-specific implementation
   * Must be implemented by subclasses
   */
  protected abstract executeImpl(args: any, context: McpRequestContext): Promise<any>;

  /**
   * Get tool name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get tool description
   */
  getDescription(): string {
    return this.description;
  }
}
