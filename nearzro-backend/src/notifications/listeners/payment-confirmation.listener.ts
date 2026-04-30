import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications.service';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class PaymentConfirmationListener {
  private readonly logger = new Logger(PaymentConfirmationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('payment.confirmed')
  async handle(payload: { payment: { id: number; userId: number; amount: number }; cartItems: any[]; traceId: string }) {
    this.logger.log({ event: 'PAYMENT_CONFIRMATION_RECEIVED', payload });

    // Send payment confirmation notification to the user
    try {
      const userId = payload.payment?.userId;
      if (!userId) return;

      const amount = payload.payment?.amount ? payload.payment.amount / 100 : 0; // convert paise to rupees
      const message = `Your payment of ₹${amount.toFixed(2)} has been confirmed.`;

      await this.notificationsService.send({
        userId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Confirmed',
        message,
        metadata: { paymentId: payload.payment?.id, traceId: payload.traceId },
      });
    } catch (error) {
      this.logger.error(error, 'Failed to process payment confirmation notification');
    }
  }
}
