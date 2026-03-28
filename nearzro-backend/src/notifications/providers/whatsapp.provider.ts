import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Twilio } from 'twilio';
import { ConfigService } from '@nestjs/config';
import { CircuitBreaker } from '../utils/circuit-breaker';

export interface WhatsAppResult {
  sid: string;
  status: string;
}

@Injectable()
export class WhatsappProvider implements OnModuleInit {
  private readonly logger = new Logger(WhatsappProvider.name);
  private client: Twilio | null = null;
  private whatsappFrom: string | undefined;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly configService: ConfigService) {
    const threshold = this.configService.get<number>('CIRCUIT_BREAKER_THRESHOLD', 5);
    const timeout = this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 60000);
    
    this.circuitBreaker = new CircuitBreaker({
      threshold,
      timeout,
      name: 'WhatsappProvider',
    });
  }

  onModuleInit() {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.whatsappFrom = this.configService.get<string>('TWILIO_WHATSAPP_FROM');

    if (accountSid && authToken && this.whatsappFrom) {
      try {
        this.client = new Twilio(accountSid, authToken);
        this.logger.log('✅ Twilio WhatsApp provider initialized');
      } catch (error) {
        this.logger.error('❌ Failed to initialize Twilio WhatsApp client:', error.message);
        this.client = null;
      }
    } else {
      this.logger.warn(
        '⚠️ Twilio credentials not configured. WhatsApp sending will be disabled. ' +
        'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in environment variables.',
      );
    }
  }

  async send(to: string, message: string): Promise<WhatsAppResult> {
    if (!this.client) {
      this.logger.error('❌ WhatsApp provider not initialized. Twilio credentials missing.');
      throw new Error('WhatsApp provider not configured. Please set Twilio credentials.');
    }

    // ✅ Validate phone number (E.164 format)
    if (!to || !this.isValidPhoneNumber(to)) {
      throw new Error(`Invalid phone number: ${to}. Must be in E.164 format (e.g., +1234567890)`);
    }

    // ✅ Validate message length
    if (!message || message.length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 4096) {
      throw new Error('Message must be 4096 characters or less');
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const result = await this.client!.messages.create({
          from: this.whatsappFrom!,
          to: `whatsapp:${to}`,
          body: message,
        });

        this.logger.log(`✅ WhatsApp sent successfully to ${to}. SID: ${result.sid}, Status: ${result.status}`);
        
        return {
          sid: result.sid,
          status: result.status,
        };
      } catch (error) {
        this.logger.error(`❌ Failed to send WhatsApp to ${to}:`, error.message);
        throw error;
      }
    });
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
