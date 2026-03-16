/**
 * Unit Tests for NotificationQueue
 * NearZro Event Management Platform
 *
 * Tests cover:
 * - Positive test scenarios (job addition)
 * - Negative test scenarios (queue failures)
 * - Edge cases (configuration options)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationQueue } from './notification.queue';
import { getQueueToken } from '@nestjs/bull';

// Mock Bull queue
const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
};

describe('NotificationQueue', () => {
  let queue: NotificationQueue;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationQueue,
        {
          provide: getQueueToken('notifications'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    queue = module.get<NotificationQueue>(NotificationQueue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Setup', () => {
    it('should be defined', () => {
      expect(queue).toBeDefined();
    });
  });

  // ============================================
  // POSITIVE TEST CASES
  // ============================================

  describe('add() - Positive Test Cases', () => {
    /**
     * Test: should add EMAIL job to queue
     */
    it('should add EMAIL job to queue', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'EMAIL' as const,
      };

      // Act
      await queue.add(data);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send',
        data,
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
        }),
      );
    });

    /**
     * Test: should add SMS job to queue
     */
    it('should add SMS job to queue', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'SMS' as const,
      };

      // Act
      await queue.add(data);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send',
        data,
        expect.any(Object),
      );
    });

    /**
     * Test: should add WHATSAPP job to queue
     */
    it('should add WHATSAPP job to queue', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'WHATSAPP' as const,
      };

      // Act
      await queue.add(data);

      // Assert
      expect(mockQueue.add).toHaveBeenCalled();
    });

    /**
     * Test: should add PUSH job to queue
     */
    it('should add PUSH job to queue', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'PUSH' as const,
      };

      // Act
      await queue.add(data);

      // Assert
      expect(mockQueue.add).toHaveBeenCalled();
    });

    /**
     * Test: should use correct queue name
     */
    it('should use correct queue name', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'EMAIL' as const,
      };

      // Act
      await queue.add(data);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send', // This is the job name
        expect.any(Object),
        expect.any(Object),
      );
    });

    /**
     * Test: should pass correct job data
     */
    it('should pass correct job data', async () => {
      // Arrange
      const data = {
        notificationId: 42,
        channel: 'EMAIL' as const,
      };

      // Act
      await queue.add(data);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send',
        { notificationId: 42, channel: 'EMAIL' },
        expect.any(Object),
      );
    });
  });

  // ============================================
  // NEGATIVE TEST CASES
  // ============================================

  describe('add() - Negative Test Cases', () => {
    /**
     * Test: should handle queue connection failure
     */
    it('should handle queue connection failure', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'EMAIL' as const,
      };

      mockQueue.add.mockRejectedValueOnce(new Error('Queue connection failed'));

      // Act & Assert
      await expect(queue.add(data)).rejects.toThrow('Queue connection failed');
    });

    /**
     * Test: should handle Redis connection error
     */
    it('should handle Redis connection error', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'EMAIL' as const,
      };

      mockQueue.add.mockRejectedValueOnce(new Error('Redis connection refused'));

      // Act & Assert
      await expect(queue.add(data)).rejects.toThrow('Redis connection refused');
    });

    /**
     * Test: should handle job creation failure
     */
    it('should handle job creation failure', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'EMAIL' as const,
      };

      mockQueue.add.mockRejectedValueOnce(new Error('Failed to create job'));

      // Act & Assert
      await expect(queue.add(data)).rejects.toThrow('Failed to create job');
    });
  });

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('add() - Edge Cases', () => {
    /**
     * Test: should handle very large notification ID
     */
    it('should handle very large notification ID', async () => {
      // Arrange
      const data = {
        notificationId: Number.MAX_SAFE_INTEGER,
        channel: 'EMAIL' as const,
      };

      // Act
      await queue.add(data);

      // Assert
      expect(mockQueue.add).toHaveBeenCalled();
    });

    /**
     * Test: should handle all channel types
     */
    it('should handle all channel types', async () => {
      const channels = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'] as const;

      for (const channel of channels) {
        const data = {
          notificationId: 1,
          channel,
        };

        // Clear mock
        mockQueue.add.mockClear();

        // Act
        await queue.add(data);

        // Assert
        expect(mockQueue.add).toHaveBeenCalled();
      }
    });

    /**
     * Test: should include retry configuration
     */
    it('should include retry configuration', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'EMAIL' as const,
      };

      // Act
      await queue.add(data);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        }),
      );
    });

    /**
     * Test: should enable removeOnComplete
     */
    it('should enable removeOnComplete', async () => {
      // Arrange
      const data = {
        notificationId: 1,
        channel: 'EMAIL' as const,
      };

      // Act
      await queue.add(data);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          removeOnComplete: true,
        }),
      );
    });
  });
});
