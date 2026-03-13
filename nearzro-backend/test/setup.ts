/**
 * Jest Global Setup Configuration
 * NearZro Event Management Platform
 * 
 * This file configures global Jest settings for all test files.
 */

import 'reflect-metadata';

// Increase test timeout for async operations
jest.setTimeout(30000);

// Handle unhandled rejections to prevent Jest worker crashes
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error.message);
});

// Suppress console output during tests to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress specific noisy warnings
  console.error = (...args: unknown[]) => {
    // Ignore Prisma deprecation warnings
    const message = args[0];
    if (typeof message === 'string' && message.includes('Prisma')) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args: unknown[]) => {
    // Ignore specific warnings
    const message = args[0];
    if (typeof message === 'string') {
      // Ignore common non-critical warnings
      if (message.includes('Unable to verify') || message.includes('ENOTFOUND')) {
        return;
      }
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global beforeEach to clear all mocks
beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Extend Jest matchers if needed
expect.extend({
  // Custom matcher for partial object matching
  toMatchObjectPartial(received: unknown, partial: unknown) {
    const pass = this.equals(received, expect.objectContaining(partial as object));
    if (pass) {
      return {
        message: () => `expected ${this.utils.printReceived(received)} not to match partial ${this.utils.printExpected(partial)}`,
        pass: true,
      };
    }
    return {
      message: () => `expected ${this.utils.printReceived(received)} to match partial ${this.utils.printExpected(partial)}`,
      pass: false,
    };
  },
});

// Mock global objects
Object.defineProperty(globalThis, 'console', {
  writable: true,
  value: {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  },
});
