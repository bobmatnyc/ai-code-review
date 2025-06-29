/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    typecheck: {
      tsconfig: './tsconfig.json'
    },
    include: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
    setupFiles: ['./src/__tests__/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        // Standard exclusions
        'node_modules/**',
        'dist/**',
        '**/__tests__/**',
        '**/tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',

        // Project-specific exclusions for non-core code
        'docs/**',
        'scripts/**',
        'src/prompts/**',

        // Configuration and build files
        '*.config.*',
        '*.d.ts',
        'src/version.ts', // Generated file

        // Examples and experimental code
        '**/examples/**',
        '**/debug/**',

        // Database and evaluation (experimental features)
        'src/database/**',
        'src/evaluation/**'
      ],
      include: [
        'src/**/*.ts'
      ],
      // Coverage thresholds for core functionality
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  esbuild: {
    target: 'node18'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  define: {
    'import.meta.vitest': 'undefined'
  }
})
