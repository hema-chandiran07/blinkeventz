import { NotificationType } from '@prisma/client';
import { bookingConfirmedTemplate } from './booking-confirmed.template';
import { bookingRequestTemplate } from './booking-request.template';
import { vendorDecisionTemplate } from './vendor-decision.template';

export const notificationTemplates = {
  [NotificationType.BOOKING_CONFIRMED]: bookingConfirmedTemplate,
  [NotificationType.BOOKING_CANCELLED]: bookingConfirmedTemplate,
  [NotificationType.VENDOR_APPROVED]: (d) =>
    vendorDecisionTemplate({ ...d, approved: true }),
  [NotificationType.VENDOR_REJECTED]: (d) =>
    vendorDecisionTemplate({ ...d, approved: false }),
};
