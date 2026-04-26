import { NotificationType } from '@prisma/client';
import { bookingConfirmedTemplate } from './booking-confirmed.template';
import { bookingRequestTemplate } from './booking-request.template';
import { vendorDecisionTemplate } from './vendor-decision.template';
import { kycDecisionTemplate } from './kyc-decision.template';
import { venueStatusTemplate } from './venue-status.template';

export const notificationTemplates = {
  [NotificationType.BOOKING_CONFIRMED]: bookingConfirmedTemplate,
  [NotificationType.BOOKING_CANCELLED]: (d) => ({
    title: '❌ Booking Cancelled',
    message: `The booking for ${d.eventTitle} on ${d.date} has been cancelled.`,
    deepLink: `/dashboard/bookings/${d.bookingId}`,
  }),
  [NotificationType.VENDOR_APPROVED]: (d) =>
    vendorDecisionTemplate({ ...d, approved: true }),
  [NotificationType.VENDOR_REJECTED]: (d) =>
    vendorDecisionTemplate({ ...d, approved: false }),
  [NotificationType.KYC_APPROVED]: (d) =>
    kycDecisionTemplate({ ...d, status: 'VERIFIED' }),
  [NotificationType.KYC_REJECTED]: (d) =>
    kycDecisionTemplate({ ...d, status: 'REJECTED' }),
  [NotificationType.VENUE_APPROVED]: (d) =>
    venueStatusTemplate({ ...d, status: 'APPROVED' }),
  [NotificationType.VENUE_REJECTED]: (d) =>
    venueStatusTemplate({ ...d, status: 'REJECTED' }),
  [NotificationType.PAYMENT_SUCCESS]: (d) => ({
    title: '💰 Payment Received',
    message: `Payment of ₹${d.amount} for "${d.eventTitle}" was successful.`,
    deepLink: `/dashboard/transactions/${d.transactionId}`,
  }),
};
