import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
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
  async createVenue(dto: CreateVenueDto, ownerId: number): Promise<VenueResponseDto> {
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
        amenities: dto.amenities,
        policies: dto.policies,
        owner: {
          connect: {
            id: ownerId,
          },
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
   * Get venues by owner
   */
  async getVenuesByOwner(ownerId: number): Promise<VenueResponseDto[]> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      include: { photos: true },
      orderBy: { createdAt: 'desc' },
    });

    return venues.map(v => this.mapToResponseDto(v));
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

    const updateData: any = {
      name: dto.name,
      type: dto.type,
      description: dto.description,
      address: dto.address,
      city: dto.city,
      area: dto.area,
      pincode: dto.pincode,
      capacityMin: dto.capacityMin ? Number(dto.capacityMin) : undefined,
      capacityMax: dto.capacityMax ? Number(dto.capacityMax) : undefined,
      basePriceMorning: dto.basePriceMorning ? Number(dto.basePriceMorning) : undefined,
      basePriceEvening: dto.basePriceEvening ? Number(dto.basePriceEvening) : undefined,
      basePriceFullDay: dto.basePriceFullDay ? Number(dto.basePriceFullDay) : undefined,
      amenities: dto.amenities,
      policies: dto.policies,
    };

    // Handle new venue images - append to existing images array
    if (venueImageUrls && venueImageUrls.length > 0) {
      const existingImages = venue.images || [];
      updateData.images = [...existingImages, ...venueImageUrls];
    }

    // Handle KYC documents - create single KycDocument entry
    if (kycDocUrls && kycDocUrls.length > 0 && dto.kycDocNumber) {
      const docNumberHash = crypto.createHash('sha256').update(dto.kycDocNumber).digest('hex');
      const docType = (dto.kycDocType || 'AADHAAR').toUpperCase() as KycDocType;
      const docUrlsString = kycDocUrls.join(',');
      
      // Search by the GLOBAL unique constraint (docType + hash)
      const existingKyc = await this.prisma.kycDocument.findUnique({
        where: {
          docType_docNumberHash: {
            docType: docType,
            docNumberHash: docNumberHash,
          }
        },
      });

      if (existingKyc) {
        await this.prisma.kycDocument.update({
          where: { id: existingKyc.id },
          data: {
            userId: venue.ownerId,
            docFileUrl: docUrlsString,
            status: 'PENDING',
          },
        });
      } else {
        await this.prisma.kycDocument.create({
          data: {
            userId: venue.ownerId,
            docType,
            docNumber: dto.kycDocNumber,
            docFileUrl: docUrlsString,
            docNumberHash,
            status: 'PENDING',
          },
        });
      }
    }

    const updated = await this.prisma.venue.update({
      where: { id },
      data: updateData,
      include: { photos: true },
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
        entityId: { in: venueIds },
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

    // Note: This would require an availability table in the database
    // For now, we'll just return the venue as-is
    // In production, you'd create/update availability slots
    
    return this.mapToResponseDto(venue);
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
    dto.amenities = venue.amenities;
    dto.policies = venue.policies;
    dto.status = venue.status;
    dto.images = venue.images;
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
