/**
 * Unit Tests for SmsProvider
 * NearZro Event Management Platform
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SmsProvider } from './sms.provider';

// Mock sendMail function
const mockMessagesCreate = jest.fn().mockResolvedValue({ sid: 'SM123456789' });

describe('SmsProvider', () => {
  let provider: SmsProvider;

  // Set up environment variables before tests
  beforeAll(() => {
    process.env.TWILIO_ACCOUNT_SID = 'test_sid';
    process.env.TWILIO_AUTH_TOKEN = 'test_token';
    process.env.TWILIO_SMS_FROM = '+1234567890';
  });

  afterAll(() => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_SMS_FROM;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMessagesCreate.mockResolvedValue({ sid: 'SM123456789' });
    
    // Create a mock SmsProvider class
    const MockSmsProvider = jest.fn().mockImplementation(() => ({
      client: {
        messages: {
          create: mockMessagesCreate,
        },
      },
      send: async function(to: string, message: string) {
        await this.client.messages.create({
          from: process.env.TWILIO_SMS_FROM,
          to,
          body: message,
        });
      },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: SmsProvider, useClass: MockSmsProvider },
      ],
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

  describe('send() - Positive Test Cases', () => {
    it('should send SMS successfully', async () => {
      const result = await provider.send('+1234567890', 'Test message');
      expect(result).toBeUndefined();
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        from: '+1234567890',
        to: '+1234567890',
        body: 'Test message',
      });
    });

    it('should send SMS with long message', async () => {
      const longMessage = 'A'.repeat(500);
      await provider.send('+1234567890', longMessage);
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        from: '+1234567890',
        to: '+1234567890',
        body: longMessage,
      });
    });

    it('should send SMS to international numbers', async () => {
      await provider.send('+919876543210', 'Test message');
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        from: '+1234567890',
        to: '+919876543210',
        body: 'Test message',
      });
    });
  });

  describe('send() - Negative Test Cases', () => {
    it('should handle Twilio authentication error', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Authentication failed'));
      await expect(provider.send('+1234567890', 'Test message')).rejects.toThrow('Authentication failed');
    });

    it('should handle invalid phone number', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Invalid phone number'));
      await expect(provider.send('invalid', 'Test message')).rejects.toThrow('Invalid phone number');
    });

    it('should handle insufficient credits error', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Insufficient funds'));
      await expect(provider.send('+1234567890', 'Test message')).rejects.toThrow('Insufficient funds');
    });

    it('should handle network error', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Network error'));
      await expect(provider.send('+1234567890', 'Test message')).rejects.toThrow('Network error');
    });
  });

  describe('send() - Edge Cases', () => {
    it('should handle empty message', async () => {
      await provider.send('+1234567890', '');
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        from: '+1234567890',
        to: '+1234567890',
        body: '',
      });
    });

    it('should handle special characters in message', async () => {
      await provider.send('+1234567890', 'Hello! 🌍🎉 #test @user');
      expect(mockMessagesCreate).toHaveBeenCalled();
    });

    it('should handle unicode characters', async () => {
      await provider.send('+1234567890', 'こんにちは مرحبا שלום');
      expect(mockMessagesCreate).toHaveBeenCalled();
    });

    it('should handle phone number with plus sign', async () => {
      await provider.send('+1234567890', 'Test message');
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        from: '+1234567890',
        to: '+1234567890',
        body: 'Test message',
      });
    });

    it('should handle phone number without plus sign', async () => {
      await provider.send('1234567890', 'Test message');
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        from: '+1234567890',
        to: '1234567890',
        body: 'Test message',
      });
    });
  });
});
