/**
 * Jest Additional Setup
 * NearZro Event Management Platform
 * 
 * Additional setup for Jest testing environment.
 * This file is imported after the test framework is set up.
 */

import { Test } from '@nestjs/testing';

// Mock process.env for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nearzro_test';
process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
process.env.FIREBASE_PROJECT_ID = 'test-project';

// Suppress NestJS logger during tests
import { Logger, LogLevel } from '@nestjs/common';

const originalError = Logger.prototype.error;
const originalWarn = Logger.prototype.warn;
const originalLog = Logger.prototype.log;

Logger.prototype.error = function (message: string, ...args: unknown[]) {
  // Suppress certain error messages during tests
  if (message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
    return;
  }
  originalError.call(this, message, ...args);
};

Logger.prototype.warn = function (message: string, ...args: unknown[]) {
  originalWarn.call(this, message, ...args);
};

Logger.prototype.log = function (message: string, ...args: unknown[]) {
  originalLog.call(this, message, ...args);
};

// Make Test module globally available
global.Test = Test;

// Add custom jest matchers
expect.extend({
  toHaveBeenCalledWithMatch(received: jest.Mock, expected: unknown) {
    const calls = received.mock.calls;
    const match = calls.some((call) => {
      return call.some((arg) => {
        if (typeof arg === 'object' && typeof expected === 'object') {
          return Object.keys(expected as object).every(
            (key) => arg[key] === (expected as Record<string, unknown>)[key],
          );
        }
        return arg === expected;
      });
    });

    if (match) {
      return {
        message: () => `expected mock not to have been called with matching args`,
        pass: true,
      };
    }
    return {
      message: () => `expected mock to have been called with matching args`,
      pass: false,
    };
  },
});
