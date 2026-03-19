import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Cart, CartStatus, ItemType, VenueType, VenueStatus } from '@prisma/client';

type SuperTestRequest = ReturnType<typeof supertest>;

describe('CartController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let request: SuperTestRequest;

  // Test data
  const testUserId = 1;
  const otherUserId = 2;

  let testCart: Cart;

  const mockVenue = {
    id: 9999,
    name: 'Test Venue',
    basePriceMorning: 10000,
    basePriceEvening: 15000,
    basePriceFullDay: 20000,
    ownerId: 100,
    type: 'Banquet Hall' as VenueType,
    description: 'Test description',
    address: 'Test address',
    city: 'Test city',
    area: 'Test area',
    pincode: '123456',
    capacityMin: 50,
    capacityMax: 500,
    status: 'APPROVED' as VenueStatus,
    amenities: null,
    policies: null,
    username: null,
    rejectionReason: null,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Generate valid JWT token
  const getAuthToken = (userId: number) => {
    return jwtService.sign({ userId, email: 'test@example.com', role: 'CUSTOMER' });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    
    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    await app.init();
    
    request = supertest(app.getHttpServer());

    // Setup test data
    testCart = await prisma.cart.upsert({
      where: { id: 9999 },
      update: {},
      create: {
        id: 9999,
        userId: testUserId,
        status: CartStatus.ACTIVE,
      },
    });

    // Create test venue
    await prisma.venue.upsert({
      where: { id: 9999 },
      update: {},
      create: mockVenue,
    });
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany({
      where: { cartId: { in: [testCart.id, 9998] } },
    });
    await prisma.cart.deleteMany({
      where: { id: { in: [testCart.id, 9998] } },
    });
    await app.close();
  });

  describe('GET /cart', () => {
    it('should return 401 without auth token', async () => {
      const response = await request.get('/cart').expect(401);
      expect(response.status).toBe(401);
    });

    it('should return existing cart with items', async () => {
      const token = getAuthToken(testUserId);

      const response = await request
        .get('/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('items');
    });
  });

  describe('POST /cart/items', () => {
    it('should return 401 without auth token', async () => {
      const response = await request
        .post('/cart/items')
        .send({ itemType: 'VENUE', venueId: 1 });
      expect(response.status).toBe(401);
    });

    it('should add item to cart', async () => {
      const token = getAuthToken(testUserId);

      const response = await request
        .post('/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          itemType: 'VENUE',
          venueId: 9999,
          timeSlot: 'EVENING',
          quantity: 1,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('should throw 400 when no item reference provided', async () => {
      const token = getAuthToken(testUserId);

      const response = await request
        .post('/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          itemType: 'VENUE',
          quantity: 1,
        });
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /cart/clear', () => {
    it('should return 401 without auth token', async () => {
      const response = await request.delete('/cart/clear');
      expect(response.status).toBe(401);
    });

    it('should clear cart items', async () => {
      const token = getAuthToken(testUserId);

      const response = await request
        .delete('/cart/clear')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should not allow accessing other users cart items', async () => {
      // Create cart for other user
      const otherCart = await prisma.cart.create({
        data: {
          id: 9998,
          userId: otherUserId,
          status: CartStatus.ACTIVE,
        },
      });

      const otherItem = await prisma.cartItem.create({
        data: {
          cartId: otherCart.id,
          itemType: ItemType.VENUE,
          venueId: 9999,
          quantity: 1,
          unitPrice: 15000,
          totalPrice: 15000,
        },
      });

      const token = getAuthToken(testUserId);

      // Try to modify other user's item
      const response = await request
        .patch(`/cart/items/${otherItem.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 5 });
      
      expect(response.status).toBe(403);
    });
  });
});
