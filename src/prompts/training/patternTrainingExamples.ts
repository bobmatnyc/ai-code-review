/**
 * @fileoverview Training examples for extract-patterns prompt optimization
 *
 * These examples demonstrate the specific patterns we want the AI to identify:
 * - Design patterns (Factory, Strategy, Observer, Dispatch models)
 * - Code structure metrics (file sizes, function sizes, inheritance)
 * - Code composition analysis (original vs library code)
 * - Architectural patterns and implementation patterns
 */

import type { PatternTrainingExample } from './ExtractPatternsTrainer';

/**
 * Example 1: Factory Pattern with Strategy Pattern
 */
const factoryStrategyExample: PatternTrainingExample = {
  code: `
// ApiClientFactory.ts (45 lines)
export class ApiClientFactory {
  private static clients = new Map<string, ApiClient>();
  
  static createClient(provider: string, config: ApiConfig): ApiClient {
    const key = \`\${provider}-\${config.model}\`;
    if (this.clients.has(key)) {
      return this.clients.get(key)!;
    }
    
    let client: ApiClient;
    switch (provider) {
      case 'openai':
        client = new OpenAIClient(config);
        break;
      case 'anthropic':
        client = new AnthropicClient(config);
        break;
      case 'google':
        client = new GoogleClient(config);
        break;
      default:
        throw new Error(\`Unknown provider: \${provider}\`);
    }
    
    this.clients.set(key, client);
    return client;
  }
}

// ReviewStrategy.ts (35 lines)
export interface ReviewStrategy {
  execute(code: string, options: ReviewOptions): Promise<ReviewResult>;
}

export class ArchitecturalReviewStrategy implements ReviewStrategy {
  constructor(private client: ApiClient) {}
  
  async execute(code: string, options: ReviewOptions): Promise<ReviewResult> {
    const prompt = this.buildArchitecturalPrompt(code, options);
    return await this.client.review(prompt);
  }
  
  private buildArchitecturalPrompt(code: string, options: ReviewOptions): string {
    return \`Analyze the architectural patterns in: \${code}\`;
  }
}

// Main usage (15 lines)
export class CodeReviewer {
  async review(code: string, type: string, provider: string): Promise<ReviewResult> {
    const client = ApiClientFactory.createClient(provider, config);
    const strategy = this.getStrategy(type, client);
    return await strategy.execute(code, options);
  }
  
  private getStrategy(type: string, client: ApiClient): ReviewStrategy {
    switch (type) {
      case 'architectural': return new ArchitecturalReviewStrategy(client);
      default: throw new Error(\`Unknown review type: \${type}\`);
    }
  }
}
`,
  expectedPatterns: {
    designPatterns: [
      'Factory Pattern - ApiClientFactory creates different client types',
      'Strategy Pattern - ReviewStrategy interface with multiple implementations',
      'Singleton Pattern - Client caching in factory',
      'Template Method Pattern - buildArchitecturalPrompt as template method',
    ],
    architecturalPatterns: [
      'Layered Architecture - Factory -> Strategy -> Client layers',
      'Plugin Architecture - Extensible review strategies',
      'Dependency Injection - Strategy receives client via constructor',
    ],
    codeMetrics: {
      averageFileSize: 32, // (45 + 35 + 15) / 3
      averageFunctionSize: 8, // Estimated average
      complexityLevel: 'medium',
    },
    compositionRatios: {
      originalCodePercentage: 95, // Mostly original business logic
      libraryCodePercentage: 5, // Minimal external dependencies
    },
    implementationPatterns: [
      'Interface Segregation - Single-purpose ReviewStrategy interface',
      'Composition over Inheritance - Strategy composition rather than inheritance',
      'Dependency Inversion - Depends on ApiClient abstraction',
    ],
  },
  description:
    'Classic example showing Factory + Strategy patterns with clean separation of concerns',
};

/**
 * Example 2: Observer Pattern with Event Dispatch
 */
const observerDispatchExample: PatternTrainingExample = {
  code: `
// EventDispatcher.ts (65 lines)
export class EventDispatcher {
  private listeners = new Map<string, Set<EventListener>>();
  private middleware: EventMiddleware[] = [];
  
  subscribe(event: string, listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    
    return () => this.unsubscribe(event, listener);
  }
  
  async dispatch(event: string, data: any): Promise<void> {
    const processedData = await this.applyMiddleware(event, data);
    const listeners = this.listeners.get(event) || new Set();
    
    await Promise.all(
      Array.from(listeners).map(listener => 
        this.safeExecute(listener, processedData)
      )
    );
  }
  
  private async applyMiddleware(event: string, data: any): Promise<any> {
    let processedData = data;
    for (const middleware of this.middleware) {
      processedData = await middleware.process(event, processedData);
    }
    return processedData;
  }
  
  private async safeExecute(listener: EventListener, data: any): Promise<void> {
    try {
      await listener(data);
    } catch (error) {
      console.error('Event listener error:', error);
    }
  }
}

// ReviewEventSystem.ts (40 lines)
export class ReviewEventSystem {
  private dispatcher = new EventDispatcher();
  
  onReviewStarted(callback: (data: ReviewStartedEvent) => void): () => void {
    return this.dispatcher.subscribe('review:started', callback);
  }
  
  onReviewCompleted(callback: (data: ReviewCompletedEvent) => void): () => void {
    return this.dispatcher.subscribe('review:completed', callback);
  }
  
  async startReview(reviewData: ReviewData): Promise<void> {
    await this.dispatcher.dispatch('review:started', { 
      timestamp: Date.now(), 
      ...reviewData 
    });
  }
  
  async completeReview(result: ReviewResult): Promise<void> {
    await this.dispatcher.dispatch('review:completed', { 
      timestamp: Date.now(), 
      result 
    });
  }
}
`,
  expectedPatterns: {
    designPatterns: [
      'Observer Pattern - EventDispatcher with subscribe/dispatch mechanism',
      'Command Pattern - Event dispatch as command execution',
      'Chain of Responsibility - Middleware processing chain',
      'Facade Pattern - ReviewEventSystem as facade over EventDispatcher',
    ],
    architecturalPatterns: [
      'Event-Driven Architecture - Decoupled communication via events',
      'Middleware Pattern - Pluggable event processing',
      'Publish-Subscribe Pattern - Event subscription system',
    ],
    codeMetrics: {
      averageFileSize: 53, // (65 + 40) / 2
      averageFunctionSize: 12, // Estimated average
      complexityLevel: 'medium',
    },
    compositionRatios: {
      originalCodePercentage: 90, // Custom event system implementation
      libraryCodePercentage: 10, // Basic Promise/Map usage
    },
    implementationPatterns: [
      'Composition Pattern - EventDispatcher composed into ReviewEventSystem',
      'Error Handling Pattern - Safe execution with try/catch',
      'Resource Management - Unsubscribe function returns for cleanup',
    ],
  },
  description: 'Event-driven system showing Observer pattern with middleware and error handling',
};

/**
 * Example 3: Large file with inheritance and mixins
 */
const inheritanceMixinExample: PatternTrainingExample = {
  code: `
// BaseClient.ts (120 lines - showing key parts)
export abstract class BaseClient {
  protected config: ClientConfig;
  protected rateLimiter: RateLimiter;
  
  constructor(config: ClientConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }
  
  abstract async makeRequest(prompt: string): Promise<Response>;
  
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    // 15 lines of retry logic
  }
  
  protected validateConfig(): void {
    // 10 lines of validation
  }
  
  protected logRequest(prompt: string): void {
    // 8 lines of logging
  }
}

// Mixins
export const CacheMixin = <T extends Constructor>(Base: T) => {
  return class extends Base {
    private cache = new Map<string, any>();
    
    protected getCached<R>(key: string): R | undefined {
      return this.cache.get(key);
    }
    
    protected setCached<R>(key: string, value: R): void {
      this.cache.set(key, value);
    }
  };
};

export const MetricsMixin = <T extends Constructor>(Base: T) => {
  return class extends Base {
    private metrics = new Map<string, number>();
    
    protected recordMetric(name: string, value: number): void {
      this.metrics.set(name, value);
    }
    
    protected getMetrics(): Record<string, number> {
      return Object.fromEntries(this.metrics);
    }
  };
};

// OpenAIClient.ts (85 lines)
export class OpenAIClient extends CacheMixin(MetricsMixin(BaseClient)) {
  async makeRequest(prompt: string): Promise<Response> {
    const cacheKey = this.generateCacheKey(prompt);
    const cached = this.getCached<Response>(cacheKey);
    if (cached) {
      this.recordMetric('cache_hits', 1);
      return cached;
    }
    
    const startTime = Date.now();
    const response = await this.executeWithRetry(() => 
      this.performOpenAIRequest(prompt)
    );
    
    const duration = Date.now() - startTime;
    this.recordMetric('request_duration', duration);
    this.setCached(cacheKey, response);
    
    return response;
  }
  
  private async performOpenAIRequest(prompt: string): Promise<Response> {
    // 25 lines of OpenAI-specific request logic
  }
  
  private generateCacheKey(prompt: string): string {
    // 8 lines of cache key generation
  }
}
`,
  expectedPatterns: {
    designPatterns: [
      'Template Method Pattern - BaseClient with abstract makeRequest',
      'Mixin Pattern - CacheMixin and MetricsMixin for cross-cutting concerns',
      'Decorator Pattern - Mixins decorating base functionality',
      'Strategy Pattern - Different client implementations',
    ],
    architecturalPatterns: [
      'Inheritance Hierarchy - BaseClient -> Mixed -> OpenAIClient (3 levels)',
      'Cross-cutting Concerns - Caching and metrics as mixins',
      'Layered Architecture - Base -> Mixins -> Concrete implementation',
    ],
    codeMetrics: {
      averageFileSize: 102, // (120 + 85) / 2 (excluding mixin definitions)
      averageFunctionSize: 15, // Larger functions due to implementation details
      complexityLevel: 'high',
    },
    compositionRatios: {
      originalCodePercentage: 85, // Complex custom client implementation
      libraryCodePercentage: 15, // External API calls, Map, Date usage
    },
    implementationPatterns: [
      'Multiple Inheritance via Mixins - TypeScript mixin pattern',
      'Abstract Base Class - BaseClient defines contract',
      'Protected Interface - Protected methods for subclass access',
      'Generic Constraints - Constructor type constraints in mixins',
    ],
  },
  description: 'Complex inheritance hierarchy with mixins showing advanced TypeScript patterns',
};

/**
 * All training examples
 */
export const PATTERN_TRAINING_EXAMPLES: PatternTrainingExample[] = [
  factoryStrategyExample,
  observerDispatchExample,
  inheritanceMixinExample,
];

/**
 * Get examples by pattern type
 */
export function getExamplesByPattern(patternType: string): PatternTrainingExample[] {
  return PATTERN_TRAINING_EXAMPLES.filter((example) =>
    example.expectedPatterns.designPatterns.some((pattern) =>
      pattern.toLowerCase().includes(patternType.toLowerCase()),
    ),
  );
}

/**
 * Get examples by complexity level
 */
export function getExamplesByComplexity(
  level: 'low' | 'medium' | 'high',
): PatternTrainingExample[] {
  return PATTERN_TRAINING_EXAMPLES.filter(
    (example) => example.expectedPatterns.codeMetrics.complexityLevel === level,
  );
}
