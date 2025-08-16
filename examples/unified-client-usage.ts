/**
 * @fileoverview Examples of using the Unified Client System
 * 
 * This file demonstrates various ways to use the unified client system
 * for AI code reviews. These examples can be used as a reference for
 * integrating the unified clients into your application.
 */

import {
  createUnifiedClient,
  getBestUnifiedClient,
  testUnifiedClients,
  initializeUnifiedClients,
  UnifiedClientFactory,
  getUnifiedClientStats,
} from '../src/clients/unified';

import type { FileInfo, ReviewType, ReviewOptions } from '../src/types/review';
import type { ProjectDocs } from '../src/utils/projectDocs';

/**
 * Example 1: Basic Usage
 * Shows how to create a client and generate a simple review
 */
export async function basicUsageExample() {
  console.log('=== Basic Usage Example ===');
  
  try {
    // Initialize the unified client system
    initializeUnifiedClients();
    
    // Create a client for OpenAI GPT-4
    const client = await createUnifiedClient('openai:gpt-4');
    
    // Sample code to review
    const codeContent = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`;
    
    // Generate a review
    const result = await client.generateReview(
      codeContent,
      'src/utils/calculator.js',
      'quick-fixes',
      null, // No project docs
      { includePositiveFeedback: true }
    );
    
    console.log('Review Result:', {
      modelUsed: result.modelUsed,
      reviewType: result.reviewType,
      contentLength: result.content.length,
      costInfo: result.costInfo,
    });
    
    return result;
  } catch (error) {
    console.error('Basic usage failed:', error);
    throw error;
  }
}

/**
 * Example 2: Multi-file Review
 * Shows how to generate a consolidated review for multiple files
 */
export async function multiFileReviewExample() {
  console.log('=== Multi-file Review Example ===');
  
  try {
    // Create a client for Anthropic Claude
    const client = await createUnifiedClient('anthropic:claude-3-5-sonnet-20241022');
    
    // Sample files to review
    const fileInfos: FileInfo[] = [
      {
        path: 'src/models/User.ts',
        content: `
export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: User[] = [];
  
  addUser(user: User) {
    this.users.push(user);
  }
  
  findUser(id: string) {
    return this.users.find(u => u.id === id);
  }
}`,
        language: 'typescript',
        size: 250,
      },
      {
        path: 'src/controllers/UserController.ts',
        content: `
import { UserService } from '../models/User';

export class UserController {
  constructor(private userService: UserService) {}
  
  async createUser(req: any, res: any) {
    const user = req.body;
    this.userService.addUser(user);
    res.json({ success: true });
  }
  
  async getUser(req: any, res: any) {
    const user = this.userService.findUser(req.params.id);
    res.json(user);
  }
}`,
        language: 'typescript',
        size: 300,
      },
    ];
    
    // Generate consolidated review
    const result = await client.generateConsolidatedReview(
      fileInfos,
      'User Management System',
      'security',
      null, // No project docs
      { 
        includePositiveFeedback: false,
        focusAreas: ['security', 'error-handling', 'type-safety']
      }
    );
    
    console.log('Consolidated Review Result:', {
      modelUsed: result.modelUsed,
      reviewType: result.reviewType,
      filesReviewed: fileInfos.length,
      costInfo: result.costInfo,
    });
    
    return result;
  } catch (error) {
    console.error('Multi-file review failed:', error);
    throw error;
  }
}

/**
 * Example 3: Best Client Selection
 * Shows how to automatically find the best client for a model
 */
export async function bestClientSelectionExample() {
  console.log('=== Best Client Selection Example ===');
  
  try {
    // Find the best client for GPT-4 (will try multiple providers)
    const { client, supportInfo } = await getBestUnifiedClient('gpt-4');
    
    console.log('Best client found:', {
      provider: supportInfo.provider,
      isSupported: supportInfo.isSupported,
      confidence: supportInfo.confidence,
      features: supportInfo.features,
    });
    
    // Use the client
    const result = await client.estimateCost(
      'console.log("Hello, world!");',
      'quick-fixes'
    );
    
    console.log('Cost estimation:', result);
    
    return { client, supportInfo, costEstimate: result };
  } catch (error) {
    console.error('Best client selection failed:', error);
    throw error;
  }
}

/**
 * Example 4: Error Handling
 * Shows how to handle various error scenarios
 */
export async function errorHandlingExample() {
  console.log('=== Error Handling Example ===');
  
  try {
    // Try to create a client for an unsupported model
    await createUnifiedClient('unsupported:model-xyz');
  } catch (error) {
    console.log('Expected error for unsupported model:', error.message);
  }
  
  try {
    // Try to create a client without API key
    const originalKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
    delete process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
    
    await createUnifiedClient('openai:gpt-4');
    
    // Restore the key
    if (originalKey) {
      process.env.AI_CODE_REVIEW_OPENAI_API_KEY = originalKey;
    }
  } catch (error) {
    console.log('Expected error for missing API key:', error.message);
  }
  
  try {
    // Test connection with invalid credentials
    const client = await createUnifiedClient('openai:gpt-4');
    // This would fail with invalid API key
    // const isConnected = await client.testConnection();
    console.log('Connection test would be performed here');
  } catch (error) {
    console.log('Connection test error:', error.message);
  }
}

/**
 * Example 5: System Monitoring
 * Shows how to monitor the unified client system
 */
export async function systemMonitoringExample() {
  console.log('=== System Monitoring Example ===');
  
  try {
    // Get system statistics
    const stats = getUnifiedClientStats();
    console.log('System Statistics:', stats);
    
    // Test all available clients
    const testResults = await testUnifiedClients();
    console.log('Client Test Results:', testResults);
    
    // Get available providers
    const providers = UnifiedClientFactory.getAvailableProviders();
    console.log('Available Providers:', providers);
    
    // Get detailed provider statistics
    const detailedStats = UnifiedClientFactory.getStatistics();
    console.log('Detailed Statistics:', detailedStats);
    
    return {
      stats,
      testResults,
      providers,
      detailedStats,
    };
  } catch (error) {
    console.error('System monitoring failed:', error);
    throw error;
  }
}

/**
 * Example 6: Custom Provider Registration
 * Shows how to register a custom provider
 */
export async function customProviderExample() {
  console.log('=== Custom Provider Example ===');
  
  // This is a mock implementation for demonstration
  class MockApiClient {
    constructor(private config: any) {}
    
    async initialize() { return true; }
    async generateReview() { 
      return {
        content: 'Mock review content',
        reviewType: 'quick-fixes',
        timestamp: new Date().toISOString(),
        modelUsed: this.config.modelName,
        costInfo: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.001,
          cost: 0.001,
          formattedCost: '$0.001000 USD',
        },
      };
    }
    async generateConsolidatedReview() { return this.generateReview(); }
    async testConnection() { return true; }
    async estimateCost() { 
      return {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        estimatedCost: 0.001,
        cost: 0.001,
        formattedCost: '$0.001000 USD',
      };
    }
    getModelName() { return this.config.modelName || 'mock-model'; }
    getProviderName() { return 'mock'; }
    getSupportedModels() { return ['mock-model-1', 'mock-model-2']; }
    supportsModel(modelName: string) { return this.getSupportedModels().includes(modelName); }
    isModelSupported(modelName: string) {
      const isSupported = this.supportsModel(modelName.replace(/^mock:/, ''));
      return {
        isSupported,
        provider: 'mock',
        confidence: isSupported ? 1.0 : 0,
        features: isSupported ? ['text-generation', 'code-review'] : [],
      };
    }
  }
  
  try {
    // Register the custom provider
    UnifiedClientFactory.registerProvider('mock', (config) => {
      return new MockApiClient(config) as any;
    });
    
    // Set a mock API key
    process.env.AI_CODE_REVIEW_MOCK_API_KEY = 'mock-key';
    
    // Use the custom provider
    const client = await createUnifiedClient('mock:mock-model-1');
    const result = await client.generateReview(
      'console.log("test");',
      'test.js',
      'quick-fixes',
      null,
      {}
    );
    
    console.log('Custom provider result:', {
      modelUsed: result.modelUsed,
      provider: client.getProviderName(),
      costInfo: result.costInfo,
    });
    
    // Clean up
    delete process.env.AI_CODE_REVIEW_MOCK_API_KEY;
    
    return result;
  } catch (error) {
    console.error('Custom provider example failed:', error);
    throw error;
  }
}

/**
 * Main function to run all examples
 */
export async function runAllExamples() {
  console.log('Running Unified Client System Examples...\n');
  
  try {
    await basicUsageExample();
    console.log('\n');
    
    await multiFileReviewExample();
    console.log('\n');
    
    await bestClientSelectionExample();
    console.log('\n');
    
    await errorHandlingExample();
    console.log('\n');
    
    await systemMonitoringExample();
    console.log('\n');
    
    await customProviderExample();
    console.log('\n');
    
    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
