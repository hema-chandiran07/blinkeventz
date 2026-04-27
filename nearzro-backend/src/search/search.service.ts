import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('search-audit') private searchAuditQueue: Queue,
  ) {}

  async globalSearch(query: string, user: any) {
    const startTime = Date.now();
    const queryTerm = query.trim();

    if (!queryTerm || queryTerm.length < 2) {
      return {
        users: [],
        venues: [],
        vendors: [],
        events: [],
      };
    }

    try {
      // 1. Concurrent Fuzzy Searching using pg_trgm similarity
      // We use $queryRaw for "industrial grade" performance and fuzzy matching
      const [users, venues, vendors, events] = await Promise.all([
        this.searchUsers(queryTerm, user) as Promise<any[]>,
        this.searchVenues(queryTerm, user) as Promise<any[]>,
        this.searchVendors(queryTerm, user) as Promise<any[]>,
        this.searchEvents(queryTerm, user) as Promise<any[]>,
      ]);

      const durationMs = Date.now() - startTime;
      const resultsCount = users.length + venues.length + vendors.length + events.length;

      // 2. Async Audit Logging via BullMQ (Non-blocking)
      this.searchAuditQueue.add('log-search', {
        userId: user?.id || null,
        query: queryTerm,
        resultsCount,
        durationMs,
        timestamp: new Date(),
      }).catch(err => this.logger.warn('Failed to queue search audit:', err));

      return {
        users,
        venues,
        vendors,
        events,
        metadata: {
          query: queryTerm,
          durationMs,
          totalResults: resultsCount,
        }
      };
    } catch (error) {
      this.logger.error(`Search failed for query "${queryTerm}":`, error);
      throw error;
    }
  }

  private async searchUsers(query: string, requester: any) {
    if (!requester || requester.role !== Role.ADMIN) return [];

    return this.prisma.$queryRaw`
      SELECT id, name, email, role, image,
             similarity(name, ${query}) as score
      FROM "User"
      WHERE name % ${query} OR email % ${query}
      ORDER BY score DESC
      LIMIT 10
    `;
  }

  private async searchVenues(query: string, requester: any) {
    // Admins see all, Owners see theirs, Customers/Guests see active
    let whereClause = Prisma.empty;
    if (requester?.role === Role.VENUE_OWNER) {
      whereClause = Prisma.sql`AND "ownerId" = ${requester.id}`;
    } else if (!requester || requester.role === Role.CUSTOMER || requester.role === Role.VENDOR) {
      whereClause = Prisma.sql`AND status = 'ACTIVE'`;
    } else if (requester.role !== Role.ADMIN) {
      whereClause = Prisma.sql`AND status = 'ACTIVE'`;
    }

    return this.prisma.$queryRaw`
      SELECT id, name, city, area, address, status, "venueImages"[1] as image,
             similarity(name, ${query}) as score
      FROM "Venue"
      WHERE (name % ${query} OR city % ${query} OR area % ${query}) ${whereClause}
      ORDER BY score DESC
      LIMIT 10
    `;
  }

  private async searchVendors(query: string, requester: any) {
    let whereClause = Prisma.empty;
    if (!requester || requester.role === Role.CUSTOMER || requester.role === Role.VENDOR) {
      whereClause = Prisma.sql`AND "verificationStatus" = 'VERIFIED'`;
    }

    return this.prisma.$queryRaw`
      SELECT id, "businessName", "businessType", city, area, verified, images[1] as image,
             similarity("businessName", ${query}) as score
      FROM "Vendor"
      WHERE ("businessName" % ${query} OR "businessType" % ${query} OR city % ${query}) ${whereClause}
      ORDER BY score DESC
      LIMIT 10
    `;
  }

  private async searchEvents(query: string, requester: any) {
    if (!requester) {
      return []; // Guests cannot search events by default
    }

    let whereClause = Prisma.empty;
    if (requester.role === Role.CUSTOMER) {
      whereClause = Prisma.sql`AND "customerId" = ${requester.id}`;
    } else if (requester.role === Role.VENUE_OWNER) {
      whereClause = Prisma.sql`AND "venueId" IN (SELECT id FROM "Venue" WHERE "ownerId" = ${requester.id})`;
    } else if (requester.role === Role.VENDOR) {
      whereClause = Prisma.sql`AND id IN (
        SELECT "EventId" FROM "EventService" 
        WHERE "vendorId" = (SELECT id FROM "Vendor" WHERE "userId" = ${requester.id})
      )`;
    } else if (requester.role !== Role.ADMIN) {
      return [];
    }

    return this.prisma.$queryRaw`
      SELECT e.id, e.title, e."eventType", e.city, e.status, v."venueImages"[1] as image,
             similarity(e.title, ${query}) as score
      FROM "Event" e
      LEFT JOIN "Venue" v ON e."venueId" = v.id
      WHERE (e.title % ${query} OR e."eventType" % ${query} OR e.city % ${query}) ${whereClause}
      ORDER BY score DESC
      LIMIT 10
    `;
  }
}
