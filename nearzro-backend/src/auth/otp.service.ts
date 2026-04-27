import { Injectable, BadRequestException, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EmailProvider } from '../notifications/providers/email.provider';
import Twilio from 'twilio';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private otpStore: Map<string, { otp: string; expiresAt: Date; retryCount: number; lastSentAt: Date }> = new Map();
  private phoneOtpStore: Map<string, { otp: string; expiresAt: Date; retryCount: number; lastSentAt: Date }> = new Map();
  private gmailUser: string;
  private gmailAppPassword: string;
  private emailFrom: string;
  private appEnv: string;
  private twilioClient: any = null;
  private twilioSmsFrom: string = '';
  private isDevMode: boolean = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private emailProvider: EmailProvider,
  ) {
    this.gmailUser = this.config.get<string>('GMAIL_USER') || '';
    this.gmailAppPassword = this.config.get<string>('GMAIL_APP_PASSWORD') || '';
    this.emailFrom = this.config.get<string>('EMAIL_FROM') || 'no-reply@NearZro.com';
    this.appEnv = this.config.get<string>('APP_ENV') || process.env.NODE_ENV || 'development';
    this.isDevMode = this.appEnv === 'development';
    
    if (this.isDevMode) {
      this.logger.log('🔧 Development mode - OTP verbose logging enabled');
    }

    // Initialize Twilio client
    const twilioSid = this.config.get<string>('TWILIO_ACCOUNT_SID') || '';
    const twilioToken = this.config.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.twilioSmsFrom = this.config.get<string>('TWILIO_SMS_FROM') || '';
    
    if (twilioSid && twilioToken) {
      try {
        this.twilioClient = Twilio(twilioSid, twilioToken);
        this.logger.log('✅ Twilio client initialized for SMS');
      } catch (error) {
        this.logger.error('❌ Failed to initialize Twilio client:', error);
      }
    } else {
      this.logger.warn('⚠️ Twilio credentials not configured');
    }
  }

  /**
   * Generate and send OTP via Email (Hybrid Try/Catch)
   */
  async sendOtp(email: string, phone?: string): Promise<{ success: boolean; message: string }> {
    // Generate real OTP and save to database
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const lastSentAt = new Date();
    this.otpStore.set(email, { otp, expiresAt, retryCount: 0, lastSentAt });

    // In development, always log the real OTP
    if (this.isDevMode) {
      this.logger.log(`📧 [DEV] Real Email OTP for ${email}: ${otp}`);
    }

    // Hybrid Try/Catch for email sending
    try {
      await this.sendEmail(email, otp);
    } catch (error: any) {
      // Graceful fallback in development
      if (this.isDevMode) {
        this.logger.warn(`[DEV] Email send failed: ${error.message} - OTP still valid for verification`);
        return {
          success: true,
          message: 'OTP sent successfully to your email' + (phone ? ' and phone' : ''),
        };
      }
      // Throw in production
      throw new InternalServerErrorException('Failed to send OTP email. Please try again.');
    }

    // Hybrid Try/Catch for SMS sending if phone provided
    if (phone) {
      try {
        await this.sendSms(phone, otp);
      } catch (error: any) {
        if (this.isDevMode) {
          this.logger.warn(`[DEV] SMS send failed: ${error.message} - OTP still sent via email`);
        } else {
          throw new InternalServerErrorException('Failed to send SMS. Please try again.');
        }
      }
    }

    return {
      success: true,
      message: 'OTP sent successfully to your email' + (phone ? ' and phone' : ''),
    };
  }

  /**
   * Send phone OTP (Hybrid Try/Catch)
   */
  async sendPhoneOtp(phone: string): Promise<{ success: boolean; message: string }> {
    // Generate real OTP and save to database
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const lastSentAt = new Date();
    this.phoneOtpStore.set(phone, { otp, expiresAt, retryCount: 0, lastSentAt });

    // In development, always log the real OTP
    if (this.isDevMode) {
      this.logger.log(`📱 [DEV] Real Phone OTP for ${phone}: ${otp}`);
    }

    // Hybrid Try/Catch for SMS sending
    try {
      await this.sendSms(phone, otp);
    } catch (error: any) {
      // Graceful fallback in development
      if (this.isDevMode) {
        this.logger.warn(`[DEV] SMS send failed: ${error.message} - OTP still valid for verification`);
        return {
          success: true,
          message: 'OTP sent to your phone',
        };
      }
      // Throw in production
      throw new InternalServerErrorException('Failed to send SMS. Please try again.');
    }

    return {
      success: true,
      message: 'OTP sent to your phone',
    };
  }

  /**
   * Verify phone OTP (strict database validation)
   */
  async verifyPhoneOtp(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
    const storedOtp = this.phoneOtpStore.get(phone);

    if (!storedOtp) {
      throw new BadRequestException('OTP not found or expired. Please request a new OTP.');
    }

    if (storedOtp.expiresAt < new Date()) {
      this.phoneOtpStore.delete(phone);
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    // Strict validation against database
    if (storedOtp.otp !== otp) {
      // Increment retry count
      storedOtp.retryCount = (storedOtp.retryCount || 0) + 1;
      
      // Update the store with incremented retry count
      this.phoneOtpStore.set(phone, storedOtp);
      
      // If 5 or more failed attempts, invalidate the OTP
      if (storedOtp.retryCount >= 5) {
        this.phoneOtpStore.delete(phone);
        throw new UnauthorizedException('Too many failed attempts. OTP has been invalidated.');
      }
      
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    this.phoneOtpStore.delete(phone);
    this.logger.log(`✅ Phone verified successfully for ${phone}`);

    return {
      success: true,
      message: 'Phone verified successfully',
    };
  }

  /**
   * Send OTP via email using Gmail SMTP
   */
  private async sendEmail(email: string, otp: string): Promise<void> {
    if (!this.gmailUser || !this.gmailAppPassword) {
      throw new Error('Gmail not configured');
    }

    await this.emailProvider.sendOtpEmail(email, otp);
    this.logger.log(`✅ Email OTP sent to ${email}`);
  }

  /**
   * Send OTP via SMS using Twilio SDK
   */
  private async sendSms(phone: string, otp: string): Promise<void> {
    if (!this.twilioClient || !this.twilioSmsFrom) {
      throw new Error('Twilio not configured');
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
    const message = `Your NearZro verification code is ${otp}. Valid for 10 minutes.`;

    await this.twilioClient.messages.create({
      body: message,
      from: this.twilioSmsFrom,
      to: formattedPhone,
    });
    this.logger.log(`✅ SMS sent to ${formattedPhone}`);
  }

  /**
   * Verify OTP (strict database validation)
   */
  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; message: string; user?: any }> {
    const storedOtp = this.otpStore.get(email);

    if (!storedOtp) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (storedOtp.expiresAt < new Date()) {
      this.otpStore.delete(email);
      throw new BadRequestException('OTP has expired');
    }

    // Strict validation against database
    if (storedOtp.otp !== otp) {
      // Increment retry count
      storedOtp.retryCount = (storedOtp.retryCount || 0) + 1;
      
      // Update the store with incremented retry count
      this.otpStore.set(email, storedOtp);
      
      // If 5 or more failed attempts, invalidate the OTP
      if (storedOtp.retryCount >= 5) {
        this.otpStore.delete(email);
        throw new UnauthorizedException('Too many failed attempts. OTP has been invalidated.');
      }
      
      throw new BadRequestException('Invalid OTP');
    }

    this.otpStore.delete(email);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      await this.prisma.user.update({
        where: { email },
        data: { isEmailVerified: true },
      });
    }

    return {
      success: true,
      message: 'Email verified successfully',
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: true,
      } : null,
    };
  }

  /**
   * Resend OTP
   */
  async resendOtp(email: string, phone?: string): Promise<{ success: boolean; message: string }> {
    // If email is provided, check rate limit on email OTP
    if (email) {
      const storedOtp = this.otpStore.get(email);
      if (storedOtp && storedOtp.lastSentAt) {
        const timeSinceLastSent = Date.now() - storedOtp.lastSentAt.getTime();
        if (timeSinceLastSent < 60 * 1000) {
          throw new BadRequestException('Too many requests. Please wait 60 seconds before resending OTP.');
        }
      }
    }
    
    // If phone is provided, check rate limit on phone OTP
    if (phone) {
      const storedOtp = this.phoneOtpStore.get(phone);
      if (storedOtp && storedOtp.lastSentAt) {
        const timeSinceLastSent = Date.now() - storedOtp.lastSentAt.getTime();
        if (timeSinceLastSent < 60 * 1000) {
          throw new BadRequestException('Too many requests. Please wait 60 seconds before resending OTP.');
        }
      }
    }
    
    return this.sendOtp(email, phone);
  }

  /**
   * Get OTP for development testing
   */
  getOtpForTesting(email: string): string | null {
    if (this.appEnv !== 'development') {
      return null;
    }
    const stored = this.otpStore.get(email);
    return stored ? stored.otp : null;
  }

  /**
   * Get phone OTP for development testing
   */
  getPhoneOtpForTesting(phone: string): string | null {
    if (this.appEnv !== 'development') {
      return null;
    }
    const stored = this.phoneOtpStore.get(phone);
    return stored ? stored.otp : null;
  }
}