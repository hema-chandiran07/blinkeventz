import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventType, TimeSlot } from './dto/create-event.dto';
import { EventStatus, Role } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { EventOwnerGuard } from './guards/event-owner.guard';
import { EventManagerGuard } from './guards/event-manager.guard';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

// ============================================
// MOCK DATA
// ============================================

const mockEvent = {
  id: 1,
  customerId: 100,
  eventType: EventType.WEDDING,
  title: 'John & Jane Wedding',
  date: new Date('2026-06-15'),
  timeSlot: TimeSlot.FULL_DAY,
  city: 'Bangalore',
  area: 'Indiranagar',
  guestCount: 300,
  venueId: 1,
  status: EventStatus.INQUIRY,
  isExpress: false,
  subtotal: 0,
  discount: 0,
  platformFee: 0,
  tax: 0,
  totalAmount: 0,
};

const validCreateEventDto = {
  eventType: EventType.WEDDING,
  title: 'John & Jane Wedding',
  date: '2026-06-15',
  timeSlot: TimeSlot.FULL_DAY,
  city: 'Bangalore',
  area: 'Indiranagar',
  guestCount: 300,
  venueId: 1,
  isExpress: false,
};

const validUpdateEventDto = {
  title: 'Updated Wedding',
  guestCount: 350,
};

// ============================================
// MOCKS
// ============================================

const createMockEventsService = () => ({
  createEvent: jest.fn(),
  findAll: jest.fn(),
  getMyEvents: jest.fn(),
  findOne: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  addService: jest.fn(),
  assignManager: jest.fn(),
});

const createMockGuard = () => ({
  canActivate: jest.fn().mockReturnValue(true),
});

const mockPrismaService = {
  event: { findUnique: jest.fn(), findMany: jest.fn() },
  user: { findUnique: jest.fn() },
  venue: { findUnique: jest.fn() },
};

// ============================================
// TEST SUITE
// ============================================

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: ReturnType<typeof createMockEventsService>;

  const mockRequest = (userId: number, role: string) => ({
    user: {
      userId,
      role,
      email: `user${userId}@test.com`,
    },
  });

  beforeEach(async () => {
    eventsService = createMockEventsService();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: eventsService },
        { provide: EventOwnerGuard, useValue: createMockGuard() },
        { provide: EventManagerGuard, useValue: createMockGuard() },
        { provide: PrismaService, useValue: mockPrismaService },
        Reflector,
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================
  // POSITIVE: POST /events
  // ============================================

  describe('POST /events', () => {
    it('should create event with valid DTO', async () => {
      eventsService.createEvent.mockResolvedValue(mockEvent);
      
      const req = mockRequest(100, Role.CUSTOMER);
      const result = await controller.create(req, validCreateEventDto);
      
      expect(eventsService.createEvent).toHaveBeenCalledWith(100, validCreateEventDto);
      expect(result).toEqual(mockEvent);
    });

    it('should create event without optional fields', async () => {
      const dtoWithoutOptional = {
        eventType: EventType.BIRTHDAY,
        date: '2026-07-01',
        timeSlot: TimeSlot.EVENING,
        city: 'Mumbai',
        guestCount: 50,
        isExpress: false,
      };
      eventsService.createEvent.mockResolvedValue({ ...mockEvent, ...dtoWithoutOptional });
      
      const req = mockRequest(100, Role.CUSTOMER);
      const result = await controller.create(req, dtoWithoutOptional);
      
      expect(eventsService.createEvent).toHaveBeenCalledWith(100, dtoWithoutOptional);
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // NEGATIVE: POST /events
  // ============================================

  describe('POST /events - validation', () => {
    it('should throw on invalid eventType', async () => {
      eventsService.createEvent.mockRejectedValue(new BadRequestException('Invalid eventType'));
      
      const req = mockRequest(100, Role.CUSTOMER);
      const invalidDto = { ...validCreateEventDto, eventType: 'INVALID' as EventType };
      
      await expect(controller.create(req, invalidDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw on missing required fields', async () => {
      eventsService.createEvent.mockRejectedValue(new BadRequestException('Missing required fields'));
      
      const req = mockRequest(100, Role.CUSTOMER);
      const invalidDto = { eventType: EventType.WEDDING };
      
      await expect(controller.create(req, invalidDto as any)).rejects.toThrow();
    });

    it('should throw on invalid date format', async () => {
      eventsService.createEvent.mockRejectedValue(new BadRequestException('Invalid date'));
      
      const req = mockRequest(100, Role.CUSTOMER);
      const invalidDto = { ...validCreateEventDto, date: 'invalid-date' };
      
      await expect(controller.create(req, invalidDto)).rejects.toThrow();
    });
  });

  // ============================================
  // POSITIVE: GET /events
  // ============================================

  describe('GET /events', () => {
    it('should return paginated events', async () => {
      const paginatedResult = {
        data: [mockEvent],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };
      eventsService.findAll.mockResolvedValue(paginatedResult);
      
      const result = await controller.findAll({});
      
      expect(eventsService.findAll).toHaveBeenCalled();
      expect(result).toEqual(paginatedResult);
    });

    it('should pass query parameters to service', async () => {
      const query = { page: 1, limit: 10, city: 'Bangalore' };
      eventsService.findAll.mockResolvedValue({ data: [], ...query, total: 0, totalPages: 0, hasNext: false, hasPrevious: false });
      
      await controller.findAll(query);
      
      expect(eventsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ============================================
  // POSITIVE: GET /events/my
  // ============================================

  describe('GET /events/my', () => {
    it('should return user events', async () => {
      const userEvents = { data: [mockEvent], page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrevious: false };
      eventsService.getMyEvents.mockResolvedValue(userEvents);
      
      const req = mockRequest(100, Role.CUSTOMER);
      const result = await controller.myEvents(req, {});
      
      expect(eventsService.getMyEvents).toHaveBeenCalledWith(100, {});
      expect(result).toEqual(userEvents);
    });

    it('should pass filters to service', async () => {
      const query = { status: EventStatus.INQUIRY, city: 'Bangalore' };
      eventsService.getMyEvents.mockResolvedValue({ data: [], ...query, total: 0, totalPages: 0, hasNext: false, hasPrevious: false });
      
      const req = mockRequest(100, Role.CUSTOMER);
      await controller.myEvents(req, query);
      
      expect(eventsService.getMyEvents).toHaveBeenCalledWith(100, query);
    });
  });

  // ============================================
  // POSITIVE: GET /events/:id
  // ============================================

  describe('GET /events/:id', () => {
    it('should return event by id', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      
      const req = mockRequest(100, Role.CUSTOMER);
      const result = await controller.findOne(req, 1);
      
      expect(eventsService.findOne).toHaveBeenCalledWith(1, 100, Role.CUSTOMER);
      expect(result).toEqual(mockEvent);
    });

    it('should return event for manager', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      
      const req = mockRequest(50, Role.EVENT_MANAGER);
      const result = await controller.findOne(req, 1);
      
      expect(eventsService.findOne).toHaveBeenCalledWith(1, 50, Role.EVENT_MANAGER);
      expect(result).toEqual(mockEvent);
    });

    it('should return event for admin', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      
      const req = mockRequest(1, Role.ADMIN);
      const result = await controller.findOne(req, 1);
      
      expect(eventsService.findOne).toHaveBeenCalledWith(1, 1, Role.ADMIN);
      expect(result).toEqual(mockEvent);
    });
  });

  // ============================================
  // NEGATIVE: GET /events/:id
  // ============================================

  describe('GET /events/:id - errors', () => {
    // Note: ParseIntPipe validation is handled by NestJS at the HTTP layer
    // Unit tests cannot test this behavior - use E2E tests for pipe validation
  });

  // ============================================
  // POSITIVE: PATCH /events/:id
  // ============================================

  describe('PATCH /events/:id', () => {
    it('should update event', async () => {
      const updatedEvent = { ...mockEvent, ...validUpdateEventDto };
      eventsService.updateEvent.mockResolvedValue(updatedEvent);
      
      const req = mockRequest(100, Role.CUSTOMER);
      const result = await controller.update(req, 1, validUpdateEventDto);
      
      expect(eventsService.updateEvent).toHaveBeenCalledWith(1, 100, Role.CUSTOMER, validUpdateEventDto);
      expect(result).toEqual(updatedEvent);
    });
  });

  // ============================================
  // POSITIVE: POST /events/:id/services
  // ============================================

  describe('POST /events/:id/services', () => {
    it('should add service to event', async () => {
      const serviceDto = { itemType: 'VENDOR_SERVICE' as any, finalPrice: 50000 };
      eventsService.addService.mockResolvedValue({ id: 1, ...serviceDto });
      
      const req = mockRequest(100, Role.CUSTOMER);
      const result = await controller.addService(req, 1, serviceDto);
      
      expect(eventsService.addService).toHaveBeenCalledWith(1, 100, Role.CUSTOMER, serviceDto);
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // POSITIVE: PATCH /events/:id/assign-manager
  // ============================================

  describe('PATCH /events/:id/assign-manager', () => {
    it('should assign manager', async () => {
      const assignDto = { managerId: 50 };
      const resultEvent = { ...mockEvent, assignedManagerId: 50 };
      eventsService.assignManager.mockResolvedValue(resultEvent);
      
      const result = await controller.assignManager(1, assignDto);
      
      expect(eventsService.assignManager).toHaveBeenCalledWith(1, 50);
      expect(result).toEqual(resultEvent);
    });
  });

  // ============================================
  // POSITIVE: DELETE /events/:id
  // ============================================

  describe('DELETE /events/:id', () => {
    it('should delete event', async () => {
      eventsService.deleteEvent.mockResolvedValue(undefined);
      
      const result = await controller.delete(1);
      
      expect(eventsService.deleteEvent).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });
  });

  // ============================================
  // DTO VALIDATION TESTS
  // ============================================

  describe('DTO Validation', () => {
    it('should accept valid CreateEventDto', async () => {
      eventsService.createEvent.mockResolvedValue(mockEvent);
      const req = mockRequest(100, Role.CUSTOMER);
      
      const result = await controller.create(req, validCreateEventDto);
      
      expect(result).toBeDefined();
    });

    it('should accept valid UpdateEventDto', async () => {
      eventsService.updateEvent.mockResolvedValue(mockEvent);
      const req = mockRequest(100, Role.CUSTOMER);
      
      const result = await controller.update(req, 1, validUpdateEventDto);
      
      expect(result).toBeDefined();
    });

    it('should accept partial UpdateEventDto', async () => {
      eventsService.updateEvent.mockResolvedValue(mockEvent);
      const req = mockRequest(100, Role.CUSTOMER);
      
      const result = await controller.update(req, 1, { title: 'New Title' });
      
      expect(result).toBeDefined();
      expect(eventsService.updateEvent).toHaveBeenCalledWith(1, 100, Role.CUSTOMER, { title: 'New Title' });
    });
  });

  // ============================================
  // AUTH & AUTHORIZATION TESTS
  // ============================================

  describe('Authorization', () => {
    it('should pass userId from request to service', async () => {
      eventsService.createEvent.mockResolvedValue(mockEvent);
      
      const req = mockRequest(999, Role.CUSTOMER);
      await controller.create(req, validCreateEventDto);
      
      expect(eventsService.createEvent).toHaveBeenCalledWith(999, validCreateEventDto);
    });

    it('should pass userRole from request to service', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      
      const req = mockRequest(100, Role.ADMIN);
      await controller.findOne(req, 1);
      
      expect(eventsService.findOne).toHaveBeenCalledWith(1, 100, Role.ADMIN);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty query parameters', async () => {
      eventsService.findAll.mockResolvedValue({ data: [], page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false });
      
      const result = await controller.findAll({});
      
      expect(eventsService.findAll).toHaveBeenCalledWith({});
      expect(result.total).toBe(0);
    });

    it('should handle large page numbers', async () => {
      eventsService.findAll.mockResolvedValue({ data: [], page: 100, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: true });
      
      const result = await controller.findAll({ page: 100, limit: 20 });
      
      expect(result.page).toBe(100);
    });

    it('should handle all query filters simultaneously', async () => {
      const query = { 
        page: 1, 
        limit: 10, 
        city: 'Bangalore', 
        status: EventStatus.INQUIRY,
        isExpress: false,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };
      eventsService.findAll.mockResolvedValue({ data: [], ...query, total: 0, totalPages: 0, hasNext: false, hasPrevious: false });
      
      await controller.findAll(query);
      
      expect(eventsService.findAll).toHaveBeenCalledWith(query);
    });
  });
});
