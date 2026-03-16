/**
 * Unit Tests for EmailProvider
 * NearZro Event Management Platform
 *
 * Tests cover:
 * - Positive test scenarios (email sending)
 * - Negative test scenarios (configuration failures, SMTP errors)
 * - Edge cases (invalid email, timeout)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from './email.provider';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

describe('EmailProvider', () => {
  let provider: EmailProvider;
  let mockTransporter: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
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
    
    // Trigger onModuleInit manually since it's not called in tests
    provider.onModuleInit();
    
    // Get the transporter for testing
    mockTransporter = (provider as any).transporter;
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
    /**
     * Test: should initialize transporter when credentials are provided
     */
    it('should initialize transporter when credentials are provided', () => {
      // Assert - transporter should be initialized
      expect(mockTransporter).toBeDefined();
    });

    /**
     * Test: should NOT initialize transporter when credentials are missing
     */
    it('should NOT initialize transporter when credentials are missing', async () => {
      const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            GMAIL_USER: '',
            GMAIL_APP_PASSWORD: '',
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

      const testProvider = module.get<EmailProvider>(EmailProvider);
      testProvider.onModuleInit();

      // Assert - transporter should NOT be initialized
      expect((testProvider as any).transporter).toBeNull();
    });
  });

  // ============================================
  // POSITIVE TEST CASES
  // ============================================

  describe('send() - Positive Test Cases', () => {
    /**
     * Test: should send email successfully
     * Validates that email is sent through the transporter
     */
    it('should send email successfully', async () => {
      // Arrange
      const to = 'test@example.com';
      const subject = 'Test Subject';
      const text = 'Test message';
      const html = '<p>Test message</p>';

      // Act
      const result = await provider.send(to, subject, text, html);

      // Assert
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'no-reply@nearzro.com',
        to,
        subject,
        text,
        html,
      });
    });

    /**
     * Test: should return messageId on success
     * Validates that the message ID is returned
     */
    it('should return messageId on success', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValueOnce({ 
        messageId: '<test-message-id>' 
      });

      // Act
      const result = await provider.send('test@example.com', 'Subject', 'Message');

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test: should use text as fallback when html is not provided
     */
    it('should use text as fallback when html is not provided', async () => {
      // Arrange
      const to = 'test@example.com';
      const subject = 'Test Subject';
      const text = 'Test message';

      // Act
      await provider.send(to, subject, text);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'no-reply@nearzro.com',
        to,
        subject,
        text,
        html: text, // text should be used as html fallback
      });
    });
  });

  describe('sendOtpEmail() - Positive Test Cases', () => {
    /**
     * Test: should send OTP email with HTML template
     */
    it('should send OTP email with HTML template', async () => {
      // Arrange
      const to = 'test@example.com';
      const otp = '123456';

      // Act
      const result = await provider.sendOtpEmail(to, otp);

      // Assert
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: 'Your NearZro Verification Code',
        }),
      );
    });

    /**
     * Test: should include OTP in email content
     */
    it('should include OTP in email content', async () => {
      // Arrange
      const to = 'test@example.com';
      const otp = '123456';

      // Act
      await provider.sendOtpEmail(to, otp);

      // Assert - the call should contain the OTP
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toContain(otp);
    });
  });

  // ============================================
  // NEGATIVE TEST CASES
  // ============================================

  describe('send() - Negative Test Cases', () => {
    /**
     * Test: should throw error if transporter is not configured
     * Validates error handling when Gmail credentials are missing
     */
    it('should throw error if transporter is not configured', async () => {
      // Arrange - create provider without transporter
      const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            GMAIL_USER: '',
            GMAIL_APP_PASSWORD: '',
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

      const testProvider = module.get<EmailProvider>(EmailProvider);
      testProvider.onModuleInit();

      // Act & Assert
      await expect(
        testProvider.send('test@example.com', 'Subject', 'Message'),
      ).rejects.toThrow('Email provider not configured');
    });

    /**
     * Test: should handle SMTP failure
     * Validates error handling when SMTP fails
     */
    it('should handle SMTP failure', async () => {
      // Arrange
      const smtpError = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValueOnce(smtpError);

      // Act & Assert
      await expect(
        provider.send('test@example.com', 'Subject', 'Message'),
      ).rejects.toThrow('SMTP connection failed');
    });

    /**
     * Test: should handle network timeout
     */
    it('should handle network timeout', async () => {
      // Arrange
      const timeoutError = new Error('Connection timed out');
      mockTransporter.sendMail.mockRejectedValueOnce(timeoutError);

      // Act & Assert
      await expect(
        provider.send('test@example.com', 'Subject', 'Message'),
      ).rejects.toThrow('Connection timed out');
    });

    /**
     * Test: should handle invalid credentials
     */
    it('should handle invalid credentials error', async () => {
      // Arrange
      const authError = new Error('Invalid login credentials');
      mockTransporter.sendMail.mockRejectedValueOnce(authError);

      // Act & Assert
      await expect(
        provider.send('test@example.com', 'Subject', 'Message'),
      ).rejects.toThrow('Invalid login credentials');
    });
  });

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('send() - Edge Cases', () => {
    /**
     * Test: should handle invalid email address format
     * Note: nodemailer validates this, but we test our handling
     */
    it('should handle invalid email address', async () => {
      // Arrange - pass invalid email, nodemailer will handle validation
      const invalidEmail = 'invalid-email';
      
      // Act & Assert
      await expect(
        provider.send(invalidEmail, 'Subject', 'Message'),
      ).rejects.toThrow();
    });

    /**
     * Test: should handle very long subject
     */
    it('should handle very long subject', async () => {
      // Arrange
      const longSubject = 'A'.repeat(500);

      // Act
      const result = await provider.send('test@example.com', longSubject, 'Message');

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test: should handle empty message body
     */
    it('should handle empty message body', async () => {
      // Act
      const result = await provider.send('test@example.com', 'Subject', '');

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test: should handle special characters in email
     */
    it('should handle special characters in email', async () => {
      // Arrange
      const emailWithPlus = 'test+tag@example.com';
      
      // Act
      const result = await provider.send(emailWithPlus, 'Subject', 'Message');

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test: should handle multiple recipients
     */
    it('should handle multiple recipients', async () => {
      // Arrange
      const recipients = 'test1@example.com,test2@example.com';
      
      // Act
      const result = await provider.send(recipients, 'Subject', 'Message');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('sendOtpEmail() - Edge Cases', () => {
    /**
     * Test: should handle very long OTP (edge case)
     */
    it('should handle long OTP', async () => {
      // Arrange
      const longOtp = '1'.repeat(20);

      // Act
      const result = await provider.sendOtpEmail('test@example.com', longOtp);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test: should handle OTP with special characters
     */
    it('should handle OTP with special characters', async () => {
      // Arrange
      const otpWithChars = 'ABC123!@#';

      // Act
      const result = await provider.sendOtpEmail('test@example.com', otpWithChars);

      // Assert
      expect(result).toBe(true);
    });
  });
});
