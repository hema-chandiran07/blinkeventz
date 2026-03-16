/**
 * Unit Tests for NotificationsService
 * NearZro Event Management Platform
 *
 * Tests cover:
 * - Positive test scenarios
 * - Negative test scenarios
 * - Edge cases
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueue } from './queue/notification.queue';
import { NotificationGateway } from './websocket/notification.gateway';
import { NotificationChannel } from './enums/notification-channel.enum';
import {
  mockSendNotificationDto,
  mockNotification,
  mockNotificationActionDto,
  mockUserPreferences,
  createMockPrismaService,
  createMockNotificationQueue,
  createMockNotificationGateway,
} from './test.helpers';

import { NotificationAction } from './dto/notification-action.dto';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;
  let queue: any;
  let gateway: any;

  // Mock Prisma service
  const mockPrisma = createMockPrismaService();

  // Mock NotificationQueue
  const mockQueue = createMockNotificationQueue();

  // Mock NotificationGateway
  const mockGateway = createMockNotificationGateway();

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationQueue, useValue: mockQueue },
        { provide: NotificationGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    queue = module.get<NotificationQueue>(NotificationQueue);
    gateway = module.get<NotificationGateway>(NotificationGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have PrismaService injected', () => {
      expect(prisma).toBeDefined();
    });

    it('should have NotificationQueue injected', () => {
      expect(queue).toBeDefined();
    });

    it('should have NotificationGateway injected', () => {
      expect(gateway).toBeDefined();
    });
  });

  // ============================================
  // POSITIVE TEST CASES
  // ============================================

  describe('send() - Positive Test Cases', () => {
    /**
     * Test: should create a notification record
     * Validates that the service correctly creates a notification in the database
     */
    it('should create a notification record', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, enabled: true },
      ]);

      // Act
      await service.send(dto);

      // Assert
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: dto.userId,
          type: dto.type,
          title: expect.any(String),
          message: expect.any(String),
          priority: dto.priority,
          eventId: dto.eventId,
        },
      });
    });

    /**
     * Test: should enqueue notification job for non-IN_APP channels
     * Validates that the service correctly adds jobs to the queue
     */
    it('should enqueue notification job', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);
      
      // Return EMAIL channel (non-IN_APP)
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, enabled: true },
      ]);

      // Act
      await service.send(dto);

      // Assert
      expect(queue.add).toHaveBeenCalledWith({
        notificationId: mockCreatedNotification.id,
        channel: NotificationChannel.EMAIL,
      });
    });

    /**
     * Test: should send in-app notification through WebSocket
     * Validates that IN_APP notifications are sent via WebSocket
     */
    it('should send in-app notification through WebSocket', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);
      
      // Return only IN_APP channel
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.IN_APP, enabled: true },
      ]);

      // Act
      await service.send(dto);

      // Assert
      expect(gateway.emitToUser).toHaveBeenCalledWith(
        dto.userId,
        mockCreatedNotification,
      );
      // Queue should NOT be called for IN_APP
      expect(queue.add).not.toHaveBeenCalled();
    });

    /**
     * Test: should resolve user notification preferences correctly
     * Validates that preferences are fetched and used
     */
    it('should resolve user notification preferences correctly', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);

      const enabledPreferences = mockUserPreferences().filter((p: any) => p.enabled);
      prisma.notificationPreference.findMany.mockResolvedValue(enabledPreferences);

      // Act
      await service.send(dto);

      // Assert - now filtering enabled in code, so we fetch all and filter
      expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith({
        where: {
          userId: dto.userId,
          type: dto.type,
        },
        select: { channel: true, enabled: true },
      });
    });

    /**
     * Test: should handle multiple channels
     * Validates that notifications are sent to multiple channels
     */
    it('should handle multiple channels', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);

      // Return multiple channels
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, enabled: true },
        { channel: NotificationChannel.IN_APP, enabled: true },
      ]);

      // Act
      await service.send(dto);

      // Assert
      expect(gateway.emitToUser).toHaveBeenCalledWith(dto.userId, mockCreatedNotification);
      expect(queue.add).toHaveBeenCalledWith({
        notificationId: mockCreatedNotification.id,
        channel: NotificationChannel.EMAIL,
      });
    });
  });

  describe('handleAction() - Positive Test Cases', () => {
    /**
     * Test: should handle ACCEPT action
     * Validates that ACCEPT action updates event status to CONFIRMED
     */
    it('should handle ACCEPT action and confirm event', async () => {
      // Arrange
      const userId = 1;
      const dto = mockNotificationActionDto({ action: NotificationAction.ACCEPT });
      const mockNotif = mockNotification({ id: dto.notificationId, eventId: 1 });
      prisma.notification.findFirst.mockResolvedValue(mockNotif);
      prisma.event.update.mockResolvedValue({ id: 1, status: 'CONFIRMED' });
      prisma.notification.update.mockResolvedValue({ ...mockNotif, read: true });

      // Act
      await service.handleAction(userId, dto);

      // Assert
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'CONFIRMED' },
      });
    });

    /**
     * Test: should handle REJECT action
     * Validates that REJECT action updates event status to CANCELLED
     */
    it('should handle REJECT action and cancel event', async () => {
      // Arrange
      const userId = 1;
      const dto = mockNotificationActionDto({ action: NotificationAction.REJECT });
      const mockNotif = mockNotification({ id: dto.notificationId, eventId: 1 });
      prisma.notification.findFirst.mockResolvedValue(mockNotif);
      prisma.event.update.mockResolvedValue({ id: 1, status: 'CANCELLED' });
      prisma.notification.update.mockResolvedValue({ ...mockNotif, read: true });

      // Act
      await service.handleAction(userId, dto);

      // Assert
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'CANCELLED' },
      });
    });

    /**
     * Test: should mark notification as read
     * Validates that the notification is marked as read after action
     */
    it('should mark notification as read', async () => {
      // Arrange
      const userId = 1;
      const dto = mockNotificationActionDto({ action: NotificationAction.ACCEPT });
      const mockNotif = mockNotification({ id: dto.notificationId, eventId: 1 });
      prisma.notification.findFirst.mockResolvedValue(mockNotif);
      prisma.event.update.mockResolvedValue({ id: 1, status: 'CONFIRMED' });
      prisma.notification.update.mockResolvedValue({ ...mockNotif, read: true });

      // Act
      await service.handleAction(userId, dto);

      // Assert
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: dto.notificationId },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  // ============================================
  // NEGATIVE TEST CASES
  // ============================================

  describe('send() - Negative Test Cases', () => {
    /**
     * Test: should throw error if notification creation fails
     * Validates proper error handling when database creation fails
     */
    it('should throw error if notification creation fails', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const dbError = new Error('Database connection failed');
      prisma.notification.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.send(dto)).rejects.toThrow('Database connection failed');
    });

    /**
     * Test: should handle queue failure gracefully
     * Validates that queue failures are handled properly
     */
    it('should handle queue failure gracefully', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);

      // Return EMAIL channel but queue fails
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, enabled: true },
      ]);
      queue.add.mockRejectedValue(new Error('Queue connection failed'));

      // Act & Assert
      await expect(service.send(dto)).rejects.toThrow('Queue connection failed');
    });

    /**
     * Test: should throw error if user preferences cannot be fetched
     * Validates error handling for preference lookup failures
     */
    it('should handle preference fetch failure', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);
      prisma.notificationPreference.findMany.mockRejectedValue(
        new Error('Failed to fetch preferences'),
      );

      // Act & Assert
      await expect(service.send(dto)).rejects.toThrow('Failed to fetch preferences');
    });
  });

  describe('handleAction() - Negative Test Cases', () => {
    /**
     * Test: should throw error if notification not found
     * Validates error handling when notification doesn't exist
     */
    it('should throw error if notification not found', async () => {
      // Arrange
      const userId = 1;
      const dto = mockNotificationActionDto();
      prisma.notification.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.handleAction(userId, dto)).rejects.toThrow(
        'Notification not found',
      );
    });

    /**
     * Test: should handle event update failure
     * Validates error handling when event update fails
     */
    it('should handle event update failure', async () => {
      // Arrange
      const userId = 1;
      const dto = mockNotificationActionDto({ action: NotificationAction.ACCEPT });
      const mockNotif = mockNotification({ id: dto.notificationId, eventId: 1 });
      prisma.notification.findFirst.mockResolvedValue(mockNotif);
      prisma.event.update.mockRejectedValue(new Error('Event update failed'));

      // Act & Assert
      await expect(service.handleAction(userId, dto)).rejects.toThrow(
        'Event update failed',
      );
    });
  });

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('send() - Edge Cases', () => {
    /**
     * Test: should handle empty user preferences
     * Validates behavior when user has no notification preferences
     */
    it('should handle empty user preferences', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);
      prisma.notificationPreference.findMany.mockResolvedValue([]);

      // Act
      await service.send(dto);

      // Assert - neither queue nor gateway should be called
      expect(queue.add).not.toHaveBeenCalled();
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    });

    /**
     * Test: should handle disabled notification channels
     * Validates that disabled channels are skipped
     */
    it('should skip disabled notification channels', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);
      
      // Return preferences with disabled channels
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, enabled: false },
        { channel: NotificationChannel.SMS, enabled: false },
      ]);

      // Act
      await service.send(dto);

      // Assert - no channels should be processed
      expect(queue.add).not.toHaveBeenCalled();
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    });

    /**
     * Test: should handle all channel types
     * Validates handling of all notification channel types
     */
    it('should handle all notification channel types', async () => {
      // Arrange
      const dto = mockSendNotificationDto();
      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);

      // Return all channels
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, enabled: true },
        { channel: NotificationChannel.SMS, enabled: true },
        { channel: NotificationChannel.WHATSAPP, enabled: true },
        { channel: NotificationChannel.PUSH, enabled: true },
        { channel: NotificationChannel.IN_APP, enabled: true },
      ]);

      // Act
      await service.send(dto);

      // Assert - IN_APP goes to gateway, others to queue
      expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledTimes(4); // All except IN_APP
    });

    /**
     * Test: should handle missing optional fields
     * Validates that optional fields are handled correctly
     */
    it('should handle missing optional fields', async () => {
      // Arrange - minimal DTO without optional fields
      const dto = {
        userId: 1,
        type: NotificationType.BOOKING_CONFIRMED,
      };

      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, enabled: true },
      ]);

      // Act
      await service.send(dto);

      // Assert
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    /**
     * Test: should use default priority when not provided
     * Validates default priority handling
     */
    it('should use default priority when not provided', async () => {
      // Arrange
      const dto = {
        userId: 1,
        type: NotificationType.BOOKING_CONFIRMED,
        // No priority provided
      };

      const mockCreatedNotification = mockNotification({ id: 1 });
      prisma.notification.create.mockResolvedValue(mockCreatedNotification);
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, enabled: true },
      ]);

      // Act
      await service.send(dto);

      // Assert
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: dto.userId,
          type: dto.type,
          title: expect.any(String),
          message: expect.any(String),
          priority: 'NORMAL', // Default priority
          eventId: undefined,
        },
      });
    });
  });

  describe('handleAction() - Edge Cases', () => {
    /**
     * Test: should handle notification without eventId
     * Validates behavior when notification is not linked to an event
     */
    it('should handle notification without eventId', async () => {
      // Arrange
      const userId = 1;
      const dto = mockNotificationActionDto({ action: NotificationAction.ACCEPT });
      // Notification without eventId
      const mockNotif = mockNotification({ id: dto.notificationId, eventId: null });
      prisma.notification.findFirst.mockResolvedValue(mockNotif);
      prisma.notification.update.mockResolvedValue({ ...mockNotif, read: true });

      // Act
      await service.handleAction(userId, dto);

      // Assert - event.update should NOT be called
      expect(prisma.event.update).not.toHaveBeenCalled();
      // But notification should still be marked as read
      expect(prisma.notification.update).toHaveBeenCalled();
    });

    /**
     * Test: should handle unknown action gracefully
     * Validates behavior for invalid action types
     */
    it('should handle unknown action gracefully', async () => {
      // Arrange
      const userId = 1;
      const dto = mockNotificationActionDto({ action: 'UNKNOWN_ACTION' as any });
      const mockNotif = mockNotification({ id: dto.notificationId, eventId: 1 });
      prisma.notification.findFirst.mockResolvedValue(mockNotif);
      prisma.notification.update.mockResolvedValue({ ...mockNotif, read: true });

      // Act
      await service.handleAction(userId, dto);

      // Assert - event should not be updated for unknown action
      expect(prisma.event.update).not.toHaveBeenCalled();
      // But notification should still be marked as read
      expect(prisma.notification.update).toHaveBeenCalled();
    });
  });
});
