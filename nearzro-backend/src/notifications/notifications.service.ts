import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueue } from './queue/notification.queue';
import { SendNotificationDto } from './dto/send-notification.dto';
import { resolveTemplate } from './utils/notification-template.util';
import { getUserEnabledChannels } from './utils/notification-preference.util';
import { NotificationGateway } from './websocket/notification.gateway';
import { NotificationActionDto } from './dto/notification-action.dto';
import { NotificationChannel } from './enums/notification-channel.enum';

// src/notifications/notifications.service.ts
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationQueue,
    private readonly gateway: NotificationGateway,
  ) {}

  // ✅ Get all notifications (Admin)
  async getAllNotifications(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.notification.count(),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ✅ Get user notifications
  async getUserNotifications(userId: number, page: number = 1, limit: number = 20, read?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (read !== undefined) {
      where.read = read;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              date: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount: await this.getUnreadCount(userId),
    };
  }

  // ✅ Get unread count
  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  // ✅ Mark notification as read
  async markAsRead(notificationId: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  // ✅ Mark all as read
  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

 async send(dto: SendNotificationDto) {
  const template = resolveTemplate(dto.type, dto.metadata);

  const notification = await this.prisma.notification.create({
    data: {
      userId: dto.userId,
      type: dto.type,
      title: template.title,
      message: template.message,
      priority: dto.priority ?? 'NORMAL',
      eventId: dto.eventId,
    },
  });

  const channels = await getUserEnabledChannels(
    this.prisma,
    dto.userId,
    dto.type,
  );

  for (const channel of channels) {
    if (channel === NotificationChannel.IN_APP) {
      this.gateway.emitToUser(dto.userId, notification);
    } else {
      await this.queue.add({
        notificationId: notification.id,
        channel,
      });
    }
  }
}


  // ✅ THIS METHOD MUST EXIST
  async handleAction(userId: number, dto: NotificationActionDto) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: dto.notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Only update event if eventId exists and action is ACCEPT or REJECT
    if (notification.eventId) {
      if (dto.action === 'ACCEPT') {
        await this.prisma.event.update({
          where: { id: notification.eventId },
          data: { status: 'CONFIRMED' },
        });
      }

      if (dto.action === 'REJECT') {
        await this.prisma.event.update({
          where: { id: notification.eventId },
          data: { status: 'CANCELLED' },
        });
      }
    }

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }
}
