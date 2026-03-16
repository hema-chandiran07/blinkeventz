/**
 * Unit Tests for SmsProvider
 * NearZro Event Management Platform
 *
 * Tests cover:
 * - Positive test scenarios (SMS sending)
 * - Negative test scenarios (Twilio errors)
 * - Edge cases (invalid phone numbers)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SmsProvider } from './sms.provider';

// Mock Twilio
const mockTwilioClient = {
  messages: {
    create: jest.fn().mockResolvedValue({ sid: 'SM123456789' }),
  },
};

jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => mockTwilioClient);
});

// Set environment variables for Twilio
process.env.TWILIO_ACCOUNT_SID = 'test_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_token';
process.env.TWILIO_SMS_FROM = '+1234567890';

describe('SmsProvider', () => {
  let provider: SmsProvider;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsProvider],
    }).compile();

    provider = module.get<SmsProvider>(SmsProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Setup', () => {
    it('should be defined', () => {
      expect(provider).toBeDefined();
    });
  });

  // ============================================
  // POSITIVE TEST CASES
  // ============================================

  describe('send() - Positive Test Cases', () => {
    /**
     * Test: should send SMS successfully
     * Validates that SMS is sent through Twilio
     */
    it('should send SMS successfully', async () => {
      // Arrange
      const to = '+1234567890';
      const message = 'Test message';

      // Act
      await provider.send(to, message);

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        from: '+1234567890',
        to,
        body: message,
      });
    });

    /**
     * Test: should send SMS with long message
     */
    it('should send SMS with long message', async () => {
      // Arrange
      const to = '+1234567890';
      const longMessage = 'A'.repeat(500);

      // Act
      await provider.send(to, longMessage);

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        from: '+1234567890',
        to,
        body: longMessage,
      });
    });

    /**
     * Test: should send SMS to international numbers
     */
    it('should send SMS to international numbers', async () => {
      // Arrange
      const to = '+919876543210'; // India
      const message = 'Test message';

      // Act
      await provider.send(to, message);

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        from: '+1234567890',
        to,
        body: message,
      });
    });
  });

  // ============================================
  // NEGATIVE TEST CASES
  // ============================================

  describe('send() - Negative Test Cases', () => {
    /**
     * Test: should handle Twilio authentication error
     */
    it('should handle Twilio authentication error', async () => {
      // Arrange
      const authError = new Error('Authentication failed');
      mockTwilioClient.messages.create.mockRejectedValueOnce(authError);

      // Act & Assert
      await expect(
        provider.send('+1234567890', 'Test message'),
      ).rejects.toThrow('Authentication failed');
    });

    /**
     * Test: should handle invalid phone number
     */
    it('should handle invalid phone number', async () => {
      // Arrange
      const invalidError = new Error('Invalid phone number');
      mockTwilioClient.messages.create.mockRejectedValueOnce(invalidError);

      // Act & Assert
      await expect(
        provider.send('invalid', 'Test message'),
      ).rejects.toThrow('Invalid phone number');
    });

    /**
     * Test: should handle insufficient credits error
     */
    it('should handle insufficient credits error', async () => {
      // Arrange
      const creditError = new Error('Insufficient funds');
      mockTwilioClient.messages.create.mockRejectedValueOnce(creditError);

      // Act & Assert
      await expect(
        provider.send('+1234567890', 'Test message'),
      ).rejects.toThrow('Insufficient funds');
    });

    /**
     * Test: should handle network error
     */
    it('should handle network error', async () => {
      // Arrange
      const networkError = new Error('Network error');
      mockTwilioClient.messages.create.mockRejectedValueOnce(networkError);

      // Act & Assert
      await expect(
        provider.send('+1234567890', 'Test message'),
      ).rejects.toThrow('Network error');
    });
  });

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('send() - Edge Cases', () => {
    /**
     * Test: should handle empty message
     */
    it('should handle empty message', async () => {
      // Act
      await provider.send('+1234567890', '');

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        from: '+1234567890',
        to: '+1234567890',
        body: '',
      });
    });

    /**
     * Test: should handle special characters in message
     */
    it('should handle special characters in message', async () => {
      // Arrange
      const specialMessage = 'Hello! 🌍🎉 #test @user';

      // Act
      await provider.send('+1234567890', specialMessage);

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalled();
    });

    /**
     * Test: should handle unicode characters
     */
    it('should handle unicode characters', async () => {
      // Arrange
      const unicodeMessage = 'こんにちは مرحبا שלום';

      // Act
      await provider.send('+1234567890', unicodeMessage);

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalled();
    });

    /**
     * Test: should handle phone number with plus sign
     */
    it('should handle phone number with plus sign', async () => {
      // Arrange
      const phoneWithPlus = '+1234567890';

      // Act
      await provider.send(phoneWithPlus, 'Test message');

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        from: '+1234567890',
        to: phoneWithPlus,
        body: 'Test message',
      });
    });

    /**
     * Test: should handle phone number without plus sign
     */
    it('should handle phone number without plus sign', async () => {
      // Arrange
      const phoneWithoutPlus = '1234567890';

      // Act
      await provider.send(phoneWithoutPlus, 'Test message');

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        from: '+1234567890',
        to: phoneWithoutPlus,
        body: 'Test message',
      });
    });
  });
});
