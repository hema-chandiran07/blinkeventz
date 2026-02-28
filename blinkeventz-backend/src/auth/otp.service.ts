import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();
  private sendgridApiKey: string;
  private emailFrom: string;
  private twilioSid: string;
  private twilioToken: string;
  private twilioSmsFrom: string;
  private twilioWhatsappFrom: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {
    this.sendgridApiKey = this.config.get<string>('SENDGRID_API_KEY') || '';
    this.emailFrom = this.config.get<string>('EMAIL_FROM') || 'no-reply@blinkeventz.com';
    this.twilioSid = this.config.get<string>('TWILIO_ACCOUNT_SID') || '';
    this.twilioToken = this.config.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.twilioSmsFrom = this.config.get<string>('TWILIO_SMS_FROM') || '';
    this.twilioWhatsappFrom = this.config.get<string>('TWILIO_WHATSAPP_FROM') || '';
  }

  /**
   * Generate and send OTP via Email and/or SMS
   */
  async sendOtp(email: string, phone?: string): Promise<{ success: boolean; message: string }> {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP (in production, use Redis)
    this.otpStore.set(email, { otp, expiresAt });

    // Send via Email
    if (email) {
      await this.sendEmail(email, otp);
    }

    // Send via SMS if phone provided
    if (phone) {
      await this.sendSms(phone, otp);
    }

    // Log for development/testing
    console.log(`📧 OTP for ${email}: ${otp} (expires in 5 minutes)`);
    if (phone) {
      console.log(`📱 SMS OTP to ${phone}: ${otp}`);
    }

    return {
      success: true,
      message: 'OTP sent successfully to your email' + (phone ? ' and phone' : ''),
    };
  }

  /**
   * Send OTP via email using SendGrid
   */
  private async sendEmail(email: string, otp: string): Promise<void> {
    if (!this.sendgridApiKey || this.sendgridApiKey.startsWith('SG.') === false) {
      console.warn('⚠️  SendGrid API key not configured, skipping email');
      return;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email }],
            subject: 'Your BlinkEventz Verification Code',
          }],
          from: { email: this.emailFrom, name: 'BlinkEventz' },
          content: [{
            type: 'text/html',
            value: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
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
                      <h1>🎉 BlinkEventz</h1>
                      <p>Your Verification Code</p>
                    </div>
                    <div class="content">
                      <p>Hello,</p>
                      <p>Thank you for registering with BlinkEventz! Please use the following verification code to complete your registration:</p>
                      <div class="otp-box">
                        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your OTP Code:</p>
                        <div class="otp-code">${otp}</div>
                      </div>
                      <p><strong>This code will expire in 5 minutes.</strong></p>
                      <p>If you didn't request this code, please ignore this email.</p>
                      <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} BlinkEventz. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `,
          }],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('SendGrid error:', error);
        throw new Error('Failed to send email');
      }

      console.log('✅ Email sent successfully to:', email);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      // Don't throw - allow OTP to still work even if email fails
    }
  }

  /**
   * Send OTP via SMS using Twilio
   */
  private async sendSms(phone: string, otp: string): Promise<void> {
    if (!this.twilioSid || !this.twilioToken) {
      console.warn('⚠️  Twilio credentials not configured, skipping SMS');
      return;
    }

    try {
      // Check if it's a WhatsApp number (starts with whatsapp:)
      const isWhatsapp = phone.startsWith('whatsapp:');
      const fromNumber = isWhatsapp ? this.twilioWhatsappFrom : this.twilioSmsFrom;
      const toNumber = isWhatsapp ? phone : `+91${phone.replace(/\D/g, '')}`;

      const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');
      
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: toNumber,
          Body: `Your BlinkEventz verification code is: ${otp}. This code will expire in 5 minutes.`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Twilio error:', error);
        throw new Error('Failed to send SMS');
      }

      console.log('✅ SMS sent successfully to:', phone);
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      // Don't throw - allow OTP to still work even if SMS fails
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

    // OTP verified successfully - delete it and mark email as verified
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
}
