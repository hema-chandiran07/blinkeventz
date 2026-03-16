/**
 * Backend Jest Configuration
 * NearZro Event Management Platform
 * 
 * Optimized for:
 * - CI/CD pipeline stability
 * - Flaky test prevention
 * - Proper mock isolation
 */

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!/**/*.spec.(t|j)s',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/dist/**',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts', '<rootDir>/test/jest.setup.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
  },
  verbose: true,
  silent: false,
  // Force Jest to exit after all tests complete
  forceExit: true,
  // Clear mocks between tests - prevents state leakage
  clearMocks: true,
  // Reset mock implementations between tests
  resetMocks: true,
  // Restore mocks to original implementations
  restoreMocks: true,
  // Detect open handles to find resource leaks (enable for debugging)
  detectOpenHandles: false,
  // Test timeout - 30 seconds for integration tests
  testTimeout: 30000,
  // Run tests serially to avoid parallel execution issues
  maxWorkers: 1,
  // Bail on first failure in CI
  bail: process.env.CI ? 1 : 0,
  // Cache for performance
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};
