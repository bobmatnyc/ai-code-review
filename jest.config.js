/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 15000, // 15 seconds timeout for API tests
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },
  transformIgnorePatterns: [
    // Tell Jest to transpile node_modules packages that use ESM
    'node_modules/(?!node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|chalk|ansi-styles)'
  ]
};
