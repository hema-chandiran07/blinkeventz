/**
 * Test Utilities and Mock Data for Notifications Module
 * NearZro Event Management Platform
 */

// Import DTOs
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationAction, NotificationActionDto } from './dto/notification-action.dto';

// Import enums from prisma client
import { NotificationType, NotificationPriority, NotificationChannel as PrismaNotificationChannel } from '@prisma/client';

// Re-export NotificationChannel from local enum
export { NotificationChannel } from './enums/notification-channel.enum';

/**
 * Create a mock SendNotificationDto
 */
export function mockSendNotificationDto(overrides: Partial<SendNotificationDto> = {}): SendNotificationDto {
  return {
    userId: 1,
    type: NotificationType.BOOKING_CONFIRMED,
    title: 'Booking Confirmed',
    message: 'Your booking has been confirmed',
    priority: NotificationPriority.NORMAL,
    eventId: 1,
    metadata: { bookingId: 1, eventTitle: 'Test Event' },
    ...overrides,
  } as SendNotificationDto;
}

/**
 * Create a mock NotificationActionDto
 */
export function mockNotificationActionDto(overrides: Partial<NotificationActionDto> = {}): NotificationActionDto {
  return {
    notificationId: 1,
    action: NotificationAction.ACCEPT,
    ...overrides,
  } as NotificationActionDto;
}

// ============================================
// Mock User Data
// ============================================

/**
 * Create a mock user
 */
export function mockUser(overrides: Record<string, any> = {}): any {
  return {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    phone: '+1234567890',
    isEmailVerified: true,
    role: 'USER',
    ...overrides,
  };
}

/**
 * Create mock user preferences for notifications
 */
export function mockUserPreferences(overrides: any[] = []): any[] {
  return [
    {
      id: 1,
      userId: 1,
      type: NotificationType.BOOKING_CONFIRMED,
      channel: PrismaNotificationChannel.EMAIL,
      enabled: true,
    },
    {
      id: 2,
      userId: 1,
      type: NotificationType.BOOKING_CONFIRMED,
      channel: PrismaNotificationChannel.IN_APP,
      enabled: true,
    },
    {
      id: 3,
      userId: 1,
      type: NotificationType.BOOKING_CONFIRMED,
      channel: PrismaNotificationChannel.SMS,
      enabled: false,
    },
    ...overrides,
  ];
}

/**
 * Create mock notification preferences
 */
export function mockNotificationPreference(
  userId: number = 1,
  type: NotificationType = NotificationType.BOOKING_CONFIRMED,
  channel: PrismaNotificationChannel = PrismaNotificationChannel.EMAIL,
  enabled: boolean = true,
): any {
  return {
    id: 1,
    userId,
    type,
    channel,
    enabled,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================
// Mock Notification Data
// ============================================

/**
 * Create a mock notification
 */
export function mockNotification(overrides: Record<string, any> = {}): any {
  return {
    id: 1,
    userId: 1,
    type: NotificationType.BOOKING_CONFIRMED,
    title: 'Booking Confirmed',
    message: 'Your booking has been confirmed',
    priority: NotificationPriority.NORMAL,
    read: false,
    readAt: null,
    eventId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser(),
    ...overrides,
  };
}

/**
 * Create multiple mock notifications
 */
export function mockNotifications(count: number = 5): any[] {
  return Array.from({ length: count }, (_, i) => mockNotification({ id: i + 1 }));
}

// ============================================
// Mock Queue Jobs
// ============================================

/**
 * Create a mock queue job data
 */
export function mockQueueJobData(overrides: Record<string, any> = {}): any {
  return {
    notificationId: 1,
    channel: PrismaNotificationChannel.EMAIL,
    ...overrides,
  };
}

/**
 * Create a mock Bull queue job
 */
export function mockBullJob(data: Record<string, any> = {}): any { 
  return {
    id: 'test-job-id',
    data,
    attemptsMade: 0,
    opts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    },
    update: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(undefined),
  };
}

// ============================================
// Mock Providers
// ============================================

/**
 * Create mock EmailProvider
 */
export function createMockEmailProvider(): any {
  return {
    send: jest.fn().mockResolvedValue(true),
    sendOtpEmail: jest.fn().mockResolvedValue(true),
    onModuleInit: jest.fn(),
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
}

/**
 * Create mock SmsProvider
 */
export function createMockSmsProvider(): any {
  return {
    send: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Create mock WhatsappProvider
 */
export function createMockWhatsappProvider(): any {
  return {
    send: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Create mock PushProvider
 */
export function createMockPushProvider(): any {
  return {
    send: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Create mock NotificationGateway
 */
export function createMockNotificationGateway(): any {
  return {
    emitToUser: jest.fn().mockResolvedValue(undefined),
    server: {
      to: jest.fn().mockReturnValue({
        emit: jest.fn().mockResolvedValue(undefined),
      }),
    },
  };
}

/**
 * Create mock NotificationQueue
 */
export function createMockNotificationQueue(): any {
  return {
    add: jest.fn().mockResolvedValue({
      id: 'test-job-id',
      data: {},
    }),
  };
}

/**
 * Create mock PrismaService
 */
export function createMockPrismaService(): any {
  return {
    notification: {
      create: jest.fn().mockResolvedValue(mockNotification()),
      findFirst: jest.fn().mockResolvedValue(mockNotification()),
      findUnique: jest.fn().mockResolvedValue(mockNotification()),
      findMany: jest.fn().mockResolvedValue(mockNotifications()),
      update: jest.fn().mockResolvedValue(mockNotification()),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    notificationPreference: {
      findMany: jest.fn().mockResolvedValue(mockUserPreferences()),
      findFirst: jest.fn().mockResolvedValue(mockNotificationPreference()),
      create: jest.fn().mockResolvedValue(mockNotificationPreference()),
      update: jest.fn().mockResolvedValue(mockNotificationPreference()),
    },
    event: {
      findUnique: jest.fn().mockResolvedValue({ id: 1, status: 'PENDING' }),
      update: jest.fn().mockResolvedValue({ id: 1, status: 'CONFIRMED' }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser()),
      update: jest.fn().mockResolvedValue({ ...mockUser(), isEmailVerified: true }),
    },
    $transaction: jest.fn().mockImplementation((callback: any) => callback(jest.fn())),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create mock ConfigService
 */
export function createMockConfigService(overrides: Record<string, any> = {}): any {
  const defaults: Record<string, any> = {
    GMAIL_USER: 'test@gmail.com',
    GMAIL_APP_PASSWORD: 'test-password',
    EMAIL_FROM: 'no-reply@nearzro.com',
    TWILIO_ACCOUNT_SID: 'test-sid',
    TWILIO_AUTH_TOKEN: 'test-token',
    TWILIO_SMS_FROM: '+1234567890',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+1234567890',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    APP_ENV: 'test',
  };

  const allConfig = { ...defaults, ...overrides };

  return {
    get: jest.fn().mockImplementation((key: string) => allConfig[key]),
  };
}

// ============================================
// OTP Mock Data
// ============================================

/**
 * Create mock OTP data
 */
export function mockOtpData(overrides: Record<string, any> = {}): { otp: string; expiresAt: Date } {
  return {
    otp: '123456',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    ...overrides,
  };
}

/**
 * Create expired OTP data
 */
export function mockExpiredOtpData(): { otp: string; expiresAt: Date } {
  return {
    otp: '123456',
    expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
  };
}

// ============================================
// Test Utilities
// ============================================

/**
 * Wait for a specified duration (for async tests)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a Jest mock function with typed return
 */
export function createMockFn<T = any>(returnValue?: T): jest.Mock<Promise<T>, []> {
  return jest.fn().mockResolvedValue(returnValue);
}

/**
 * Create a rejected Jest mock function
 */
export function createRejectedMockFn(error: Error): jest.Mock<Promise<never>, []> {
  return jest.fn().mockRejectedValue(error);
}
