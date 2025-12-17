/**
 * @fileoverview Anthropic tool calling functionality for architectural reviews.
 *
 * This module provides specialized functionality for handling tool calling in
 * Anthropic API requests, particularly for architectural reviews. It includes
 * the logic for processing tool call responses, executing tools, and formatting
 * tool results for follow-up requests.
 */

import type {
  CostInfo /* , ReviewType */,
  FileInfo,
  ReviewOptions,
  ReviewResult,
} from '../../types/review'; // ReviewType not used
import { extractPackageInfo } from '../../utils/dependencies/packageAnalyzer';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';
import { makeAnthropicConversationRequest, makeAnthropicRequest } from './anthropicApiClient';
import {
  getApiModelName,
  initializeAnthropicClient,
  isAnthropicModel,
  parseJsonResponse,
} from './anthropicModelHelpers';
import { formatConsolidatedReviewPrompt, loadPromptTemplate } from './index';
import { getModelMapping } from './modelMaps';
import { getCostInfoFromText } from './tokenCounter';
import { ALL_TOOLS } from './toolCalling';
import { executeToolCall } from './toolExecutor';

/**
 * System prompt specific for architectural review with tool calling
 */
/**
 * Get the architectural system prompt, optionally with diagram generation
 * @param includeDiagram Whether to include diagram generation instructions
 * @returns System prompt for architectural review
 */
function getArchitecturalSystemPrompt(includeDiagram = false): string {
  let prompt = `You are an expert code reviewer and software architect. Focus on providing actionable feedback on the project's architecture, dependencies, and overall design. You will be given a codebase to review.

IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE ARCHITECTURAL REVIEW CONTENT.

You have access to the following tools to help with your review:
- search_dependency_security: Use this to search for security information about a dependency
- batch_search_dependency_security: Use this to search for security information about multiple dependencies (up to 5)

ESSENTIAL TASK: For ALL major dependencies in the project, you MUST use these tools to thoroughly check for:
1. Security vulnerabilities and CVEs
2. Version updates and recommendations
3. Compatibility issues and breaking changes
4. Deprecation warnings
5. Maintenance status

Always include a dedicated "Dependency Security Analysis" section in your review that summarizes the findings from your dependency security checks. This is a critical part of the architectural review.`;

  if (includeDiagram) {
    prompt += `

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
  }

  return prompt;
}

/**
 * Interface for tool call results
 */
interface ToolCallResult {
  toolName: string;
  result: any;
}

/**
 * Format package dependencies into a readable text format
 * @param packageResults Package analysis results
 * @returns Formatted package information text
 */
function formatPackageDependencies(packageResults: any[]): string {
  if (packageResults.length === 0) {
    return '';
  }

  let packageInfoText =
    '\n\n## Package Dependencies\n\nThe project includes the following package dependencies:\n\n';

  // Format npm dependencies
  const npmDeps = packageResults.find((result) => result.npm && result.npm.length > 0);
  if (npmDeps?.npm) {
    packageInfoText += '### NPM Dependencies (JavaScript/TypeScript)\n\n';
    npmDeps.npm.forEach((dep: any) => {
      packageInfoText += `- ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.devDependency ? ' (dev)' : ''}\n`;
    });
    packageInfoText += '\n';
  }

  // Format composer dependencies
  const composerDeps = packageResults.find(
    (result) => result.composer && result.composer.length > 0,
  );
  if (composerDeps?.composer) {
    packageInfoText += '### Composer Dependencies (PHP)\n\n';
    composerDeps.composer.forEach((dep: any) => {
      packageInfoText += `- ${dep.name}${dep.constraint ? ` (${dep.constraint})` : ''}${dep.devDependency ? ' (dev)' : ''}\n`;
    });
    packageInfoText += '\n';
  }

  // Format python dependencies
  const pythonDeps = packageResults.find((result) => result.python && result.python.length > 0);
  if (pythonDeps?.python) {
    packageInfoText += '### Python Dependencies\n\n';
    pythonDeps.python.forEach((dep: any) => {
      packageInfoText += `- ${dep.name}${dep.constraint ? ` (${dep.constraint})` : ''}\n`;
    });
    packageInfoText += '\n';
  }

  // Format ruby dependencies
  const rubyDeps = packageResults.find((result) => result.ruby && result.ruby.length > 0);
  if (rubyDeps?.ruby) {
    packageInfoText += '### Ruby Dependencies\n\n';
    rubyDeps.ruby.forEach((dep: any) => {
      packageInfoText += `- ${dep.name}${dep.constraint ? ` (${dep.constraint})` : ''}${dep.devDependency ? ' (dev)' : ''}\n`;
    });
    packageInfoText += '\n';
  }

  return packageInfoText;
}

/**
 * Execute tool calls and collect results
 * @param toolCalls Array of tool calls to execute
 * @returns Array of tool call results
 */
async function executeToolCalls(
  toolCalls: Array<{ name: string; arguments: any }>,
): Promise<ToolCallResult[]> {
  logger.info(`Executing ${toolCalls.length} tool calls for architectural review...`);

  const toolResults: ToolCallResult[] = [];
  for (const toolCall of toolCalls) {
    logger.info(
      `Executing tool call: ${toolCall.name} with arguments: ${JSON.stringify(toolCall.arguments)}`,
    );
    try {
      const result = await executeToolCall(toolCall.name, toolCall.arguments);
      logger.info(`Tool call result received for ${toolCall.name}`);
      toolResults.push({
        toolName: toolCall.name,
        result,
      });
    } catch (error) {
      logger.error(
        `Error executing tool call ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
      toolResults.push({
        toolName: toolCall.name,
        result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return toolResults;
}

/**
 * Build conversation messages with tool results
 * @param userPrompt Original user prompt
 * @param responseMessage Initial assistant response
 * @param toolResults Tool execution results
 * @returns Array of conversation messages
 */
function buildToolResultsMessages(
  userPrompt: string,
  responseMessage: string,
  toolResults: ToolCallResult[],
): Array<{ role: string; content: any }> {
  const initialMessage = { role: 'user', content: userPrompt };
  const assistantMessage = {
    role: 'assistant',
    content: responseMessage,
  };

  // Create a conversation with the tool results
  const messages = createToolResultsRequest([initialMessage, assistantMessage], toolResults);

  // Add a final user prompt
  messages.push({
    role: 'user',
    content:
      'Based on the security information provided by the tools, complete your architectural review with security recommendations.' +
      ' Please ensure your response includes specific version recommendations for dependencies with security issues.',
  });

  return messages;
}

/**
 * Perform architectural review with tool calling
 * @param apiKey API key for Anthropic
 * @param apiModelName Model name for API calls
 * @param systemPrompt System prompt for the review
 * @param userPrompt User prompt with code and context
 * @param tools Available tools for the review
 * @returns Review content as string
 */
async function performToolCallingReview(
  apiKey: string,
  apiModelName: string,
  systemPrompt: string,
  userPrompt: string,
  tools: any[],
): Promise<string> {
  // Make the initial API request with tools
  const data = await makeAnthropicRequest(
    apiKey,
    apiModelName,
    systemPrompt,
    userPrompt,
    0.2,
    tools,
  );

  logger.debug(`Initial response: ${JSON.stringify(data)}`);

  // Process tool calls from the response
  const { toolCalls, responseMessage } = processToolCallsFromResponse(data);

  // If there are tool calls, execute them
  if (toolCalls.length > 0) {
    const toolResults = await executeToolCalls(toolCalls);

    // Build a conversation with the tool results
    const messages = buildToolResultsMessages(userPrompt, responseMessage, toolResults);

    // Make the final API request with tool results
    const finalData = await makeAnthropicConversationRequest(apiKey, apiModelName, messages);

    if (finalData.content && finalData.content.length > 0) {
      logger.info('Successfully generated architectural review with tool calling');
      return finalData.content[0].text;
    }
    throw new Error('Invalid response format from Anthropic');
  }

  // No tool calls, just use the initial response
  if (data.content && data.content.length > 0) {
    logger.info('Successfully generated architectural review');
    return data.content[0].text;
  }
  throw new Error('Invalid response format from Anthropic');
}

/**
 * Create follow-up messages containing tool results
 * @param previousMessages Previous conversation messages
 * @param toolResults Results from tool executions
 * @returns Updated messages array with tool results
 */
export function createToolResultsRequest(
  previousMessages: Array<{ role: string; content: any }>,
  toolResults: ToolCallResult[],
): Array<{ role: string; content: any }> {
  // Create a new array with previous messages
  const messages = [...previousMessages];

  // Add tool results
  for (const result of toolResults) {
    messages.push({
      role: 'user',
      content: `Tool "${result.toolName}" returned: ${JSON.stringify(result.result, null, 2)}`,
    });
  }

  return messages;
}

/**
 * Process tool calls from the Anthropic API response
 * @param responseData The API response data
 * @returns Object containing tool calls and the response message
 */
export function processToolCallsFromResponse(responseData: any): {
  toolCalls: Array<{ name: string; arguments: any }>;
  responseMessage: string;
} {
  const toolCalls: Array<{ name: string; arguments: any }> = [];
  let responseMessage = '';

  if (responseData.content && responseData.content.length > 0) {
    responseMessage = responseData.content[0].text;

    // Check for tool calls in the response
    if (responseData.content[0].type === 'tool_use' && responseData.content[0].tool_use) {
      toolCalls.push({
        name: responseData.content[0].tool_use.name,
        arguments: responseData.content[0].tool_use.input,
      });
    }
  }

  return { toolCalls, responseMessage };
}

/**
 * Prepare tools for Anthropic API
 * @param tools Array of tool definitions
 * @returns Formatted tools for the Anthropic API
 */
export function prepareTools(tools: any[]): any[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: tool.parameters.properties,
      required: tool.parameters.required,
    },
  }));
}

/**
 * Configuration for architectural review
 */
interface ArchitecturalReviewConfig {
  modelName: string;
  apiKey: string;
  supportsToolCalling: boolean;
  serpApiConfigured: boolean;
}

/**
 * Validate that the correct Anthropic model is configured
 * @returns Model information
 * @throws Error if model is invalid
 */
function validateAnthropicModel(): { adapter: string; modelName: string } {
  const { isCorrect, adapter, modelName } = isAnthropicModel();

  if (!isCorrect) {
    throw new Error(
      `Anthropic client was called with an invalid model: ${adapter ? `${adapter}:${modelName}` : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`,
    );
  }

  return { adapter, modelName };
}

/**
 * Build configuration for architectural review
 * @param modelName Model name
 * @returns Review configuration
 * @throws Error if API key is missing
 */
function buildReviewConfig(modelName: string): ArchitecturalReviewConfig {
  const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key is missing');
  }

  const model = getModelMapping(`anthropic:${modelName}`);
  const supportsToolCalling = model?.supportsToolCalling || false;
  const serpApiConfigured = !!process.env.SERPAPI_KEY;

  logReviewConfiguration(modelName, supportsToolCalling, serpApiConfigured);

  return { modelName, apiKey, supportsToolCalling, serpApiConfigured };
}

/**
 * Log review configuration for debugging
 * @param modelName Model name
 * @param supportsToolCalling Whether tool calling is supported
 * @param serpApiConfigured Whether SERP API is configured
 */
function logReviewConfiguration(
  modelName: string,
  supportsToolCalling: boolean,
  serpApiConfigured: boolean,
): void {
  logger.debug(
    `Using model: ${modelName}, supportsToolCalling: ${supportsToolCalling}, serpApiConfigured: ${serpApiConfigured}`,
  );
  logger.debug(`SERPAPI_KEY configured: ${serpApiConfigured ? 'YES' : 'NO'}`);
  logger.debug(`Model supports tool calling: ${supportsToolCalling ? 'YES' : 'NO'}`);
}

/**
 * Prepare user prompt with file information and package dependencies
 * @param files Array of file information
 * @param projectName Project name
 * @param projectDocs Project documentation
 * @param options Review options
 * @returns User prompt string
 */
async function prepareArchitecturalPrompt(
  files: FileInfo[],
  projectName: string,
  projectDocs: ProjectDocs | null | undefined,
  options: ReviewOptions | undefined,
): Promise<string> {
  const packageResults = await extractPackageInfo(process.cwd());
  const promptTemplate = await loadPromptTemplate('architectural', options);

  const fileInfos = files.map((file) => ({
    relativePath: file.relativePath,
    content:
      file.content.substring(0, 1000) + (file.content.length > 1000 ? '\n... (truncated)' : ''),
    sizeInBytes: file.content.length,
  }));

  const packageInfoText = formatPackageDependencies(packageResults);
  return (
    formatConsolidatedReviewPrompt(promptTemplate, projectName, fileInfos, projectDocs) +
    packageInfoText
  );
}

/**
 * Execute architectural review with tool calling
 * @param config Review configuration
 * @param userPrompt User prompt
 * @param options Review options
 * @returns Review content and structured data
 */
async function executeToolCallingReview(
  config: ArchitecturalReviewConfig,
  userPrompt: string,
  options: ReviewOptions | undefined,
): Promise<{ content: string; structuredData: any }> {
  const tools = prepareTools(ALL_TOOLS);
  const apiModelName = await getApiModelName(config.modelName);
  const systemPrompt = getArchitecturalSystemPrompt(options?.diagram || false);

  const content = await performToolCallingReview(
    config.apiKey,
    apiModelName,
    systemPrompt,
    userPrompt,
    tools,
  );

  const structuredData = parseJsonResponse(content);
  return { content, structuredData };
}

/**
 * Calculate cost information from review content
 * @param content Review content
 * @param modelName Model name
 * @returns Cost information or undefined
 */
function calculateReviewCost(content: string, modelName: string): CostInfo | undefined {
  try {
    return getCostInfoFromText(content, `anthropic:${modelName}`);
  } catch (error) {
    logger.warn(
      `Failed to calculate cost information: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }
}

/**
 * Generate an architectural review with tool calling
 * @param files Array of file information
 * @param projectName Project name
 * @param projectDocs Project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateArchitecturalAnthropicReview(
  files: FileInfo[],
  projectName: string,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions,
): Promise<ReviewResult> {
  const { modelName } = validateAnthropicModel();

  try {
    await initializeAnthropicClient();
    const config = buildReviewConfig(modelName);

    // Check if tool calling is enabled
    const toolCallingEnabled =
      config.supportsToolCalling && config.serpApiConfigured && options?.type === 'architectural';

    if (!toolCallingEnabled) {
      logger.info(`Generating regular architectural review using Anthropic ${modelName}...`);
      const { generateAnthropicConsolidatedReview } = await import('./anthropicReviewGenerators');
      return generateAnthropicConsolidatedReview(
        files,
        projectName,
        'architectural',
        projectDocs,
        options,
      );
    }

    // Execute tool calling review
    logger.info(
      `Generating architectural review with tool calling using Anthropic ${modelName}...`,
    );
    const userPrompt = await prepareArchitecturalPrompt(files, projectName, projectDocs, options);

    const { content, structuredData } = await executeToolCallingReview(config, userPrompt, options);
    const cost = calculateReviewCost(content, modelName);

    return {
      content,
      cost,
      modelUsed: `anthropic:${modelName}`,
      filePath: 'architectural',
      reviewType: 'architectural',
      timestamp: new Date().toISOString(),
      structuredData,
    };
  } catch (error) {
    logger.error(
      `Error generating architectural review: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}
