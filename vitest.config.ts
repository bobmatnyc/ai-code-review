import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

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
    }
  },
  esbuild: {
    target: 'node14'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})