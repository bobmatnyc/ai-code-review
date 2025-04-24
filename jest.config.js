/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  // Override default cache directory to a project-local folder to avoid permission issues
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 15000, // 15 seconds timeout for API tests
  setupFiles: ['./src/tests/setup.js'],
  transform: {
    '^.+\\.tsx?$': ['babel-jest', {
      presets: ['@babel/preset-env', '@babel/preset-typescript']
    }],
    '^.+\\.jsx?$': ['babel-jest', {
      presets: ['@babel/preset-env']
    }]
  },
  transformIgnorePatterns: [
    // Tell Jest to transpile node_modules packages that use ESM
    'node_modules/(?!node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|chalk|ansi-styles|#ansi-styles)'
  ],
  moduleNameMapper: {
    // Handle ESM imports
    '#ansi-styles': '<rootDir>/node_modules/chalk/source/vendor/ansi-styles/index.js',
    '#supports-color': '<rootDir>/node_modules/chalk/source/vendor/supports-color/index.js'
  }
};
