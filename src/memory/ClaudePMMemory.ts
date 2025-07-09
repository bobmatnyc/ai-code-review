/**
 * ClaudePMMemory - Enterprise Memory Management for AI Code Review
 * 
 * This class implements the core memory infrastructure (MEM-001) with enterprise
 * schemas (MEM-002) optimized for high-activity code review operations.
 */

import type { 
  MemoryConfig, 
  MemoryOperation, 
  CodeReviewMemoryEntry, 
  PerformanceMetrics,
  MemorySearchParams,
  MemorySearchResults,
  MemoryOperationResult,
  Mem0AIClient,
  MemoryCategory
} from './types';

/**
 * Main memory management class for AI Code Review
 * 
 * Provides enterprise-grade memory operations with:
 * - High-activity performance optimization
 * - TypeScript type safety
 * - Comprehensive error handling
 * - Performance monitoring
 * - Concurrent operation support
 */
export class ClaudePMMemory {
  private client!: Mem0AIClient;
  private config: MemoryConfig;
  private operations: Map<string, MemoryOperation> = new Map();
  private metrics!: PerformanceMetrics;
  private cache: Map<string, CodeReviewMemoryEntry> = new Map();

  constructor(config: MemoryConfig) {
    this.config = config;
    this.initializeMetrics();
    this.initializeClient();
  }

  /**
   * Initialize the mem0AI client
   */
  private initializeClient(): void {
    try {
      // Check if API key is available for real client
      const hasApiKey = this.config.apiKey || process.env.MEM0_API_KEY;
      
      if (!hasApiKey) {
        throw new Error('No API key provided - using mock client');
      }

      // Dynamic import to handle the mem0ai package
      const mem0ai = require('mem0ai');
      
      // Handle different export patterns
      const Mem0AI = mem0ai.default || mem0ai.MemoryClient || mem0ai;
      
      if (typeof Mem0AI === 'function') {
        // Try to create real client
        try {
          this.client = new Mem0AI({
            apiKey: this.config.apiKey || process.env.MEM0_API_KEY,
            baseUrl: this.config.baseUrl
          });
          console.log('✅ mem0AI real client initialized successfully');
        } catch (clientError) {
          console.warn(`Real mem0AI client failed: ${clientError}, using mock client`);
          throw clientError;
        }
      } else {
        // Fallback to direct object if constructor pattern doesn't work
        throw new Error('mem0ai package structure not recognized');
      }
    } catch (error) {
      console.warn(`mem0AI client initialization failed, using mock client: ${error}`);
      // Create a sophisticated mock client for testing/development
      this.client = this.createMockClient();
    }
  }

  /**
   * Create a mock client that simulates mem0AI behavior for testing
   */
  private createMockClient(): Mem0AIClient {
    const mockMemories = new Map<string, {
      id: string;
      content: string;
      metadata: Record<string, any>;
      userId?: string;
    }>();

    return {
      add: async (content: string, userId?: string, metadata?: any) => {
        const id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        mockMemories.set(id, { id, content, metadata: metadata || {}, userId });
        return { id };
      },
      
      search: async (query: string, userId?: string, limit?: number) => {
        const results = Array.from(mockMemories.values())
          .filter(memory => {
            // Filter by userId if provided
            if (userId && memory.userId !== userId) return false;
            // Simple text search
            return memory.content.toLowerCase().includes(query.toLowerCase());
          })
          .slice(0, limit || 10)
          .map(memory => ({
            id: memory.id,
            content: memory.content,
            score: 0.9, // Mock high relevance score
            metadata: memory.metadata
          }));
        
        return results;
      },
      
      get: async (memoryId: string) => {
        const memory = mockMemories.get(memoryId);
        if (!memory) {
          return { 
            id: memoryId, 
            content: 'Mock content not found', 
            metadata: {} 
          };
        }
        return {
          id: memory.id,
          content: memory.content,
          metadata: memory.metadata
        };
      },
      
      update: async (memoryId: string, content: string, metadata?: any) => {
        const memory = mockMemories.get(memoryId);
        if (memory) {
          memory.content = content;
          memory.metadata = { ...memory.metadata, ...metadata };
        }
        return { id: memoryId };
      },
      
      delete: async (memoryId: string) => {
        mockMemories.delete(memoryId);
      },
      
      getAll: async (userId?: string) => {
        return Array.from(mockMemories.values())
          .filter(memory => !userId || memory.userId === userId)
          .map(memory => ({
            id: memory.id,
            content: memory.content,
            metadata: memory.metadata
          }));
      }
    };
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      operationsByCategory: {
        PATTERN: 0,
        ERROR: 0,
        TEAM: 0,
        PROJECT: 0
      },
      averageDurationMs: 0,
      successRate: 1.0,
      peakConcurrency: 0,
      memoryUsage: {
        totalEntries: 0,
        cacheHitRate: 0,
        storageSizeBytes: 0
      },
      timeWindow: {
        start: new Date(),
        end: new Date()
      }
    };
  }

  /**
   * Store a code review memory entry
   * 
   * @param category - Memory category (PATTERN, ERROR, TEAM, PROJECT)
   * @param content - Memory content
   * @param metadata - Additional metadata
   * @returns Promise with operation result
   */
  async storeMemory(
    category: MemoryCategory,
    content: string,
    metadata: Partial<CodeReviewMemoryEntry['metadata']> = {}
  ): Promise<MemoryOperationResult<string>> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    try {
      const operation = this.createOperation(operationId, 'store', category);
      this.operations.set(operationId, operation);

      // Prepare memory entry
      const memoryEntry: CodeReviewMemoryEntry = {
        id: '', // Will be set by mem0AI
        category,
        content,
        metadata: {
          ...metadata,
          createdAt: new Date(),
          accessCount: 0
        }
      };

      // Store in mem0AI
      const result = await this.client.add(
        content,
        this.generateUserId(category),
        {
          category,
          ...metadata,
          createdAt: new Date().toISOString()
        }
      );

      memoryEntry.id = result.id;

      // Cache if enabled
      if (this.config.cache.enabled) {
        this.cache.set(result.id, memoryEntry);
      }

      // Update operation status
      const durationMs = Date.now() - startTime;
      operation.status = 'success';
      operation.durationMs = durationMs;

      this.updateMetrics(operation, true);

      return {
        success: true,
        data: result.id,
        metrics: {
          durationMs,
          timestamp: new Date(),
          operationType: 'store'
        }
      };

    } catch (error) {
      const durationMs = Date.now() - startTime;
      const operation = this.operations.get(operationId);
      if (operation) {
        operation.status = 'error';
        operation.error = String(error);
        operation.durationMs = durationMs;
        this.updateMetrics(operation, false);
      }

      return {
        success: false,
        error: `Failed to store memory: ${error}`,
        metrics: {
          durationMs,
          timestamp: new Date(),
          operationType: 'store'
        }
      };
    }
  }

  /**
   * Search for memories based on query and filters
   * 
   * @param params - Search parameters
   * @returns Promise with search results
   */
  async searchMemories(params: MemorySearchParams): Promise<MemoryOperationResult<MemorySearchResults>> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    try {
      const operation = this.createOperation(operationId, 'search', params.category || 'PATTERN');
      this.operations.set(operationId, operation);

      // Check cache first if enabled
      if (this.config.cache.enabled) {
        const cachedResults = this.searchCache(params);
        if (cachedResults.length > 0) {
          this.metrics.memoryUsage.cacheHitRate += 1;
          return this.createSearchResult(cachedResults, params, startTime);
        }
      }

      // Search in mem0AI
      const userId = params.category ? this.generateUserId(params.category) : undefined;
      const searchResults = await this.client.search(
        params.query,
        userId,
        params.limit || 10
      );

      // Convert to our format
      const results: CodeReviewMemoryEntry[] = searchResults
        .filter(result => this.matchesFilters(result, params))
        .map(result => ({
          id: result.id,
          category: (result.metadata?.category as MemoryCategory) || 'PATTERN',
          content: result.content,
          metadata: {
            ...result.metadata,
            confidence: result.score,
            lastAccessed: new Date(),
            accessCount: ((result.metadata?.accessCount as number) || 0) + 1,
            createdAt: result.metadata?.createdAt ? new Date(result.metadata.createdAt) : new Date()
          }
        }));

      const durationMs = Date.now() - startTime;
      operation.status = 'success';
      operation.durationMs = durationMs;

      this.updateMetrics(operation, true);

      const searchResults_final: MemorySearchResults = {
        results,
        totalMatches: results.length,
        searchDurationMs: durationMs,
        query: params.query,
        filters: params
      };

      return {
        success: true,
        data: searchResults_final,
        metrics: {
          durationMs,
          timestamp: new Date(),
          operationType: 'search'
        }
      };

    } catch (error) {
      const durationMs = Date.now() - startTime;
      const operation = this.operations.get(operationId);
      if (operation) {
        operation.status = 'error';
        operation.error = String(error);
        operation.durationMs = durationMs;
        this.updateMetrics(operation, false);
      }

      return {
        success: false,
        error: `Failed to search memories: ${error}`,
        metrics: {
          durationMs,
          timestamp: new Date(),
          operationType: 'search'
        }
      };
    }
  }

  /**
   * Get current performance metrics
   * 
   * @returns Current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.metrics.timeWindow.end = new Date();
    return { ...this.metrics };
  }

  /**
   * Clear all cached memories
   */
  clearCache(): void {
    this.cache.clear();
    this.metrics.memoryUsage.cacheHitRate = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: this.metrics.memoryUsage.cacheHitRate
    };
  }

  /**
   * Test high-activity performance with concurrent operations
   * 
   * @param concurrentOps - Number of concurrent operations to test
   * @returns Performance test results
   */
  async testHighActivityPerformance(concurrentOps: number = 50): Promise<{
    success: boolean;
    metrics: PerformanceMetrics;
    errors: string[];
  }> {
    const errors: string[] = [];
    const startTime = Date.now();

    // Create concurrent operations
    const operations = Array.from({ length: concurrentOps }, (_, i) => {
      const category: MemoryCategory = ['PATTERN', 'ERROR', 'TEAM', 'PROJECT'][i % 4] as MemoryCategory;
      return this.storeMemory(
        category,
        `High-activity test memory ${i}`,
        {
          projectId: 'ai-code-review',
          language: 'typescript',
          strategy: 'performance-test',
          tags: ['test', 'high-activity']
        }
      );
    });

    try {
      // Execute all operations concurrently
      const results = await Promise.allSettled(operations);
      
      // Collect errors
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          errors.push(`Operation ${index}: ${result.reason}`);
        } else if (!result.value.success) {
          errors.push(`Operation ${index}: ${result.value.error}`);
        }
      });

      // Update peak concurrency
      this.metrics.peakConcurrency = Math.max(this.metrics.peakConcurrency, concurrentOps);

      const testDuration = Date.now() - startTime;
      console.log(`High-activity test completed in ${testDuration}ms with ${errors.length} errors`);

      return {
        success: errors.length === 0,
        metrics: this.getMetrics(),
        errors
      };

    } catch (error) {
      errors.push(`High-activity test failed: ${error}`);
      return {
        success: false,
        metrics: this.getMetrics(),
        errors
      };
    }
  }

  // Private helper methods

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserId(category: MemoryCategory): string {
    return `ai-code-review_${category.toLowerCase()}`;
  }

  private createOperation(
    id: string, 
    type: MemoryOperation['type'], 
    category: MemoryCategory
  ): MemoryOperation {
    return {
      id,
      type,
      category,
      timestamp: new Date(),
      status: 'pending'
    };
  }

  private updateMetrics(operation: MemoryOperation, success: boolean): void {
    this.metrics.totalOperations += 1;
    this.metrics.operationsByCategory[operation.category] += 1;
    
    if (operation.durationMs) {
      const totalDuration = this.metrics.averageDurationMs * (this.metrics.totalOperations - 1) + operation.durationMs;
      this.metrics.averageDurationMs = totalDuration / this.metrics.totalOperations;
    }

    const successfulOps = this.metrics.totalOperations * this.metrics.successRate;
    this.metrics.successRate = success 
      ? (successfulOps + 1) / this.metrics.totalOperations
      : successfulOps / this.metrics.totalOperations;

    // Update memory usage
    if (success && operation.type === 'store') {
      this.metrics.memoryUsage.totalEntries += 1;
    }
  }

  private searchCache(params: MemorySearchParams): CodeReviewMemoryEntry[] {
    const results: CodeReviewMemoryEntry[] = [];
    const query = params.query.toLowerCase();

    for (const entry of Array.from(this.cache.values())) {
      // Simple text matching for cache search
      if (entry.content.toLowerCase().includes(query)) {
        // Apply filters
        if (params.category && entry.category !== params.category) continue;
        if (params.projectId && entry.metadata.projectId !== params.projectId) continue;
        if (params.language && entry.metadata.language !== params.language) continue;
        if (params.minConfidence && (entry.metadata.confidence || 0) < params.minConfidence) continue;

        results.push(entry);
      }
    }

    return results.slice(0, params.limit || 10);
  }

  private matchesFilters(result: any, params: MemorySearchParams): boolean {
    if (params.category && result.metadata?.category !== params.category) return false;
    if (params.projectId && result.metadata?.projectId !== params.projectId) return false;
    if (params.language && result.metadata?.language !== params.language) return false;
    if (params.minConfidence && result.score < params.minConfidence) return false;
    
    return true;
  }

  private createSearchResult(
    results: CodeReviewMemoryEntry[], 
    params: MemorySearchParams, 
    startTime: number
  ): MemoryOperationResult<MemorySearchResults> {
    const durationMs = Date.now() - startTime;
    
    return {
      success: true,
      data: {
        results,
        totalMatches: results.length,
        searchDurationMs: durationMs,
        query: params.query,
        filters: params
      },
      metrics: {
        durationMs,
        timestamp: new Date(),
        operationType: 'search'
      }
    };
  }
}