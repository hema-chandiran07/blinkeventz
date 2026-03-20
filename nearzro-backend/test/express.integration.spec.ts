/**
 * Express Module Integration Tests
 * Tests complete API flows using Supertest
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ExpressPlanType, ExpressStatus, EventStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('ExpressController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test user and tokens
  let userAccessToken: string;
  let otherUserAccessToken: string;
  const testUserId = 9999;
  const otherUserId = 9998;

  // Test event ID
  let testEventId: number;

  // Helper to create test event
  const createTestEvent = async (userId: number, area: string, date: Date) => {
    // First create a user if not exists (or use existing)
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          name: 'Test User',
          email: `test${userId}@test.com`,
          phone: '1234567890',
          role: 'CUSTOMER',
        },
      });
    }

    return prisma.event.create({
      data: {
        customerId: userId,
        userId: userId,
        title: 'Test Express Event',
        eventType: 'WEDDING',
        date: date,
        timeSlot: 'MORNING',
        city: 'Chennai',
        area: area,
        guestCount: 100,
        subtotal: 100000,
        totalAmount: 100000,
        status: EventStatus.INQUIRY,
      },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Generate test tokens
    userAccessToken = jwtService.sign({
      sub: testUserId,
      userId: testUserId,
      role: 'CUSTOMER',
    });

    otherUserAccessToken = jwtService.sign({
      sub: otherUserId,
      userId: otherUserId,
      role: 'CUSTOMER',
    });

    // Create test event in database
    const testEvent = await createTestEvent(testUserId, 'Anna Nagar', new Date(Date.now() + 24 * 60 * 60 * 1000));
    testEventId = testEvent.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.expressRequest.deleteMany({
      where: { EventId: testEventId },
    });
    await prisma.event.delete({
      where: { id: testEventId },
    });
    await app.close();
  });

  // ========================================
  // POST /express Tests
  // ========================================

  describe('POST /express', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/express')
        .send({ EventId: testEventId, planType: ExpressPlanType.FIXED });

      expect(response.status).toBe(401);
    });

    it('should return 400 if event not found', async () => {
      const response = await request(app.getHttpServer())
        .post('/express')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ EventId: 999999, planType: ExpressPlanType.FIXED });

      expect(response.status).toBe(400);
    });

    it('should return 403 if user does not own the event', async () => {
      // Create event for test user
      const eventForOtherUser = await createTestEvent(testUserId, 'Anna Nagar', new Date(Date.now() + 24 * 60 * 60 * 1000));

      const response = await request(app.getHttpServer())
        .post('/express')
        .set('Authorization', `Bearer ${otherUserAccessToken}`)
        .send({ EventId: eventForOtherUser.id, planType: ExpressPlanType.FIXED });

      expect(response.status).toBe(403);

      // Cleanup
      await prisma.event.delete({ where: { id: eventForOtherUser.id } });
    });

    it('should return 400 if express already exists for event', async () => {
      // First create an express request
      await request(app.getHttpServer())
        .post('/express')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ EventId: testEventId, planType: ExpressPlanType.FIXED });

      // Try to create another one
      const response = await request(app.getHttpServer())
        .post('/express')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ EventId: testEventId, planType: ExpressPlanType.FIXED });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already created');
    });

    it('should return 400 if event has no area', async () => {
      // Create event without area
      const eventNoArea = await prisma.event.create({
        data: {
          customerId: testUserId,
          userId: testUserId,
          title: 'Event No Area',
          eventType: 'WEDDING',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          timeSlot: 'MORNING',
          city: 'Chennai',
          guestCount: 100,
          subtotal: 100000,
          totalAmount: 100000,
          status: EventStatus.INQUIRY,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/express')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ EventId: eventNoArea.id, planType: ExpressPlanType.FIXED });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('area');

      // Cleanup
      await prisma.event.delete({ where: { id: eventNoArea.id } });
    });

    it('should return 400 if area is not serviceable', async () => {
      // Create event in non-serviceable area
      const eventBadArea = await prisma.event.create({
        data: {
          customerId: testUserId,
          userId: testUserId,
          title: 'Event Bad Area',
          eventType: 'WEDDING',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          timeSlot: 'MORNING',
          city: 'Chennai',
          area: 'Unknown Place',
          guestCount: 100,
          subtotal: 100000,
          totalAmount: 100000,
          status: EventStatus.INQUIRY,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/express')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ EventId: eventBadArea.id, planType: ExpressPlanType.FIXED });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not available');

      // Cleanup
      await prisma.event.delete({ where: { id: eventBadArea.id } });
    });

    it('should return 400 if insufficient time before event', async () => {
      // Create event in the past (or very soon)
      const eventSoon = await createTestEvent(testUserId, 'Anna Nagar', new Date(Date.now() + 30 * 60 * 1000)); // 30 minutes from now

      const response = await request(app.getHttpServer())
        .post('/express')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ EventId: eventSoon.id, planType: ExpressPlanType.FIXED });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('minimum');

      // Cleanup
      await prisma.event.delete({ where: { id: eventSoon.id } });
    });

    it('should create express request successfully', async () => {
      // Create fresh event for this test
      const freshEvent = await createTestEvent(testUserId, 'Anna Nagar', new Date(Date.now() + 5 * 60 * 60 * 1000)); // 5 hours from now

      const response = await request(app.getHttpServer())
        .post('/express')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ EventId: freshEvent.id, planType: ExpressPlanType.FIXED });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.EventId).toBe(freshEvent.id);
      expect(response.body.planType).toBe(ExpressPlanType.FIXED);
      expect(response.body.status).toBe(ExpressStatus.PENDING);

      // Cleanup
      await prisma.expressRequest.delete({
        where: { EventId: freshEvent.id },
      });
      await prisma.event.delete({ where: { id: freshEvent.id } });
    });
  });

  // ========================================
  // GET /express/event/:id Tests
  // ========================================

  describe('GET /express/event/:id', () => {
    let testExpressEventId: number;

    beforeAll(async () => {
      // Create event with express request
      const event = await createTestEvent(testUserId, 'Anna Nagar', new Date(Date.now() + 24 * 60 * 60 * 1000));
      
      await prisma.expressRequest.create({
        data: {
          EventId: event.id,
          userId: testUserId,
          planType: ExpressPlanType.CUSTOMIZED,
          status: ExpressStatus.PENDING,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          expressFee: 0,
        },
      });
      
      testExpressEventId = event.id;
    });

    afterAll(async () => {
      // Cleanup
      await prisma.expressRequest.deleteMany({
        where: { EventId: testExpressEventId },
      });
      await prisma.event.delete({
        where: { id: testExpressEventId },
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/express/event/${testExpressEventId}`);

      expect(response.status).toBe(401);
    });

    it('should return 200 with null if express not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/express/event/999999')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(200);
      // NestJS serializes null to {} - accept either as valid "empty" response
      const isEmpty = response.body === null || 
        (typeof response.body === 'object' && Object.keys(response.body).length === 0);
      expect(isEmpty).toBe(true);
    });

    it('should return 403 if user does not own the express', async () => {
      const response = await request(app.getHttpServer())
        .get(`/express/event/${testExpressEventId}`)
        .set('Authorization', `Bearer ${otherUserAccessToken}`);

      expect(response.status).toBe(403);
    });

    it('should return express request if user owns it', async () => {
      const response = await request(app.getHttpServer())
        .get(`/express/event/${testExpressEventId}`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.EventId).toBe(testExpressEventId);
      expect(response.body.planType).toBe(ExpressPlanType.CUSTOMIZED);
    });
  });
});
