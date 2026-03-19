import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, TimeSlot } from './dto/create-event.dto';
import { EventStatus, Role, ItemTypeForEvent } from '@prisma/client';

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
  assignedManagerId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  _count: { services: 0 },
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

const mockVenue = { id: 1, name: 'Royal Palace', capacityMin: 100, capacityMax: 500 };
const mockManager = { id: 50, role: Role.EVENT_MANAGER, name: 'Event Manager' };

// ============================================
// MOCK PRISMA SERVICE
// ============================================

const createMockPrisma = () => ({
  event: { 
    findUnique: jest.fn(), 
    findMany: jest.fn(), 
    create: jest.fn(), 
    update: jest.fn(), 
    delete: jest.fn(), 
    count: jest.fn() 
  },
  user: { findUnique: jest.fn() },
  venue: { findUnique: jest.fn() },
  eventService: { create: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn((cb) => cb(createMockPrisma())),
});

// ============================================
// TEST SUITE
// ============================================

describe('EventsService', () => {
  let service: EventsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService, 
        { provide: PrismaService, useValue: prisma }
      ],
    }).compile();
    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => { 
    expect(service).toBeDefined(); 
  });

  // ============================================
  // POSITIVE: createEvent
  // ============================================

  describe('createEvent', () => {
    it('should create event with valid data', async () => {
      // Mock venue lookup for capacity validation
      prisma.venue.findUnique.mockResolvedValue({ id: 1, capacityMin: 100, capacityMax: 500 });
      prisma.event.create.mockResolvedValue({ ...mockEvent, customerId: 100 });
      const result = await service.createEvent(100, validCreateEventDto);
      expect(result).toBeDefined();
      expect(result.eventType).toBe(validCreateEventDto.eventType);
    });

    it('should create event without venue', async () => {
      const dtoWithoutVenue = { ...validCreateEventDto, venueId: undefined };
      prisma.event.create.mockResolvedValue({ ...mockEvent, customerId: 100, venueId: null });
      const result = await service.createEvent(100, dtoWithoutVenue);
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // NEGATIVE: createEvent
  // ============================================

  describe('createEvent - validation errors', () => {
    it('should throw when date is in past', async () => {
      await expect(
        service.createEvent(100, { ...validCreateEventDto, date: '2020-01-01' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when venue not found', async () => {
      prisma.venue.findUnique.mockResolvedValue(null);
      await expect(
        service.createEvent(100, { ...validCreateEventDto, venueId: 999 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when guest count exceeds capacity', async () => {
      prisma.venue.findUnique.mockResolvedValue(mockVenue);
      await expect(
        service.createEvent(100, { ...validCreateEventDto, guestCount: 1000 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when guest count below minimum capacity', async () => {
      prisma.venue.findUnique.mockResolvedValue(mockVenue);
      await expect(
        service.createEvent(100, { ...validCreateEventDto, guestCount: 50 })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // POSITIVE: findAll
  // ============================================

  describe('findAll', () => {
    it('should return paginated events', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by city', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll({ city: 'Bangalore' });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll({ status: EventStatus.INQUIRY });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by date range', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll({ startDate: '2026-01-01', endDate: '2026-12-31' });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by isExpress', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll({ isExpress: false });
      expect(result.data).toHaveLength(1);
    });
  });

  // ============================================
  // NEGATIVE: findAll
  // ============================================

  describe('findAll - edge cases', () => {
    it('should handle empty results', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);
      const result = await service.findAll({ city: 'NonExistent' });
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ============================================
  // POSITIVE: getMyEvents
  // ============================================

  describe('getMyEvents', () => {
    it('should return user events', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.getMyEvents(100, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by status for user events', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.getMyEvents(100, { status: EventStatus.INQUIRY });
      expect(result.data).toHaveLength(1);
    });
  });

  // ============================================
  // POSITIVE: findOne
  // ============================================

  describe('findOne', () => {
    it('should return event for owner', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      const result = await service.findOne(1, 100, Role.CUSTOMER);
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should return event for assigned manager', async () => {
      const eventWithManager = { ...mockEvent, assignedManagerId: 50, _count: { services: 0 } };
      prisma.event.findUnique.mockResolvedValue(eventWithManager);
      const result = await service.findOne(1, 50, Role.EVENT_MANAGER);
      expect(result).toBeDefined();
    });

    it('should return event for admin', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      const result = await service.findOne(1, 999, Role.ADMIN);
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // NEGATIVE: findOne
  // ============================================

  describe('findOne - errors', () => {
    it('should throw NotFoundException when not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999, 100, Role.CUSTOMER)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      await expect(service.findOne(1, 999, Role.CUSTOMER)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // POSITIVE: addService
  // ============================================

  describe('addService', () => {
    it('should add service to event', async () => {
      prisma.$transaction = jest.fn().mockImplementation(async (cb) => {
        const tx = createMockPrisma();
        tx.eventService = { 
          create: jest.fn().mockResolvedValue({ id: 1 }), 
          findMany: jest.fn().mockResolvedValue([{ finalPrice: 50000 }]) 
        };
        tx.event = { update: jest.fn().mockResolvedValue({ ...mockEvent, subtotal: 50000 }) };
        return cb(tx);
      });
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      const result = await service.addService(1, 100, Role.CUSTOMER, { 
        itemType: ItemTypeForEvent.VENDOR_SERVICE, 
        finalPrice: 50000 
      });
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // NEGATIVE: addService
  // ============================================

  describe('addService - errors', () => {
    it('should throw when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(
        service.addService(999, 100, Role.CUSTOMER, { itemType: ItemTypeForEvent.VENDOR_SERVICE, finalPrice: 50000 })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when unauthorized', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      await expect(
        service.addService(1, 999, Role.CUSTOMER, { itemType: ItemTypeForEvent.VENDOR_SERVICE, finalPrice: 50000 })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // POSITIVE: assignManager
  // ============================================

  describe('assignManager', () => {
    it('should assign manager to event', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.user.findUnique.mockResolvedValue(mockManager);
      prisma.event.update.mockResolvedValue({ ...mockEvent, assignedManagerId: 50 });
      const result = await service.assignManager(1, 50);
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // NEGATIVE: assignManager
  // ============================================

  describe('assignManager - errors', () => {
    it('should throw when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.assignManager(999, 50)).rejects.toThrow(NotFoundException);
    });

    it('should throw when manager not found', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.assignManager(1, 999)).rejects.toThrow(BadRequestException);
    });

    it('should throw when user is not EVENT_MANAGER', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.user.findUnique.mockResolvedValue({ id: 50, role: Role.CUSTOMER, name: 'Customer' });
      await expect(service.assignManager(1, 50)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // POSITIVE: updateEvent
  // ============================================

  describe('updateEvent', () => {
    it('should update event by owner', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.event.update.mockResolvedValue({ ...mockEvent, title: 'Updated Title' });
      const result = await service.updateEvent(1, 100, Role.CUSTOMER, { title: 'Updated Title' });
      expect(result).toBeDefined();
    });

    it('should allow admin to update any event', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.event.update.mockResolvedValue({ ...mockEvent, title: 'Admin Updated' });
      const result = await service.updateEvent(1, 999, Role.ADMIN, { title: 'Admin Updated' });
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // NEGATIVE: updateEvent
  // ============================================

  describe('updateEvent - errors', () => {
    it('should throw when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(
        service.updateEvent(999, 100, Role.CUSTOMER, { title: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when non-owner tries to update', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      await expect(
        service.updateEvent(1, 999, Role.CUSTOMER, { title: 'Hacked' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw when updating to past date', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      await expect(
        service.updateEvent(1, 100, Role.CUSTOMER, { date: '2020-01-01' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // POSITIVE: deleteEvent
  // ============================================

  describe('deleteEvent', () => {
    it('should delete event', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.event.delete.mockResolvedValue(mockEvent);
      await service.deleteEvent(1);
      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  // ============================================
  // NEGATIVE: deleteEvent
  // ============================================

  describe('deleteEvent - errors', () => {
    it('should throw when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.deleteEvent(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // PAGINATION TESTS
  // ============================================

  describe('Pagination', () => {
    it('should calculate correct metadata for page 1', async () => {
      prisma.event.findMany.mockResolvedValue(Array(10).fill(mockEvent));
      prisma.event.count.mockResolvedValue(100);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(false);
      expect(result.totalPages).toBe(10);
    });

    it('should calculate correct metadata for middle page', async () => {
      prisma.event.findMany.mockResolvedValue(Array(10).fill(mockEvent));
      prisma.event.count.mockResolvedValue(100);
      const result = await service.findAll({ page: 5, limit: 10 });
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
      expect(result.totalPages).toBe(10);
    });

    it('should calculate correct metadata for last page', async () => {
      prisma.event.findMany.mockResolvedValue(Array(10).fill(mockEvent));
      prisma.event.count.mockResolvedValue(100);
      const result = await service.findAll({ page: 10, limit: 10 });
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(true);
      expect(result.totalPages).toBe(10);
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('Security', () => {
    it('should not expose customer PII in list', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll({});
      expect(result.data[0]).not.toHaveProperty('customerEmail');
      expect(result.data[0]).not.toHaveProperty('customerPhone');
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle event without venue', async () => {
      const eventWithoutVenue = { ...mockEvent, venueId: null };
      prisma.event.findUnique.mockResolvedValue(eventWithoutVenue);
      const result = await service.findOne(1, 100, Role.CUSTOMER);
      expect(result.venueId).toBeUndefined();
    });

    it('should handle event without title', async () => {
      const eventWithoutTitle = { ...mockEvent, title: null };
      prisma.event.findUnique.mockResolvedValue(eventWithoutTitle);
      const result = await service.findOne(1, 100, Role.CUSTOMER);
      expect(result.title).toBeUndefined();
    });

    it('should handle partial update', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.event.update.mockResolvedValue({ ...mockEvent, city: 'Chennai' });
      const result = await service.updateEvent(1, 100, Role.CUSTOMER, { city: 'Chennai' });
      expect(result.city).toBe('Chennai');
    });
  });
});
