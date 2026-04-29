import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentConfirmationListener {
  private readonly logger = new Logger(PaymentConfirmationListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent('payment.confirmed')
  async handlePaymentConfirmed(payload: { payment: any; cartItems: any[]; traceId: string }) {
    const { payment, cartItems, traceId } = payload;
    try {
      for (const item of cartItems) {
        if (item.venueId) {
          const venue = await this.prisma.venue.findUnique({
            where: { id: item.venueId },
            select: { ownerId: true, name: true },
          });
          if (venue?.ownerId) {
            await this.notificationsService.send({
              userId: venue.ownerId,
              title: 'New Booking Received',
              message: `A new booking confirmed for ${venue.name}. Please review and respond.`,
              type: 'BOOKING_CONFIRMED',
              metadata: { paymentId: payment.id, venueId: item.venueId, traceId },
            } as any);
          }
        }
        if (item.vendorServiceId) {
          const service = await this.prisma.vendorService.findUnique({
            where: { id: item.vendorServiceId },
            include: { vendor: { select: { userId: true, businessName: true } } },
          });
          if (service?.vendor?.userId) {
            await this.notificationsService.send({
              userId: service.vendor.userId,
              title: 'New Service Booking',
              message: `A booking confirmed for ${service.vendor.businessName}. Please review and respond.`,
              type: 'BOOKING_CONFIRMED',
              metadata: { paymentId: payment.id, vendorServiceId: item.vendorServiceId, traceId },
            } as any);
          }
        }
      }
      await this.notificationsService.send({
        userId: payment.userId,
        title: 'Booking Confirmed!',
        message: 'Your payment was successful and your booking is confirmed. Track it in your dashboard.',
        type: 'BOOKING_CONFIRMED',
        metadata: { paymentId: payment.id, traceId },
      } as any);
    } catch (error: any) {
      this.logger.error({ event: 'PAYMENT_NOTIFICATION_FAILED', traceId, error: error.message });
    }
  }
}
