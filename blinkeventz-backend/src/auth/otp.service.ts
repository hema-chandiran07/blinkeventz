import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();
  private sendgridApiKey: string;
  private emailFrom: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {
    this.sendgridApiKey = this.config.get<string>('SENDGRID_API_KEY') || '';
    this.emailFrom = this.config.get<string>('EMAIL_FROM') || 'no-reply@NearZro.com';
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

    // Send via Email using SendGrid
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
   * Send OTP via email using SendGrid
   */
  private async sendEmail(email: string, otp: string): Promise<void> {
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
            subject: 'Your NearZro Verification Code',
          }],
          from: { email: this.emailFrom, name: 'NearZro' },
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
            `,
          }],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ SendGrid Error:', error);
        // Log OTP to console as fallback
        console.log(`\n📧 OTP for ${email}: ${otp}\n⚠️  SendGrid failed - ${error.errors?.[0]?.message || 'Unknown error'}\n`);
      } else {
        console.log(`✅ Email sent successfully to ${email}`);
      }
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      // Fallback: log OTP to console
      console.log(`\n📧 OTP for ${email}: ${otp}\n⚠️  Email sending failed - use this code instead\n`);
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
}
