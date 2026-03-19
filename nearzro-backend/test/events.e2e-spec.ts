import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { EventsModule } from '../src/events/events.module';
import { EventStatus, Role, ItemTypeForEvent } from '@prisma/client';
import { EventType, TimeSlot } from '../src/events/dto/create-event.dto';
import request from 'supertest';

// ============================================
// TEST CONFIGURATION
// ============================================

const TEST_USER = {
  id: 100,
  email: 'test@example.com',
  name: 'Test User',
  role: Role.CUSTOMER,
};

const TEST_ADMIN = {
  id: 1,
  email: 'admin@example.com',
  name: 'Admin User',
  role: Role.ADMIN,
};

const TEST_EVENT_MANAGER = {
  id: 50,
  email: 'manager@example.com',
  name: 'Event Manager',
  role: Role.EVENT_MANAGER,
};

const mockJwt = (user: any) => `mock-jwt-token-${user.id}-${user.role}`;

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

const mockVenue = {
  id: 1,
  name: 'Royal Palace',
  capacityMin: 100,
  capacityMax: 500,
  city: 'Bangalore',
};

// ============================================
// E2E TEST SUITE
// ============================================

describe('EventsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  // Mock Prisma Service
  const mockPrismaService = {
    event: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    venue: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // POSITIVE: POST /events
  // ============================================

  describe('POST /events', () => {
    it('should create event with valid data', async () => {
      const createDto = {
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

      mockPrismaService.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrismaService.event.create.mockResolvedValue({ ...mockEvent, ...createDto });

      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.eventType).toBe(createDto.eventType);
        });
    });

    it('should create event without venue', async () => {
      const createDto = {
        eventType: EventType.BIRTHDAY,
        date: '2026-07-01',
        timeSlot: TimeSlot.EVENING,
        city: 'Mumbai',
        guestCount: 50,
        isExpress: false,
      };

      mockPrismaService.event.create.mockResolvedValue({ ...mockEvent, ...createDto, venueId: null });

      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(createDto)
        .expect(201);
    });

    it('should create event with minimum required fields', async () => {
      const createDto = {
        eventType: EventType.CORPORATE,
        date: '2026-08-15',
        timeSlot: TimeSlot.MORNING,
        city: 'Delhi',
        guestCount: 100,
        isExpress: false,
      };

      mockPrismaService.event.create.mockResolvedValue({ ...mockEvent, ...createDto });

      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(createDto)
        .expect(201);
    });
  });

  // ============================================
  // NEGATIVE: POST /events
  // ============================================

  describe('POST /events - validation errors', () => {
    it('should reject invalid eventType', async () => {
      const invalidDto = {
        eventType: 'INVALID_TYPE',
        date: '2026-06-15',
        timeSlot: TimeSlot.FULL_DAY,
        city: 'Bangalore',
        guestCount: 300,
        isExpress: false,
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      const invalidDto = {
        eventType: EventType.WEDDING,
        // Missing: date, timeSlot, city, guestCount, isExpress
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should reject past date', async () => {
      const invalidDto = {
        eventType: EventType.WEDDING,
        date: '2020-01-01',
        timeSlot: TimeSlot.FULL_DAY,
        city: 'Bangalore',
        guestCount: 300,
        isExpress: false,
      };

      mockPrismaService.event.create.mockRejectedValue(new Error('Event date must be in the future'));

      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(invalidDto)
        .expect(500);
    });

    it('should reject negative guestCount', async () => {
      const invalidDto = {
        eventType: EventType.WEDDING,
        date: '2026-06-15',
        timeSlot: TimeSlot.FULL_DAY,
        city: 'Bangalore',
        guestCount: -10,
        isExpress: false,
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should reject guestCount exceeding 10000', async () => {
      const invalidDto = {
        eventType: EventType.WEDDING,
        date: '2026-06-15',
        timeSlot: TimeSlot.FULL_DAY,
        city: 'Bangalore',
        guestCount: 20000,
        isExpress: false,
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  // ============================================
  // UNAUTHORIZED: POST /events
  // ============================================

  describe('POST /events - unauthorized', () => {
    it('should reject request without JWT', async () => {
      const createDto = {
        eventType: EventType.WEDDING,
        date: '2026-06-15',
        timeSlot: TimeSlot.FULL_DAY,
        city: 'Bangalore',
        guestCount: 300,
        isExpress: false,
      };

      return request(app.getHttpServer())
        .post('/events')
        .send(createDto)
        .expect(401);
    });

    it('should reject request with invalid JWT', async () => {
      const createDto = {
        eventType: EventType.WEDDING,
        date: '2026-06-15',
        timeSlot: TimeSlot.FULL_DAY,
        city: 'Bangalore',
        guestCount: 300,
        isExpress: false,
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', 'Bearer invalid-token')
        .send(createDto)
        .expect(401);
    });
  });

  // ============================================
  // POSITIVE: GET /events
  // ============================================

  describe('GET /events', () => {
    it('should return paginated events', async () => {
      const events = [{ ...mockEvent }, { ...mockEvent, id: 2 }];
      mockPrismaService.event.findMany.mockResolvedValue(events);
      mockPrismaService.event.count.mockResolvedValue(2);

      return request(app.getHttpServer())
        .get('/events')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(2);
          expect(res.body.total).toBe(2);
          expect(res.body.page).toBe(1);
        });
    });

    it('should filter by city', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.event.count.mockResolvedValue(1);

      return request(app.getHttpServer())
        .get('/events?city=Bangalore')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
        });
    });

    it('should filter by status', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.event.count.mockResolvedValue(1);

      return request(app.getHttpServer())
        .get('/events?status=INQUIRY')
        .expect(200);
    });

    it('should filter by isExpress', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.event.count.mockResolvedValue(1);

      return request(app.getHttpServer())
        .get('/events?isExpress=false')
        .expect(200);
    });

    it('should handle pagination correctly', async () => {
      const events = Array(10).fill(mockEvent);
      mockPrismaService.event.findMany.mockResolvedValue(events);
      mockPrismaService.event.count.mockResolvedValue(100);

      return request(app.getHttpServer())
        .get('/events?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
          expect(res.body.total).toBe(100);
          expect(res.body.totalPages).toBe(10);
          expect(res.body.hasNext).toBe(true);
          expect(res.body.hasPrevious).toBe(false);
        });
    });

    it('should handle empty results', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);
      mockPrismaService.event.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/events?city=NonExistent')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.total).toBe(0);
          expect(res.body.totalPages).toBe(0);
        });
    });
  });

  // ============================================
  // POSITIVE: GET /events/my
  // ============================================

  describe('GET /events/my', () => {
    it('should return user events', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.event.count.mockResolvedValue(1);

      return request(app.getHttpServer())
        .get('/events/my')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
        });
    });

    it('should filter user events by status', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.event.count.mockResolvedValue(1);

      return request(app.getHttpServer())
        .get('/events/my?status=INQUIRY')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .expect(200);
    });
  });

  // ============================================
  // UNAUTHORIZED: GET /events/my
  // ============================================

  describe('GET /events/my - unauthorized', () => {
    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get('/events/my')
        .expect(401);
    });
  });

  // ============================================
  // POSITIVE: GET /events/:id
  // ============================================

  describe('GET /events/:id', () => {
    it('should return event for owner', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);

      return request(app.getHttpServer())
        .get('/events/1')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(1);
        });
    });

    it('should return event for admin', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);

      return request(app.getHttpServer())
        .get('/events/1')
        .set('Authorization', `Bearer ${mockJwt(TEST_ADMIN)}`)
        .expect(200);
    });

    it('should return event for assigned manager', async () => {
      const eventWithManager = { ...mockEvent, assignedManagerId: 50 };
      mockPrismaService.event.findUnique.mockResolvedValue(eventWithManager);

      return request(app.getHttpServer())
        .get('/events/1')
        .set('Authorization', `Bearer ${mockJwt(TEST_EVENT_MANAGER)}`)
        .expect(200);
    });
  });

  // ============================================
  // NEGATIVE: GET /events/:id
  // ============================================

  describe('GET /events/:id - errors', () => {
    it('should return 404 for non-existent event', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/events/999')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .expect(404);
    });

    it('should return 403 for unauthorized user', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);

      return request(app.getHttpServer())
        .get('/events/1')
        .set('Authorization', `Bearer ${mockJwt({ id: 999, role: Role.CUSTOMER })}`)
        .expect(403);
    });
  });

  // ============================================
  // POSITIVE: PATCH /events/:id
  // ============================================

  describe('PATCH /events/:id', () => {
    it('should update event by owner', async () => {
      const updateDto = { title: 'Updated Wedding' };
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.event.update.mockResolvedValue({ ...mockEvent, ...updateDto });

      return request(app.getHttpServer())
        .patch('/events/1')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Wedding');
        });
    });

    it('should allow partial update', async () => {
      const updateDto = { guestCount: 350 };
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.event.update.mockResolvedValue({ ...mockEvent, ...updateDto });

      return request(app.getHttpServer())
        .patch('/events/1')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(updateDto)
        .expect(200);
    });
  });

  // ============================================
  // POSITIVE: POST /events/:id/services
  // ============================================

  describe('POST /events/:id/services', () => {
    it('should add service to event', async () => {
      const serviceDto = {
        itemType: ItemTypeForEvent.VENDOR_SERVICE,
        vendorServiceId: 5,
        finalPrice: 50000,
        serviceType: 'CATERING',
      };

      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.$transaction = jest.fn().mockImplementation(async (cb) => {
        const tx = {
          eventService: { create: jest.fn().mockResolvedValue({ id: 1, ...serviceDto }), findMany: jest.fn().mockResolvedValue([{ finalPrice: 50000 }]) },
          event: { update: jest.fn().mockResolvedValue({ ...mockEvent, subtotal: 50000 }) },
        };
        return cb(tx);
      });

      return request(app.getHttpServer())
        .post('/events/1/services')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(serviceDto)
        .expect(201);
    });
  });

  // ============================================
  // POSITIVE: PATCH /events/:id/assign-manager
  // ============================================

  describe('PATCH /events/:id/assign-manager', () => {
    it('should assign manager to event (admin only)', async () => {
      const assignDto = { managerId: 50 };
      const mockManager = { id: 50, role: Role.EVENT_MANAGER, name: 'Manager' };
      
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.user.findUnique.mockResolvedValue(mockManager);
      mockPrismaService.event.update.mockResolvedValue({ ...mockEvent, assignedManagerId: 50 });

      return request(app.getHttpServer())
        .patch('/events/1/assign-manager')
        .set('Authorization', `Bearer ${mockJwt(TEST_ADMIN)}`)
        .send(assignDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.assignedManagerId).toBe(50);
        });
    });
  });

  // ============================================
  // NEGATIVE: PATCH /events/:id/assign-manager
  // ============================================

  describe('PATCH /events/:id/assign-manager - errors', () => {
    it('should reject non-admin (403)', async () => {
      const assignDto = { managerId: 50 };

      return request(app.getHttpServer())
        .patch('/events/1/assign-manager')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .send(assignDto)
        .expect(403);
    });

    it('should reject invalid manager (400)', async () => {
      const assignDto = { managerId: 999 };
      
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .patch('/events/1/assign-manager')
        .set('Authorization', `Bearer ${mockJwt(TEST_ADMIN)}`)
        .send(assignDto)
        .expect(400);
    });
  });

  // ============================================
  // POSITIVE: DELETE /events/:id
  // ============================================

  describe('DELETE /events/:id', () => {
    it('should delete event (admin only)', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.event.delete.mockResolvedValue(mockEvent);

      return request(app.getHttpServer())
        .delete('/events/1')
        .set('Authorization', `Bearer ${mockJwt(TEST_ADMIN)}`)
        .expect(200);
    });
  });

  // ============================================
  // NEGATIVE: DELETE /events/:id
  // ============================================

  describe('DELETE /events/:id - errors', () => {
    it('should reject non-admin (403)', async () => {
      return request(app.getHttpServer())
        .delete('/events/1')
        .set('Authorization', `Bearer ${mockJwt(TEST_USER)}`)
        .expect(403);
    });

    it('should return 404 for non-existent event', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .delete('/events/999')
        .set('Authorization', `Bearer ${mockJwt(TEST_ADMIN)}`)
        .expect(404);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle very large page numbers', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);
      mockPrismaService.event.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/events?page=999999&limit=20')
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(999999);
        });
    });

    it('should handle invalid pagination values', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);
      mockPrismaService.event.count.mockResolvedValue(0);

      return request(app.getHttpServer())
        .get('/events?page=-1&limit=0')
        .expect(200);
    });

    it('should handle multiple query filters', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.event.count.mockResolvedValue(1);

      return request(app.getHttpServer())
        .get('/events?city=Bangalore&status=INQUIRY&isExpress=false&page=1&limit=10')
        .expect(200);
    });
  });
});
