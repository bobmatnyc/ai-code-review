/**
 * Mock client initializer to skip API calls during testing
 * 
 * This module mocks the initialization of LLM clients to avoid actual API calls.
 */

// Mock response for testing
function mockResponse(type, model) {
  const timestamp = new Date().toISOString();
  
  return {
    content: `
# Architectural Review (MOCK)

This is a mock review generated for testing the tool calling implementation. In a real scenario, this would be an actual review from the ${model} model.

## Summary

This project appears to be a simple web application using Express.js for the backend and includes several dependencies with known security vulnerabilities.

## Security Analysis

${type === 'openai' ? '**Tool Calling Used:** The OpenAI model used its ability to call the security analysis tool.' : '**Tool Calling Used:** The Anthropic model used its ability to call the security analysis tool.'}

### Dependency Vulnerabilities

The following dependencies have security issues:

1. **axios@0.21.1** - High severity vulnerability (SSRF)
   - Recommended upgrade to version 1.3.4

2. **log4js@5.0.0** - Medium severity vulnerability (ReDoS)
   - Recommended upgrade to version 6.7.1

3. **node-forge@0.9.0** - High severity vulnerability (Prototype Pollution)
   - Recommended upgrade to version 1.3.1

4. **django@2.2.13** - Medium severity vulnerability (Directory Traversal)
   - Recommended upgrade to version 4.2.4

## Architecture Recommendations

1. Update all dependencies to their recommended secure versions
2. Implement proper input validation throughout the application
3. Consider using a dependency scanning tool in your CI/CD pipeline

This mock review demonstrates the tool calling feature has been successfully implemented for ${type} client.
`,
    modelUsed: `${type}:${model}`,
    timestamp,
    filePath: 'architectural',
    reviewType: 'architectural',
    cost: {
      promptTokens: 1000,
      completionTokens: 1500,
      totalTokens: 2500,
      costUSD: 0.05
    }
  };
}

// Export mock initializers
module.exports = {
  // Mock OpenAI initializer
  mockInitializeOpenAI: async function() {
    console.log('[MOCK] Initializing OpenAI client');
    return true;
  },
  
  // Mock Anthropic initializer
  mockInitializeAnthropic: async function() {
    console.log('[MOCK] Initializing Anthropic client');
    return true;
  },
  
  // Mock OpenAI architectural review
  mockOpenAIArchitecturalReview: async function(files, project, projectDocs, options) {
    console.log('[MOCK] Generating architectural review with OpenAI');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    return mockResponse('openai', 'gpt-4o');
  },
  
  // Mock Anthropic architectural review
  mockAnthropicArchitecturalReview: async function(files, project, projectDocs, options) {
    console.log('[MOCK] Generating architectural review with Anthropic');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    return mockResponse('anthropic', 'claude-3-opus');
  }
};