/**
 * @fileoverview Node.js version of the modelMaps.ts file.
 * This file contains the model mappings for the validation scripts.
 */

// Model map from modelMaps.ts
const MODEL_MAP = {
  "gemini:gemini-2.5-pro": {
    "apiName": "gemini-2.5-pro-preview-03-25",
    "displayName": "Gemini 2.5 Pro",
    "provider": "gemini",
    "useV1Beta": true,
    "contextWindow": 1000000,
    "description": "Enhanced reasoning and multimodal capabilities",
    "apiKeyEnvVar": "AI_CODE_REVIEW_GOOGLE_API_KEY",
    "supportsToolCalling": false
  },
  "gemini:gemini-2.0-flash-lite": {
    "apiName": "gemini-2.0-flash-lite",
    "displayName": "Gemini 2.0 Flash Lite",
    "provider": "gemini",
    "contextWindow": 1000000,
    "description": "Lightweight, fast variant of Gemini flash model",
    "apiKeyEnvVar": "AI_CODE_REVIEW_GOOGLE_API_KEY",
    "supportsToolCalling": false
  },
  "gemini:gemini-2.0-flash": {
    "apiName": "gemini-2.0-flash",
    "displayName": "Gemini 2.0 Flash",
    "provider": "gemini",
    "contextWindow": 1000000,
    "description": "Balanced performance and quality",
    "apiKeyEnvVar": "AI_CODE_REVIEW_GOOGLE_API_KEY",
    "supportsToolCalling": false
  },
  "anthropic:claude-3-opus": {
    "apiName": "claude-3-opus-20240229",
    "displayName": "Claude 3 Opus",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Anthropic's most powerful model",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-3.7-sonnet": {
    "apiName": "claude-3-7-sonnet-20250219",
    "displayName": "Claude 3.7 Sonnet (hyphen format)",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Latest hybrid reasoning model with enhanced capabilities",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-3.5-sonnet": {
    "apiName": "claude-3-5-sonnet-20241022",
    "displayName": "Claude 3.5 Sonnet v2",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Improved version of Claude 3.5 Sonnet",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-3-haiku": {
    "apiName": "claude-3-haiku-20240307",
    "displayName": "Claude 3 Haiku",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Optimized for speed and efficiency",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "anthropic:claude-3.5-haiku": {
    "apiName": "claude-3-5-haiku-20241022",
    "displayName": "Claude 3.5 Haiku",
    "provider": "anthropic",
    "contextWindow": 200000,
    "description": "Fast and lightweight model",
    "apiKeyEnvVar": "AI_CODE_REVIEW_ANTHROPIC_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-4.1": {
    "apiName": "gpt-4.1",
    "displayName": "GPT-4.1",
    "provider": "openai",
    "contextWindow": 1000000,
    "description": "Latest coding-oriented GPT model",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-4o": {
    "apiName": "gpt-4o",
    "displayName": "GPT-4o",
    "provider": "openai",
    "contextWindow": 128000,
    "description": "Multimodal model with native image/audio/text support",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-4.5": {
    "apiName": "gpt-4.5",
    "displayName": "GPT-4.5",
    "provider": "openai",
    "contextWindow": 128000,
    "description": "Preview model with advanced reasoning and collaboration tools",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-4-turbo": {
    "apiName": "gpt-4-turbo",
    "displayName": "GPT-4 Turbo",
    "provider": "openai",
    "contextWindow": 1000000,
    "description": "Optimized version of GPT-4 with faster response times",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": true
  },
  "openai:gpt-3.5-turbo": {
    "apiName": "gpt-3.5-turbo",
    "displayName": "GPT-3.5 Turbo",
    "provider": "openai",
    "contextWindow": 4096,
    "description": "Cost-effective turbo model for GPT-3.5",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENAI_API_KEY",
    "supportsToolCalling": false
  },
  "openrouter:anthropic/claude-3-opus": {
    "apiName": "anthropic/claude-3-opus-20240229",
    "displayName": "Claude 3 Opus (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 200000,
    "description": "Claude 3 Opus model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
  },
  "openrouter:anthropic/claude-3-sonnet": {
    "apiName": "anthropic/claude-3-sonnet",
    "displayName": "Claude 3 Sonnet (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 200000,
    "description": "Claude 3 Sonnet model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
  },
  "openrouter:anthropic/claude-3-haiku": {
    "apiName": "anthropic/claude-3-haiku",
    "displayName": "Claude 3 Haiku (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 200000,
    "description": "Claude 3 Haiku model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
  },
  "openrouter:openai/gpt-4o": {
    "apiName": "openai/gpt-4o",
    "displayName": "GPT-4o (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 128000,
    "description": "GPT-4o model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
  },
  "openrouter:openai/gpt-4-turbo": {
    "apiName": "openai/gpt-4-turbo",
    "displayName": "GPT-4 Turbo (via OpenRouter)",
    "provider": "openrouter",
    "contextWindow": 1000000,
    "description": "GPT-4 Turbo model served via OpenRouter",
    "apiKeyEnvVar": "AI_CODE_REVIEW_OPENROUTER_API_KEY",
    "supportsToolCalling": false
  }
};

// Helper functions equivalent to modelMaps.ts
function getModelsByProvider(provider) {
  return Object.keys(MODEL_MAP).filter(key => MODEL_MAP[key].provider === provider);
}

function getModelMapping(modelKey) {
  return MODEL_MAP[modelKey];
}

function getApiNameFromKey(modelKey) {
  return MODEL_MAP[modelKey]?.apiName || modelKey.split(':')[1] || modelKey;
}

function supportsToolCalling(modelKey) {
  const mapping = getModelMapping(modelKey);
  return mapping?.supportsToolCalling || false;
}

// Export for Node.js
module.exports = {
  MODEL_MAP,
  getModelsByProvider,
  getModelMapping,
  getApiNameFromKey,
  supportsToolCalling
};