import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailProvider implements OnModuleInit {
  private readonly logger = new Logger(EmailProvider.name);
  private transporter: nodemailer.Transporter | null = null;
  private gmailUser: string | undefined;
  private gmailAppPassword: string | undefined;
  private emailFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.gmailUser = this.configService.get<string>('GMAIL_USER');
    this.gmailAppPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');
    this.emailFrom = this.configService.get<string>('EMAIL_FROM') || 'no-reply@NearZro.com';
  }

  onModuleInit() {
    // Initialize Gmail SMTP transporter
    if (this.gmailUser && this.gmailAppPassword) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.gmailUser,
          pass: this.gmailAppPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      this.logger.log('✅ Gmail SMTP email provider initialized');
    } else {
      this.logger.warn(
        '⚠️  Gmail credentials not configured. Email sending will be disabled. ' +
        'Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.'
      );
    }
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    // Check if Gmail is configured
    if (!this.transporter) {
      this.logger.error('❌ Email provider not initialized. Gmail credentials missing.');
      throw new Error('Email provider not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD.');
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.emailFrom,
        to,
        subject,
        text,
        html: html || text,
      });

      this.logger.log(`✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send OTP email with HTML template
   */
  async sendOtpEmail(to: string, otp: string): Promise<boolean> {
    const htmlContent = `
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
    `;

    return this.send(
      to,
      'Your NearZro Verification Code',
      `Your OTP is: ${otp}. This code will expire in 5 minutes.`,
      htmlContent
    );
  }
}
