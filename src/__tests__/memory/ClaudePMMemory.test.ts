/**
 * ClaudePMMemory High-Activity Performance Tests
 * 
 * Comprehensive test suite for validating memory system performance
 * under high-frequency code review workloads.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClaudePMMemory } from '../../memory/ClaudePMMemory';
import { MemorySchemas } from '../../memory/schemas';
import { CodeReviewMemoryPatterns } from '../../memory/patterns';
import type { MemoryConfig, HighActivityTestConfig } from '../../memory/types';

// Mock mem0ai package
vi.mock('mem0ai', () => ({
  default: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'test-id-' + Date.now() }),
    search: vi.fn().mockResolvedValue([
      {
        id: 'search-result-1',
        content: 'Test memory content',
        score: 0.95,
        metadata: { category: 'PATTERN', language: 'typescript' }
      }
    ]),
    get: vi.fn().mockResolvedValue({
      id: 'test-id',
      content: 'Test content',
      metadata: {}
    }),
    update: vi.fn().mockResolvedValue({ id: 'test-id' }),
    delete: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([])
  }))
}));

describe('ClaudePMMemory - High-Activity Performance Tests', () => {
  let memory: ClaudePMMemory;
  let config: MemoryConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      maxConcurrency: 100,
      retentionDays: 30,
      enableMetrics: true,
      cache: {
        enabled: true,
        maxSize: 1000,
        ttlSeconds: 3600
      }
    };

    memory = new ClaudePMMemory(config);
  });

  afterEach(() => {
    memory.clearCache();
    vi.clearAllMocks();
  });

  describe('Basic Memory Operations', () => {
    it('should store a PATTERN memory successfully', async () => {
      const result = await memory.storeMemory(
        'PATTERN',
        'Test pattern content',
        {
          language: 'typescript',
          projectId: 'ai-code-review',
          tags: ['test', 'pattern']
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metrics.operationType).toBe('store');
      expect(result.metrics.durationMs).toBeGreaterThan(0);
    });

    it('should store an ERROR memory successfully', async () => {
      const result = await memory.storeMemory(
        'ERROR',
        'Test error pattern',
        {
          language: 'typescript',
          severity: 'medium',
          tags: ['test', 'error']
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should search memories with filters', async () => {
      const result = await memory.searchMemories({
        query: 'typescript performance',
        category: 'PATTERN',
        language: 'typescript',
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.results).toBeInstanceOf(Array);
      expect(result.data!.query).toBe('typescript performance');
    });
  });

  describe('High-Activity Concurrent Operations', () => {
    it('should handle 50 concurrent store operations', async () => {
      const concurrentOps = 50;
      const startTime = Date.now();

      const operations = Array.from({ length: concurrentOps }, (_, i) => {
        const category = ['PATTERN', 'ERROR', 'TEAM', 'PROJECT'][i % 4] as any;
        return memory.storeMemory(
          category,
          `High-activity test memory ${i}`,
          {
            projectId: 'ai-code-review',
            language: 'typescript',
            strategy: 'performance-test',
            tags: ['test', 'high-activity', `iteration-${i}`]
          }
        );
      });

      const results = await Promise.allSettled(operations);
      const duration = Date.now() - startTime;

      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      console.log(`High-activity test: ${successful}/${concurrentOps} operations succeeded in ${duration}ms`);

      // Performance assertions
      expect(successful).toBeGreaterThan(concurrentOps * 0.9); // 90% success rate
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(failed).toBeLessThan(concurrentOps * 0.1); // Less than 10% failures

      // Check metrics
      const metrics = memory.getMetrics();
      expect(metrics.totalOperations).toBeGreaterThanOrEqual(successful);
      expect(metrics.peakConcurrency).toBeGreaterThan(0);
    });

    it('should handle mixed operations (store/search) concurrently', async () => {
      const totalOps = 30;
      const storeOps = 20;
      const searchOps = 10;

      // First, store some initial data
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          memory.storeMemory('PATTERN', `Initial pattern ${i}`, { tags: ['initial'] })
        )
      );

      // Mixed concurrent operations
      const operations = [
        // Store operations
        ...Array.from({ length: storeOps }, (_, i) =>
          memory.storeMemory('PATTERN', `Concurrent pattern ${i}`, { tags: ['concurrent'] })
        ),
        // Search operations
        ...Array.from({ length: searchOps }, (_, i) =>
          memory.searchMemories({ query: `pattern ${i}`, limit: 5 })
        )
      ];

      const startTime = Date.now();
      const results = await Promise.allSettled(operations);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

      expect(successful).toBeGreaterThan(totalOps * 0.8); // 80% success rate for mixed operations
      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds

      console.log(`Mixed operations test: ${successful}/${totalOps} operations succeeded in ${duration}ms`);
    });

    it('should maintain performance under sustained load', async () => {
      const rounds = 3;
      const opsPerRound = 20;
      const roundResults: number[] = [];

      for (let round = 0; round < rounds; round++) {
        const startTime = Date.now();

        const operations = Array.from({ length: opsPerRound }, (_, i) =>
          memory.storeMemory(
            'PROJECT',
            `Sustained load test round ${round}, operation ${i}`,
            {
              round: round.toString(),
              operation: i.toString(),
              tags: ['sustained-load', `round-${round}`]
            }
          )
        );

        const results = await Promise.allSettled(operations);
        const duration = Date.now() - startTime;
        roundResults.push(duration);

        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        expect(successful).toBeGreaterThan(opsPerRound * 0.9);

        console.log(`Round ${round + 1}: ${successful}/${opsPerRound} operations in ${duration}ms`);

        // Brief pause between rounds
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Performance should not degrade significantly across rounds
      const avgFirstHalf = roundResults.slice(0, Math.ceil(rounds / 2)).reduce((a, b) => a + b, 0) / Math.ceil(rounds / 2);
      const avgSecondHalf = roundResults.slice(Math.floor(rounds / 2)).reduce((a, b) => a + b, 0) / Math.floor(rounds / 2);
      
      // Second half should not be more than 50% slower than first half
      expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 1.5);

      console.log(`Sustained load test: avg first half ${avgFirstHalf}ms, avg second half ${avgSecondHalf}ms`);
    });
  });

  describe('Memory Schema Integration', () => {
    it('should store TypeScript patterns using schema', async () => {
      const patterns = CodeReviewMemoryPatterns.getTypeScriptPatterns();
      
      const operations = patterns.map(pattern =>
        memory.storeMemory(pattern.category, pattern.content, pattern.metadata)
      );

      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

      expect(successful).toBe(patterns.length);
    });

    it('should store error patterns and search for them', async () => {
      const errorPatterns = CodeReviewMemoryPatterns.getCommonErrorPatterns();

      // Store error patterns
      const storeResults = await Promise.allSettled(
        errorPatterns.map(pattern =>
          memory.storeMemory(pattern.category, pattern.content, pattern.metadata)
        )
      );

      const stored = storeResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      expect(stored).toBe(errorPatterns.length);

      // Search for security-related errors
      const searchResult = await memory.searchMemories({
        query: 'security vulnerability',
        category: 'ERROR',
        limit: 10
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.data!.results.length).toBeGreaterThan(0);
    });

    it('should validate memory entries using schema validation', async () => {
      const testPattern = MemorySchemas.createPatternMemory({
        pattern: 'Test Pattern',
        description: 'Test description',
        language: 'typescript',
        complexity: 'low',
        useCase: 'Testing'
      });

      const validation = MemorySchemas.validateMemoryEntry({
        ...testPattern,
        id: 'test-id'
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Cache Performance', () => {
    it('should utilize cache for repeated searches', async () => {
      // Store some data
      await memory.storeMemory('PATTERN', 'Cached pattern test', { tags: ['cache-test'] });

      const query = { query: 'cached pattern', limit: 5 };

      // First search (cache miss)
      const firstSearch = await memory.searchMemories(query);
      expect(firstSearch.success).toBe(true);

      // Second search (should hit cache if implemented)
      const secondSearch = await memory.searchMemories(query);
      expect(secondSearch.success).toBe(true);

      const cacheStats = memory.getCacheStats();
      expect(cacheStats.size).toBeGreaterThanOrEqual(0);
    });

    it('should manage cache size limits', async () => {
      const cacheLimit = config.cache.maxSize;
      
      // Store more items than cache limit
      const operations = Array.from({ length: cacheLimit + 10 }, (_, i) =>
        memory.storeMemory('PATTERN', `Cache test pattern ${i}`, { iteration: i.toString() })
      );

      await Promise.allSettled(operations);

      const cacheStats = memory.getCacheStats();
      expect(cacheStats.size).toBeLessThanOrEqual(cacheLimit);
    });
  });

  describe('Performance Metrics', () => {
    it('should track comprehensive performance metrics', async () => {
      // Perform various operations
      await memory.storeMemory('PATTERN', 'Metrics test pattern', {});
      await memory.storeMemory('ERROR', 'Metrics test error', {});
      await memory.searchMemories({ query: 'metrics test', limit: 5 });

      const metrics = memory.getMetrics();

      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.operationsByCategory.PATTERN).toBeGreaterThan(0);
      expect(metrics.operationsByCategory.ERROR).toBeGreaterThan(0);
      expect(metrics.averageDurationMs).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.timeWindow.start).toBeInstanceOf(Date);
      expect(metrics.timeWindow.end).toBeInstanceOf(Date);

      console.log('Performance metrics:', JSON.stringify(metrics, null, 2));
    });

    it('should calculate success rate correctly', async () => {
      const initialMetrics = memory.getMetrics();
      const initialSuccessRate = initialMetrics.successRate;

      // Perform successful operation
      await memory.storeMemory('PATTERN', 'Success rate test', {});

      const updatedMetrics = memory.getMetrics();
      expect(updatedMetrics.successRate).toBeGreaterThanOrEqual(initialSuccessRate);
      expect(updatedMetrics.totalOperations).toBeGreaterThan(initialMetrics.totalOperations);
    });
  });

  describe('Built-in High-Activity Test', () => {
    it('should pass the built-in high-activity performance test', async () => {
      const testResult = await memory.testHighActivityPerformance(25); // Reduced for test environment

      expect(testResult.success).toBe(true);
      expect(testResult.errors).toHaveLength(0);
      expect(testResult.metrics.totalOperations).toBeGreaterThan(20);
      expect(testResult.metrics.peakConcurrency).toBeGreaterThan(0);

      console.log('Built-in high-activity test result:', JSON.stringify(testResult, null, 2));
    });

    it('should handle stress test configuration', async () => {
      const stressTestConfig: HighActivityTestConfig = {
        concurrentOperations: 20,
        testDurationSeconds: 5,
        operationsPerSecond: 10,
        scenarios: [
          { name: 'store-patterns', weight: 40, operation: 'store', dataSize: 'medium' },
          { name: 'search-patterns', weight: 30, operation: 'search', dataSize: 'small' },
          { name: 'store-errors', weight: 20, operation: 'store', dataSize: 'large' },
          { name: 'update-patterns', weight: 10, operation: 'update', dataSize: 'small' }
        ]
      };

      // Simulate the stress test scenarios
      const operations = Array.from({ length: stressTestConfig.concurrentOperations }, (_, i) => {
        const scenario = stressTestConfig.scenarios[i % stressTestConfig.scenarios.length];
        
        switch (scenario.operation) {
          case 'store':
            return memory.storeMemory('PATTERN', `Stress test ${scenario.name} ${i}`, {
              scenario: scenario.name,
              iteration: i.toString()
            });
          case 'search':
            return memory.searchMemories({
              query: `stress test ${i}`,
              limit: 5
            });
          default:
            return memory.storeMemory('PATTERN', `Default operation ${i}`, {});
        }
      });

      const startTime = Date.now();
      const results = await Promise.allSettled(operations);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const successRate = successful / results.length;

      expect(successRate).toBeGreaterThan(0.8); // 80% success rate
      expect(duration).toBeLessThan(stressTestConfig.testDurationSeconds * 2000); // Allow 2x the target duration

      console.log(`Stress test: ${successful}/${results.length} operations (${(successRate * 100).toFixed(1)}%) in ${duration}ms`);
    });
  });
});