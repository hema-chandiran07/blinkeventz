/**
 * Jest Global Setup Configuration
 * NearZro Event Management Platform
 * 
 * This file configures global Jest settings for all test files.
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';

// Load test environment configuration first
dotenv.config({ path: '.env.test' });

// Also load default .env as fallback but DON'T override test values
dotenv.config({ override: false });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-jwt-key';

// Increase test timeout for async operations
jest.setTimeout(30000);

// Handle unhandled rejections to prevent Jest worker crashes
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error.message);
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
