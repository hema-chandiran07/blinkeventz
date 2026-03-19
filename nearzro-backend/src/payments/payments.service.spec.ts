// src/payments/payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { forwardRef, Inject } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CartService } from '../cart/cart.service';
import { 
  BadRequestException, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { PaymentStatus, CartStatus, PaymentProvider } from '@prisma/client';

// ============================================================
// MOCKS
// ============================================================

const mockPrisma = {
  payment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  cart: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  cartItem: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
  paymentEvent: {
    create: jest.fn(),
  },
};

const mockRazorpay = {
  orders: {
    create: jest.fn().mockResolvedValue({
      id: 'order_test_123',
      amount: 10000,
      currency: 'INR',
    }),
    fetch: jest.fn().mockResolvedValue({
      id: 'order_test_123',
      status: 'paid',
    }),
  },
  payments: {
    fetch: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      RAZORPAY_KEY_ID: 'rzp_test_123',
      RAZORPAY_KEY_SECRET: 'test_secret',
      RAZORPAY_WEBHOOK_SECRET: 'webhook_secret',
      NODE_ENV: 'development',
    };
    return config[key];
  }),
};

const mockCartService = {
  releaseCartLock: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
};

// ============================================================
// TEST SUITE
// ============================================================

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'RAZORPAY_CLIENT', useValue: mockRazorpay },
        { provide: ConfigService, useValue: mockConfigService },
        // Provide CartService as a factory to handle forwardRef
        {
          provide: CartService,
          useFactory: () => mockCartService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('✅ createOrder - POSITIVE TESTS', () => {
    const userId = 1;
    const cartId = 1;
    const dto = { cartId, idempotencyKey: 'idem_123' };

    const mockCart = {
      id: cartId,
      userId,
      status: CartStatus.ACTIVE,
      items: [{ id: 1, totalPrice: 100 }],
    };

    it('should create a payment order successfully', async () => {
      // Arrange
      const txMock = {
        cart: {
          findUnique: jest.fn().mockResolvedValue(mockCart),
          update: jest.fn().mockResolvedValue({}),
        },
        payment: {
          create: jest.fn().mockResolvedValue({
            id: 1,
            providerOrderId: 'order_test_123',
            amount: 10000,
            status: PaymentStatus.CREATED,
            expiresAt: new Date(),
            idempotencyKey: 'idem_123',
            cartId: 1,
            userId: 1,
          }),
        },
        paymentEvent: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async () => {
        // Simulate what the service expects: returns { payment, isNew }
        const payment = await txMock.payment.create();
        return { payment, isNew: true };
      });

      // Act
      const result = await service.createOrder(userId, dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('order_test_123');
    });

    it('should return existing payment for duplicate idempotency key', async () => {
      // Arrange
      const existingPayment = {
        id: 1,
        providerOrderId: 'order_existing',
        amount: 10000,
        status: PaymentStatus.CREATED,
        idempotencyKey: 'idem_123',
      };
      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);

      // Act
      const result = await service.createOrder(userId, dto);

      // Assert
      expect(result.id).toBe('order_existing');
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should return existing pending payment if not expired', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const existingPendingPayment = {
        id: 1,
        providerOrderId: 'order_existing',
        amount: 10000,
        status: PaymentStatus.CREATED,
        expiresAt: futureDate,
        idempotencyKey: null,
      };
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.payment.findFirst.mockResolvedValue(existingPendingPayment);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return { payment: existingPendingPayment, isNew: false };
      });

      // Act
      const result = await service.createOrder(userId, dto);

      // Assert
      expect(result.id).toBe('order_existing');
    });
  });

  describe('❌ createOrder - NEGATIVE TESTS', () => {
    const userId = 1;
    const cartId = 1;
    const dto = { cartId, idempotencyKey: 'idem_123' };

    const mockCart = {
      id: cartId,
      userId,
      status: CartStatus.ACTIVE,
      items: [{ id: 1, totalPrice: 100 }],
    };

    it('should throw BadRequestException for invalid cart', async () => {
      // Arrange
      const txMock = {
        cart: {
          findUnique: jest.fn().mockResolvedValue(null), // Cart not found
        },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      // Act & Assert
      await expect(service.createOrder(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for cart not owned by user', async () => {
      // Arrange
      const otherUserCart = { ...mockCart, userId: 999 };
      const txMock = {
        cart: {
          findUnique: jest.fn().mockResolvedValue(otherUserCart), // Different user
        },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      // Act & Assert
      await expect(service.createOrder(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-active cart', async () => {
      // Arrange
      const lockedCart = { ...mockCart, status: CartStatus.LOCKED };
      const txMock = {
        cart: {
          findUnique: jest.fn().mockResolvedValue(lockedCart),
        },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      // Act & Assert
      await expect(service.createOrder(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty cart', async () => {
      // Arrange
      const emptyCart = { ...mockCart, items: [] };
      const txMock = {
        cart: {
          findUnique: jest.fn().mockResolvedValue(emptyCart),
        },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      // Act & Assert
      await expect(service.createOrder(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid amount (zero)', async () => {
      // Arrange - This test verifies zero amount rejection (fintech requirement)
      // Note: The actual validation is added as part of production hardening
      const zeroAmountCart = { ...mockCart, items: [{ id: 1, price: 100, quantity: 1, totalPrice: 0 }] };
      const txMock = {
        cart: {
          findUnique: jest.fn().mockResolvedValue(zeroAmountCart),
        },
        payment: {
          findFirst: jest.fn().mockResolvedValue(null), // No existing pending payment
        },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      // Act & Assert - Service now has zero amount validation
      await expect(service.createOrder(userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // CONFIRM PAYMENT TESTS
  // ============================================================

  describe('✅ confirmPayment - POSITIVE TESTS', () => {
    const userId = 1;
    const dto = {
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
      razorpaySignature: 'valid_signature',
    };

    const mockPayment = {
      id: 1,
      userId,
      cartId: 1,
      providerOrderId: 'order_test_123',
      status: PaymentStatus.CREATED,
      cart: { id: 1, userId },
    };

    it('should confirm payment successfully', async () => {
      // Arrange
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          payment: {
            update: jest.fn().mockResolvedValue({ ...mockPayment, status: PaymentStatus.CAPTURED }),
          },
          cart: {
            update: jest.fn().mockResolvedValue({}),
          },
          paymentEvent: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await service.confirmPayment(userId, dto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(PaymentStatus.CAPTURED);
    });

    it('should return success for already captured payment (idempotent)', async () => {
      // Arrange
      const alreadyCapturedPayment = { 
        ...mockPayment, 
        status: PaymentStatus.CAPTURED 
      };
      mockPrisma.payment.findUnique.mockResolvedValue(alreadyCapturedPayment);

      // Act
      const result = await service.confirmPayment(userId, dto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment already confirmed');
    });
  });

  describe('❌ confirmPayment - NEGATIVE TESTS', () => {
    const userId = 1;
    const dto = {
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
      razorpaySignature: 'valid_signature',
    };

    const mockPayment = {
      id: 1,
      userId,
      cartId: 1,
      providerOrderId: 'order_test_123',
      status: PaymentStatus.CREATED,
      cart: { id: 1, userId },
    };

    it('should throw NotFoundException for non-existent payment', async () => {
      // Arrange
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.confirmPayment(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for payment owned by different user', async () => {
      // Arrange
      const otherUserPayment = { ...mockPayment, userId: 999 };
      mockPrisma.payment.findUnique.mockResolvedValue(otherUserPayment);

      // Act & Assert
      await expect(service.confirmPayment(userId, dto)).rejects.toThrow(BadRequestException);
    });

    // Security fix: Prevent re-confirming failed payments (fintech requirement)
    it('should throw BadRequestException for failed payment', async () => {
      // Arrange
      const failedPayment = {
        ...mockPayment,
        status: PaymentStatus.FAILED,
        userId,
      };
      mockPrisma.payment.findUnique.mockResolvedValue(failedPayment);
      const dto = { 
        razorpayOrderId: 'order_test_123', 
        razorpayPaymentId: 'pay_test_123',
        razorpaySignature: 'test_signature' 
      };

      // Act & Assert
      await expect(service.confirmPayment(userId, dto)).rejects.toThrow(
        'Cannot confirm a failed payment',
      );
    });
  });

  // ============================================================
  // WEBHOOK TESTS
  // ============================================================

  describe('✅ handleWebhook - POSITIVE TESTS', () => {
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_123',
            order_id: 'order_test_123',
            status: 'captured',
            amount: 10000,
            currency: 'INR',
          },
        },
      },
    };

    const mockPayment = {
      id: 1,
      providerOrderId: 'order_test_123',
      cartId: 1,
      userId: 1,
      status: PaymentStatus.CREATED,
    };

    it('should process webhook successfully', async () => {
      // Arrange
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          payment: {
            update: jest.fn().mockResolvedValue({}),
          },
          cart: {
            update: jest.fn().mockResolvedValue({}),
          },
          paymentEvent: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await service.handleWebhook(webhookPayload as any);

      // Assert
      expect(result.processed).toBe(true);
    });

    it('should process payment.failed webhook', async () => {
      // Arrange
      const failedPayload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              order_id: 'order_test_123',
              status: 'failed',
              amount: 10000,
              currency: 'INR',
            },
          },
        },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          payment: {
            update: jest.fn().mockResolvedValue({}),
          },
          cart: {
            update: jest.fn().mockResolvedValue({}),
          },
          paymentEvent: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await service.handleWebhook(failedPayload as any);

      // Assert
      expect(result.processed).toBe(true);
    });
  });

  describe('❌ handleWebhook - NEGATIVE TESTS', () => {
    const mockPayment = {
      id: 1,
      providerOrderId: 'order_test_123',
      cartId: 1,
      userId: 1,
      status: PaymentStatus.CREATED,
    };

    it('should reject duplicate webhook events', async () => {
      // Arrange
      const paymentWithEventId = {
        ...mockPayment,
        providerWebhookEventId: 'pay_test_123',
      };
      mockPrisma.payment.findFirst.mockResolvedValue(paymentWithEventId);

      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              order_id: 'order_test_123',
              status: 'captured',
              amount: 10000,
              currency: 'INR',
            },
          },
        },
      };

      // Act
      const result = await service.handleWebhook(webhookPayload as any);

      // Assert
      expect(result.processed).toBe(true);
      expect(result.message).toBe('Event already processed');
    });

    it('should reject invalid state transition', async () => {
      // Arrange
      // Payment is already CAPTURED, webhook tries to capture again
      const capturedPayment = {
        ...mockPayment,
        status: PaymentStatus.CAPTURED,
      };
      mockPrisma.payment.findUnique.mockResolvedValue(capturedPayment);

      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              order_id: 'order_test_123',
              status: 'captured',
              amount: 10000,
              currency: 'INR',
            },
          },
        },
      };

      // Act
      const result = await service.handleWebhook(webhookPayload as any);

      // Assert
      expect(result.processed).toBe(false);
      expect(result.message).toBe('Invalid state transition');
    });

    it('should handle payment not found', async () => {
      // Arrange
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_nonexistent',
              order_id: 'order_nonexistent',
              status: 'captured',
              amount: 10000,
              currency: 'INR',
            },
          },
        },
      };

      // Act
      const result = await service.handleWebhook(webhookPayload as any);

      // Assert
      expect(result.processed).toBe(false);
      expect(result.message).toBe('Payment not found');
    });
  });

  // ============================================================
  // GET PAYMENT STATUS TESTS
  // ============================================================

  describe('✅ getPaymentStatus - POSITIVE TESTS', () => {
    it('should return payment status for owner', async () => {
      // Arrange
      const userId = 1;
      const mockPayment = {
        id: 1,
        userId,
        providerOrderId: 'order_test_123',
        providerPaymentId: 'pay_test_123',
        status: PaymentStatus.CAPTURED,
        amount: 10000,
        currency: 'INR',
        createdAt: new Date(),
        completedAt: new Date(),
      };
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await service.getPaymentStatus(1, userId);

      // Assert
      expect(result.status).toBe(PaymentStatus.CAPTURED);
    });
  });

  describe('❌ getPaymentStatus - NEGATIVE TESTS', () => {
    it('should throw NotFoundException for non-existent payment', async () => {
      // Arrange
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPaymentStatus(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for payment owned by different user', async () => {
      // Arrange
      const mockPayment = {
        id: 1,
        userId: 999,
        providerOrderId: 'order_test_123',
        status: PaymentStatus.CAPTURED,
        amount: 10000,
        currency: 'INR',
        createdAt: new Date(),
      };
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(service.getPaymentStatus(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // GET PAYMENT BY ORDER ID TESTS
  // ============================================================

  describe('✅ getPaymentByOrderId - POSITIVE TESTS', () => {
    it('should return payment for owner', async () => {
      // Arrange
      const userId = 1;
      const mockPayment = {
        id: 1,
        userId,
        providerOrderId: 'order_test_123',
        cart: { id: 1, userId },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await service.getPaymentByOrderId('order_test_123', userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.providerOrderId).toBe('order_test_123');
    });
  });

  describe('❌ getPaymentByOrderId - NEGATIVE TESTS', () => {
    it('should throw NotFoundException for non-existent order', async () => {
      // Arrange
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPaymentByOrderId('nonexistent', 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for order owned by different user', async () => {
      // Arrange
      const mockPayment = {
        id: 1,
        userId: 999,
        providerOrderId: 'order_test_123',
        cart: { id: 1, userId: 999 },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(service.getPaymentByOrderId('order_test_123', 1)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // PROCESS EXPIRED PAYMENTS TESTS
  // ============================================================

  describe('✅ processExpiredPayments', () => {
    it('should process expired payments', async () => {
      // Arrange
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.payment.findMany.mockResolvedValue([
        { id: 1, cartId: 1, providerOrderId: 'order_1' },
        { id: 2, cartId: 2, providerOrderId: 'order_2' },
      ]);
      mockPrisma.cart.update.mockResolvedValue({});

      // Act
      const result = await service.processExpiredPayments();

      // Assert
      expect(result).toBe(2);
    });

    it('should return 0 when no expired payments', async () => {
      // Arrange
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.payment.findMany.mockResolvedValue([]);

      // Act
      const result = await service.processExpiredPayments();

      // Assert
      expect(result).toBe(0);
    });
  });

  // ============================================================
  // RELEASE CART LOCK TESTS
  // ============================================================

  describe('✅ releaseCartLock', () => {
    it('should release cart lock', async () => {
      // Arrange
      mockPrisma.cart.update.mockResolvedValue({ id: 1, status: CartStatus.ACTIVE });

      // Act
      await service.releaseCartLock(1);

      // Assert
      expect(mockPrisma.cart.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: CartStatus.ACTIVE },
      });
    });
  });

  // ============================================================
  // CREATE ORDER SIMPLE TESTS
  // ============================================================

  describe('✅ createOrderSimple', () => {
    it('should create simplified payment order', async () => {
      // Arrange
      const dto = {
        amount: 599,
        currency: 'INR',
        idempotencyKey: 'simple_123',
      };
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({
        id: 1,
        providerOrderId: 'order_mock_123',
        amount: 59900,
        status: PaymentStatus.CREATED,
        expiresAt: new Date(),
      });

      // Act
      const result = await service.createOrderSimple(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.amount).toBe(59900);
    });

    it('should return existing payment for duplicate idempotency key', async () => {
      // Arrange
      const dto = {
        amount: 599,
        idempotencyKey: 'simple_123',
      };
      const existingPayment = {
        id: 1,
        providerOrderId: 'order_existing',
        amount: 59900,
        status: PaymentStatus.CREATED,
      };
      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);

      // Act
      const result = await service.createOrderSimple(dto);

      // Assert
      expect(result.id).toBe('order_existing');
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });
  });
});
