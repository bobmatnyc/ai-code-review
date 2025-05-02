/**
 * @fileoverview Command-line script to test API connections.
 *
 * This script tests connections to all configured APIs (Google Gemini and OpenRouter)
 * to verify that the API keys provided in the environment variables are valid and
 * working correctly.
 *
 * Usage:
 * ```
 * pnpm run test:api
 * ```
 */

import { runApiConnectionTests } from './tests/apiConnectionTest';

// Run the API connection tests
runApiConnectionTests().catch(error => {
  console.error('Error running API connection tests:', error);
  process.exit(1);
});
