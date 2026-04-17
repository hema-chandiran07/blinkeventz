import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
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
        userId: user.id,
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
    if (requester.role !== Role.ADMIN) return [];

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
    // Admins see all, Owners see theirs, Customers see approved
    let whereClause = '';
    if (requester.role === Role.VENUE_OWNER) {
      whereClause = `AND "ownerId" = ${requester.id}`;
    } else if (requester.role === Role.CUSTOMER) {
      whereClause = `AND status = 'ACTIVE'`;
    } else if (requester.role !== Role.ADMIN) {
      // Vendors/Others only see active venues
      whereClause = `AND status = 'ACTIVE'`;
    }

    return this.prisma.$queryRawUnsafe(`
      SELECT id, name, city, area, address, status, "venueImages"[1] as image,
             similarity(name, $1) as score
      FROM "Venue"
      WHERE (name % $1 OR city % $1 OR area % $1) ${whereClause}
      ORDER BY score DESC
      LIMIT 10
    `, query);
  }

  private async searchVendors(query: string, requester: any) {
    let whereClause = '';
    if (requester.role === Role.CUSTOMER) {
      whereClause = `AND "verificationStatus" = 'VERIFIED'`;
    }

    return this.prisma.$queryRawUnsafe(`
      SELECT id, "businessName", "businessType", city, area, verified, images[1] as image,
             similarity("businessName", $1) as score
      FROM "Vendor"
      WHERE ("businessName" % $1 OR "businessType" % $1 OR city % $1) ${whereClause}
      ORDER BY score DESC
      LIMIT 10
    `, query);
  }

  private async searchEvents(query: string, requester: any) {
    let whereClause = '';
    if (requester.role === Role.CUSTOMER) {
      whereClause = `AND "customerId" = ${requester.id}`;
    } else if (requester.role === Role.VENUE_OWNER) {
      // Show events at venues owned by this user
      whereClause = `AND "venueId" IN (SELECT id FROM "Venue" WHERE "ownerId" = ${requester.id})`;
    } else if (requester.role === Role.VENDOR) {
      // Show events where vendor is providing a service
      whereClause = `AND id IN (
        SELECT "EventId" FROM "EventService" 
        WHERE "vendorId" = (SELECT id FROM "Vendor" WHERE "userId" = ${requester.id})
      )`;
    } else if (requester.role !== Role.ADMIN) {
      return [];
    }

    return this.prisma.$queryRawUnsafe(`
      SELECT e.id, e.title, e."eventType", e.city, e.status, v."venueImages"[1] as image,
             similarity(e.title, $1) as score
      FROM "Event" e
      LEFT JOIN "Venue" v ON e."venueId" = v.id
      WHERE (e.title % $1 OR e."eventType" % $1 OR e.city % $1) ${whereClause}
      ORDER BY score DESC
      LIMIT 10
    `, query);
  }
}
