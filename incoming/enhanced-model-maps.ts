/**
 * @fileoverview Enhanced model mapping system for AI Code Review tool.
 * 
 * This module provides a comprehensive model configuration system that includes:
 * - Verified model specifications as of June 2025
 * - Pricing information for accurate cost estimation
 * - Deprecation tracking with migration guidance
 * - Backwards compatibility with existing codebase
 * - Provider-specific feature detection
 * - Model categorization and capability mapping
 * 
 * DESIGN RATIONALE:
 * - Maintains existing API surface for backwards compatibility
 * - Adds optional fields to avoid breaking changes
 * - Implements deprecation warnings to guide users away from retiring models
 * - Provides tiered pricing support for models with complex pricing structures
 * - Centralizes all model metadata for easier maintenance
 * 
 * @version 4.0.0
 * @since 3.2.8
 */

/**
 * Supported AI providers with their ecosystem characteristics.
 * 
 * Each provider has different capabilities, pricing models, and API structures.
 * This enum helps with type safety and provider-specific logic.
 */
export type Provider = 'gemini' | 'anthropic' | 'openai' | 'openrouter';

/**
 * Model performance and use-case categories.
 * 
 * These categories help users select appropriate models based on their specific needs:
 * - REASONING: Models optimized for complex problem-solving and multi-step thinking
 * - FAST_INFERENCE: Models optimized for speed over maximum capability
 * - COST_OPTIMIZED: Models providing good value for basic tasks
 * - LONG_CONTEXT: Models with extended context windows for large documents
 * - MULTIMODAL: Models supporting text, image, and other input types
 * - CODING: Models specifically fine-tuned for code generation and analysis
 */
export enum ModelCategory {
  REASONING = 'reasoning',
  FAST_INFERENCE = 'fast-inference', 
  COST_OPTIMIZED = 'cost-optimized',
  LONG_CONTEXT = 'long-context',
  MULTIMODAL = 'multimodal',
  CODING = 'coding'
}

/**
 * Tiered pricing structure for models with variable costs based on usage.
 * 
 * Some providers (like Google) implement tiered pricing where the cost per token
 * changes based on the number of tokens processed. This interface supports
 * complex pricing models while maintaining backwards compatibility.
 */
export interface TieredPricing {
  /** Token count threshold where this pricing tier begins */
  threshold: number;
  /** Price per million input tokens at this tier (USD) */
  inputPrice: number;
  /** Price per million output tokens at this tier (USD) */
  outputPrice: number;
  /** Human-readable description of this pricing tier */
  description?: string;
}

/**
 * Deprecation information for models being phased out.
 * 
 * This structure provides users with advance notice of model deprecations
 * and guidance on migration paths. Following industry best practices,
 * we provide 6+ months notice for major model deprecations.
 */
export interface DeprecationInfo {
  /** Whether this model is currently deprecated */
  isDeprecated: boolean;
  /** ISO date string when the model will be removed (if deprecated) */
  deprecationDate?: string;
  /** Recommended model to migrate to */
  migrationTarget?: string;
  /** Additional context about the deprecation */
  message?: string;
  /** Severity level of the deprecation warning */
  severity?: 'warning' | 'urgent' | 'critical';
}

/**
 * Provider-specific features and capabilities.
 * 
 * Different AI providers support different features like streaming, batching,
 * or prompt caching. This interface allows the tool to optimize API usage
 * based on provider capabilities.
 */
export interface ProviderFeatures {
  /** Whether the provider supports streaming responses */
  supportsStreaming: boolean;
  /** Whether the provider supports batch requests */
  supportsBatching: boolean;
  /** Whether the provider supports prompt caching for cost optimization */
  supportsPromptCaching: boolean;
  /** Rate limit for requests per minute (if known) */
  maxRequestsPerMinute?: number;
  /** Custom headers required for this provider */
  customHeaders?: Record<string, string>;
  /** Whether the provider supports function/tool calling */
  supportsTools: boolean;
}

/**
 * Enhanced model mapping interface with comprehensive metadata.
 * 
 * This interface extends the original ModelMapping with additional fields
 * for pricing, deprecation tracking, and enhanced capabilities. All new
 * fields are optional to maintain backwards compatibility.
 * 
 * BACKWARDS COMPATIBILITY NOTE:
 * Existing code using the original ModelMapping interface will continue
 * to work without modification. New features are opt-in.
 */
export interface EnhancedModelMapping {
  // Original fields (maintained for backwards compatibility)
  /** API-specific model identifier used when making API calls */
  apiIdentifier: string;
  /** Human-readable model name for display purposes */
  displayName: string;
  /** Provider identifier (gemini, anthropic, openai, openrouter) */
  provider: Provider;
  /** Whether to use v1beta API version (Gemini-specific) */
  useV1Beta?: boolean;
  /** Maximum context window size in tokens */
  contextWindow?: number;
  /** Model description for user guidance */
  description?: string;
  /** Environment variable name for the API key */
  apiKeyEnvVar: string;
  /** Whether model supports tool calling (legacy field) */
  supportsToolCalling?: boolean;

  // Enhanced fields (new in v4.0.0)
  /** Maximum output tokens per request */
  maxOutputTokens?: number;
  /** Simple pricing: cost per million input tokens (USD) */
  inputPricePerMillion?: number;
  /** Simple pricing: cost per million output tokens (USD) */
  outputPricePerMillion?: number;
  /** Complex tiered pricing structure (overrides simple pricing if present) */
  tieredPricing?: TieredPricing[];
  /** Deprecation status and migration information */
  deprecation?: DeprecationInfo;
  /** Model performance and use-case categories */
  categories?: ModelCategory[];
  /** Specific capabilities this model supports */
  capabilities?: string[];
  /** Provider-specific features and limitations */
  providerFeatures?: ProviderFeatures;
  /** Alternative model identifiers or aliases */
  aliases?: string[];
  /** Model variants (e.g., :nitro, :floor for OpenRouter) */
  variants?: Record<string, string>;
  /** Additional notes or warnings for users */
  notes?: string;
  /** Current availability status */
  status?: 'available' | 'preview' | 'deprecated' | 'retiring';
}

/**
 * Legacy interface for backwards compatibility.
 * 
 * This maintains the exact structure of the original ModelMapping interface
 * to ensure existing code continues to work without modification.
 */
export interface ModelMapping {
  apiIdentifier: string;
  displayName: string;
  provider: Provider;
  useV1Beta?: boolean;
  contextWindow?: number;
  description?: string;
  apiKeyEnvVar: string;
  supportsToolCalling?: boolean;
}

/**
 * Comprehensive model registry with verified specifications as of June 2025.
 * 
 * This registry includes:
 * - Corrected context window sizes based on official documentation
 * - Current pricing information for cost estimation
 * - Deprecation warnings for models being phased out
 * - Enhanced capability detection for optimal model selection
 * 
 * VERIFICATION NOTES:
 * - All specifications verified against official provider documentation
 * - Pricing current as of June 2025
 * - Context windows corrected (e.g., GPT-4-turbo is 128K, not 1M)
 * - Deprecated models marked with migration guidance
 */
export const ENHANCED_MODEL_MAP: Record<string, EnhancedModelMapping> = {
  // GEMINI MODELS
  // Google's flagship models with competitive pricing and large context windows
  
  "gemini:gemini-2.5-pro-preview": {
    apiIdentifier: "gemini-2.5-pro-preview-05-06",
    displayName: "Gemini 2.5 Pro Preview",
    provider: "gemini",
    useV1Beta: true,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    description: "Google's most advanced reasoning and multimodal model",
    apiKeyEnvVar: "AI_CODE_REVIEW_GOOGLE_API_KEY",
    supportsToolCalling: true,
    status: "preview",
    categories: [ModelCategory.REASONING, ModelCategory.LONG_CONTEXT, ModelCategory.MULTIMODAL],
    capabilities: ["reasoning", "multimodal", "function-calling", "thinking-tokens"],
    // Gemini 2.5 Pro has tiered pricing: cheaper for first 200K tokens
    tieredPricing: [
      {
        threshold: 0,
        inputPrice: 1.25,
        outputPrice: 10.0,
        description: "First 200K tokens per request"
      },
      {
        threshold: 200000,
        inputPrice: 2.50,
        outputPrice: 15.0,
        description: "Tokens beyond 200K per request"
      }
    ],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: false,
      supportsPromptCaching: true,
      supportsTools: true,
      maxRequestsPerMinute: 60
    },
    notes: "Thinking tokens are included in output token count. Preview model with enhanced reasoning capabilities."
  },

  "gemini:gemini-2.5-pro": {
    apiIdentifier: "gemini-2.5-pro-preview-05-06",
    displayName: "Gemini 2.5 Pro (DEPRECATED - Use gemini-2.5-pro-preview)",
    provider: "gemini",
    useV1Beta: true,
    contextWindow: 1000000,
    description: "DEPRECATED - Please use gemini:gemini-2.5-pro-preview instead",
    apiKeyEnvVar: "AI_CODE_REVIEW_GOOGLE_API_KEY",
    supportsToolCalling: true,
    status: "deprecated",
    deprecation: {
      isDeprecated: true,
      migrationTarget: "gemini:gemini-2.5-pro-preview",
      message: "This alias is deprecated. Use the explicit preview model name.",
      severity: "warning"
    },
    // Inherit pricing from preview model
    tieredPricing: [
      { threshold: 0, inputPrice: 1.25, outputPrice: 10.0 },
      { threshold: 200000, inputPrice: 2.50, outputPrice: 15.0 }
    ],
    aliases: ["gemini-2.5-pro-preview"],
    notes: "Legacy alias maintained for backwards compatibility. Update to use gemini:gemini-2.5-pro-preview."
  },

  "gemini:gemini-2.0-flash-lite": {
    apiIdentifier: "gemini-2.0-flash-lite",
    displayName: "Gemini 2.0 Flash Lite",
    provider: "gemini",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    description: "Lightweight, cost-optimized variant of Gemini Flash",
    apiKeyEnvVar: "AI_CODE_REVIEW_GOOGLE_API_KEY",
    supportsToolCalling: false,
    status: "available",
    categories: [ModelCategory.COST_OPTIMIZED, ModelCategory.FAST_INFERENCE, ModelCategory.LONG_CONTEXT],
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    capabilities: ["multimodal", "fast-inference"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: false,
      supportsPromptCaching: true,
      supportsTools: false, // Limited tool support
      maxRequestsPerMinute: 60
    },
    notes: "Most cost-effective option. No search/code execution tools available."
  },

  "gemini:gemini-2.0-flash": {
    apiIdentifier: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    provider: "gemini",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    description: "Balanced performance and quality with full tool support",
    apiKeyEnvVar: "AI_CODE_REVIEW_GOOGLE_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.LONG_CONTEXT, ModelCategory.MULTIMODAL],
    inputPricePerMillion: 0.10,
    outputPricePerMillion: 0.40,
    capabilities: ["multimodal", "function-calling", "native-tools", "search", "code-execution"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: false,
      supportsPromptCaching: true,
      supportsTools: true,
      maxRequestsPerMinute: 60
    }
  },

  // ANTHROPIC CLAUDE MODELS
  // Known for excellent coding capabilities and safety features

  "anthropic:claude-3-opus": {
    apiIdentifier: "claude-3-opus-20240229",
    displayName: "Claude 3 Opus",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    description: "Anthropic's most powerful model (RETIRING SOON)",
    apiKeyEnvVar: "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    supportsToolCalling: true,
    status: "retiring",
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    deprecation: {
      isDeprecated: true,
      deprecationDate: "2025-07-21",
      migrationTarget: "anthropic:claude-4-opus",
      message: "Claude 3 Opus will be retired on July 21, 2025. Migrate to Claude 4 Opus for continued access to flagship capabilities.",
      severity: "urgent"
    },
    capabilities: ["reasoning", "coding", "analysis", "creative-writing"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: true,
      supportsTools: true,
      maxRequestsPerMinute: 50
    },
    notes: "Legacy model with 6+ months retirement notice. Claude 4 Opus offers superior performance."
  },

  "anthropic:claude-3.7-sonnet": {
    apiIdentifier: "claude-3-7-sonnet-20250219",
    displayName: "Claude 3.7 Sonnet",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 128000, // Extended with beta header
    description: "Hybrid reasoning model with enhanced capabilities",
    apiKeyEnvVar: "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    capabilities: ["extended-thinking", "token-efficient-tools", "parallel-processing"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: true,
      supportsTools: true,
      maxRequestsPerMinute: 50,
      customHeaders: { "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15" }
    },
    notes: "Requires beta header for extended output. Excellent for complex reasoning tasks."
  },

  "anthropic:claude-3.5-sonnet": {
    apiIdentifier: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet v2",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    description: "Improved version of Claude 3.5 Sonnet with computer use",
    apiKeyEnvVar: "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.CODING, ModelCategory.MULTIMODAL],
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    capabilities: ["computer-use", "vision", "coding", "tool-use"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: true,
      supportsTools: true,
      maxRequestsPerMinute: 50
    }
  },

  "anthropic:claude-3-haiku": {
    apiIdentifier: "claude-3-haiku-20240307",
    displayName: "Claude 3 Haiku",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    description: "Fast and lightweight model (RETIRING SOON)",
    apiKeyEnvVar: "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    supportsToolCalling: true,
    status: "retiring",
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.COST_OPTIMIZED],
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    deprecation: {
      isDeprecated: true,
      deprecationDate: "2025-07-21",
      migrationTarget: "anthropic:claude-3.5-haiku",
      message: "Claude 3 Haiku will be retired on July 21, 2025. Migrate to Claude 3.5 Haiku for continued fast inference.",
      severity: "urgent"
    },
    capabilities: ["fast-inference", "basic-reasoning"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: true,
      supportsTools: true,
      maxRequestsPerMinute: 100
    },
    notes: "Legacy model being retired. Claude 3.5 Haiku offers better performance at similar speed."
  },

  "anthropic:claude-3.5-haiku": {
    apiIdentifier: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    description: "Fast and lightweight model with improved capabilities",
    apiKeyEnvVar: "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.COST_OPTIMIZED],
    inputPricePerMillion: 1.0,
    outputPricePerMillion: 5.0,
    capabilities: ["fast-inference", "reasoning", "tool-use"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: true,
      supportsTools: true,
      maxRequestsPerMinute: 100
    }
  },

  "anthropic:claude-4-sonnet": {
    apiIdentifier: "claude-sonnet-4-20250514",
    displayName: "Claude 4 Sonnet",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    description: "Next-generation balanced model with enhanced reasoning",
    apiKeyEnvVar: "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    capabilities: ["extended-thinking", "parallel-tools", "memory", "advanced-reasoning"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: true,
      supportsTools: true,
      maxRequestsPerMinute: 50
    },
    notes: "Latest generation Claude model with significantly enhanced capabilities."
  },

  "anthropic:claude-4-opus": {
    apiIdentifier: "claude-opus-4-20250514",
    displayName: "Claude 4 Opus",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 32000,
    description: "Most powerful Claude model with advanced capabilities",
    apiKeyEnvVar: "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    capabilities: ["extended-thinking", "parallel-tools", "best-coding", "advanced-reasoning"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: true,
      supportsTools: true,
      maxRequestsPerMinute: 50
    },
    notes: "Flagship Claude model optimized for the most demanding tasks."
  },

  // OPENAI MODELS
  // Industry-leading models with strong general capabilities

  "openai:gpt-4.1": {
    apiIdentifier: "gpt-4.1",
    displayName: "GPT-4.1",
    provider: "openai",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    description: "Latest coding-oriented GPT model with million-token context",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENAI_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.CODING, ModelCategory.LONG_CONTEXT, ModelCategory.REASONING],
    inputPricePerMillion: 2.0,
    outputPricePerMillion: 8.0,
    capabilities: ["coding", "reasoning", "tool-use", "long-context"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: false,
      supportsTools: true,
      maxRequestsPerMinute: 60
    },
    variants: {
      "mini": "gpt-4.1-mini", // $0.40/$1.60 pricing
      "nano": "gpt-4.1-nano"  // $0.10/$0.40 pricing
    },
    notes: "Also available in mini and nano variants for cost optimization."
  },

  "openai:gpt-4o": {
    apiIdentifier: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    contextWindow: 128000, // Verified: NOT 1M as sometimes reported
    maxOutputTokens: 4096,
    description: "Multimodal model with native image/audio/text support",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENAI_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.MULTIMODAL, ModelCategory.FAST_INFERENCE],
    inputPricePerMillion: 5.0,
    outputPricePerMillion: 15.0,
    capabilities: ["multimodal", "fast-inference", "vision", "audio"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: false,
      supportsTools: true,
      maxRequestsPerMinute: 60
    }
  },

  "openai:gpt-4.5": {
    apiIdentifier: "gpt-4.5-preview",
    displayName: "GPT-4.5 (DEPRECATED)",
    provider: "openai",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    description: "DEPRECATED: Experimental model being removed",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENAI_API_KEY",
    supportsToolCalling: true,
    status: "deprecated",
    categories: [ModelCategory.REASONING],
    inputPricePerMillion: 150.0,
    outputPricePerMillion: 600.0,
    deprecation: {
      isDeprecated: true,
      deprecationDate: "2025-07-14",
      migrationTarget: "openai:gpt-4.1",
      message: "GPT-4.5 was an experimental model that is being removed. Migrate to GPT-4.1 for similar capabilities at much lower cost.",
      severity: "critical"
    },
    capabilities: ["experimental-reasoning"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: false,
      supportsPromptCaching: false,
      supportsTools: true,
      maxRequestsPerMinute: 20
    },
    notes: "Experimental model with very high pricing. GPT-4.1 offers better value."
  },

  "openai:gpt-4-turbo": {
    apiIdentifier: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    provider: "openai",
    contextWindow: 128000, // Verified: NOT 1M as originally specified
    maxOutputTokens: 4096,
    description: "Optimized version of GPT-4 with faster response times",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENAI_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.FAST_INFERENCE],
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    capabilities: ["fast-inference", "reasoning", "tool-use"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: false,
      supportsTools: true,
      maxRequestsPerMinute: 60
    },
    notes: "Context window is 128K, not 1M. Consider GPT-4.1 for longer contexts."
  },

  "openai:gpt-3.5-turbo": {
    apiIdentifier: "gpt-3.5-turbo-0125",
    displayName: "GPT-3.5 Turbo",
    provider: "openai",
    contextWindow: 16384, // Verified: Current version is 16K, not 4K
    maxOutputTokens: 4096,
    description: "Cost-effective model for simpler tasks",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENAI_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.COST_OPTIMIZED, ModelCategory.FAST_INFERENCE],
    inputPricePerMillion: 1.0,
    outputPricePerMillion: 2.0,
    capabilities: ["basic-reasoning", "tool-use"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: true,
      supportsPromptCaching: false,
      supportsTools: true,
      maxRequestsPerMinute: 100
    },
    notes: "Current version has 16K context. Only instruct variant has 4K context."
  },

  "openai:o3": {
    apiIdentifier: "o3",
    displayName: "OpenAI O3",
    provider: "openai",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    description: "Advanced reasoning model optimized for complex problem solving",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENAI_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.REASONING],
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 40.0,
    capabilities: ["reasoning", "multimodal-reasoning", "tool-use-during-reasoning"],
    providerFeatures: {
      supportsStreaming: false, // Reasoning models often don't support streaming
      supportsBatching: false,
      supportsPromptCaching: false,
      supportsTools: true,
      maxRequestsPerMinute: 30
    },
    notes: "Optimized for complex reasoning tasks. May have longer response times."
  },

  "openai:o3-mini": {
    apiIdentifier: "o3-mini",
    displayName: "OpenAI O3 Mini",
    provider: "openai",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    description: "Smaller, faster version of O3 reasoning model",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENAI_API_KEY",
    supportsToolCalling: true,
    status: "available",
    categories: [ModelCategory.REASONING, ModelCategory.COST_OPTIMIZED],
    inputPricePerMillion: 1.1,
    outputPricePerMillion: 4.4,
    capabilities: ["reasoning", "effort-control", "stem-focused"],
    providerFeatures: {
      supportsStreaming: false,
      supportsBatching: false,
      supportsPromptCaching: false,
      supportsTools: true,
      maxRequestsPerMinute: 60
    },
    notes: "Cost-effective reasoning model with configurable effort levels."
  },

  // OPENROUTER MODELS
  // Unified access to multiple providers with intelligent routing

  "openrouter:anthropic/claude-3-opus": {
    apiIdentifier: "anthropic/claude-3-opus-20240229",
    displayName: "Claude 3 Opus (via OpenRouter)",
    provider: "openrouter",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    description: "Claude 3 Opus model served via OpenRouter with intelligent routing",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    supportsToolCalling: false, // OpenRouter may have limited tool support
    status: "available",
    categories: [ModelCategory.REASONING, ModelCategory.CODING],
    inputPricePerMillion: 15.0, // May include OpenRouter markup
    outputPricePerMillion: 75.0,
    capabilities: ["reasoning", "coding", "analysis"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: false,
      supportsPromptCaching: false,
      supportsTools: false,
      maxRequestsPerMinute: 50
    },
    variants: {
      "nitro": ":nitro",     // Speed-optimized
      "floor": ":floor",     // Cost-optimized
      "free": ":free"        // Free tier with limits
    },
    notes: "Served via OpenRouter. May include routing fees. Check OpenRouter pricing for exact costs."
  },

  "openrouter:anthropic/claude-3-sonnet": {
    apiIdentifier: "anthropic/claude-3-sonnet",
    displayName: "Claude 3 Sonnet (via OpenRouter)",
    provider: "openrouter",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    description: "Claude 3 Sonnet model served via OpenRouter",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    supportsToolCalling: false,
    status: "available",
    categories: [ModelCategory.CODING],
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    capabilities: ["coding", "reasoning"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: false,
      supportsPromptCaching: false,
      supportsTools: false,
      maxRequestsPerMinute: 50
    },
    variants: {
      "nitro": ":nitro",
      "floor": ":floor",
      "free": ":free"
    }
  },

  "openrouter:anthropic/claude-3-haiku": {
    apiIdentifier: "anthropic/claude-3-haiku",
    displayName: "Claude 3 Haiku (via OpenRouter)",
    provider: "openrouter",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    description: "Claude 3 Haiku model served via OpenRouter",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    supportsToolCalling: false,
    status: "available",
    categories: [ModelCategory.FAST_INFERENCE, ModelCategory.COST_OPTIMIZED],
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    capabilities: ["fast-inference"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: false,
      supportsPromptCaching: false,
      supportsTools: false,
      maxRequestsPerMinute: 100
    },
    variants: {
      "nitro": ":nitro",
      "floor": ":floor",
      "free": ":free"
    }
  },

  "openrouter:openai/gpt-4o": {
    apiIdentifier: "openai/gpt-4o",
    displayName: "GPT-4o (via OpenRouter)",
    provider: "openrouter",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    description: "GPT-4o model served via OpenRouter",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    supportsToolCalling: false,
    status: "available",
    categories: [ModelCategory.MULTIMODAL, ModelCategory.FAST_INFERENCE],
    inputPricePerMillion: 5.0,
    outputPricePerMillion: 15.0,
    capabilities: ["multimodal", "fast-inference"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: false,
      supportsPromptCaching: false,
      supportsTools: false,
      maxRequestsPerMinute: 60
    },
    variants: {
      "nitro": ":nitro",
      "floor": ":floor"
    }
  },

  "openrouter:openai/gpt-4-turbo": {
    apiIdentifier: "openai/gpt-4-turbo",
    displayName: "GPT-4 Turbo (via OpenRouter)",
    provider: "openrouter",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    description: "GPT-4 Turbo model served via OpenRouter",
    apiKeyEnvVar: "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    supportsToolCalling: false,
    status: "available",
    categories: [ModelCategory.FAST_INFERENCE],
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    capabilities: ["fast-inference", "reasoning"],
    providerFeatures: {
      supportsStreaming: true,
      supportsBatching: false,
      supportsPromptCaching: false,
      supportsTools: false,
      maxRequestsPerMinute: 60
    },
    variants: {
      "nitro": ":nitro",
      "floor": ":floor"
    }
  }
};

/**
 * Legacy model map for backwards compatibility.
 * 
 * This maintains the exact structure expected by existing code while
 * providing access to the enhanced model specifications. New code should
 * use ENHANCED_MODEL_MAP directly for full feature access.
 * 
 * IMPLEMENTATION NOTE:
 * This map is generated from ENHANCED_MODEL_MAP to ensure consistency
 * and avoid duplication. Changes to model specifications only need to
 * be made in ENHANCED_MODEL_MAP.
 */
export const MODEL_MAP: Record<string, ModelMapping> = Object.fromEntries(
  Object.entries(ENHANCED_MODEL_MAP).map(([key, enhanced]) => [
    key,
    {
      apiIdentifier: enhanced.apiIdentifier,
      displayName: enhanced.displayName,
      provider: enhanced.provider,
      useV1Beta: enhanced.useV1Beta,
      contextWindow: enhanced.contextWindow,
      description: enhanced.description,
      apiKeyEnvVar: enhanced.apiKeyEnvVar,
      supportsToolCalling: enhanced.supportsToolCalling
    } as ModelMapping
  ])
);

/**
 * Models organized by provider for easy filtering and selection.
 * 
 * This structure is automatically derived from ENHANCED_MODEL_MAP to ensure
 * consistency and reduce maintenance overhead.
 */
export const MODELS: Record<Provider, string[]> = {
  gemini: Object.keys(ENHANCED_MODEL_MAP).filter(
    key => ENHANCED_MODEL_MAP[key].provider === 'gemini'
  ),
  anthropic: Object.keys(ENHANCED_MODEL_MAP).filter(
    key => ENHANCED_MODEL_MAP[key].provider === 'anthropic'
  ),
  openai: Object.keys(ENHANCED_MODEL_MAP).filter(
    key => ENHANCED_MODEL_MAP[key].provider === 'openai'
  ),
  openrouter: Object.keys(ENHANCED_MODEL_MAP).filter(
    key => ENHANCED_MODEL_MAP[key].provider === 'openrouter'
  )
};

// UTILITY FUNCTIONS
// These functions provide both backwards compatibility and new enhanced features

/**
 * Get the API name for a given model (backwards compatible).
 * 
 * @param modelKey The full model key (e.g., 'gemini:gemini-1.5-pro')
 * @returns The API name for the model, or the original model name if not found
 * 
 * @example
 * ```typescript
 * const apiName = getApiNameFromKey('gemini:gemini-2.5-pro-preview');
 * // Returns: 'gemini-2.5-pro-preview-05-06'
 * ```
 */
export function getApiNameFromKey(modelKey: string): string {
  const enhanced = ENHANCED_MODEL_MAP[modelKey];
  if (enhanced) {
    return enhanced.apiIdentifier;
  }
  
  // Fallback to legacy behavior for backwards compatibility
  return MODEL_MAP[modelKey]?.apiIdentifier || modelKey.split(':')[1] || modelKey;
}

/**
 * Get the legacy model mapping for a given model key (backwards compatible).
 * 
 * @param modelKey The full model key (e.g., 'gemini:gemini-1.5-pro')
 * @returns The model mapping, or undefined if not found
 */
export function getModelMapping(modelKey: string): ModelMapping | undefined {
  return MODEL_MAP[modelKey];
}

/**
 * Get the enhanced model mapping with all metadata (NEW).
 * 
 * @param modelKey The full model key (e.g., 'gemini:gemini-1.5-pro')
 * @returns The enhanced model mapping, or undefined if not found
 * 
 * @example
 * ```typescript
 * const enhanced = getEnhancedModelMapping('anthropic:claude-4-sonnet');
 * if (enhanced?.deprecation?.isDeprecated) {
 *   console.warn(`Model is deprecated: ${enhanced.deprecation.message}`);
 * }
 * console.log(`Cost: $${enhanced.inputPricePerMillion}/M input tokens`);
 * ```
 */
export function getEnhancedModelMapping(modelKey: string): EnhancedModelMapping | undefined {
  return ENHANCED_MODEL_MAP[modelKey];
}

/**
 * Get all models for a given provider (backwards compatible).
 * 
 * @param provider The provider (gemini, anthropic, openai, openrouter)
 * @returns Array of model keys for the provider
 */
export function getModelsByProvider(provider: Provider): string[] {
  return MODELS[provider] || [];
}

/**
 * Get the models for a given provider (legacy alias).
 * 
 * @param provider The provider (gemini, anthropic, openai, openrouter)
 * @returns Array of model keys for the provider
 * @deprecated Use getModelsByProvider instead
 */
export function getModels(provider: Provider): string[] {
  return getModelsByProvider(provider);
}

/**
 * Parse a model string in the format "provider:model" (backwards compatible).
 * 
 * @param modelString The model string to parse
 * @returns An object with provider and modelName
 * @throws Error if modelString is empty or undefined
 */
export function parseModelString(modelString: string): {
  provider: Provider;
  modelName: string;
} {
  if (!modelString) {
    throw new Error(
      'Model string is required. Please specify a model using the AI_CODE_REVIEW_MODEL environment variable.'
    );
  }

  const [provider, modelName] = modelString.includes(':')
    ? modelString.split(':')
    : ['gemini', modelString]; // Default to gemini if no provider specified

  return {
    provider: provider as Provider,
    modelName
  };
}

/**
 * Get the full model key from provider and model name (backwards compatible).
 * 
 * @param provider The provider (gemini, anthropic, openai, openrouter)
 * @param modelName The model name
 * @returns The full model key
 */
export function getFullModelKey(provider: Provider, modelName: string): string {
  return `${provider}:${modelName}`;
}

/**
 * Check if a model supports tool calling (backwards compatible).
 * 
 * @param modelKey The full model key (e.g., 'openai:gpt-4o')
 * @returns True if the model supports tool calling, false otherwise
 */
export function supportsToolCalling(modelKey: string): boolean {
  const enhanced = ENHANCED_MODEL_MAP[modelKey];
  if (enhanced) {
    return enhanced.supportsToolCalling || enhanced.providerFeatures?.supportsTools || false;
  }
  
  // Fallback to legacy behavior
  const mapping = getModelMapping(modelKey);
  return mapping?.supportsToolCalling || false;
}

// NEW UTILITY FUNCTIONS FOR ENHANCED FEATURES

/**
 * Calculate the estimated cost for a given model and token usage (NEW).
 * 
 * @param modelKey The full model key
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @returns Estimated cost in USD, or null if pricing unavailable
 * 
 * @example
 * ```typescript
 * const cost = calculateCost('gemini:gemini-2.5-pro-preview', 10000, 5000);
 * console.log(`Estimated cost: $${cost?.toFixed(4)}`);
 * ```
 */
export function calculateCost(
  modelKey: string, 
  inputTokens: number, 
  outputTokens: number
): number | null {
  const enhanced = ENHANCED_MODEL_MAP[modelKey];
  if (!enhanced) return null;

  // Handle tiered pricing (e.g., Gemini 2.5 Pro)
  if (enhanced.tieredPricing && enhanced.tieredPricing.length > 0) {
    let inputCost = 0;
    let outputCost = 0;
    
    // Find appropriate tier for input tokens
    const inputTier = enhanced.tieredPricing
      .filter(tier => inputTokens >= tier.threshold)
      .sort((a, b) => b.threshold - a.threshold)[0];
    
    if (inputTier) {
      inputCost = (inputTokens * inputTier.inputPrice) / 1_000_000;
    }
    
    // Find appropriate tier for output tokens
    const outputTier = enhanced.tieredPricing
      .filter(tier => outputTokens >= tier.threshold)
      .sort((a, b) => b.threshold - a.threshold)[0];
    
    if (outputTier) {
      outputCost = (outputTokens * outputTier.outputPrice) / 1_000_000;
    }
    
    return inputCost + outputCost;
  }

  // Handle simple pricing
  if (enhanced.inputPricePerMillion && enhanced.outputPricePerMillion) {
    const inputCost = (inputTokens * enhanced.inputPricePerMillion) / 1_000_000;
    const outputCost = (outputTokens * enhanced.outputPricePerMillion) / 1_000_000;
    return inputCost + outputCost;
  }

  return null;
}

/**
 * Check if a model is deprecated and get deprecation information (NEW).
 * 
 * @param modelKey The full model key
 * @returns Deprecation information, or null if not deprecated
 * 
 * @example
 * ```typescript
 * const deprecation = getDeprecationInfo('openai:gpt-4.5');
 * if (deprecation) {
 *   console.warn(`⚠️  ${deprecation.message}`);
 *   console.log(`Migrate to: ${deprecation.migrationTarget}`);
 * }
 * ```
 */
export function getDeprecationInfo(modelKey: string): DeprecationInfo | null {
  const enhanced = ENHANCED_MODEL_MAP[modelKey];
  return enhanced?.deprecation?.isDeprecated ? enhanced.deprecation : null;
}

/**
 * Get models by category for intelligent selection (NEW).
 * 
 * @param category The model category to filter by
 * @param excludeDeprecated Whether to exclude deprecated models
 * @returns Array of model keys matching the category
 * 
 * @example
 * ```typescript
 * const costOptimized = getModelsByCategory(ModelCategory.COST_OPTIMIZED);
 * const fastModels = getModelsByCategory(ModelCategory.FAST_INFERENCE, true);
 * ```
 */
export function getModelsByCategory(
  category: ModelCategory, 
  excludeDeprecated: boolean = false
): string[] {
  return Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_key, mapping]) => {
      if (excludeDeprecated && mapping.deprecation?.isDeprecated) {
        return false;
      }
      return mapping.categories?.includes(category) || false;
    })
    .map(([key]) => key);
}

/**
 * Get the most cost-effective model for a given provider (NEW).
 * 
 * @param provider The provider to search within
 * @param excludeDeprecated Whether to exclude deprecated models
 * @returns The most cost-effective model key, or null if none found
 * 
 * @example
 * ```typescript
 * const cheapest = getCostEffectiveModel('anthropic');
 * console.log(`Most cost-effective Anthropic model: ${cheapest}`);
 * ```
 */
export function getCostEffectiveModel(
  provider: Provider, 
  excludeDeprecated: boolean = true
): string | null {
  const providerModels = Object.entries(ENHANCED_MODEL_MAP)
    .filter(([_key, mapping]) => {
      if (mapping.provider !== provider) return false;
      if (excludeDeprecated && mapping.deprecation?.isDeprecated) return false;
      return mapping.inputPricePerMillion !== undefined;
    })
    .sort(([, a], [, b]) => {
      const aPrice = a.inputPricePerMillion || Infinity;
      const bPrice = b.inputPricePerMillion || Infinity;
      return aPrice - bPrice;
    });

  return providerModels.length > 0 ? providerModels[0][0] : null;
}

/**
 * Get recommended model for code review tasks (NEW).
 * 
 * This function implements intelligent model selection based on the specific
 * requirements of code review tasks: good reasoning, tool support, and
 * cost-effectiveness.
 * 
 * @param prioritizeCost Whether to prioritize cost over performance
 * @returns Recommended model key for code review tasks
 * 
 * @example
 * ```typescript
 * const recommended = getRecommendedModelForCodeReview();
 * const budgetOption = getRecommendedModelForCodeReview(true);
 * ```
 */
export function getRecommendedModelForCodeReview(prioritizeCost: boolean = false): string {
  // Get models suitable for coding tasks
  const codingModels = getModelsByCategory(ModelCategory.CODING, true);
  
  if (prioritizeCost) {
    // Find the most cost-effective coding model
    const costEffective = codingModels
      .map(key => ({ key, mapping: ENHANCED_MODEL_MAP[key] }))
      .filter(({ mapping }) => mapping.inputPricePerMillion !== undefined)
      .sort((a, b) => (a.mapping.inputPricePerMillion || 0) - (b.mapping.inputPricePerMillion || 0));
    
    if (costEffective.length > 0) {
      return costEffective[0].key;
    }
  }
  
  // Default recommendations based on balance of capability and cost
  const recommendations = [
    'anthropic:claude-4-sonnet',      // Best overall for coding
    'anthropic:claude-3.5-sonnet',    // Solid alternative
    'openai:gpt-4.1',                 // Good for long contexts
    'gemini:gemini-2.0-flash',        // Fast and cost-effective
    'anthropic:claude-3.5-haiku'      // Budget option
  ];
  
  // Return first available recommendation
  for (const modelKey of recommendations) {
    if (ENHANCED_MODEL_MAP[modelKey] && !ENHANCED_MODEL_MAP[modelKey].deprecation?.isDeprecated) {
      return modelKey;
    }
  }
  
  // Fallback to first available non-deprecated model
  const available = Object.keys(ENHANCED_MODEL_MAP).find(
    key => !ENHANCED_MODEL_MAP[key].deprecation?.isDeprecated
  );
  
  return available || 'gemini:gemini-2.5-pro-preview';
}

/**
 * Validate that a model key exists and is not deprecated (NEW).
 * 
 * @param modelKey The model key to validate
 * @param allowDeprecated Whether to allow deprecated models
 * @returns Validation result with warnings and suggestions
 * 
 * @example
 * ```typescript
 * const validation = validateModelKey('openai:gpt-4.5');
 * if (!validation.isValid) {
 *   console.error(validation.error);
 *   if (validation.suggestion) {
 *     console.log(`Try: ${validation.suggestion}`);
 *   }
 * }
 * ```
 */
export function validateModelKey(
  modelKey: string, 
  allowDeprecated: boolean = false
): {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestion?: string;
} {
  const enhanced = ENHANCED_MODEL_MAP[modelKey];
  
  if (!enhanced) {
    return {
      isValid: false,
      error: `Model '${modelKey}' not found`,
      suggestion: `Available models: ${Object.keys(ENHANCED_MODEL_MAP).slice(0, 3).join(', ')}...`
    };
  }
  
  if (enhanced.deprecation?.isDeprecated && !allowDeprecated) {
    return {
      isValid: false,
      error: `Model '${modelKey}' is deprecated`,
      warning: enhanced.deprecation.message,
      suggestion: enhanced.deprecation.migrationTarget
    };
  }
  
  if (enhanced.deprecation?.isDeprecated && allowDeprecated) {
    return {
      isValid: true,
      warning: `Model '${modelKey}' is deprecated: ${enhanced.deprecation.message}`
    };
  }
  
  return { isValid: true };
}

/**
 * Default model recommendation for the tool.
 * 
 * This is the model that will be used when no specific model is configured.
 * It balances performance, cost, and availability.
 */
export const DEFAULT_MODEL = 'gemini:gemini-2.5-pro-preview';

/**
 * Export type definitions for external use.
 */
export type {
  EnhancedModelMapping,
  ModelMapping,
  TieredPricing,
  DeprecationInfo,
  ProviderFeatures
};