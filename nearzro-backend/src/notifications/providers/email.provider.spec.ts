/**
 * Unit Tests for EmailProvider
 * NearZro Event Management Platform
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from './email.provider';

// Mock sendMail function
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });

describe('EmailProvider', () => {
  let provider: EmailProvider;

  // Set up environment variables before tests
  beforeAll(() => {
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
    process.env.EMAIL_FROM = 'no-reply@nearzro.com';
  });

  afterAll(() => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    delete process.env.EMAIL_FROM;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          GMAIL_USER: 'test@gmail.com',
          GMAIL_APP_PASSWORD: 'test-password',
          EMAIL_FROM: 'no-reply@nearzro.com',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<EmailProvider>(EmailProvider);
    
    // Manually initialize the transporter since onModuleInit isn't called in tests
    (provider as any).transporter = {
      sendMail: mockSendMail,
    };
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
    it('should send OTP email', async () => {
      const result = await provider.sendOtpEmail('test@example.com', '123456');
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('send() - Negative Test Cases', () => {
    it('should throw error if transporter is not configured', async () => {
      const mockConfigServiceNoCreds = {
        get: jest.fn((key: string) => {
          if (key === 'GMAIL_USER') return '';
          if (key === 'GMAIL_APP_PASSWORD') return '';
          if (key === 'EMAIL_FROM') return 'test@test.com';
          return undefined;
        }) as any,
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailProvider,
          { provide: ConfigService, useValue: mockConfigServiceNoCreds },
        ],
      }).compile();

      const testProvider = module.get<EmailProvider>(EmailProvider);
      
      await expect(testProvider.send('test@example.com', 'Subject', 'Message')).rejects.toThrow('Email provider not configured');
    });

    it('should handle SMTP failure', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));
      await expect(provider.send('test@example.com', 'Subject', 'Message')).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('send() - Edge Cases', () => {
    it('should handle very long subject', async () => {
      const longSubject = 'A'.repeat(500);
      const result = await provider.send('test@example.com', longSubject, 'Message');
      expect(result).toBe(true);
    });

    it('should handle empty message body', async () => {
      const result = await provider.send('test@example.com', 'Subject', '');
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
});
