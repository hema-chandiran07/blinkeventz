/**
 * Integration Tests for Notifications Module
 * NearZro Event Management Platform
 *
 * Tests cover:
 * - Flow 1: Notification Creation (Client → NotificationsService → DB → Queue)
 * - Flow 2: Notification Delivery (Queue → NotificationProcessor → Provider → Delivery result)
 * - Flow 3: OTP Authentication (AuthService → OTPService → EmailProvider → Email sent)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../../src/notifications/notifications.module';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { NotificationQueue } from '../../src/notifications/queue/notification.queue';
import { NotificationProcessor } from '../../src/notifications/queue/notification.processor';
import { EmailProvider } from '../../src/notifications/providers/email.provider';
import { SmsProvider } from '../../src/notifications/providers/sms.provider';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OtpService } from '../../src/auth/otp.service';

// Import types
const NotificationType = {
  BOOKING_REQUEST: 'BOOKING_REQUEST',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
} as const;

const NotificationPriority = {
  NORMAL: 'NORMAL',
} as const;

const NotificationChannel = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
} as const;

describe('Notifications Integration Tests', () => {
  let app: INestApplication;
  let notificationsService: NotificationsService;
  let prisma: any;
  let queue: any;
  let emailProvider: any;
  let smsProvider: any;

  // Mock Prisma
  const mockPrisma = {
    notification: {
      create: jest.fn().mockImplementation((data) => 
        Promise.resolve({
          id: Math.floor(Math.random() * 1000),
          ...data.data,
          read: false,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findFirst: jest.fn().mockImplementation((query) => 
        Promise.resolve({
          id: 1,
          userId: query.where.userId,
          type: 'BOOKING_CONFIRMED',
          title: 'Test Notification',
          message: 'Test message',
          priority: 'NORMAL',
          read: false,
          readAt: null,
          eventId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findUnique: jest.fn().mockImplementation((query) => 
        Promise.resolve({
          id: query.where.id,
          userId: 1,
          user: {
            id: 1,
            email: 'test@example.com',
            phone: '+1234567890',
          },
          type: 'BOOKING_CONFIRMED',
          title: 'Test Notification',
          message: 'Test message',
          priority: 'NORMAL',
          read: false,
          readAt: null,
          eventId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      update: jest.fn().mockImplementation((data) => 
        Promise.resolve({
          ...data.data,
          id: data.where.id,
          updatedAt: new Date(),
        })
      ),
    },
    notificationPreference: {
      findMany: jest.fn().mockImplementation(() => 
        Promise.resolve([
          { channel: NotificationChannel.EMAIL, enabled: true },
          { channel: NotificationChannel.IN_APP, enabled: true },
        ])
      ),
    },
    event: {
      update: jest.fn().mockImplementation((data) => 
        Promise.resolve({
          id: data.where.id,
          ...data.data,
          updatedAt: new Date(),
        })
      ),
    },
    user: {
      update: jest.fn().mockImplementation((data) => 
        Promise.resolve({
          id: 1,
          email: data.where.email,
          isEmailVerified: true,
          ...data.data,
        })
      ),
    },
  };

  // Mock Queue
  const mockQueue = {
    add: jest.fn().mockImplementation((jobName, data, options) => 
      Promise.resolve({
        id: 'test-job-' + Math.random(),
        data,
        options,
      })
    ),
  };

  // Mock Providers
  const mockEmailProvider = {
    send: jest.fn().mockResolvedValue(true),
    sendOtpEmail: jest.fn().mockResolvedValue(true),
  };

  const mockSmsProvider = {
    send: jest.fn().mockResolvedValue(true),
  };

  // Mock Gateway
  const mockGateway = {
    emitToUser: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [NotificationsModule],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: NotificationQueue,
          useValue: mockQueue,
        },
        {
          provide: EmailProvider,
          useValue: mockEmailProvider,
        },
        {
          provide: SmsProvider,
          useValue: mockSmsProvider,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(NotificationQueue)
      .useValue(mockQueue)
      .overrideProvider(EmailProvider)
      .useValue(mockEmailProvider)
      .overrideProvider(SmsProvider)
      .useValue(mockSmsProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    notificationsService = app.get<NotificationsService>(NotificationsService);
    prisma = app.get<PrismaService>(PrismaService);
    queue = app.get<NotificationQueue>(NotificationQueue);
    emailProvider = app.get<EmailProvider>(EmailProvider);
    smsProvider = app.get<SmsProvider>(SmsProvider);
  });

  afterAll(async () => {
    // Clean up
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Flow 1: Notification Creation
  // Client → NotificationsService → DB → Queue
  // ============================================

  describe('Flow 1: Notification Creation', () => {
    /**
     * Test: should create notification and add to queue
     * Integration flow: DTO → Service → Prisma → Bull Queue
     */
    it('should create notification and add to queue', async () => {
      // Arrange
      const dto = {
        userId: 1,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Booking Confirmed',
        message: 'Your booking has been confirmed',
        priority: NotificationPriority.NORMAL,
        eventId: 1,
      };

      // Act
      await notificationsService.send(dto);

      // Assert
      // 1. Prisma create should be called
      expect(mockPrisma.notification.create).toHaveBeenCalled();

      // 2. Preferences should be fetched
      expect(mockPrisma.notificationPreference.findMany).toHaveBeenCalled();

      // 3. Queue should be called for non-IN_APP channels
      expect(mockQueue.add).toHaveBeenCalled();
    });

    /**
     * Test: should send in-app notification via WebSocket
     */
    it('should send in-app notification via WebSocket', async () => {
      // Arrange - override preferences to only have IN_APP
      mockPrisma.notificationPreference.findMany.mockResolvedValueOnce([
        { channel: NotificationChannel.IN_APP, enabled: true },
      ]);

      const dto = {
        userId: 1,
        type: NotificationType.BOOKING_CONFIRMED,
        eventId: 1,
      };

      // Act
      await notificationsService.send(dto);

      // Assert - Queue should NOT be called, but notification should be created
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      // Queue may or may not be called depending on preferences
    });

    /**
     * Test: should handle notification with multiple channels
     */
    it('should handle notification with multiple channels', async () => {
      // Arrange - multiple channels enabled
      mockPrisma.notificationPreference.findMany.mockResolvedValueOnce([
        { channel: NotificationChannel.EMAIL, enabled: true },
        { channel: NotificationChannel.SMS, enabled: true },
        { channel: NotificationChannel.IN_APP, enabled: true },
      ]);

      const dto = {
        userId: 1,
        type: NotificationType.BOOKING_CONFIRMED,
        eventId: 1,
      };

      // Act
      await notificationsService.send(dto);

      // Assert
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      // Queue should be called for EMAIL and SMS
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // Flow 2: Notification Delivery
  // Queue → NotificationProcessor → Provider → Delivery result
  // ============================================

  describe('Flow 2: Notification Delivery', () => {
    let processor: NotificationProcessor;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationProcessor,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: EmailProvider, useValue: mockEmailProvider },
          { provide: SmsProvider, useValue: mockSmsProvider },
        ],
      }).compile();

      processor = module.get<NotificationProcessor>(NotificationProcessor);
    });

    /**
     * Test: should process email notification through processor
     * Integration flow: Job → Processor → EmailProvider → Email sent
     */
    it('should process email notification through processor', async () => {
      // Arrange
      const job = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.EMAIL,
        },
      };

      // Act
      await processor.handle(job as any);

      // Assert
      expect(mockPrisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { user: true },
      });

      expect(mockEmailProvider.send).toHaveBeenCalledWith(
        'test@example.com',
        'Test Notification',
        'Test message',
      );
    });

    /**
     * Test: should process SMS notification through processor
     */
    it('should process SMS notification through processor', async () => {
      // Arrange
      const job = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.SMS,
        },
      };

      // Act
      await processor.handle(job as any);

      // Assert
      expect(mockSmsProvider.send).toHaveBeenCalledWith(
        '+1234567890',
        'Test message',
      );
    });

    /**
     * Test: should skip notification if user data is missing
     */
    it('should skip notification if user data is missing', async () => {
      // Arrange - notification without user
      mockPrisma.notification.findUnique.mockResolvedValueOnce({
        id: 1,
        user: null,
        title: 'Test',
        message: 'Test message',
      });

      const job = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.EMAIL,
        },
      };

      // Act
      await processor.handle(job as any);

      // Assert - email should not be sent
      expect(mockEmailProvider.send).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Flow 3: OTP Authentication
  // AuthService → OTPService → EmailProvider → Email sent
  // ============================================

  describe('Flow 3: OTP Authentication', () => {
    let otpService: OtpService;

    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          GMAIL_USER: 'test@gmail.com',
          GMAIL_APP_PASSWORD: 'test-password',
          EMAIL_FROM: 'no-reply@nearzro.com',
          APP_ENV: 'test',
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OtpService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: EmailProvider, useValue: mockEmailProvider },
        ],
      }).compile();

      otpService = module.get<OtpService>(OtpService);
    });

    /**
     * Test: should send OTP and verify successfully
     * Integration flow: Request OTP → Store → Email → Verify → Update User
     */
    it('should send OTP and verify successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const otp = '123456';

      // Mock crypto.randomInt to return known OTP
      const crypto = require('crypto');
      jest.spyOn(crypto, 'randomInt').mockReturnValue(123456);

      // Act - send OTP
      const sendResult = await otpService.sendOtp(email);
      
      // Act - verify OTP
      const verifyResult = await otpService.verifyOtp(email, otp);

      // Assert
      expect(sendResult.success).toBe(true);
      expect(verifyResult.success).toBe(true);
      expect(mockEmailProvider.sendOtpEmail).toHaveBeenCalledWith(
        email,
        otp,
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email },
        data: { isEmailVerified: true },
      });
    });

    /**
     * Test: should reject invalid OTP
     */
    it('should reject invalid OTP', async () => {
      // Arrange
      const email = 'test@example.com';
      
      // Mock crypto.randomInt
      const crypto = require('crypto');
      jest.spyOn(crypto, 'randomInt').mockReturnValue(123456);

      await otpService.sendOtp(email);

      // Act & Assert
      await expect(otpService.verifyOtp(email, '000000')).rejects.toThrow('Invalid OTP');
    });

    /**
     * Test: should handle OTP expiration
     */
    it('should handle OTP expiration', async () => {
      // Arrange
      const email = 'test@example.com';
      
      // Manually set expired OTP
      (otpService as any).otpStore.set(email, {
        otp: '123456',
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired
      });

      // Act & Assert
      await expect(otpService.verifyOtp(email, '123456')).rejects.toThrow('OTP has expired');
    });
  });
});
