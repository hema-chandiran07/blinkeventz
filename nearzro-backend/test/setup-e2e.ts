/**
 * E2E Test Setup
 * 
 * This file bootstraps the NestJS application for end-to-end testing.
 * It creates a test application instance connected to a test database.
 * 
 * Key responsibilities:
 * - Create NestJS application instance
 * - Connect to test database via Prisma
 * - Enable validation pipe for DTO validation
 * - Initialize all required services
 * - Clean up after all tests complete
 */

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

let app: any = null;
let prisma: PrismaService | null = null;

/**
 * Initialize the test application
 * Creates a new NestJS instance with all modules compiled
 */
export async function initE2EApp() {
  if (app) {
    return app;
  }

  app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Reduce noise in tests
  });

  // Enable validation pipe for all endpoints
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Get Prisma service for database operations
  const prismaService = app.get(PrismaService);
  prisma = prismaService;
  
  // Manually connect to test database
  await prismaService.connect();

  return app;
}

/**
 * Get the HTTP server for making requests
 * Used with Supertest for API testing
 */
export function getHttpServer() {
  if (!app) {
    throw new Error('E2E app not initialized. Call initE2EApp() first.');
  }
  return app.getHttpServer();
}

/**
 * Get the Prisma service instance
 * Used for direct database operations in tests
 */
export function getPrismaService() {
  if (!prisma) {
    throw new Error('E2E app not initialized. Call initE2EApp() first.');
  }
  return prisma;
}

/**
 * Clean up resources after all tests
 * Disconnects Prisma and closes the application
 */
export async function cleanupE2EApp() {
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    prisma = null;
  }

  if (app) {
    try {
      await app.close();
    } catch (e) {
      // Ignore close errors
    }
    app = null;
  }
}

/**
 * Reset the database to a clean state
 * Deletes all test data before each test
 */
export async function resetDatabase() {
  if (!prisma) {
    throw new Error('E2E app not initialized. Call initE2EApp() first.');
  }

  // Delete in correct order to respect foreign key constraints
  try {
    await prisma.vendorService.deleteMany().catch(() => {});
    await prisma.vendor.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Seed minimal test data
 * Creates required base data for tests
 */
export async function seedTestData() {
  if (!prisma) {
    throw new Error('E2E app not initialized. Call initE2EApp() first.');
  }

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nearzro.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@nearzro.com',
      passwordHash: '$2b$10$test', // Hashed 'password'
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });

  return { adminUser };
}

export { app, prisma };
