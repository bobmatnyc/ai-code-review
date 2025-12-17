/**
 * @fileoverview Dynamic pricing fetcher for OpenRouter API
 * Fetches and caches model pricing data from OpenRouter API
 * Falls back to static pricing if API is unavailable
 */

import logger from '@/utils/logger';

/**
 * OpenRouter API model structure
 */
interface OpenRouterModel {
  id: string;
  name?: string;
  context_length: number;
  pricing: {
    prompt: string; // Price per token (e.g., "0.000015")
    completion: string;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
  };
}

/**
 * OpenRouter API response structure
 */
interface OpenRouterApiResponse {
  data: OpenRouterModel[];
}

/**
 * Parsed pricing information
 */
export interface ModelPricing {
  inputPrice: number; // Price per million tokens
  outputPrice: number; // Price per million tokens
}

/**
 * Pricing cache structure
 */
interface PricingCache {
  data: Map<string, ModelPricing>;
  lastFetched: number;
}

// Cache configuration
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

// Module-level cache
let pricingCache: PricingCache | null = null;

/**
 * Convert OpenRouter price string (per token) to price per million tokens
 */
function convertPriceToPerMillion(pricePerToken: string): number {
  const price = Number.parseFloat(pricePerToken);
  if (Number.isNaN(price)) {
    return 0;
  }
  return price * 1_000_000;
}

/**
 * Fetch pricing data from OpenRouter API with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Parse OpenRouter API response and build pricing map
 */
function parsePricingData(apiResponse: OpenRouterApiResponse): Map<string, ModelPricing> {
  const pricingMap = new Map<string, ModelPricing>();

  for (const model of apiResponse.data) {
    const inputPrice = convertPriceToPerMillion(model.pricing.prompt);
    const outputPrice = convertPriceToPerMillion(model.pricing.completion);

    pricingMap.set(model.id, {
      inputPrice,
      outputPrice,
    });
  }

  return pricingMap;
}

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (!pricingCache) {
    return false;
  }

  const now = Date.now();
  const elapsed = now - pricingCache.lastFetched;

  return elapsed < CACHE_TTL_MS;
}

/**
 * Fetch model pricing data from OpenRouter API
 * Caches results for 1 hour
 *
 * @returns Map of model IDs to pricing information
 * @throws Error if API fetch fails
 */
export async function fetchOpenRouterPricing(): Promise<Map<string, ModelPricing>> {
  // Return cached data if still valid
  if (isCacheValid() && pricingCache) {
    logger.debug('Using cached OpenRouter pricing data');
    return pricingCache.data;
  }

  try {
    logger.debug('Fetching pricing data from OpenRouter API...');

    const response = await fetchWithTimeout(OPENROUTER_API_URL, REQUEST_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`OpenRouter API returned status ${response.status}: ${response.statusText}`);
    }

    const apiResponse: OpenRouterApiResponse = await response.json();

    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    const pricingMap = parsePricingData(apiResponse);

    // Update cache
    pricingCache = {
      data: pricingMap,
      lastFetched: Date.now(),
    };

    logger.info(`Fetched pricing for ${pricingMap.size} models from OpenRouter API`);

    return pricingMap;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to fetch OpenRouter pricing: ${errorMessage}`);
    throw error;
  }
}

/**
 * Get pricing for a specific model
 * Returns null if model not found
 *
 * @param modelId - OpenRouter model ID (e.g., "anthropic/claude-3-opus")
 * @returns Pricing information or null
 */
export async function getModelPricing(modelId: string): Promise<ModelPricing | null> {
  try {
    const pricingMap = await fetchOpenRouterPricing();
    return pricingMap.get(modelId) || null;
  } catch (error) {
    logger.debug(`Could not get pricing for model ${modelId}: ${error}`);
    return null;
  }
}

/**
 * Clear the pricing cache
 * Useful for testing or forcing a refresh
 */
export function clearPricingCache(): void {
  pricingCache = null;
  logger.debug('Pricing cache cleared');
}

/**
 * Get cache statistics
 * Useful for debugging and monitoring
 */
export function getCacheStats(): {
  isValid: boolean;
  modelCount: number;
  lastFetched: Date | null;
  age: number;
} {
  if (!pricingCache) {
    return {
      isValid: false,
      modelCount: 0,
      lastFetched: null,
      age: 0,
    };
  }

  const age = Date.now() - pricingCache.lastFetched;

  return {
    isValid: isCacheValid(),
    modelCount: pricingCache.data.size,
    lastFetched: new Date(pricingCache.lastFetched),
    age,
  };
}
