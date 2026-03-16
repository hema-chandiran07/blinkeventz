/**
 * Unit Tests for NotificationProcessor
 * NearZro Event Management Platform
 *
 * Tests cover:
 * - Positive test scenarios (job processing)
 * - Negative test scenarios (provider failures, retries)
 * - Edge cases (missing user data, unsupported channels)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationProcessor } from './notification.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { WhatsappProvider } from '../providers/whatsapp.provider';

// Import types
const NotificationChannel = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  PUSH: 'PUSH',
} as const;

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let prisma: any;
  let emailProvider: any;
  let smsProvider: any;
  let whatsappProvider: any;

  // Mock Prisma
  const mockPrisma = {
    notification: {
      findUnique: jest.fn(),
    },
  };

  // Mock EmailProvider
  const mockEmailProvider = {
    send: jest.fn().mockResolvedValue(true),
  };

  // Mock SmsProvider
  const mockSmsProvider = {
    send: jest.fn().mockResolvedValue(true),
  };

  // Mock WhatsappProvider
  const mockWhatsappProvider = {
    send: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailProvider, useValue: mockEmailProvider },
        { provide: SmsProvider, useValue: mockSmsProvider },
        { provide: WhatsappProvider, useValue: mockWhatsappProvider },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    prisma = module.get<PrismaService>(PrismaService);
    emailProvider = module.get<EmailProvider>(EmailProvider);
    smsProvider = module.get<SmsProvider>(SmsProvider);
    whatsappProvider = module.get<WhatsappProvider>(WhatsappProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Setup', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
    });

    it('should have PrismaService injected', () => {
      expect(prisma).toBeDefined();
    });

    it('should have EmailProvider injected', () => {
      expect(emailProvider).toBeDefined();
    });

    it('should have SmsProvider injected', () => {
      expect(smsProvider).toBeDefined();
    });
  });

  // ============================================
  // POSITIVE TEST CASES
  // ============================================

  describe('handle() - Positive Test Cases', () => {
    /**
     * Test: should process EMAIL notification successfully
     */
    it('should process EMAIL notification successfully', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.EMAIL,
        },
      };

      const mockNotification = {
        id: 1,
        user: {
          email: 'test@example.com',
          phone: null,
        },
        title: 'Test Notification',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert
      expect(prisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { user: true },
      });

      expect(emailProvider.send).toHaveBeenCalledWith(
        'test@example.com',
        'Test Notification',
        'Test message',
      );
    });

    /**
     * Test: should process SMS notification successfully
     */
    it('should process SMS notification successfully', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.SMS,
        },
      };

      const mockNotification = {
        id: 1,
        user: {
          email: null,
          phone: '+1234567890',
        },
        title: 'Test Notification',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert
      expect(smsProvider.send).toHaveBeenCalledWith(
        '+1234567890',
        'Test message',
      );
    });

    /**
     * Test: should process WHATSAPP notification successfully
     */
    it('should process WHATSAPP notification successfully', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.WHATSAPP,
        },
      };

      const mockNotification = {
        id: 1,
        user: {
          email: null,
          phone: '+1234567890',
        },
        title: 'Test Notification',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert
      expect(whatsappProvider.send).toHaveBeenCalledWith(
        '+1234567890',
        'Test message',
      );
    });

    /**
     * Test: should route notification to correct provider
     * Validates that different channels use correct providers
     */
    it('should route notification to correct provider', async () => {
      // Arrange - EMAIL job
      const emailJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.EMAIL,
        },
      };

      const mockNotification = {
        id: 1,
        user: { email: 'test@example.com', phone: null },
        title: 'Test',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(emailJob as any);

      // Assert - EMAIL provider called, others not
      expect(emailProvider.send).toHaveBeenCalled();
      expect(smsProvider.send).not.toHaveBeenCalled();
      expect(whatsappProvider.send).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // NEGATIVE TEST CASES
  // ============================================

  describe('handle() - Negative Test Cases', () => {
    /**
     * Test: should handle missing notification gracefully
     */
    it('should handle missing notification gracefully', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 999,
          channel: NotificationChannel.EMAIL,
        },
      };

      mockPrisma.notification.findUnique.mockResolvedValue(null);

      // Act
      await processor.handle(mockJob as any);

      // Assert - should not throw, just return
      expect(emailProvider.send).not.toHaveBeenCalled();
    });

    /**
     * Test: should handle missing user data gracefully
     */
    it('should handle missing user data gracefully', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.EMAIL,
        },
      };

      // Notification without user
      const mockNotification = {
        id: 1,
        user: null,
        title: 'Test',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert
      expect(emailProvider.send).not.toHaveBeenCalled();
    });

    /**
     * Test: should skip EMAIL if user has no email
     */
    it('should skip EMAIL if user has no email', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.EMAIL,
        },
      };

      const mockNotification = {
        id: 1,
        user: {
          email: null,
          phone: null,
        },
        title: 'Test',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert
      expect(emailProvider.send).not.toHaveBeenCalled();
    });

    /**
     * Test: should skip SMS if user has no phone
     */
    it('should skip SMS if user has no phone', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.SMS,
        },
      };

      const mockNotification = {
        id: 1,
        user: {
          email: 'test@example.com',
          phone: null,
        },
        title: 'Test',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert
      expect(smsProvider.send).not.toHaveBeenCalled();
    });

    /**
     * Test: should log provider failure
     * Note: In the current implementation, errors are thrown
     */
    it('should throw error when provider fails', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.EMAIL,
        },
      };

      const mockNotification = {
        id: 1,
        user: { email: 'test@example.com' },
        title: 'Test',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      emailProvider.send.mockRejectedValueOnce(new Error('SMTP failed'));

      // Act & Assert
      await expect(processor.handle(mockJob as any)).rejects.toThrow('SMTP failed');
    });
  });

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('handle() - Edge Cases', () => {
    /**
     * Test: should handle PUSH channel (currently not implemented)
     */
    it('should handle PUSH channel gracefully', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.PUSH,
        },
      };

      const mockNotification = {
        id: 1,
        user: { email: 'test@example.com', phone: '+1234567890' },
        title: 'Test',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert - PUSH is not implemented, so no provider should be called
      expect(emailProvider.send).not.toHaveBeenCalled();
      expect(smsProvider.send).not.toHaveBeenCalled();
      expect(whatsappProvider.send).not.toHaveBeenCalled();
    });

    /**
     * Test: should handle notification with missing title
     */
    it('should handle notification with missing title', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.EMAIL,
        },
      };

      const mockNotification = {
        id: 1,
        user: { email: 'test@example.com', phone: null },
        title: null,
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert
      expect(emailProvider.send).toHaveBeenCalledWith(
        'test@example.com',
        null,
        'Test message',
      );
    });

    /**
     * Test: should handle empty message
     */
    it('should handle notification with empty message', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          channel: NotificationChannel.EMAIL,
        },
      };

      const mockNotification = {
        id: 1,
        user: { email: 'test@example.com', phone: null },
        title: 'Test',
        message: '',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert
      expect(emailProvider.send).toHaveBeenCalledWith(
        'test@example.com',
        'Test',
        '',
      );
    });

    /**
     * Test: should handle job with missing channel
     */
    it('should handle job with missing channel', async () => {
      // Arrange
      const mockJob = {
        data: {
          notificationId: 1,
          // channel is undefined
        },
      };

      const mockNotification = {
        id: 1,
        user: { email: 'test@example.com', phone: null },
        title: 'Test',
        message: 'Test message',
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await processor.handle(mockJob as any);

      // Assert - should not throw
      expect(emailProvider.send).not.toHaveBeenCalled();
    });
  });
});
