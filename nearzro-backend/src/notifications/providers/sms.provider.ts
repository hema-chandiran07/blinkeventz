import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Twilio } from 'twilio';
import { ConfigService } from '@nestjs/config';
import { CircuitBreaker } from '../utils/circuit-breaker';

export interface SmsResult {
  sid: string;
  status: string;
}

@Injectable()
export class SmsProvider implements OnModuleInit {
  private readonly logger = new Logger(SmsProvider.name);
  private client: Twilio | null = null;
  private smsFrom: string | undefined;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly configService: ConfigService) {
    const threshold = this.configService.get<number>('CIRCUIT_BREAKER_THRESHOLD', 5);
    const timeoutMs = this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 60000);

    this.circuitBreaker = new CircuitBreaker({
      name: 'SmsProvider',
      threshold,
      timeout: timeoutMs,
    });
  }

  onModuleInit() {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.smsFrom = this.configService.get<string>('TWILIO_SMS_FROM');

    if (accountSid && authToken && this.smsFrom) {
      try {
        this.client = new Twilio(accountSid, authToken);
        this.logger.log('✅ Twilio SMS provider initialized');
      } catch (error) {
        this.logger.error('❌ Failed to initialize Twilio SMS client:', error.message);
        this.client = null;
      }
    } else {
      this.logger.warn(
        '⚠️ Twilio credentials not configured. SMS sending will be disabled. ' +
        'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_FROM in environment variables.',
      );
    }
  }

  async send(to: string, message: string): Promise<SmsResult> {
    if (!this.client) {
      this.logger.error('❌ SMS provider not initialized. Twilio credentials missing.');
      throw new Error('SMS provider not configured. Please set Twilio credentials.');
    }

    // Validate phone number (E.164 format)
    if (!to || !this.isValidPhoneNumber(to)) {
      throw new Error(`Invalid phone number: ${to}. Must be in E.164 format (e.g., +1234567890)`);
    }

    // Validate message length
    if (!message || message.length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 1600) {
      throw new Error('Message must be 1600 characters or less');
    }

    // 🔄 Retry logic with exponential backoff + jitter for transient errors
    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.circuitBreaker.execute(async () => {
          const result = await this.client!.messages.create({
            from: this.smsFrom!,
            to,
            body: message,
          });

          this.logger.log(`✅ SMS sent successfully to ${to}. SID: ${result.sid}, Status: ${result.status}`);
          
          return {
            sid: result.sid,
            status: result.status,
          };
        });
      } catch (error: any) {
        lastError = error;
        const isTransient = this.isTransientError(error);

        if (!isTransient || attempt === maxAttempts) {
          throw error;
        }

        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        this.logger.warn(`SMS send attempt ${attempt} failed (transient). Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Determines if an error is transient (network/timeout) vs permanent (validation)
   */
  private isTransientError(error: any): boolean {
    const transientPatterns = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|network|timeout|status=4[012]|Service Unavailable/i;
    return transientPatterns.test(error.message || '');
  }

  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[country code][subscriber number]
    // Must start with + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getCircuitBreakerState() {
    return {
      state: this.circuitBreaker.getState(),
      failures: this.circuitBreaker.getFailures(),
    };
  }
}
