/**
 * Prisma Test Client
 * NearZro Event Management Platform
 * 
 * Provides a Prisma client instance for integration tests.
 * Uses a separate test database to avoid polluting development data.
 */

import { PrismaClient } from '@prisma/client';

export class PrismaTestClient {
  private static instance: PrismaClient | null = null;

  /**
   * Get or create the singleton Prisma test client instance
   */
  static getInstance(): PrismaClient {
    if (!PrismaTestClient.instance) {
      PrismaTestClient.instance = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/nearzro_test',
          },
        },
        log: ['error', 'warn'],
      });
    }
    return PrismaTestClient.instance;
  }

  /**
   * Connect to the test database
   */
  static async connect(): Promise<void> {
    const client = PrismaTestClient.getInstance();
    await client.$connect();
  }

  /**
   * Disconnect from the test database
   */
  static async disconnect(): Promise<void> {
    const client = PrismaTestClient.getInstance();
    await client.$disconnect();
    PrismaTestClient.instance = null;
  }

  /**
   * Clean all tables in the test database
   * Use with caution - this will delete all data!
   */
  static async cleanDatabase(): Promise<void> {
    const client = PrismaTestClient.getInstance();

    // Delete in correct order to respect foreign key constraints
    await client.notificationDelivery.deleteMany();
    await client.notification.deleteMany();
    await client.reviewVote.deleteMany();
    await client.review.deleteMany();
    await client.auditOutbox.deleteMany();
    await client.auditLog.deleteMany();
    await client.cartItem.deleteMany();
    await client.cart.deleteMany();
    await client.booking.deleteMany();
    await client.availabilitySlot.deleteMany();
    await client.venuePhoto.deleteMany();
    await client.venue.deleteMany();
    await client.vendorService.deleteMany();
    await client.vendor.deleteMany();
    await client.eventService.deleteMany();
    await client.event.deleteMany();
    await client.promotion.deleteMany();
    await client.expressRequest.deleteMany();
    await client.payment.deleteMany();
    await client.payout.deleteMany();
    await client.kycDocument.deleteMany();
    await client.bankWebhookLog.deleteMany();
    await client.bankAccount.deleteMany();
    await client.customerProfile.deleteMany();
    await client.aIPlan.deleteMany();
    await client.notificationPreference.deleteMany();
    await client.user.deleteMany();
  }

  /**
   * Reset the database - clean and then seed with initial data
   */
  static async resetDatabase(): Promise<void> {
    await PrismaTestClient.cleanDatabase();
  }
}

// Export a default instance for convenience
export const prismaTestClient = PrismaTestClient.getInstance();
