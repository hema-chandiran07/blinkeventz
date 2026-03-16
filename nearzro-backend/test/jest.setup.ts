/**
 * Jest Additional Setup
 * NearZro Event Management Platform
 * 
 * Additional setup for Jest testing environment.
 * This file is imported after the test framework is set up.
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
