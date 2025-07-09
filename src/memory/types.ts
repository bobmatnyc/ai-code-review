/**
 * Memory System Type Definitions
 * 
 * Comprehensive TypeScript definitions for the memory system
 * supporting high-activity code review operations.
 */

/**
 * Memory configuration for the ai-code-review project
 */
export interface MemoryConfig {
  /** API key for mem0AI service */
  apiKey?: string;
  /** Base URL for mem0AI service (optional, defaults to hosted service) */
  baseUrl?: string;
  /** Maximum number of concurrent memory operations */
  maxConcurrency: number;
  /** Memory retention policy in days */
  retentionDays: number;
  /** Enable performance monitoring */
  enableMetrics: boolean;
  /** Cache configuration */
  cache: {
    enabled: boolean;
    maxSize: number;
    ttlSeconds: number;
  };
}

/**
 * Memory operation types for code review workflows
 */
export interface MemoryOperation {
  /** Unique operation identifier */
  id: string;
  /** Operation type */
  type: 'store' | 'search' | 'update' | 'delete';
  /** Memory category */
  category: MemoryCategory;
  /** Operation timestamp */
  timestamp: Date;
  /** Operation duration in milliseconds */
  durationMs?: number;
  /** Operation status */
  status: 'pending' | 'success' | 'error';
  /** Error details if operation failed */
  error?: string;
}

/**
 * Memory categories for code review patterns
 */
export type MemoryCategory = 'PATTERN' | 'ERROR' | 'TEAM' | 'PROJECT';

/**
 * Memory entry structure for code review data
 */
export interface CodeReviewMemoryEntry {
  /** Unique memory identifier */
  id: string;
  /** Memory category */
  category: MemoryCategory;
  /** Memory content */
  content: string;
  /** Associated metadata */
  metadata: {
    /** Project identifier */
    projectId?: string;
    /** File path or pattern */
    filePath?: string;
    /** Programming language */
    language?: string;
    /** Review strategy that created this memory */
    strategy?: string;
    /** Confidence score (0-1) */
    confidence?: number;
    /** Tags for categorization */
    tags?: string[];
    /** Creation timestamp */
    createdAt: Date;
    /** Last accessed timestamp */
    lastAccessed?: Date;
    /** Access count */
    accessCount?: number;
  };
}

/**
 * Performance metrics for memory operations
 */
export interface PerformanceMetrics {
  /** Total operations performed */
  totalOperations: number;
  /** Operations per category */
  operationsByCategory: Record<MemoryCategory, number>;
  /** Average operation duration in milliseconds */
  averageDurationMs: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Peak concurrent operations */
  peakConcurrency: number;
  /** Memory usage statistics */
  memoryUsage: {
    /** Total entries stored */
    totalEntries: number;
    /** Cache hit rate */
    cacheHitRate: number;
    /** Storage size in bytes */
    storageSizeBytes: number;
  };
  /** Time window for these metrics */
  timeWindow: {
    start: Date;
    end: Date;
  };
}

/**
 * Memory search parameters
 */
export interface MemorySearchParams {
  /** Search query */
  query: string;
  /** Filter by category */
  category?: MemoryCategory;
  /** Filter by project */
  projectId?: string;
  /** Filter by language */
  language?: string;
  /** Maximum number of results */
  limit?: number;
  /** Minimum confidence score */
  minConfidence?: number;
  /** Include metadata in results */
  includeMetadata?: boolean;
}

/**
 * Memory search results
 */
export interface MemorySearchResults {
  /** Search results */
  results: CodeReviewMemoryEntry[];
  /** Total number of matches */
  totalMatches: number;
  /** Search duration in milliseconds */
  searchDurationMs: number;
  /** Search query used */
  query: string;
  /** Applied filters */
  filters: Partial<MemorySearchParams>;
}

/**
 * Mem0AI client interface (TypeScript definitions for the npm package)
 */
export interface Mem0AIClient {
  /** Add a memory entry */
  add(content: string, userId?: string, metadata?: Record<string, any>): Promise<{ id: string }>;
  /** Search memories */
  search(query: string, userId?: string, limit?: number): Promise<Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }>>;
  /** Get a specific memory */
  get(memoryId: string): Promise<{
    id: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
  /** Update a memory */
  update(memoryId: string, content: string, metadata?: Record<string, any>): Promise<{ id: string }>;
  /** Delete a memory */
  delete(memoryId: string): Promise<void>;
  /** Get all memories for a user */
  getAll(userId?: string): Promise<Array<{
    id: string;
    content: string;
    metadata?: Record<string, any>;
  }>>;
}

/**
 * Memory operation result
 */
export interface MemoryOperationResult<T = any> {
  /** Operation success status */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error message if operation failed */
  error?: string;
  /** Operation metrics */
  metrics: {
    durationMs: number;
    timestamp: Date;
    operationType: string;
  };
}

/**
 * High-activity test configuration
 */
export interface HighActivityTestConfig {
  /** Number of concurrent operations to simulate */
  concurrentOperations: number;
  /** Duration of test in seconds */
  testDurationSeconds: number;
  /** Operations per second target */
  operationsPerSecond: number;
  /** Test scenarios to run */
  scenarios: Array<{
    name: string;
    weight: number; // Percentage of operations
    operation: 'store' | 'search' | 'update';
    dataSize: 'small' | 'medium' | 'large';
  }>;
}