<<<<<<< Updated upstream
import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
=======
import { Injectable, BadRequestException, InternalServerErrorException, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
>>>>>>> Stashed changes
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EmailProvider } from '../notifications/providers/email.provider';
import Twilio from 'twilio';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
<<<<<<< Updated upstream
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();
  private phoneOtpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();
=======
>>>>>>> Stashed changes
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
   * Generate and send OTP via Email/SMS
   * Uses database-backed OtpRecord with bcrypt hashing
   * Includes per-IP rate limiting: max 5 requests per 10 minutes
   */
<<<<<<< Updated upstream
  async sendOtp(email: string, phone?: string): Promise<{ success: boolean; message: string }> {
    // Generate real OTP and save to database
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.otpStore.set(email, { otp, expiresAt });

    // In development, always log the real OTP
    if (this.isDevMode) {
      this.logger.log(`📧 [DEV] Real Email OTP for ${email}: ${otp}`);
=======
  async sendOtp(email?: string, phone?: string, ip?: string): Promise<{ success: boolean; message: string }> {
    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
>>>>>>> Stashed changes
    }

    // Per-IP rate limiting: max 5 OTP requests from same IP in 10 minutes
    if (ip) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const ipCount = await this.prisma.otpRecord.count({
        where: {
          ipAddress: ip,
          createdAt: { gte: tenMinutesAgo },
        },
      });

      if (ipCount >= 5) {
        this.logger.warn(`IP rate limit exceeded for IP: ${ip}`);
        throw new ForbiddenException('Too many OTP requests from this IP. Please try again later.');
      }
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const otpHash = await bcrypt.hash(otp, 10);

    // Find existing user by email if provided
    let userId: number | null = null;
    if (email) {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });
      userId = user?.id ?? null;
    }

    // Store OTP record in database
    await this.prisma.otpRecord.create({
      data: {
        userId,
        email: email || null,
        phone: phone || null,
        otpHash,
        expiresAt,
        attempts: 0,
        ipAddress: ip || null,
      },
    });

    // In development, log the OTP
    if (this.isDevMode) {
      this.logger.log(`📧 [DEV] Real Email OTP for ${email || phone}: ${otp}`);
    }

    // Send OTP via email and/or SMS
    try {
      if (email) {
        await this.sendEmail(email, otp);
      }
    } catch (error: any) {
      if (this.isDevMode) {
        this.logger.warn(`[DEV] Email send failed: ${error.message} - OTP still valid for verification`);
      } else {
        throw new InternalServerErrorException('Failed to send OTP email. Please try again.');
      }
    }

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
   * Verify OTP against database record
   * Uses bcrypt comparison and tracks attempts
   */
<<<<<<< Updated upstream
  async sendPhoneOtp(phone: string): Promise<{ success: boolean; message: string }> {
    // Generate real OTP and save to database
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    this.phoneOtpStore.set(phone, { otp, expiresAt });
=======
   async verifyOtp(identifier: string, otp: string): Promise<{ success: boolean; message: string; user?: any }> {
     if (!identifier) {
       throw new BadRequestException('Email or phone is required');
     }
>>>>>>> Stashed changes

     const now = new Date();
     const isEmail = identifier.includes('@');
     const otpRecord = await this.prisma.otpRecord.findFirst({
       where: isEmail
         ? { email: identifier, expiresAt: { gt: now } }
         : { phone: identifier, expiresAt: { gt: now } },
       orderBy: { createdAt: 'desc' },
     });

     if (!otpRecord) {
       throw new BadRequestException('OTP not found or expired. Please request a new OTP.');
     }

     // Check attempts - if 5 or more failed attempts, invalidate
     if (otpRecord.attempts >= 5) {
       await this.prisma.otpRecord.delete({ where: { id: otpRecord.id } });
       throw new UnauthorizedException('Too many failed attempts. OTP has been invalidated.');
     }

     // Verify OTP using bcrypt
     const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
     if (!isValid) {
       // Increment attempt count
       await this.prisma.otpRecord.update({
         where: { id: otpRecord.id },
         data: { attempts: { increment: 1 } },
       });

       const remainingAttempts = 5 - (otpRecord.attempts + 1);
       if (remainingAttempts <= 0) {
         await this.prisma.otpRecord.delete({ where: { id: otpRecord.id } });
         throw new UnauthorizedException('Too many failed attempts. OTP has been invalidated.');
       }

       throw new BadRequestException(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
     }

<<<<<<< Updated upstream
    // Strict validation against database
    if (storedOtp.otp !== otp) {
      throw new BadRequestException('Invalid OTP. Please try again.');
    }
=======
     // OTP is valid - delete the record (one-time use)
     await this.prisma.otpRecord.delete({ where: { id: otpRecord.id } });
>>>>>>> Stashed changes

     // If verified via email and user exists, mark email as verified
     if (otpRecord.userId) {
       if (isEmail) {
         await this.prisma.user.update({
           where: { id: otpRecord.userId },
           data: { isEmailVerified: true },
         });
       }

       const user = await this.prisma.user.findUnique({
         where: { id: otpRecord.userId },
       });

       if (user) {
         return {
           success: true,
           message: isEmail ? 'Email verified successfully' : 'Phone verified successfully',
           user: {
             id: user.id,
             email: user.email,
             name: user.name,
             isEmailVerified: user.isEmailVerified,
           },
         };
       }
     }

     return {
       success: true,
       message: isEmail ? 'Email verified successfully' : 'Phone verified successfully',
       user: null,
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
<<<<<<< Updated upstream
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
    return this.sendOtp(email, phone);
  }

  /**
=======
>>>>>>> Stashed changes
   * Get OTP for development testing
   */
  getOtpForTesting(email: string): string | null {
    if (this.appEnv !== 'development') {
      return null;
    }
    // Not available for DB-backed OTP
    return null;
  }

  /**
   * Get phone OTP for development testing
   */
  getPhoneOtpForTesting(phone: string): string | null {
    if (this.appEnv !== 'development') {
      return null;
    }
    // Not available for DB-backed OTP
    return null;
  }

  // Backward compatibility wrappers for removed method names
  async sendPhoneOtp(phone: string, ip?: string): Promise<{ success: boolean; message: string }> {
    return this.sendOtp(undefined, phone, ip);
  }

  async verifyPhoneOtp(phone: string, otp: string): Promise<{ success: boolean; message: string; user?: any }> {
    return this.verifyOtp(phone, otp);
  }

  async resendOtp(email?: string, phone?: string): Promise<{ success: boolean; message: string }> {
    return this.sendOtp(email, phone, undefined);
  }
}
