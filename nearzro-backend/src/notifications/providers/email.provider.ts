import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { CircuitBreaker } from '../utils/circuit-breaker';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

@Injectable()
export class EmailProvider implements OnModuleInit {
  private readonly logger = new Logger(EmailProvider.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly circuitBreaker: CircuitBreaker;
  private emailFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.emailFrom = this.configService.get<string>('EMAIL_FROM') || 'no-reply@nearzro.com';
    
    const threshold = this.configService.get<number>('CIRCUIT_BREAKER_THRESHOLD', 5);
    const timeoutMs = this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 60000);

    // CircuitBreaker expects config object with name, threshold (failureThreshold), and timeout in ms
    this.circuitBreaker = new CircuitBreaker({
      name: 'EmailProvider',
      threshold,
      timeout: timeoutMs,
    });
  }

  async onModuleInit() {
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailAppPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');

    if (gmailUser && gmailAppPassword) {
      try {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailAppPassword,
          },
          tls: {
            rejectUnauthorized: true, // ✅ Enable certificate validation
          },
          connectionTimeout: 10000, // 10 seconds
          socketTimeout: 30000, // 30 seconds
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
        });

        // ✅ Verify SMTP connection
        await this.transporter.verify();
        this.logger.log('✅ Gmail SMTP email provider initialized and verified');
      } catch (error) {
        this.logger.error('❌ Gmail SMTP connection failed:', error.message);
        this.transporter = null;
      }
    } else {
      this.logger.warn(
        '⚠️ Gmail credentials not configured. Email sending will be disabled. ' +
        'Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.',
      );
    }
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<EmailResult> {
    if (!this.transporter) {
      this.logger.error('❌ Email provider not initialized. Gmail credentials missing.');
      throw new Error('Email provider not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD.');
    }

    // Validate email format
    if (!to || !this.isValidEmail(to)) {
      throw new Error(`Invalid email address: ${to}`);
    }

    // Validate subject
    if (!subject || subject.length > 998) {
      throw new Error('Subject must be 1-998 characters');
    }

    // Validate message
    if (!text && !html) {
      throw new Error('Either text or html content is required');
    }

    // 🔄 Retry logic with exponential backoff + jitter for transient errors
    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.circuitBreaker.execute(async () => {
          const info = await this.transporter!.sendMail({
            from: this.emailFrom,
            to,
            subject,
            text,
            html: html || text,
          });

          this.logger.log(`✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
          
          return {
            messageId: info.messageId,
            accepted: info.accepted || [],
            rejected: info.rejected || [],
          };
        });
      } catch (error: any) {
        lastError = error;
        const isTransient = this.isTransientError(error);

        // If not a transient error or last attempt, rethrow
        if (!isTransient || attempt === maxAttempts) {
          throw error;
        }

        // Calculate delay: exponential backoff + jitter (2^attempt * 1s + random up to 500ms)
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        this.logger.warn(`Email send attempt ${attempt} failed (transient). Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Determine if an error is transient (network/timeout) vs permanent (validation)
   */
  private isTransientError(error: any): boolean {
    // Network errors, timeouts, connection resets
    const transientPatterns = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|network|timeout/i;
    // SMTP 4xx codes that are transient? e.g., 421, 451, 452, 454
    const transientSmtpCodes = /421|451|452|454/;
    
    const message = error.message || '';
    const code = error.code || '';
    
    return transientPatterns.test(message) || transientSmtpCodes.test(code);
  }

  async sendOtpEmail(to: string, otp: string): Promise<EmailResult> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #1a1a1a; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 NearZro</h1>
              <p>Your Verification Code</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for registering with NearZro! Please use the following verification code to complete your registration:</p>
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your OTP Code:</p>
                <div class="otp-code">${otp}</div>
              </div>
              <p><strong>This code will expire in 5 minutes.</strong></p>
              <p>If you didn't request this code, please ignore this email.</p>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} NearZro. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send(
      to,
      'Your NearZro Verification Code',
      `Your OTP is: ${otp}. This code will expire in 5 minutes.`,
      htmlContent,
    );
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isConnected(): boolean {
    return this.transporter !== null;
  }

  getCircuitBreakerState() {
    return {
      state: this.circuitBreaker.getState(),
      failures: this.circuitBreaker.getFailures(),
    };
  }
}
