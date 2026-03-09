import { NotificationChannel } from '@prisma/client';

export type DeliverableChannel = Exclude<
  NotificationChannel,
  'IN_APP'
>;

export interface NotificationJob {
  notificationId: number;
  channel: DeliverableChannel;
}
