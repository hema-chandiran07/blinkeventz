/**
 * Unit Tests for EmailProvider
 * NearZro Event Management Platform
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from './email.provider';

// Mock nodemailer
const mockVerify = jest.fn().mockResolvedValue(true);
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: mockVerify,
    sendMail: mockSendMail,
  })),
}));

describe('EmailProvider', () => {
  let provider: EmailProvider;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVerify.mockResolvedValue(true);
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          GMAIL_USER: 'test@gmail.com',
          GMAIL_APP_PASSWORD: 'test-password',
          EMAIL_FROM: 'no-reply@nearzro.com',
          CIRCUIT_BREAKER_THRESHOLD: '5',
          CIRCUIT_BREAKER_TIMEOUT: '60000',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<EmailProvider>(EmailProvider);
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
    it('should initialize transporter with valid credentials', async () => {
      await provider.onModuleInit();
      expect(provider.isConnected()).toBe(true);
    });

    it('should verify SMTP connection on init', async () => {
      await provider.onModuleInit();
      expect(mockVerify).toHaveBeenCalled();
    });

    it('should handle connection verification failure', async () => {
      mockVerify.mockRejectedValueOnce(new Error('Connection failed'));
      await provider.onModuleInit();
      expect(provider.isConnected()).toBe(false);
    });

    it('should not initialize transporter without credentials', async () => {
      const mockConfigServiceNoCreds = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'GMAIL_USER') return '';
          if (key === 'GMAIL_APP_PASSWORD') return '';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailProvider,
          { provide: ConfigService, useValue: mockConfigServiceNoCreds },
        ],
      }).compile();

      const testProvider = module.get<EmailProvider>(EmailProvider);
      await testProvider.onModuleInit();
      expect(testProvider.isConnected()).toBe(false);
    });
  });

  describe('send() - Positive Test Cases', () => {
    beforeEach(async () => {
      await provider.onModuleInit();
    });

    it('should send email successfully', async () => {
      const result = await provider.send('test@example.com', 'Test Subject', 'Test message', '<p>Test message</p>');
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'no-reply@nearzro.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>',
      });
    });

    it('should use text as fallback when html is not provided', async () => {
      await provider.send('test@example.com', 'Test Subject', 'Test message');
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'no-reply@nearzro.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: 'Test message',
      });
    });
  });

  describe('sendOtpEmail() - Positive Test Cases', () => {
    beforeEach(async () => {
      await provider.onModuleInit();
    });

    it('should send OTP email', async () => {
      const result = await provider.sendOtpEmail('test@example.com', '123456');
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('send() - Negative Test Cases', () => {
    it('should throw error if transporter is not configured', async () => {
      const mockConfigServiceNoCreds = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'GMAIL_USER') return '';
          if (key === 'GMAIL_APP_PASSWORD') return '';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailProvider,
          { provide: ConfigService, useValue: mockConfigServiceNoCreds },
        ],
      }).compile();

      const testProvider = module.get<EmailProvider>(EmailProvider);
      await testProvider.onModuleInit();
      
      await expect(testProvider.send('test@example.com', 'Subject', 'Message')).rejects.toThrow('Email provider not configured');
    });

    it('should handle SMTP failure', async () => {
      await provider.onModuleInit();
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));
      await expect(provider.send('test@example.com', 'Subject', 'Message')).rejects.toThrow('SMTP connection failed');
    });

    it('should reject invalid email address', async () => {
      await provider.onModuleInit();
      await expect(provider.send('invalid-email', 'Subject', 'Message')).rejects.toThrow('Invalid email address');
    });

    it('should reject empty subject', async () => {
      await provider.onModuleInit();
      await expect(provider.send('test@example.com', '', 'Message')).rejects.toThrow('Subject must be 1-998 characters');
    });

    it('should reject empty message', async () => {
      await provider.onModuleInit();
      await expect(provider.send('test@example.com', 'Subject', '')).rejects.toThrow('Either text or html content is required');
    });
  });

  describe('send() - Edge Cases', () => {
    beforeEach(async () => {
      await provider.onModuleInit();
    });

    it('should handle very long subject', async () => {
      const longSubject = 'A'.repeat(998);
      const result = await provider.send('test@example.com', longSubject, 'Message');
      expect(result).toBe(true);
    });

    it('should handle special characters in email', async () => {
      const result = await provider.send('test+tag@example.com', 'Subject', 'Message');
      expect(result).toBe(true);
    });

    it('should handle multiple recipients', async () => {
      const result = await provider.send('test1@example.com,test2@example.com', 'Subject', 'Message');
      expect(result).toBe(true);
    });
  });

  describe('sendOtpEmail() - Edge Cases', () => {
    beforeEach(async () => {
      await provider.onModuleInit();
    });

    it('should handle long OTP', async () => {
      const longOtp = '1'.repeat(20);
      const result = await provider.sendOtpEmail('test@example.com', longOtp);
      expect(result).toBe(true);
    });

    it('should handle OTP with special characters', async () => {
      const result = await provider.sendOtpEmail('test@example.com', 'ABC123!@#');
      expect(result).toBe(true);
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(async () => {
      await provider.onModuleInit();
    });

    it('should track circuit breaker state', () => {
      const state = provider.getCircuitBreakerState();
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failures');
    });

    it('should open circuit after threshold failures', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP failed'));
      
      // Fail 5 times (threshold)
      for (let i = 0; i < 5; i++) {
        try {
          await provider.send('test@example.com', 'Subject', 'Message');
        } catch (e) {
          // Expected to fail
        }
      }
      
      const state = provider.getCircuitBreakerState();
      expect(state.state).toBe('OPEN');
    });
  });
});
