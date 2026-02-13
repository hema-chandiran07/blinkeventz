import { NotificationChannel, NotificationPriority } from '@prisma/client';

export class NotificationEvent {
  constructor(
    public readonly notificationId: number,
    public readonly channel: NotificationChannel,
    public readonly priority: NotificationPriority,
  ) {}
}
