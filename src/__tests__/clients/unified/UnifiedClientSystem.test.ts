/**
 * @fileoverview Tests for the unified client system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UnifiedClientFactory } from '../../../clients/UnifiedClientFactory';
import { initializeUnifiedClients, createUnifiedClient, getBestUnifiedClient } from '../../../clients/unified';
import type { IApiClient, ApiClientConfig } from '../../../clients/IApiClient';

// Mock client for testing
class MockApiClient implements IApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  async initialize(): Promise<boolean> {
    // Mock initialization
    return true;
  }

  async generateReview(): Promise<any> {
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

  async generateConsolidatedReview(): Promise<any> {
    return this.generateReview();
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async estimateCost(): Promise<any> {
    return {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.001,
      cost: 0.001,
      formattedCost: '$0.001000 USD',
    };
  }

  getModelName(): string {
    return this.config.modelName || 'mock-model';
  }

  getProviderName(): string {
    return 'mock';
  }

  getSupportedModels(): string[] {
    return ['mock-model-1', 'mock-model-2'];
  }

  supportsModel(modelName: string): boolean {
    return this.getSupportedModels().includes(modelName);
  }

  isModelSupported(modelName: string) {
    const cleanedModel = modelName.replace(/^mock:/, '');
    const isSupported = this.getSupportedModels().includes(cleanedModel);
    return {
      isSupported,
      provider: 'mock',
      confidence: isSupported ? 1.0 : 0,
      features: isSupported ? ['text-generation', 'code-review'] : [],
    };
  }

  getModelSupportInfo(modelName: string) {
    if (this.supportsModel(modelName)) {
      return {
        supported: true,
        confidence: 1.0,
        features: ['text-generation', 'code-review'],
      };
    }
    return {
      supported: false,
      confidence: 0,
      features: [],
    };
  }
}

describe('Unified Client System', () => {
  beforeEach(() => {
    // Clear any existing registrations
    UnifiedClientFactory.clearProviders();
  });

  describe('Client Registration', () => {
    it('should register unified clients', () => {
      initializeUnifiedClients();
      
      const providers = UnifiedClientFactory.getAvailableProviders();
      expect(providers).toContain('openai');
    });

    it('should register custom mock client', () => {
      UnifiedClientFactory.registerProvider('mock', (config: ApiClientConfig) => {
        return new MockApiClient(config);
      });

      const providers = UnifiedClientFactory.getAvailableProviders();
      expect(providers).toContain('mock');
    });
  });

  describe('Client Creation', () => {
    beforeEach(() => {
      UnifiedClientFactory.registerProvider('mock', (config: ApiClientConfig) => {
        return new MockApiClient(config);
      });
      // Set mock API key for testing
      process.env.AI_CODE_REVIEW_MOCK_API_KEY = 'test-key';
    });

    afterEach(() => {
      // Clean up
      delete process.env.AI_CODE_REVIEW_MOCK_API_KEY;
    });

    it('should create client for supported model', async () => {
      const client = await createUnifiedClient('mock:mock-model-1');
      expect(client).toBeInstanceOf(MockApiClient);
      expect(client.getModelName()).toBe('mock-model-1');
    });

    it('should find best client for model', async () => {
      const result = await getBestUnifiedClient('mock-model-1');
      expect(result.client).toBeInstanceOf(MockApiClient);
      expect(result.supportInfo.isSupported).toBe(true);
      expect(result.supportInfo.confidence).toBe(1.0);
    });

    it('should throw error for unsupported model', async () => {
      await expect(createUnifiedClient('unsupported:model')).rejects.toThrow();
    });
  });

  describe('Client Functionality', () => {
    let client: IApiClient;

    beforeEach(async () => {
      UnifiedClientFactory.registerProvider('mock', (config: ApiClientConfig) => {
        return new MockApiClient(config);
      });
      // Set mock API key for testing
      process.env.AI_CODE_REVIEW_MOCK_API_KEY = 'test-key';
      client = await createUnifiedClient('mock:mock-model-1');
    });

    afterEach(() => {
      // Clean up
      delete process.env.AI_CODE_REVIEW_MOCK_API_KEY;
    });

    it('should generate review', async () => {
      const result = await client.generateReview(
        'test code',
        'test.ts',
        'quick-fixes',
        null,
        {}
      );

      expect(result.content).toBe('Mock review content');
      expect(result.modelUsed).toBe('mock-model-1');
      expect(result.costInfo).toBeDefined();
    });

    it('should test connection', async () => {
      const isConnected = await client.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should estimate cost', async () => {
      const cost = await client.estimateCost('test code', 'quick-fixes');
      expect(cost.totalTokens).toBe(150);
      expect(cost.estimatedCost).toBe(0.001);
    });

    it('should provide model information', () => {
      expect(client.getModelName()).toBe('mock-model-1');
      expect(client.getProviderName()).toBe('mock');
      expect(client.getSupportedModels()).toContain('mock-model-1');
      expect(client.supportsModel('mock-model-1')).toBe(true);
      expect(client.supportsModel('unsupported-model')).toBe(false);
    });
  });

  describe('Factory Statistics', () => {
    beforeEach(() => {
      UnifiedClientFactory.registerProvider('mock', (config: ApiClientConfig) => {
        return new MockApiClient(config);
      });
      // Set mock API key for testing
      process.env.AI_CODE_REVIEW_MOCK_API_KEY = 'test-key';
    });

    afterEach(() => {
      // Clean up
      delete process.env.AI_CODE_REVIEW_MOCK_API_KEY;
    });

    it('should provide statistics', () => {
      const stats = UnifiedClientFactory.getStatistics();
      expect(stats.totalProviders).toBe(1);
      expect(stats.providers).toHaveProperty('mock');
      expect(stats.providers.mock.totalModels).toBe(2);
    });
  });
});
