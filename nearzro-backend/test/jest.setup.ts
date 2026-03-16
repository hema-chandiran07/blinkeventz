/**
 * Jest Additional Setup
 * NearZro Event Management Platform
 * 
 * Additional setup for Jest testing environment.
 * This file is imported after the test framework is set up.
 * 
 * IMPORTANT: Mocks are applied lazily to avoid breaking module imports.
 * Individual test files should import and apply specific mocks as needed.
 */

import { Test } from '@nestjs/testing';
import * as dotenv from 'dotenv';

// Load test environment configuration first (this sets DATABASE_URL to test DB)
dotenv.config({ path: '.env.test' });

// Load .env but don't override existing values (including DATABASE_URL from .env.test)
dotenv.config({ override: false });

// FORCE override DATABASE_URL to test database - this is critical for tests
process.env.DATABASE_URL = 'postgresql://postgres:2006@localhost:5432/nearzro_test';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:2006@localhost:5432/nearzro_test';
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'test-sendgrid-key';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'test-project';

// Set default Twilio credentials for tests
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'test_sid';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test_token';
process.env.TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM || '+1234567890';

// ============================================
// NESTJS LOGGER MOCKING
// ============================================

// Suppress NestJS logger during tests
import { Logger } from '@nestjs/common';

const originalError = Logger.prototype.error;
const originalWarn = Logger.prototype.warn;
const originalLog = Logger.prototype.log;
const originalDebug = Logger.prototype.debug;
const originalVerbose = Logger.prototype.verbose;

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

Logger.prototype.debug = function (message: string, ...args: unknown[]) {
  originalDebug.call(this, message, ...args);
};

Logger.prototype.verbose = function (message: string, ...args: unknown[]) {
  originalVerbose.call(this, message, ...args);
};

// Make Test module globally available
global.Test = Test;

// ============================================
// CUSTOM JEST MATCHERS
// ============================================

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

  // Custom matcher to check if object contains specific keys
  toContainKeys(received: object, keys: string[]) {
    const receivedKeys = Object.keys(received);
    const missingKeys = keys.filter((key) => !receivedKeys.includes(key));

    if (missingKeys.length === 0) {
      return {
        message: () => `expected object to not contain keys: ${missingKeys.join(', ')}`,
        pass: true,
      };
    }
    return {
      message: () => `expected object to contain keys: ${missingKeys.join(', ')}`,
      pass: false,
    };
  },

  // Custom matcher for partial date comparison
  toBeCloseToDate(received: Date, expected: Date, precision: number = 1000) {
    const diff = Math.abs(received.getTime() - expected.getTime());
    const pass = diff <= precision;
    return {
      message: pass
        ? () => `expected ${received} not to be close to ${expected}`
        : () => `expected ${received} to be close to ${expected} (within ${precision}ms)`,
      pass,
    };
  },
});

// ============================================
// GLOBAL TEST UTILITIES
// ============================================

// Helper to wait for async operations
global.delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Helper to generate random test data
global.generateTestEmail = (): string => {
  return `test_${Date.now()}@example.com`;
};

global.generateTestPhone = (): string => {
  return `+1234567${Math.floor(Math.random() * 10000)}`;
};
