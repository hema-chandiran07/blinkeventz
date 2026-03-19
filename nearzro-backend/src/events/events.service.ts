import { 
  Injectable, 
  ForbiddenException, 
  NotFoundException, 
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateEventDto, EventType, TimeSlot } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { AddEventServiceDto } from './dto/add-event-service.dto';
import { EventStatus, Role } from '@prisma/client';
import { 
  EventListItemResponseDto, 
  PaginatedEventResponseDto,
  EventCustomerResponseDto,
} from './dto/response/event-response.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle Prisma errors and convert to NestJS exceptions
   */
  private handlePrismaError(error: any, operation: string): never {
    // P2002 = Record already exists (unique constraint)
    if (error.code === 'P2002') {
      throw new BadRequestException(
        `A record with this ${error.meta?.target?.[0] || 'value'} already exists`
      );
    }
    
    // P2025 = Record not found
    if (error.code === 'P2025') {
      throw new NotFoundException(
        `The record you are trying to ${operation} was not found`
      );
    }
    
    // P2003 = Foreign key constraint failed
    if (error.code === 'P2003') {
      throw new BadRequestException(
        'Referenced record does not exist'
      );
    }
    
    // P2000 = Value too long for column
    if (error.code === 'P2000') {
      throw new BadRequestException(
        'One or more values are too long for the column'
      );
    }
    
    // Log the error for debugging
    console.error(`Prisma error during ${operation}:`, error);
    
    throw new InternalServerErrorException(
      `An error occurred while ${operation}. Please try again later.`
    );
  }

  /**
   * GET ALL EVENTS (Public with limited data)
   * 
   * Returns paginated list of events with basic info.
   * Does NOT expose customer PII (email, phone).
   */
  async findAll(query: EventQueryDto): Promise<PaginatedEventResponseDto> {
    try {
      const { page = 1, limit = 20, status, city, area, isExpress, startDate, endDate, sortBy, sortOrder } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (city) {
        where.city = { equals: city, mode: 'insensitive' };
      }
      
      if (area) {
        where.area = { equals: area, mode: 'insensitive' };
      }
      
      if (isExpress !== undefined) {
        where.isExpress = isExpress;
      }
      
      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate);
        }
        if (endDate) {
          where.date.lte = new Date(endDate);
        }
      }

      // Get total count for pagination
      const total = await this.prisma.event.count({ where });

      // Get paginated results - use select for better performance
      const events = await this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          eventType: true,
          title: true,
          date: true,
          timeSlot: true,
          city: true,
          area: true,
          guestCount: true,
          status: true,
          isExpress: true,
          totalAmount: true,
          createdAt: true,
          // Only get what we need - no N+1
          venue: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
          _count: {
            select: { services: true },
          },
        },
        orderBy: sortBy ? { [sortBy]: sortOrder || 'desc' } : { createdAt: 'desc' },
      });

      // Transform to response DTO (exclude sensitive data)
      const data: EventListItemResponseDto[] = events.map(event => ({
        id: event.id,
        eventType: event.eventType as EventType,
        title: event.title || undefined,
        date: event.date,
        timeSlot: event.timeSlot as TimeSlot,
        city: event.city,
        area: event.area || undefined,
        guestCount: event.guestCount,
        status: event.status,
        isExpress: event.isExpress,
        totalAmount: event.totalAmount,
        createdAt: event.createdAt,
        venue: event.venue ? {
          id: event.venue.id,
          name: event.venue.name,
          city: event.venue.city,
        } : undefined,
        serviceCount: event._count.services,
      }));

      return {
        data,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      };
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new InternalServerErrorException('Failed to fetch events');
    }
  }

  /**
   * GET MY EVENTS
   * 
   * Returns events owned by the current user with full details.
   */
  async getMyEvents(userId: number, query: EventQueryDto): Promise<PaginatedEventResponseDto> {
    try {
      const { page = 1, limit = 20, status, city, area, isExpress, startDate, endDate, sortBy, sortOrder } = query;
      const skip = (page - 1) * limit;

      // Build where clause - only user's events
      const where: any = {
        customerId: userId,
      };
      
      if (status) {
        where.status = status;
      }
      
      if (city) {
        where.city = { equals: city, mode: 'insensitive' };
      }
      
      if (area) {
        where.area = { equals: area, mode: 'insensitive' };
      }
      
      if (isExpress !== undefined) {
        where.isExpress = isExpress;
      }
      
      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate);
        }
        if (endDate) {
          where.date.lte = new Date(endDate);
        }
      }

      // Get total count for pagination
      const total = await this.prisma.event.count({ where });

      // Get paginated results - use select for better performance
      const events = await this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          eventType: true,
          title: true,
          date: true,
          timeSlot: true,
          city: true,
          area: true,
          guestCount: true,
          status: true,
          isExpress: true,
          totalAmount: true,
          createdAt: true,
          // Only get what we need
          venue: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
          assignedManager: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { services: true },
          },
        },
        orderBy: sortBy ? { [sortBy]: sortOrder || 'desc' } : { createdAt: 'desc' },
      });

      // Transform to response DTO
      const data: EventListItemResponseDto[] = events.map(event => ({
        id: event.id,
        eventType: event.eventType as EventType,
        title: event.title || undefined,
        date: event.date,
        timeSlot: event.timeSlot as TimeSlot,
        city: event.city,
        area: event.area || undefined,
        guestCount: event.guestCount,
        status: event.status,
        isExpress: event.isExpress,
        totalAmount: event.totalAmount,
        createdAt: event.createdAt,
        venue: event.venue ? {
          id: event.venue.id,
          name: event.venue.name,
          city: event.venue.city,
        } : undefined,
        serviceCount: event._count.services,
      }));

      return {
        data,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      };
    } catch (error) {
      console.error('Error fetching user events:', error);
      throw new InternalServerErrorException('Failed to fetch your events');
    }
  }

  /**
   * GET SINGLE EVENT
   * 
   * Returns event by ID with full details.
   * Only accessible by owner, assigned manager, or admin.
   */
  async findOne(eventId: number, userId: number, userRole: string): Promise<EventCustomerResponseDto> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          venue: true,
          services: true,
          assignedManager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Authorization check: owner, assigned manager, or admin
      const isOwner = event.customerId === userId;
      const isAssignedManager = event.assignedManagerId === userId;
      const isAdmin = userRole === Role.ADMIN;

      if (!isOwner && !isAssignedManager && !isAdmin) {
        throw new ForbiddenException('You do not have permission to view this event');
      }

      return {
        id: event.id,
        eventType: event.eventType as EventType,
        title: event.title || undefined,
        date: event.date,
        timeSlot: event.timeSlot as TimeSlot,
        city: event.city,
        area: event.area || undefined,
        guestCount: event.guestCount,
        venueId: event.venueId || undefined,
        status: event.status,
        isExpress: event.isExpress,
        subtotal: event.subtotal,
        discount: event.discount,
        platformFee: event.platformFee,
        tax: event.tax,
        totalAmount: event.totalAmount,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Error fetching event:', error);
      throw new InternalServerErrorException('Failed to fetch event');
    }
  }

  /**
   * CREATE EVENT
   * 
   * Creates a new event for the authenticated user.
   * Validates venue capacity if venue is specified.
   */
  async createEvent(userId: number, dto: CreateEventDto): Promise<EventCustomerResponseDto> {
    try {
      // Validate event date is in the future
      const eventDate = new Date(dto.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        throw new BadRequestException('Event date must be in the future');
      }

      // If venue is specified, validate capacity
      if (dto.venueId) {
        const venue = await this.prisma.venue.findUnique({
          where: { id: dto.venueId },
        });

        if (!venue) {
          throw new BadRequestException('Venue not found');
        }

        if (dto.guestCount < venue.capacityMin || dto.guestCount > venue.capacityMax) {
          throw new BadRequestException(
            `Guest count must be between ${venue.capacityMin} and ${venue.capacityMax} for this venue`
          );
        }
      }

      const event = await this.prisma.event.create({
        data: {
          customerId: userId,
          eventType: dto.eventType,
          title: dto.title,
          date: new Date(dto.date),
          timeSlot: dto.timeSlot,
          city: dto.city,
          area: dto.area,
          guestCount: dto.guestCount,
          venueId: dto.venueId,
          isExpress: dto.isExpress,
          status: EventStatus.INQUIRY, // Start as INQUIRY, not CONFIRMED
          subtotal: 0,
          discount: 0,
          platformFee: 0,
          tax: 0,
          totalAmount: 0,
        },
        include: {
          venue: true,
        },
      });

      return {
        id: event.id,
        eventType: event.eventType as EventType,
        title: event.title || undefined,
        date: event.date,
        timeSlot: event.timeSlot as TimeSlot,
        city: event.city,
        area: event.area || undefined,
        guestCount: event.guestCount,
        venueId: event.venueId || undefined,
        status: event.status,
        isExpress: event.isExpress,
        subtotal: event.subtotal,
        discount: event.discount,
        platformFee: event.platformFee,
        tax: event.tax,
        totalAmount: event.totalAmount,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating event:', error);
      throw new InternalServerErrorException('Failed to create event');
    }
  }

  /**
   * UPDATE EVENT
   * 
   * Updates an existing event. Only owner or admin can update.
   */
  async updateEvent(
    eventId: number, 
    userId: number, 
    userRole: string, 
    dto: UpdateEventDto
  ): Promise<EventCustomerResponseDto> {
    try {
      // Check if event exists
      const existingEvent = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!existingEvent) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Authorization: only owner or admin can update
      if (existingEvent.customerId !== userId && userRole !== Role.ADMIN) {
        throw new ForbiddenException('You do not have permission to update this event');
      }

      // Validate event date if being updated
      if (dto.date) {
        const eventDate = new Date(dto.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (eventDate < today) {
          throw new BadRequestException('Event date must be in the future');
        }

        // Validate venue capacity if venue is being updated
        const venueId = dto.venueId || existingEvent.venueId;
        const guestCount = dto.guestCount || existingEvent.guestCount;
        
        if (venueId) {
          const venue = await this.prisma.venue.findUnique({
            where: { id: venueId },
          });

          if (venue && (guestCount < venue.capacityMin || guestCount > venue.capacityMax)) {
            throw new BadRequestException(
              `Guest count must be between ${venue.capacityMin} and ${venue.capacityMax} for this venue`
            );
          }
        }
      }

      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          ...(dto.eventType && { eventType: dto.eventType }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.date && { date: new Date(dto.date) }),
          ...(dto.timeSlot && { timeSlot: dto.timeSlot }),
          ...(dto.city && { city: dto.city }),
          ...(dto.area !== undefined && { area: dto.area }),
          ...(dto.guestCount && { guestCount: dto.guestCount }),
          ...(dto.venueId !== undefined && { venueId: dto.venueId }),
          ...(dto.isExpress !== undefined && { isExpress: dto.isExpress }),
          ...(dto.status && { status: dto.status }),
        },
        include: {
          venue: true,
        },
      });

      return {
        id: event.id,
        eventType: event.eventType as EventType,
        title: event.title || undefined,
        date: event.date,
        timeSlot: event.timeSlot as TimeSlot,
        city: event.city,
        area: event.area || undefined,
        guestCount: event.guestCount,
        venueId: event.venueId || undefined,
        status: event.status,
        isExpress: event.isExpress,
        subtotal: event.subtotal,
        discount: event.discount,
        platformFee: event.platformFee,
        tax: event.tax,
        totalAmount: event.totalAmount,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error updating event:', error);
      throw new InternalServerErrorException('Failed to update event');
    }
  }

  /**
   * ADD SERVICE TO EVENT
   * 
   * Adds a service to an event. Uses transaction to prevent race conditions.
   * Only owner or assigned manager can add services.
   */
  async addService(
    eventId: number, 
    userId: number, 
    userRole: string, 
    dto: AddEventServiceDto
  ): Promise<any> {
    try {
      // Find event with ownership check
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Authorization: owner, assigned manager, or admin
      const isOwner = event.customerId === userId;
      const isAssignedManager = event.assignedManagerId === userId;
      const isAdmin = userRole === Role.ADMIN;

      if (!isOwner && !isAssignedManager && !isAdmin) {
        throw new ForbiddenException('You do not have permission to add services to this event');
      }

      // Use transaction to prevent race conditions
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the service
        const service = await tx.eventService.create({
          data: {
            eventId,
            itemType: dto.itemType,
            venueId: dto.venueId,
            vendorServiceId: dto.vendorServiceId,
            serviceType: dto.serviceType,
            finalPrice: dto.finalPrice,
            notes: dto.notes,
          },
        });

        // Recalculate pricing atomically
        const services = await tx.eventService.findMany({
          where: { eventId },
        });

        const subtotal = services.reduce((sum, s) => sum + s.finalPrice, 0);
        const totalAmount = subtotal + event.platformFee + event.tax - event.discount;

        await tx.event.update({
          where: { id: eventId },
          data: {
            subtotal,
            totalAmount,
          },
        });

        return service;
      });

      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Error adding service:', error);
      throw new InternalServerErrorException('Failed to add service to event');
    }
  }

  /**
   * ASSIGN EVENT MANAGER (ADMIN ONLY)
   * 
   * Assigns an event manager to an event.
   * Validates that the manager has EVENT_MANAGER role.
   */
  async assignManager(eventId: number, managerId: number): Promise<any> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Validate manager exists and has EVENT_MANAGER role
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, role: true, name: true },
      });

      if (!manager) {
        throw new BadRequestException('Manager user not found');
      }

      if (manager.role !== Role.EVENT_MANAGER) {
        throw new BadRequestException('User must have EVENT_MANAGER role to be assigned');
      }

      return this.prisma.event.update({
        where: { id: eventId },
        data: {
          assignedManagerId: managerId,
        },
        include: {
          assignedManager: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error assigning manager:', error);
      throw new InternalServerErrorException('Failed to assign manager');
    }
  }

  /**
   * DELETE EVENT (ADMIN ONLY)
   * 
   * Deletes an event and all related services.
   */
  async deleteEvent(eventId: number): Promise<void> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Delete event (cascades to services if configured)
      await this.prisma.event.delete({
        where: { id: eventId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting event:', error);
      throw new InternalServerErrorException('Failed to delete event');
    }
  }
}
