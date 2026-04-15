import { Injectable, NotFoundException, Logger, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueQueryDto, VenueSearchQueryDto } from './dto/venue-query.dto';
import { VenueResponseDto, PaginatedVenueResponseDto } from './dto/venue-response.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { KycDocType } from '@prisma/client';
import * as crypto from 'crypto';

// Define VenueStatus locally
const VenueStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELISTED: 'DELISTED',
  REJECTED: 'REJECTED',
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
  ) {}

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
        photos: true,
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

    const where: any = {
      status: status || VenueStatus.ACTIVE,
    };

    if (city) where.city = city;
    if (area) where.area = area;
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
       status: VenueStatus.DELISTED,
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
   * Get venue owner stats - for dashboard
   */
  async getVenueOwnerStats(ownerId: number): Promise<{
    totalVenues: number;
    activeVenues: number;
    pendingVenues: number;
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    totalRevenue: number;
  }> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true, status: true },
    });

    const venueIds = venues.map(v => v.id);
    const totalVenues = venues.length;
    const activeVenues = venues.filter(v => v.status === 'ACTIVE').length;
    const pendingVenues = venues.filter(v => v.status === 'PENDING_APPROVAL').length;

    // Get booked slots count for these venues
    const bookedSlots = await this.prisma.availabilitySlot.findMany({
      where: {
        venueId: { in: venueIds },
        entityType: 'VENUE',
        status: 'BOOKED',
      },
      select: { id: true },
    });

    // Get total captured payments for revenue
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'CAPTURED',
      },
      select: { amount: true },
    });

    const totalBookings = bookedSlots.length;
    const confirmedBookings = bookedSlots.length;
    const pendingBookings = 0;
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalVenues,
      activeVenues,
      pendingVenues,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      totalRevenue,
    };
  }

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
    // Note: In production, implement proper cache invalidation strategy
    // For now, we'll need to wait for TTL expiration
    this.logger.warn('List cache invalidation not fully implemented - using TTL');
  }
}
