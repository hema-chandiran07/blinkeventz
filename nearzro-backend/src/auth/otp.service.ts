import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EmailProvider } from '../notifications/providers/email.provider';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();
  private gmailUser: string;
  private gmailAppPassword: string;
  private emailFrom: string;
  private appEnv: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private emailProvider: EmailProvider,
  ) {
    this.gmailUser = this.config.get<string>('GMAIL_USER') || '';
    this.gmailAppPassword = this.config.get<string>('GMAIL_APP_PASSWORD') || '';
    this.emailFrom = this.config.get<string>('EMAIL_FROM') || 'no-reply@NearZro.com';
    this.appEnv = this.config.get<string>('APP_ENV') || 'development';
  }

  /**
   * Generate and send OTP via Email
   */
  async sendOtp(email: string, phone?: string): Promise<{ success: boolean; message: string }> {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP
    this.otpStore.set(email, { otp, expiresAt });

    // Send via Email using Gmail
    await this.sendEmail(email, otp);

    // Send via SMS if phone provided (Twilio)
    if (phone) {
      await this.sendSms(phone, otp);
    }

    return {
      success: true,
      message: 'OTP sent successfully to your email' + (phone ? ' and phone' : ''),
    };
  }

  /**
   * Send OTP via email using Gmail SMTP
   */
  private async sendEmail(email: string, otp: string): Promise<void> {
    // Check if Gmail is configured
    if (!this.gmailUser || !this.gmailAppPassword) {
      this.logger.error('❌ Gmail not configured. Cannot send OTP email.');
      this.logger.warn('Please set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.');
      throw new Error('Email service not configured. Please contact administrator.');
    }

    try {
      // Use EmailProvider for sending OTP emails
      await this.emailProvider.sendOtpEmail(email, otp);
      this.logger.log(`✅ OTP email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send OTP email to ${email}:`, error);
      throw new Error('Failed to send OTP email. Please try again.');
    }
  }

  /**
   * Send OTP via SMS using Twilio
   */
  private async sendSms(phone: string, otp: string): Promise<void> {
    const twilioSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const twilioToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const twilioSmsFrom = this.config.get<string>('TWILIO_SMS_FROM');

    if (!twilioSid || !twilioToken || !twilioSmsFrom) {
      console.log(`📱 SMS OTP to ${phone}: ${otp} (Twilio not configured)`);
      return;
    }

    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const toNumber = `+91${phone.replace(/\D/g, '')}`;

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioSmsFrom,
          To: toNumber,
          Body: `Your NearZro verification code is: ${otp}. Expires in 5 minutes.`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Twilio Error:', error);
        console.log(`📱 SMS OTP to ${phone}: ${otp} (Twilio failed - use this code)`);
      } else {
        console.log(`✅ SMS sent to ${phone}`);
      }
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      console.log(`📱 SMS OTP to ${phone}: ${otp} (SMS failed - use this code)`);
    }
  }

  /**
   * Verify OTP and mark email as verified
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

    if (storedOtp.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // OTP verified successfully
    this.otpStore.delete(email);

    // Update user's email verification status
    const user = await this.prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });

    return {
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: true,
      },
    };
  }

  /**
   * Resend OTP
   */
  async resendOtp(email: string, phone?: string): Promise<{ success: boolean; message: string }> {
    return this.sendOtp(email, phone);
  }

  /**
   * Get OTP for development/testing (ONLY in development mode)
   * This is used when email sending is not working
   */
  getOtpForTesting(email: string): string | null {
    if (this.appEnv !== 'development') {
      return null; // Never expose OTP in production
    }
    const stored = this.otpStore.get(email);
    return stored ? stored.otp : null;
  }
}
