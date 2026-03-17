<<<<<<< Updated upstream
import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueQueryDto, VenueSearchQueryDto } from './dto/venue-query.dto';
import { VenueResponseDto, PaginatedVenueResponseDto } from './dto/venue-response.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
=======
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueStatus, SlotStatus, EntityType } from '@prisma/client';
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
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
        capacityMin: dto.capacityMin,
        capacityMax: dto.capacityMax,
        basePriceMorning: dto.basePriceMorning,
        basePriceEvening: dto.basePriceEvening,
        basePriceFullDay: dto.basePriceFullDay,
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
=======
 
async createVenue(dto: CreateVenueDto, ownerId: number) {
  // Verify that the owner exists before creating the venue
  const owner = await this.prisma.user.findUnique({
    where: { id: ownerId },
  });

  if (!owner) {
    throw new NotFoundException(`User with ID ${ownerId} not found. Please log in again.`);
  }

  return this.prisma.venue.create({
    data: {
      name: dto.name,
      type: dto.type,
      description: dto.description,
      address: dto.address,
      city: dto.city,
      area: dto.area,
      pincode: dto.pincode,
      capacityMin: dto.capacityMin,
      capacityMax: dto.capacityMax,
      basePriceMorning: dto.basePriceMorning,
      basePriceEvening: dto.basePriceEvening,
      basePriceFullDay: dto.basePriceFullDay,
      amenities: dto.amenities, // string
      policies: dto.policies,

      // ✅ IMPORTANT FIX
      owner: {
        connect: {
          id: ownerId,
        },
      },
    },
  });
}


  async getApprovedVenues() {
    return this.prisma.venue.findMany({
      where: { status: VenueStatus.ACTIVE },
    });
  }

  async approveVenue(id: number) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.ACTIVE },
    });
  }

  async rejectVenue(id: number) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.INACTIVE },
    });
  }

  async getVenuesByOwner(ownerId: number) {
    return this.prisma.venue.findMany({
      where: { ownerId },
      include: {
        photos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVenueOwnerBookings(ownerId: number) {
    // Get all venues owned by the user
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const venueIds = venues.map(v => v.id);

    if (venueIds.length === 0) {
      return [];
    }

    // Get all bookings for these venues
    const bookings = await this.prisma.event.findMany({
      where: {
        venueId: { in: venueIds },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return bookings.map(booking => ({
      id: booking.id,
      customerName: booking.customer.name,
      customerEmail: booking.customer.email,
      customerPhone: booking.customer.phone,
      eventName: booking.title || booking.eventType,
      eventType: booking.eventType,
      date: booking.date,
      timeSlot: booking.timeSlot,
      guests: booking.guestCount,
      baseAmount: booking.subtotal,
      finalAmount: booking.totalAmount,
      status: this.mapEventStatusToBookingStatus(booking.status),
      venueName: booking.venue?.name || 'Unknown',
      createdAt: booking.createdAt,
      notes: null,
    }));
  }

  private mapEventStatusToBookingStatus(status: string): string {
    // Map EventStatus to booking status for frontend
    switch (status) {
      case 'INQUIRY':
      case 'PENDING_PAYMENT':
        return 'pending';
      case 'CONFIRMED':
      case 'IN_PROGRESS':
        return 'confirmed';
      case 'COMPLETED':
        return 'completed';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return status.toLowerCase();
    }
  }

  async getVenueOwnerStats(ownerId: number) {
    // Get all venues owned by the user
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true, status: true },
    });

    const venueIds = venues.map(v => v.id);

    const totalVenues = venues.length;
    const activeVenues = venues.filter(v => v.status === 'ACTIVE').length;

    if (venueIds.length === 0) {
      return {
        totalVenues,
        activeVenues,
        activeBookings: 0,
        totalEarnings: 0,
        pendingRequests: 0,
      };
    }

    // Get bookings stats
    const bookings = await this.prisma.event.findMany({
      where: {
        venueId: { in: venueIds },
      },
      select: {
        status: true,
        totalAmount: true,
      },
    });

    const activeBookings = bookings.filter(
      b => b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT' || b.status === 'IN_PROGRESS'
    ).length;

    const pendingRequests = bookings.filter(
      b => b.status === 'PENDING_PAYMENT' || b.status === 'INQUIRY'
    ).length;

    const totalEarnings = bookings
      .filter(b => b.status === 'COMPLETED' || b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    return {
      totalVenues,
      activeVenues,
      activeBookings,
      totalEarnings,
      pendingRequests,
    };
  }

  async searchVenues(query: string) {
    if (!query) {
      return this.prisma.venue.findMany({
        where: { status: VenueStatus.ACTIVE },
      });
    }

    return this.prisma.venue.findMany({
      where: {
        status: VenueStatus.ACTIVE,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { city: { contains: query } },
          { area: { contains: query } },
        ],
>>>>>>> Stashed changes
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
  async updateVenue(id: number, dto: Partial<CreateVenueDto>, ownerId: number): Promise<VenueResponseDto> {
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

    const updated = await this.prisma.venue.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        address: dto.address,
        city: dto.city,
        area: dto.area,
        pincode: dto.pincode,
        capacityMin: dto.capacityMin,
        capacityMax: dto.capacityMax,
        basePriceMorning: dto.basePriceMorning,
        basePriceEvening: dto.basePriceEvening,
        basePriceFullDay: dto.basePriceFullDay,
        amenities: dto.amenities,
        policies: dto.policies,
      },
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

  async updateVenue(id: number, userId: number, dto: CreateVenueDto) {
    // Verify ownership
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    if (venue.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own venues');
    }

    return this.prisma.venue.update({
      where: { id },
      data: dto,
    });
  }

  async deleteVenue(id: number, userId: number) {
    // Verify ownership
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    if (venue.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own venues');
    }

    return this.prisma.venue.delete({
      where: { id },
    });
  }

  async uploadVenuePhoto(
    id: number,
    userId: number,
    file: Express.Multer.File,
    isCover: boolean,
  ) {
    // Verify ownership
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    if (venue.ownerId !== userId) {
      throw new ForbiddenException('You can only upload photos to your own venues');
    }

    // If this is cover photo, unset other cover photos
    if (isCover) {
      await this.prisma.venuePhoto.updateMany({
        where: { venueId: id, isCover: true },
        data: { isCover: false },
      });
    }

    // Create photo record
    const photo = await this.prisma.venuePhoto.create({
      data: {
        venueId: id,
        url: `/uploads/venues/${file.filename}`,
        isCover,
      },
    });

    return photo;
  }

  // Get all blocked slots for venue owner's venues
  async getBlockedSlots(ownerId: number) {
    // Get all venues owned by the user
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const venueIds = venues.map(v => v.id);

    if (venueIds.length === 0) {
      return [];
    }

    // Get all blocked availability slots for these venues
    const blockedSlots = await this.prisma.availabilitySlot.findMany({
      where: {
        entityType: EntityType.VENUE,
        entityId: { in: venueIds },
        status: SlotStatus.BLOCKED,
      },
      orderBy: { date: 'asc' },
    });

    return blockedSlots.map(slot => ({
      id: slot.id,
      date: slot.date.toISOString().split('T')[0],
      timeSlot: slot.timeSlot,
      reason: null,
    }));
  }

  // Create a blocked slot
  async createBlockedSlot(ownerId: number, dto: { date: string; timeSlot: string; reason?: string }) {
    // Get all venues owned by the user
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const venueIds = venues.map(v => v.id);

    if (venueIds.length === 0) {
      throw new BadRequestException('You do not own any venues');
    }

    // Check if slot already exists (booked or blocked)
    const existingSlot = await this.prisma.availabilitySlot.findFirst({
      where: {
        entityType: EntityType.VENUE,
        entityId: { in: venueIds },
        date: new Date(dto.date),
        timeSlot: dto.timeSlot,
      },
    });

    if (existingSlot) {
      if (existingSlot.status === SlotStatus.BLOCKED || existingSlot.status === SlotStatus.BOOKED) {
        throw new BadRequestException('This time slot is already blocked or booked');
      }
      // Update existing available slot to blocked
      const updated = await this.prisma.availabilitySlot.update({
        where: { id: existingSlot.id },
        data: { status: SlotStatus.BLOCKED },
      });
      return {
        id: updated.id,
        date: updated.date.toISOString().split('T')[0],
        timeSlot: updated.timeSlot,
        reason: dto.reason,
      };
    }

    // Create new blocked slot (use first venue as default)
    const created = await this.prisma.availabilitySlot.create({
      data: {
        entityType: EntityType.VENUE,
        entityId: venueIds[0],
        date: new Date(dto.date),
        timeSlot: dto.timeSlot,
        status: SlotStatus.BLOCKED,
      },
    });

    return {
      id: created.id,
      date: created.date.toISOString().split('T')[0],
      timeSlot: created.timeSlot,
      reason: dto.reason,
    };
  }

  // Delete a blocked slot
  async deleteBlockedSlot(ownerId: number, date: string, timeSlot: string) {
    // Get all venues owned by the user
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const venueIds = venues.map(v => v.id);

    if (venueIds.length === 0) {
      throw new BadRequestException('You do not own any venues');
    }

    // Find the blocked slot
    const slot = await this.prisma.availabilitySlot.findFirst({
      where: {
        entityType: EntityType.VENUE,
        entityId: { in: venueIds },
        date: new Date(date),
        timeSlot: timeSlot,
        status: SlotStatus.BLOCKED,
      },
    });

    if (!slot) {
      throw new BadRequestException('Blocked slot not found');
    }

    // Delete the slot
    await this.prisma.availabilitySlot.delete({
      where: { id: slot.id },
    });

    return { success: true };
  }

  // Get venue owner analytics
  async getVenueOwnerAnalytics(ownerId: number, timeRange: string = '6m') {
    // Get all venues owned by the user
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    });

    const venueIds = venues.map(v => v.id);

    if (venueIds.length === 0) {
      return {
        revenue: [],
        bookings: [],
        occupancy: [],
        venuePerformance: [],
        customerTypes: [],
        stats: {
          totalRevenue: 0,
          totalBookings: 0,
          averageOccupancy: 0,
          totalVenues: 0,
          revenueGrowth: 0,
          bookingGrowth: 0,
        },
      };
    }

    // Calculate date range
    const now = new Date();
    let monthsToSubtract = 6;
    if (timeRange === '1y') monthsToSubtract = 12;
    if (timeRange === 'all') monthsToSubtract = 24;

    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsToSubtract, 1);

    // Get all events for these venues in the time range
    const events = await this.prisma.event.findMany({
      where: {
        venueId: { in: venueIds },
        date: { gte: startDate },
        status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
      },
      include: {
        venue: {
          select: { name: true },
        },
      },
    });

    // Group events by month for revenue and bookings charts
    const monthlyData = new Map<string, { revenue: number; bookings: number; label: string }>();
    
    // Initialize all months in range
    for (let i = monthsToSubtract - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('en-US', { month: 'short' });
      monthlyData.set(key, { revenue: 0, bookings: 0, label });
    }

    // Populate with actual data
    for (const event of events) {
      const eventDate = new Date(event.date);
      const key = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyData.get(key);
      if (data) {
        data.revenue += event.totalAmount || 0;
        data.bookings += 1;
      }
    }

    // Convert to arrays for charts
    const revenue = Array.from(monthlyData.values()).map(d => ({
      label: d.label,
      value: d.revenue,
    }));

    const bookings = Array.from(monthlyData.values()).map(d => ({
      label: d.label,
      value: d.bookings,
    }));

    // Calculate occupancy rate (bookings / available slots)
    const availabilitySlots = await this.prisma.availabilitySlot.findMany({
      where: {
        entityType: EntityType.VENUE,
        entityId: { in: venueIds },
        date: { gte: startDate },
      },
    });

    const totalSlots = availabilitySlots.length;
    const bookedSlots = availabilitySlots.filter(s => s.status === 'BOOKED').length;
    const occupancyRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

    // Generate monthly occupancy data
    const monthlyOccupancy = new Map<string, number>();
    for (let i = monthsToSubtract - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('en-US', { month: 'short' });
      // Simulate occupancy based on bookings (in real app, calculate from actual availability)
      const monthBookings = bookings.find(b => b.label === label)?.value || 0;
      const simulatedOccupancy = Math.min(95, Math.max(20, monthBookings * 3 + 30));
      monthlyOccupancy.set(key, simulatedOccupancy);
    }

    const occupancy = Array.from(monthlyOccupancy.entries()).map(([_, value], idx) => ({
      label: revenue[idx]?.label || 'Unknown',
      value,
    }));

    // Venue performance
    const venuePerformance = venues.map(venue => {
      const venueEvents = events.filter(e => e.venueId === venue.id);
      const venueRevenue = venueEvents.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
      return {
        name: venue.name,
        bookings: venueEvents.length,
        revenue: venueRevenue,
        rating: 4.5 + Math.random() * 0.5, // In real app, get from reviews
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Customer types (event types distribution)
    const eventTypeCount = new Map<string, number>();
    for (const event of events) {
      const type = event.eventType || 'Other';
      eventTypeCount.set(type, (eventTypeCount.get(type) || 0) + 1);
    }

    const totalEvents = events.length;
    const colors = ['#7c3aed', '#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#ec4899'];
    const customerTypes = Array.from(eventTypeCount.entries()).map(([label, value], idx) => ({
      label,
      value: totalEvents > 0 ? Math.round((value / totalEvents) * 100) : 0,
      color: colors[idx % colors.length],
    }));

    // Calculate stats
    const totalRevenue = revenue.reduce((sum, m) => sum + m.value, 0);
    const totalBookingsCount = bookings.reduce((sum, m) => sum + m.value, 0);
    const averageOccupancy = occupancy.length > 0 
      ? Math.round(occupancy.reduce((sum, m) => sum + m.value, 0) / occupancy.length)
      : 0;

    // Calculate growth rates
    let revenueGrowth = 0;
    let bookingGrowth = 0;
    if (revenue.length >= 2) {
      const lastMonth = revenue[revenue.length - 1].value;
      const prevMonth = revenue[revenue.length - 2].value;
      if (prevMonth > 0) {
        revenueGrowth = Math.round(((lastMonth - prevMonth) / prevMonth) * 100);
      }
    }
    if (bookings.length >= 2) {
      const lastMonth = bookings[bookings.length - 1].value;
      const prevMonth = bookings[bookings.length - 2].value;
      if (prevMonth > 0) {
        bookingGrowth = Math.round(((lastMonth - prevMonth) / prevMonth) * 100);
      }
    }

    return {
      revenue,
      bookings,
      occupancy,
      venuePerformance,
      customerTypes,
      stats: {
        totalRevenue,
        totalBookings: totalBookingsCount,
        averageOccupancy,
        totalVenues: venues.length,
        revenueGrowth,
        bookingGrowth,
      },
    };
  }
}
