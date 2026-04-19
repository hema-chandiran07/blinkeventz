import { Injectable, NotFoundException, Logger, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueQueryDto, VenueSearchQueryDto } from './dto/venue-query.dto';
import { VenueResponseDto, PaginatedVenueResponseDto } from './dto/venue-response.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { KycDocType } from '@prisma/client';
import * as crypto from 'crypto';

// Define VenueStatus locally - must match Prisma schema + 'ALL' for queries
const VenueStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELISTED: 'DELISTED',
  ALL: 'ALL',
} as const;
export type VenueStatus = typeof VenueStatus[keyof typeof VenueStatus];

/**
 * Venues Service - Production Ready
 * 
 * Features:
 * - PII protection via response DTOs
 * - Pagination support
 * - Redis caching for public queries
 * - Proper error handling
 */
@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) { }

  /**
   * Find venue by ID - Public endpoint
   * Returns only non-PII data
   */
  async findById(id: number): Promise<VenueResponseDto> {
    const cacheKey = `venue:${id}`;

    // Try cache first
    const cached = await this.cache.get<VenueResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        photos: { where: { isActive: true } },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        availabilitySlots: true,
      },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    // Map to response DTO (excludes PII)
    const response = this.mapToResponseDto(venue);

    // Cache the result
    await this.cache.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  /**
   * Create a new venue
   */
  async createVenue(
    dto: CreateVenueDto,
    ownerId: number,
    venueImageUrls: string[] = [],
    kycDocUrls: string[] = [],
    govtCertUrls: string[] = []
  ): Promise<VenueResponseDto> {
    const venue = await this.prisma.venue.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        address: dto.address,
        city: dto.city,
        area: dto.area,
        pincode: dto.pincode,
        capacityMin: dto.capacityMin ? Number(dto.capacityMin) : 0,
        capacityMax: dto.capacityMax ? Number(dto.capacityMax) : 0,
        basePriceMorning: dto.basePriceMorning ? Number(dto.basePriceMorning) : 0,
        basePriceEvening: dto.basePriceEvening ? Number(dto.basePriceEvening) : 0,
        basePriceFullDay: dto.basePriceFullDay ? Number(dto.basePriceFullDay) : 0,
        amenities: Array.isArray(dto.amenities) ? dto.amenities.join(', ') : dto.amenities,
        policies: dto.policies,
        venueImages: venueImageUrls,
        kycDocFiles: kycDocUrls,
        venueGovtCertificateFiles: govtCertUrls,
        owner: {
          connect: {
            id: ownerId,
          },
        },
        // Create initial photos
        photos: {
          create: venueImageUrls.map((url, index) => ({
            url,
            isCover: index === 0,
            category: 'MAIN' as any,
          })),
        },
      },
      include: {
        photos: true,
      },
    });

    // Invalidate list cache
    await this.invalidateListCache();

    return this.mapToResponseDto(venue);
  }

  /**
   * Get paginated approved venues - Public endpoint
   */
  async getApprovedVenues(query: VenueQueryDto): Promise<PaginatedVenueResponseDto> {
    const { page = 1, limit = 20, city, area, type, status } = query;

    const cacheKey = `venue:list:${page}:${limit}:${city || 'all'}:${area || 'all'}:${type || 'all'}`;

    // Try cache first for basic list
    if (!city && !area && !type) {
      const cached = await this.cache.get<PaginatedVenueResponseDto>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const where: any = {};

    // Logic: 
    // 1. If status is explicitly 'ALL', we show everything (Admin view)
    // 2. If a specific status is provided, show that status
    // 3. Otherwise default to ACTIVE (Public/Landing page view)
    if (status) {
      if ((status as any) !== 'ALL') {
        where.status = status;
      }
      // if ALL, we leave where.status undefined to fetch all
    } else {
      where.status = VenueStatus.ACTIVE;
    }

    if (city) where.city = city;
    if (area) where.area = area;
    if (type) where.type = type;

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        include: {
          photos: { where: { isActive: true } },
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venue.count({ where }),
    ]);

    const response: PaginatedVenueResponseDto = {
      data: venues.map(v => this.mapToResponseDto(v)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };

    // Cache only default queries
    if (!city && !area && !type) {
      await this.cache.set(cacheKey, response, this.CACHE_TTL);
    }

    return response;
  }

  /**
   * Approve a venue - Admin only
   */
  async approveVenue(id: number): Promise<VenueResponseDto> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    const updated = await this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.ACTIVE },
      include: { photos: true },
    });

    // Invalidate caches
    await this.invalidateVenueCache(id);
    await this.invalidateListCache();

    return this.mapToResponseDto(updated);
  }

  /**
   * Reject a venue - Admin only
   */
  async rejectVenue(id: number, reason?: string): Promise<VenueResponseDto> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    const updated = await this.prisma.venue.update({
      where: { id },
      data: {
        status: VenueStatus.INACTIVE,
        rejectionReason: reason,
      },
      include: { photos: true },
    });

    // Invalidate caches
    await this.invalidateVenueCache(id);
    await this.invalidateListCache();

    return this.mapToResponseDto(updated);
  }

  /**
   * Admin: Get all venues regardless of status
   */
  async findAllAdmin(): Promise<any[]> {
    return this.prisma.venue.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            photos: true,
            availabilitySlots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin: Get full venue details including PII and KYC
   */
  async findByIdAdmin(id: number): Promise<any> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        photos: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        availabilitySlots: {
          take: 50,
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    // Standardize with the same KYC/Bank enrichment as Vendors
    const kycDocuments = await this.prisma.kycDocument.findMany({
      where: { userId: venue.ownerId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...venue,
      kyc: {
        status: kycDocuments[0]?.status || 'NOT_SUBMITTED',
        documents: kycDocuments,
      },
    };
  }

  /**
   * Get venues by owner - ENHANCED with KYC status and bank accounts
   */
  async getVenuesByOwner(ownerId: number): Promise<any[]> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      include: {
        photos: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isEmailVerified: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get KYC documents with status
    const kycDocuments = await this.prisma.kycDocument.findMany({
      where: { userId: ownerId },
      select: {
        id: true,
        docType: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        verifiedAt: true,
        docFileUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get bank accounts (masked for security)
    const bankAccounts = await this.prisma.bankAccount.findMany({
      where: { userId: ownerId },
      select: {
        id: true,
        accountHolder: true,
        bankName: true,
        ifsc: true,
        branchName: true,
        isVerified: true,
        referenceId: true,
        createdAt: true,
        accountNumber: true,
      },
    });

    // Mask bank account numbers in response
    const maskedBankAccounts = bankAccounts.map(account => {
      const fullNumber = account.accountNumber;
      const { accountNumber: _, ...safeAccount } = account;
      return {
        ...safeAccount,
        accountNumberMasked: 'XXXX-XXXX-' + (fullNumber ? fullNumber.slice(-4) : '0000'),
      };
    });

    // Determine KYC approval status
    const latestKyc = kycDocuments.length > 0 ? kycDocuments[0] : null;
    const kycStatus = latestKyc ? latestKyc.status : 'NOT_SUBMITTED';

    return venues.map(v => ({
      ...this.mapToResponseDto(v),
      owner: v.owner,
      kyc: {
        status: kycStatus,
        documents: kycDocuments.map(doc => ({
          id: doc.id,
          docType: doc.docType,
          status: doc.status,
          rejectionReason: doc.rejectionReason ?? undefined,
          submittedAt: doc.createdAt,
          verifiedAt: doc.verifiedAt ?? undefined,
          docFileUrl: doc.docFileUrl,
        })),
        isApproved: kycStatus === 'VERIFIED',
        isRejected: kycStatus === 'REJECTED',
        rejectionReason: latestKyc?.rejectionReason ?? undefined,
      },
      bankAccounts: maskedBankAccounts,
      hasVerifiedBankAccount: maskedBankAccounts.some(acc => acc.isVerified),
    }));
  }

  /**
   * Search venues - Public endpoint with pagination
   */
  async searchVenues(query: VenueSearchQueryDto): Promise<PaginatedVenueResponseDto> {
    const { q, page = 1, limit = 20, city, type } = query;

    const cacheKey = `venue:search:${q || 'all'}:${page}:${limit}:${city || 'all'}:${type || 'all'}`;

    // Try cache
    const cached = await this.cache.get<PaginatedVenueResponseDto>(cacheKey);
    if (cached && q) {
      return cached;
    }

    const where: any = {
      status: VenueStatus.ACTIVE,
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { area: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (city) where.city = city;
    if (type) where.type = type;

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        include: { photos: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venue.count({ where }),
    ]);

    const response: PaginatedVenueResponseDto = {
      data: venues.map(v => this.mapToResponseDto(v)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };

    if (q) {
      await this.cache.set(cacheKey, response, this.CACHE_TTL);
    }

    return response;
  }

  /**
   * Update venue - Owner only
   */
  async updateVenue(
    id: number,
    dto: Partial<CreateVenueDto>,
    ownerId: number,
    venueImageUrls?: string[],
    kycDocUrls?: string[],
    govtCertUrls?: string[],
  ): Promise<VenueResponseDto> {
    // Verify ownership is handled by guard
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    if (venue.ownerId !== ownerId) {
      throw new NotFoundException('You do not own this venue');
    }

    // Convert string values to proper types for Prisma
    const updateData: any = {
      name: dto.name,
      type: dto.type,
      description: dto.description,
      address: dto.address,
      city: dto.city,
      area: dto.area,
      pincode: dto.pincode,
      // Convert amenities array to JSON string if it's an array
      amenities: Array.isArray(dto.amenities)
        ? dto.amenities.join(', ')
        : dto.amenities,
      policies: dto.policies,
    };

    // Convert numeric fields from strings to integers
    if (dto.capacityMin !== undefined) {
      updateData.capacityMin = typeof dto.capacityMin === 'string' ? parseInt(dto.capacityMin, 10) : dto.capacityMin;
    }
    if (dto.capacityMax !== undefined) {
      updateData.capacityMax = typeof dto.capacityMax === 'string' ? parseInt(dto.capacityMax, 10) : dto.capacityMax;
    }
    if (dto.basePriceMorning !== undefined) {
      updateData.basePriceMorning = typeof dto.basePriceMorning === 'string' ? parseInt(dto.basePriceMorning, 10) : dto.basePriceMorning;
    }
    if (dto.basePriceEvening !== undefined) {
      updateData.basePriceEvening = typeof dto.basePriceEvening === 'string' ? parseInt(dto.basePriceEvening, 10) : dto.basePriceEvening;
    }
    if (dto.basePriceFullDay !== undefined) {
      updateData.basePriceFullDay = typeof dto.basePriceFullDay === 'string' ? parseInt(dto.basePriceFullDay, 10) : dto.basePriceFullDay;
    }

    // Replace venue images if provided (full replacement, not append)
    if (venueImageUrls !== undefined) {
      updateData.venueImages = venueImageUrls;
    }

    // Set KYC document files if provided (replacement, not append)
    if (kycDocUrls && kycDocUrls.length > 0) {
      updateData.kycDocFiles = kycDocUrls;
    }

    // Set government certificate files if provided (replacement, not append)
    if (govtCertUrls && govtCertUrls.length > 0) {
      updateData.venueGovtCertificateFiles = govtCertUrls;
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updated = await this.prisma.venue.update({
      where: { id },
      data: {
        ...updateData,
        // Synchronize VenuePhoto relation
        photos: venueImageUrls !== undefined ? {
          deleteMany: {}, // Clear existing
          create: venueImageUrls.map((url, index) => ({
            url,
            isCover: index === 0,
            category: 'GALLERY' as any,
          })),
        } : undefined,
      },
      include: {
        photos: true,
      },
    });

    // Invalidate caches
    await this.invalidateVenueCache(id);
    await this.invalidateListCache();

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete venue - Owner only
   */
  async deleteVenue(id: number, ownerId: number): Promise<void> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    if (venue.ownerId !== ownerId) {
      throw new NotFoundException('You do not own this venue');
    }

    await this.prisma.venue.delete({
      where: { id },
    });

    // Invalidate caches
    await this.invalidateVenueCache(id);
    await this.invalidateListCache();
  }

  /**
   * Old getVenueOwnerStats removed; replaced with new implementation at the end of class.
   */

  /**
   * Update venue availability
   */
  async updateAvailability(
    venueId: number,
    ownerId: number,
    availability: { date: string; timeSlot: string; status: string }[]
  ): Promise<VenueResponseDto> {
    // Verify ownership
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${venueId} not found`);
    }

    if (venue.ownerId !== ownerId) {
      throw new NotFoundException('You do not own this venue');
    }

    // Update or create availability slots
    const results: any[] = [];
    for (const slot of availability) {
      const existing = await this.prisma.availabilitySlot.findFirst({
        where: {
          entityType: 'VENUE' as any,
          venueId,
          date: new Date(slot.date),
          timeSlot: slot.timeSlot,
        },
      });

      if (existing) {
        results.push(
          await this.prisma.availabilitySlot.update({
            where: { id: existing.id },
            data: { status: slot.status as any },
          }),
        );
      } else {
        results.push(
          await this.prisma.availabilitySlot.create({
            data: {
              entityType: 'VENUE' as any,
              venueId,
              date: new Date(slot.date),
              timeSlot: slot.timeSlot,
              status: slot.status as any,
            },
          }),
        );
      }
    }

    return this.mapToResponseDto(venue);
  }

  /**
   * Update availability for all venues owned by user (frontend expects /venues/me/availability)
   */
  async updateMyAvailability(
    ownerId: number,
    availability: { date: string; timeSlot: string; status: string }[]
  ) {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const venueIds = venues.map(v => v.id);

    // Update or create availability slots for all venues
    const results: any[] = [];
    for (const slot of availability) {
      for (const venueId of venueIds) {
        const existing = await this.prisma.availabilitySlot.findFirst({
          where: {
            entityType: 'VENUE' as any,
            venueId,
            date: new Date(slot.date),
            timeSlot: slot.timeSlot,
          },
        });

        if (existing) {
          results.push(
            await this.prisma.availabilitySlot.update({
              where: { id: existing.id },
              data: { status: slot.status as any },
            }),
          );
        } else {
          results.push(
            await this.prisma.availabilitySlot.create({
              data: {
                entityType: 'VENUE' as any,
                venueId,
                date: new Date(slot.date),
                timeSlot: slot.timeSlot,
                status: slot.status as any,
              },
            }),
          );
        }
      }
    }

    return { success: true, updatedSlots: results.length };
  }

  /**
   * Get blocked slots for venue owner
   */
  async getBlockedSlots(ownerId: number): Promise<any[]> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const venueIds = venues.map(v => v.id);

    const blockedSlots = await this.prisma.availabilitySlot.findMany({
      where: {
        venueId: { in: venueIds },
        entityType: 'VENUE',
        status: 'BLOCKED',
      },
      orderBy: { date: 'asc' },
    });

    return blockedSlots.map(slot => ({
      id: slot.id,
      date: slot.date.toISOString().split('T')[0],
      timeSlot: slot.timeSlot,
      reason: 'Blocked by venue owner',
    }));
  }

  /**
   * Block a time slot for venue
   */
  async blockTimeSlot(
    ownerId: number,
    date: string,
    timeSlot: string,
    reason?: string
  ): Promise<any> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true },
    });

    if (venues.length === 0) {
      throw new NotFoundException('No venues found for this owner');
    }

    const venueIds = venues.map(v => v.id);

    // Check if slot already exists
    const existingSlot = await this.prisma.availabilitySlot.findFirst({
      where: {
        venueId: { in: venueIds },
        entityType: 'VENUE',
        date: new Date(date),
        timeSlot,
      },
    });

    if (existingSlot) {
      if (existingSlot.status === 'BOOKED') {
        throw new BadRequestException('Cannot block a slot that is already booked');
      }

      // Update existing slot to BLOCKED
      const updatedSlot = await this.prisma.availabilitySlot.update({
        where: { id: existingSlot.id },
        data: { status: 'BLOCKED' },
      });

      return {
        id: updatedSlot.id,
        date: updatedSlot.date.toISOString().split('T')[0],
        timeSlot: updatedSlot.timeSlot,
        status: updatedSlot.status,
        reason: reason || 'Blocked by venue owner',
      };
    }

    // Create new blocked slot (use first venue as default)
    const newSlot = await this.prisma.availabilitySlot.create({
      data: {
        entityType: 'VENUE',
        venueId: venueIds[0],
        date: new Date(date),
        timeSlot,
        status: 'BLOCKED',
      },
    });

    return {
      id: newSlot.id,
      date: newSlot.date.toISOString().split('T')[0],
      timeSlot: newSlot.timeSlot,
      status: newSlot.status,
      reason: reason || 'Blocked by venue owner',
    };
  }

  /**
   * Unblock a time slot for venue
   */
  async unblockTimeSlot(
    ownerId: number,
    date: string,
    timeSlot: string
  ): Promise<void> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const venueIds = venues.map(v => v.id);

    const slot = await this.prisma.availabilitySlot.findFirst({
      where: {
        venueId: { in: venueIds },
        entityType: 'VENUE',
        date: new Date(date),
        timeSlot,
        status: 'BLOCKED',
      },
    });

    if (!slot) {
      throw new NotFoundException('Blocked slot not found');
    }

    // Update to AVAILABLE
    await this.prisma.availabilitySlot.update({
      where: { id: slot.id },
      data: { status: 'AVAILABLE' },
    });
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Map Prisma venue to response DTO (excludes PII)
   */
  private mapToResponseDto(venue: any): VenueResponseDto {
    const dto = new VenueResponseDto();
    dto.id = venue.id;
    dto.name = venue.name;
    dto.type = venue.type;
    dto.description = venue.description;
    dto.address = venue.address;
    dto.city = venue.city;
    dto.area = venue.area;
    dto.pincode = venue.pincode;
    dto.capacityMin = venue.capacityMin;
    dto.capacityMax = venue.capacityMax;
    dto.basePriceMorning = venue.basePriceMorning;
    dto.basePriceEvening = venue.basePriceEvening;
    dto.basePriceFullDay = venue.basePriceFullDay;

    // Convert comma-separated string to array for frontend compatibility
    dto.amenities = venue.amenities
      ? venue.amenities.split(',').map((a: string) => a.trim()).filter(Boolean)
      : [];

    dto.policies = venue.policies;
    dto.status = venue.status;
    dto.images = venue.venueImages || [];
    dto.photos = venue.photos?.map((p: any) => ({
      id: p.id,
      url: p.url,
      isCover: p.isCover,
    }));
    dto.createdAt = venue.createdAt;
    dto.updatedAt = venue.updatedAt;

    // These are excluded via @Exclude() decorator
    dto.ownerId = venue.ownerId;

    return dto;
  }

  /**
   * Invalidate specific venue cache
   */
  private async invalidateVenueCache(venueId: number): Promise<void> {
    await this.cache.del(`venue:${venueId}`);
  }

  /**
   * Invalidate all list caches
   * In production, consider using cache tags or separate cache keys
   */
  private async invalidateListCache(): Promise<void> {
    // Proactive cache invalidation: reset all venue lists when data changes
    // Using any cast to handle interface discrepancy in some cache-manager versions
    await (this.cache as any).clear();
  }
  /**
   * Get rich analytics for venue owner
   */
  async getVenueOwnerAnalytics(ownerId: number) {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
    });

    if (venues.length === 0) {
      return {
        totalRevenue: 0,
        completedRevenue: 0,
        totalBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        totalVenues: 0,
        currency: 'INR',
        monthlyRevenue: [],
        venuePerformance: [],
        eventTypeBreakdown: [],
      };
    }

    const venueIds = venues.map(v => v.id);

    // Get all bookings for these venues
    const bookings = await this.prisma.booking.findMany({
      where: {
        slot: { venueId: { in: venueIds } } as any,
      },
      include: {
        slot: true,
      },
    });

    // Monthly Trends & Growth Calculation
    const now = new Date();
    const monthlyRevenue: any[] = [];
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthBookings = bookings.filter(b => {
        const bd = new Date(b.createdAt);
        return bd >= monthStart && bd <= monthEnd;
      });

      const monthRevenue = monthBookings.reduce((sum, b: any) => sum + (Number(b.totalAmount) || 0), 0);

      if (i === 0) currentMonthRevenue = monthRevenue;
      else if (i === 1) lastMonthRevenue = monthRevenue;

      monthlyRevenue.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        bookings: monthBookings.length,
        occupancy: Math.min(100, Math.round((monthBookings.length / (venues.length * 30)) * 100)),
      });
    }

    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : (currentMonthRevenue > 0 ? 100 : 0);

    // Calculate revenue totals
    let totalRevenue = 0;
    let completedRevenue = 0;

    bookings.forEach((b: any) => {
      const amount = Number((b as any).totalAmount) || 0;
      totalRevenue += amount;
      if (b.status === 'COMPLETED') {
        completedRevenue += amount;
      }
    });

    // Venue performance
    const venuePerformance = await Promise.all(venues.map(async v => {
      const vBookings = bookings.filter((b: any) => b.slot?.venueId === v.id);
      const vRevenue = vBookings.reduce((sum, b: any) => sum + (Number((b as any).totalAmount) || 0), 0);
      return {
        id: v.id,
        name: v.name,
        bookings: vBookings.length,
        revenue: vRevenue,
        rating: 4.8,
        occupancyRate: Math.min(100, Math.round((vBookings.length / 30) * 100)),
      };
    }));

    const platformFee = Math.round(totalRevenue * 0.05);

    return {
      totalRevenue,
      netRevenue: totalRevenue - platformFee,
      platformFee,
      completedRevenue,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === "CONFIRMED").length,
      completedBookings: bookings.filter(b => b.status === "COMPLETED").length,
      pendingBookings: bookings.filter(b => b.status === "PENDING").length,
      cancelledBookings: bookings.filter(b => b.status === "CANCELLED").length,
      totalVenues: venues.length,
      activeVenues: venues.filter(v => v.status === 'ACTIVE').length,
      currency: 'INR',
      revenueGrowth,
      monthlyRevenue,
      venuePerformance,
    };
  }

  async getVenueOwnerBookings(userId: number) {
    // Find all venues owned by this user
    const venues = await this.prisma.venue.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, city: true, area: true, address: true },
    });
    const venueIds = venues.map(v => v.id);
    const venueMap = new Map(venues.map(v => [v.id, v]));

    const events = await this.prisma.event.findMany({
      where: { venueId: { in: venueIds } },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return events.map(event => ({
      id: event.id,
      status: event.status,
      guestCount: (event.meta as any)?.guestCount || 0,
      totalAmount: event.totalAmount,
      notes: (event.meta as any)?.specialNotes || null,
      createdAt: event.createdAt,
      user: event.customer,
      slot: {
        date: event.date,
        timeSlot: event.timeSlot?.toLowerCase() || 'full_day',
        entityType: 'VENUE',
        eventTitle: 'Venue Booking',
        name: 'Venue Booking',
        venue: venueMap.get(event.venueId!),
      },
    }));
  }

  async updateVenueBookingStatus(bookingId: number, status: string, userId: number) {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const venueIds = venues.map(v => v.id);

    const event = await this.prisma.event.findUnique({ where: { id: bookingId } });
    if (!event || !venueIds.includes(event.venueId!)) {
      throw new Error('Booking not found or unauthorized');
    }

    return this.prisma.event.update({
      where: { id: bookingId },
      data: { status: status as any },
    });
  }

  async getVenueOwnerStats(userId: number) {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const venueIds = venues.map(v => v.id);

    const [activeBookings, pendingRequests, earnings] = await Promise.all([
      this.prisma.event.count({
        where: { venueId: { in: venueIds }, status: 'CONFIRMED' },
      }),
      this.prisma.event.count({
        where: { venueId: { in: venueIds }, status: 'PENDING_PAYMENT' },
      }),
      this.prisma.event.aggregate({
        where: {
          venueId: { in: venueIds },
          status: { in: ['CONFIRMED', 'COMPLETED'] as any },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalVenues: venues.length,
      activeBookings,
      pendingRequests,
      totalEarnings: earnings._sum.totalAmount || 0,
    };
  }
}
