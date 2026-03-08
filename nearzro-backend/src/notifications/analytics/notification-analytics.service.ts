import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async trackSent(notificationId: number) {
    // for future dashboards
    console.log(`📊 Notification sent: ${notificationId}`);
  }

  async trackDelivered(notificationId: number) {
    console.log(`📬 Notification delivered: ${notificationId}`);
  }

  async countByType(type: NotificationType) {
    return this.prisma.notification.count({
      where: { type },
    });
  }
}
