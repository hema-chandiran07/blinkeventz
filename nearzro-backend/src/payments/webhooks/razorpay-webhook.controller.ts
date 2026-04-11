// src/payments/webhooks/razorpay-webhook.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  Headers, 
  HttpCode, 
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
  forwardRef
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentsService } from '../payments.service';

interface RazorpayWebhookPayload {
  event: string;
  entity: string;
  account_id?: string;
  id: string;
  recipient_id?: string;
  batch_id?: string;
  request?: {
    idempotency_key?: string;
  };
  payload?: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        amount: number;
        currency: string;
        method: string;
        captured: boolean;
        card_id?: string;
        bank?: string;
        wallet?: string;
        vpa?: string;
      };
    };
    order?: {
      entity: {
        id: string;
        status: string;
        amount: number;
        currency: string;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        status: string;
      };
    };
  };
}

/**
 * Razorpay Webhook Controller - PRIMARY SOURCE OF TRUTH
 * 
 * This is the primary mechanism for payment confirmation.
 * Razorpay sends webhook events when:
 * - Payment is captured
 * - Payment fails
 * - Payment is refunded
 * - Order is expired
 * 
 * Key features:
 * - Signature verification
 * - Idempotent event processing (duplicate detection)
 * - Atomic state updates
 * - Full audit trail
 */
@Controller('webhooks/razorpay')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);
  private readonly webhookSecret: string;
  private readonly isProduction: boolean;

  constructor(
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    this.isProduction = nodeEnv === 'production';
  }

  /**
   * Handle Razorpay webhook events
   * 
   * Endpoint: POST /webhooks/razorpay
   * 
   * This is the PRIMARY SOURCE OF TRUTH for payment confirmation.
   * The client-side confirm endpoint is only a fallback.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: RazorpayWebhookPayload,
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-webhook-version') webhookVersion?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const traceId = requestId || `webhook_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    this.logger.log({
      event: 'WEBHOOK_RECEIVED',
      traceId,
      razorpayEvent: payload.event,
      entity: payload.entity,
      webhookId: payload.id,
      version: webhookVersion,
    });

    try {
      // === 1. VALIDATE WEBHOOK VERSION ===
      if (webhookVersion && webhookVersion !== '1.0.0') {
        this.logger.warn({
          event: 'WEBHOOK_UNKNOWN_VERSION',
          traceId,
          version: webhookVersion,
        });
      }

      // === 2. VERIFY SIGNATURE ===
      // Skip signature verification in development if secret not configured
      if (this.isProduction && !this.webhookSecret) {
        this.logger.error({
          event: 'WEBHOOK_SECRET_MISSING',
          traceId,
        });
        throw new UnauthorizedException('Webhook secret not configured');
      }

      // In production, always verify signature
      // In development, verify if secret is set, otherwise reject
      if (!this.webhookSecret) {
        this.logger.error({
          event: 'WEBHOOK_SECRET_NOT_CONFIGURED',
          traceId,
          reason: 'Webhook secret is not set. All webhooks will be rejected. Set RAZORPAY_WEBHOOK_SECRET.',
        });
        throw new UnauthorizedException('Webhook signature verification is not configured');
      }

      this.verifyWebhookSignature(payload, signature, traceId);

      // === 3. VERIFY REQUIRED FIELDS ===
      if (!payload.event || !payload.id) {
        this.logger.error({
          event: 'WEBHOOK_INVALID_PAYLOAD',
          traceId,
          reason: 'Missing required fields',
        });
        throw new BadRequestException('Invalid webhook payload');
      }

      // === 4. PROCESS EVENT ===
      // Note: The actual processing is delegated to the service
      // which handles idempotency, state machine validation, etc.
      const result = await this.paymentsService.handleWebhook(
        this.transformPayload(payload, traceId),
        traceId,
      );

      this.logger.log({
        event: 'WEBHOOK_PROCESSED',
        traceId,
        razorpayEvent: payload.event,
        processed: result.processed,
        message: result.message,
      });

      return {
        status: result.processed ? 'processed' : 'error',
        message: result.message,
      };

    } catch (error) {
      this.logger.error({
        event: 'WEBHOOK_ERROR',
        traceId,
        error: error.message,
        stack: error.stack,
      });
      
      // Return 200 to Razorpay to prevent retries for certain errors
      // Only return error for truly unhandled cases
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        return {
          status: 'error',
          message: error.message,
        };
      }

      // For unexpected errors, return 500 but still acknowledge
      return {
        status: 'error',
        message: 'Internal server error',
      };
    }
  }

  /**
   * Health check endpoint for webhook URL validation
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  healthCheck() {
    return { 
      status: 'healthy', 
      service: 'razorpay-webhook',
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  /**
   * Verify Razorpay webhook signature
   * 
   * Razorpay uses HMAC-SHA256 with webhook secret
   */
  private verifyWebhookSignature(
    payload: RazorpayWebhookPayload,
    signature: string,
    traceId: string,
  ): void {
    if (!signature) {
      this.logger.error({
        event: 'WEBHOOK_MISSING_SIGNATURE',
        traceId,
      });
      throw new UnauthorizedException('Missing webhook signature');
    }

    // Note: In production, Razorpay sends the signature in a specific format
    // The actual verification depends on how Razorpay sends the payload
    // For Razorpay, they send: sha256=signature
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Razorpay signature format: sha256=<signature>
    const actualSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature;

    if (actualSignature !== expectedSignature) {
      this.logger.error({
        event: 'WEBHOOK_INVALID_SIGNATURE',
        traceId,
        expected: expectedSignature,
        received: actualSignature,
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  /**
   * Transform Razorpay payload to internal format
   */
  private transformPayload(payload: RazorpayWebhookPayload, traceId: string): {
    event: string;
    payload: {
      payment?: {
        entity: {
          id: string;
          order_id: string;
          status: string;
          amount: number;
          currency: string;
        };
      };
      order?: {
        entity: {
          id: string;
          status: string;
        };
      };
    };
  } {
    this.logger.log({
      event: 'WEBHOOK_TRANSFORM',
      traceId,
      originalEvent: payload.event,
    });

    return {
      event: payload.event,
      payload: payload.payload as any,
    };
  }
}
