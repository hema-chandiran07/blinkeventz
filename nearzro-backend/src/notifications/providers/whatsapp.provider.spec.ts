/**
 * Unit Tests for WhatsappProvider
 * NearZro Event Management Platform
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsappProvider } from './whatsapp.provider';

// Mock Twilio
const mockMessagesCreate = jest.fn().mockResolvedValue({ sid: 'SM123456789' });

jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockMessagesCreate,
    },
  })),
}));

describe('WhatsappProvider', () => {
  let provider: WhatsappProvider;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMessagesCreate.mockResolvedValue({ sid: 'SM123456789' });

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          TWILIO_ACCOUNT_SID: 'test_sid',
          TWILIO_AUTH_TOKEN: 'test_token',
          TWILIO_WHATSAPP_FROM: 'whatsapp:+1234567890',
          CIRCUIT_BREAKER_THRESHOLD: '5',
          CIRCUIT_BREAKER_TIMEOUT: '60000',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<WhatsappProvider>(WhatsappProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Setup', () => {
    it('should be defined', () => {
      expect(provider).toBeDefined();
    });
  });

  describe('onModuleInit()', () => {
    it('should initialize Twilio client with valid credentials', () => {
      provider.onModuleInit();
      expect(provider.isConnected()).toBe(true);
    });

    it('should not initialize client without credentials', async () => {
      const mockConfigServiceNoCreds = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'TWILIO_ACCOUNT_SID') return '';
          if (key === 'TWILIO_AUTH_TOKEN') return '';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WhatsappProvider,
          { provide: ConfigService, useValue: mockConfigServiceNoCreds },
        ],
      }).compile();

      const testProvider = module.get<WhatsappProvider>(WhatsappProvider);
      testProvider.onModuleInit();
      expect(testProvider.isConnected()).toBe(false);
    });
  });

  describe('send() - Positive Test Cases', () => {
    beforeEach(() => {
      provider.onModuleInit();
    });

    it('should send WhatsApp message successfully', async () => {
      const result = await provider.send('+1234567890', 'Test message');
      expect(result).toBe(true);
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        from: 'whatsapp:+1234567890',
        to: 'whatsapp:+1234567890',
        body: 'Test message',
      });
    });

    it('should send WhatsApp with long message', async () => {
      const longMessage = 'A'.repeat(4096);
      const result = await provider.send('+1234567890', longMessage);
      expect(result).toBe(true);
    });

    it('should send WhatsApp to international numbers', async () => {
      const result = await provider.send('+919876543210', 'Test message');
      expect(result).toBe(true);
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        from: 'whatsapp:+1234567890',
        to: 'whatsapp:+919876543210',
        body: 'Test message',
      });
    });
  });

  describe('send() - Negative Test Cases', () => {
    beforeEach(() => {
      provider.onModuleInit();
    });

    it('should throw error if provider is not initialized', async () => {
      const mockConfigServiceNoCreds = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'TWILIO_ACCOUNT_SID') return '';
          if (key === 'TWILIO_AUTH_TOKEN') return '';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WhatsappProvider,
          { provide: ConfigService, useValue: mockConfigServiceNoCreds },
        ],
      }).compile();

      const testProvider = module.get<WhatsappProvider>(WhatsappProvider);
      testProvider.onModuleInit();
      
      await expect(testProvider.send('+1234567890', 'Test')).rejects.toThrow('WhatsApp provider not configured');
    });

    it('should reject invalid phone number', async () => {
      await expect(provider.send('invalid', 'Test message')).rejects.toThrow('Invalid phone number');
    });

    it('should reject phone number without plus sign', async () => {
      await expect(provider.send('1234567890', 'Test message')).rejects.toThrow('Invalid phone number');
    });

    it('should reject empty message', async () => {
      await expect(provider.send('+1234567890', '')).rejects.toThrow('Message cannot be empty');
    });

    it('should reject message over 4096 characters', async () => {
      const longMessage = 'A'.repeat(4097);
      await expect(provider.send('+1234567890', longMessage)).rejects.toThrow('Message must be 4096 characters or less');
    });

    it('should handle Twilio authentication error', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Authentication failed'));
      await expect(provider.send('+1234567890', 'Test message')).rejects.toThrow('Authentication failed');
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
    beforeEach(() => {
      provider.onModuleInit();
    });

    it('should handle special characters in message', async () => {
      const result = await provider.send('+1234567890', 'Hello! 🌍🎉 #test @user');
      expect(result).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const result = await provider.send('+1234567890', 'こんにちは مرحبا שלום');
      expect(result).toBe(true);
    });

    it('should handle phone number with country code', async () => {
      const result = await provider.send('+919876543210', 'Test message');
      expect(result).toBe(true);
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      provider.onModuleInit();
    });

    it('should track circuit breaker state', () => {
      const state = provider.getCircuitBreakerState();
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failures');
    });

    it('should open circuit after threshold failures', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Twilio failed'));
      
      // Fail 5 times (threshold)
      for (let i = 0; i < 5; i++) {
        try {
          await provider.send('+1234567890', 'Test message');
        } catch (e) {
          // Expected to fail
        }
      }
      
      const state = provider.getCircuitBreakerState();
      expect(state.state).toBe('OPEN');
    });
  });
});
