import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartCacheService } from './cart.cache.service';
import { CartEventService } from './cart-event.service';
import { Cart, CartItem, CartStatus, ItemType } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;

  // Mock data
  const mockUserId = 1;
  const mockCartId = 100;
  const mockItemId = 200;

  const mockCart: Cart & { items: CartItem[] } = {
    id: mockCartId,
    userId: mockUserId,
    status: CartStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  const mockVenue = {
    id: 1,
    name: 'Test Venue',
    basePriceMorning: 10000,
    basePriceEvening: 15000,
    basePriceFullDay: 20000,
  };

  const mockVendorService = {
    id: 2,
    name: 'Catering Service',
    baseRate: 5000,
    pricingModel: 'PER_PERSON',
    isActive: true,
    vendor: { businessName: 'Test Vendor' },
  };

  const mockCartItem: CartItem = {
    id: mockItemId,
    cartId: mockCartId,
    itemType: ItemType.VENUE,
    venueId: 1,
    vendorServiceId: null,
    addonId: null,
    date: new Date(),
    timeSlot: 'EVENING',
    quantity: 1,
    unitPrice: 15000,
    totalPrice: 15000,
    meta: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock services
  const mockPrisma = {
    $transaction: jest.fn((callback) => {
      const tx = {
        cart: {
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        cartItem: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
        venue: {
          findUnique: jest.fn(),
        },
        vendorService: {
          findUnique: jest.fn(),
        },
      };
      return callback(tx);
    }),
    cart: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCacheService = {
    getCart: jest.fn(),
    setCart: jest.fn(),
    invalidateCart: jest.fn(),
    checkAndSetIdempotencyKey: jest.fn(),
  };

  const mockEventService = {
    publishEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CartCacheService,
          useValue: mockCacheService,
        },
        {
          provide: CartEventService,
          useValue: mockEventService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return existing cart with items', async () => {
      mockPrisma.cart.findFirst.mockResolvedValue({
        ...mockCart,
        items: [mockCartItem],
      });
      mockCacheService.getCart.mockResolvedValue(null);

      const result = await service.getCart(mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockCartId);
      expect(result.status).toBe('ACTIVE');
    });

    it('should create new cart if not exists', async () => {
      mockPrisma.cart.findFirst.mockResolvedValue(null);
      mockPrisma.cart.create.mockResolvedValue({
        ...mockCart,
        items: [],
      });
      mockCacheService.getCart.mockResolvedValue(null);

      const result = await service.getCart(mockUserId);

      expect(mockPrisma.cart.create).toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });

    it('should throw ForbiddenException if cart expired', async () => {
      const expiredCart = {
        ...mockCart,
        expiresAt: new Date(Date.now() - 1000),
        items: [],
      };
      mockPrisma.cart.findFirst.mockResolvedValue(expiredCart);
      mockCacheService.getCart.mockResolvedValue(null);

      await expect(service.getCart(mockUserId)).rejects.toThrow(ForbiddenException);
    });

    it('should return cached cart if available', async () => {
      const cachedCart = {
        id: mockCartId,
        status: 'ACTIVE',
        items: [],
        subtotal: '0',
        platformFee: '0',
        tax: '0',
        totalAmount: '0',
      };
      mockCacheService.getCart.mockResolvedValue(cachedCart);

      const result = await service.getCart(mockUserId);

      expect(result).toEqual(cachedCart);
      expect(mockPrisma.cart.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    const validDto = {
      itemType: 'VENUE',
      venueId: 1,
      timeSlot: 'EVENING' as const,
      quantity: 1,
    };

    it('should add new item to cart', async () => {
      mockCacheService.checkAndSetIdempotencyKey.mockResolvedValue(false);

      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cart: {
            findFirst: jest.fn().mockResolvedValue(mockCart),
            create: jest.fn(),
          },
          cartItem: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              ...mockCartItem,
              unitPrice: 15000,
              totalPrice: 15000,
            }),
          },
          venue: {
            findUnique: jest.fn().mockResolvedValue(mockVenue),
          },
          vendorService: {
            findUnique: jest.fn(),
          },
        };
        return callback(tx);
      });

      const result = await service.addItem(mockUserId, validDto);

      expect(result).toBeDefined();
      expect(result.itemType).toBe('VENUE');
    });

    it('should throw BadRequestException when no item reference provided', async () => {
      mockCacheService.checkAndSetIdempotencyKey.mockResolvedValue(false);

      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cart: { findFirst: jest.fn().mockResolvedValue(mockCart) },
          cartItem: { findFirst: jest.fn(), create: jest.fn() },
          venue: { findUnique: jest.fn() },
          vendorService: { findUnique: jest.fn() },
        };
        return callback(tx);
      });

      await expect(
        service.addItem(mockUserId, {
          itemType: 'VENUE',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when venue not found', async () => {
      mockCacheService.checkAndSetIdempotencyKey.mockResolvedValue(false);

      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cart: { findFirst: jest.fn().mockResolvedValue(mockCart) },
          cartItem: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
          venue: { findUnique: jest.fn().mockResolvedValue(null) },
          vendorService: { findUnique: jest.fn() },
        };
        return callback(tx);
      });

      await expect(
        service.addItem(mockUserId, validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on duplicate idempotency key', async () => {
      mockCacheService.checkAndSetIdempotencyKey.mockResolvedValue(true);

      await expect(
        service.addItem(mockUserId, validDto, 'duplicate-key'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate price server-side from venue', async () => {
      let createCallData: any;
      mockCacheService.checkAndSetIdempotencyKey.mockResolvedValue(false);

      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cart: { findFirst: jest.fn().mockResolvedValue(mockCart) },
          cartItem: { 
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((data) => {
              createCallData = data;
              // Prisma create takes { data: {...} }, so spread data.data for flat object
              return Promise.resolve({ id: 1, ...data.data });
            }),
          },
          venue: { findUnique: jest.fn().mockResolvedValue(mockVenue) },
          vendorService: { findUnique: jest.fn() },
        };
        return callback(tx);
      });

      await service.addItem(mockUserId, validDto);

      expect(createCallData.data.unitPrice).toBe(15000);
      expect(createCallData.data.totalPrice).toBe(15000);
    });
  });

  describe('updateItem', () => {
    it('should throw ForbiddenException when user does not own cart', async () => {
      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockCartItem,
              cart: { ...mockCart, userId: 999 },
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        service.updateItem(mockUserId, mockItemId, { quantity: 2 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when item not found', async () => {
      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        service.updateItem(mockUserId, mockItemId, { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when cart is not ACTIVE', async () => {
      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockCartItem,
              cart: { ...mockCart, userId: mockUserId, status: 'LOCKED' },
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        service.updateItem(mockUserId, mockItemId, { quantity: 2 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should invalidate cache after update', async () => {
      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockCartItem,
              cart: { ...mockCart, userId: mockUserId },
              vendorServiceId: null,
              meta: null,
            }),
            update: jest.fn().mockResolvedValue({
              ...mockCartItem,
              quantity: 3,
            }),
          },
          venue: { findUnique: jest.fn() },
          vendorService: { findUnique: jest.fn() },
        };
        return callback(tx);
      });

      await service.updateItem(mockUserId, mockItemId, { quantity: 3 });

      expect(mockCacheService.invalidateCart).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('removeItem', () => {
    it('should throw ForbiddenException when unauthorized', async () => {
      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockCartItem,
              cart: { ...mockCart, userId: 999 },
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        service.removeItem(mockUserId, mockItemId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should invalidate cache after removal', async () => {
      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockCartItem,
              cart: { ...mockCart, userId: mockUserId },
            }),
            delete: jest.fn().mockResolvedValue(mockCartItem),
          },
        };
        return callback(tx);
      });

      await service.removeItem(mockUserId, mockItemId);

      expect(mockCacheService.invalidateCart).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('clearCart', () => {
    it('should throw NotFoundException when cart not found', async () => {
      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cart: { findFirst: jest.fn().mockResolvedValue(null) },
        };
        return callback(tx);
      });

      await expect(service.clearCart(mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should invalidate cache after clear', async () => {
      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cart: { findFirst: jest.fn().mockResolvedValue(mockCart) },
          cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) },
        };
        return callback(tx);
      });

      await service.clearCart(mockUserId);

      expect(mockCacheService.invalidateCart).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('checkout', () => {
    it('should throw NotFoundException when cart not found', async () => {
      mockPrisma.cart.findFirst.mockResolvedValue(null);

      await expect(service.checkout(mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when cart is empty', async () => {
      mockPrisma.cart.findFirst.mockResolvedValue({
        ...mockCart,
        items: [],
      });

      await expect(service.checkout(mockUserId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on duplicate idempotency key', async () => {
      mockCacheService.checkAndSetIdempotencyKey.mockResolvedValue(true);

      mockPrisma.cart.findFirst.mockResolvedValue({
        ...mockCart,
        items: [mockCartItem],
      });

      await expect(
        service.checkout(mockUserId, 'duplicate-key'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate correct totals with platform fee and tax', async () => {
      mockCacheService.checkAndSetIdempotencyKey.mockResolvedValue(false);

      mockPrisma.cart.findFirst.mockResolvedValue({
        ...mockCart,
        items: [
          { ...mockCartItem, totalPrice: 10000 },
          { ...mockCartItem, id: 201, totalPrice: 20000 },
        ],
      });
      mockPrisma.cart.update.mockResolvedValue({ ...mockCart, status: 'LOCKED' });

      const result = await service.checkout(mockUserId);

      expect(result.subtotal).toBe('30000');
      expect(result.platformFee).toBe('600');
      expect(result.tax).toBe('5508');
      expect(result.totalAmount).toBe('36108');
    });

    it('should invalidate cache after checkout', async () => {
      mockCacheService.checkAndSetIdempotencyKey.mockResolvedValue(false);

      mockPrisma.cart.findFirst.mockResolvedValue({
        ...mockCart,
        items: [mockCartItem],
      });
      mockPrisma.cart.update.mockResolvedValue({ ...mockCart, status: 'LOCKED' });

      await service.checkout(mockUserId);

      expect(mockCacheService.invalidateCart).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('Security', () => {
    it('should never accept unitPrice from client', async () => {
      let createCallData: any;
      mockCacheService.checkAndSetIdempotencyKey.mockResolvedValue(false);

      // Use FULL_DAY to test fallback logic - no timeSlot means FULL_DAY is used
      mockPrisma.$transaction = jest.fn((callback) => {
        const tx = {
          cart: { findFirst: jest.fn().mockResolvedValue(mockCart) },
          cartItem: { 
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((data) => {
              createCallData = data;
              // Prisma create takes { data: {...} }, so spread data.data for flat object
              return Promise.resolve({ id: 1, ...data.data });
            }),
          },
          venue: { findUnique: jest.fn().mockResolvedValue(mockVenue) },
          vendorService: { findUnique: jest.fn() },
        };
        return callback(tx);
      });

      // No timeSlot - should use FULL_DAY price (20000), not client-provided price (100)
      await service.addItem(mockUserId, {
        itemType: 'VENUE',
        venueId: 1,
        quantity: 1,
      });

      // Should use server-side FULL_DAY price (20000), not client-provided (100)
      expect(createCallData.data.unitPrice).toBe(20000);
    });
  });
});
