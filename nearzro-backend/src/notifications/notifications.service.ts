import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueue } from './queue/notification.queue';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ComposeMessageDto } from './dto/compose-message.dto';
import { resolveTemplate } from './utils/notification-template.util';
import { getUserEnabledChannels } from './utils/notification-preference.util';
import { NotificationGateway } from './websocket/notification.gateway';
import { NotificationActionDto } from './dto/notification-action.dto';
import { NotificationChannel } from './enums/notification-channel.enum';
import { EmailProvider } from './providers/email.provider';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationQueue,
    private readonly gateway: NotificationGateway,
  ) {}

  // ============================================================================
  // GET NOTIFICATIONS
  // ============================================================================

  // Get all notifications (Admin)
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

  // Get user notifications
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

  // Get unread count
  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  // ============================================================================
  // MARK AS READ
  // ============================================================================

  // Mark notification as read
  async markAsRead(notificationId: number, userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { success: true, count: result.count };
  }

  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId: number, userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: false,
        readAt: null,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }

    return { success: true, count: result.count };
  }

  // Mark all as read
  async markAllAsRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { success: true, count: result.count };
  }

  // ============================================================================
  // DELETE NOTIFICATIONS
  // ============================================================================

  // Delete single notification
  async deleteNotification(notificationId: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true, message: 'Notification deleted' };
  }

  // Delete all notifications (clear all)
  async deleteAllNotifications(userId: number) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return { success: true, deleted: result.count };
  }

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  // Get notification preferences
  async getPreferences(userId: number) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { type: 'asc' },
    });
  }

  // Update notification preference
  async updatePreference(userId: number, type: string, channel: string, enabled: boolean) {
    // Upsert: update if exists, create if not
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_type_channel: {
          userId,
          type: type as any,
          channel: channel as any,
        },
      },
      update: { enabled },
      create: {
        userId,
        type: type as any,
        channel: channel as any,
        enabled,
      },
    });
  }

  // Update global preferences (bulk update for specific channels across all types)
  async updateGlobalPreferences(userId: number, channels: { IN_APP?: boolean; EMAIL?: boolean; SMS?: boolean; WHATSAPP?: boolean; PUSH?: boolean }) {
    const notificationTypes = [
      'KYC_SUBMITTED', 'KYC_APPROVED', 'KYC_REJECTED', 'BOOKING_REQUEST',
      'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED',
      'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED',
      'SYSTEM_ALERT', 'PROMOTIONAL', 'MESSAGE_RECEIVED'
    ];

    const updates: Promise<any>[] = [];
    for (const type of notificationTypes) {
      for (const [channel, enabled] of Object.entries(channels)) {
        if (enabled !== undefined) {
          updates.push(
            this.prisma.notificationPreference.upsert({
              where: {
                userId_type_channel: {
                  userId,
                  type: type as any,
                  channel: channel as any,
                },
              },
              update: { enabled },
              create: {
                userId,
                type: type as any,
                channel: channel as any,
                enabled,
              },
            })
          );
        }
      }
    }

    await Promise.all(updates);
    return { success: true, message: 'Global preferences synchronized' };
  }

  // ============================================================================
  // SEND NOTIFICATIONS
  // ============================================================================

  async send(dto: SendNotificationDto) {
    const template = resolveTemplate(dto.type, dto.metadata);

    // If targetAudience is provided, send to multiple users
    if (dto.targetAudience && dto.targetAudience !== 'all') {
      return this.sendToAudience(dto, template);
    }

    // If userId is provided, send to specific user
    if (dto.userId) {
      return this.sendToUser(dto, template);
    }

    // If no userId or targetAudience, send to all users
    return this.sendToAll(dto, template);
  }

  async sendToUser(dto: SendNotificationDto, template: any) {
    if (!dto.userId) {
      throw new Error('userId is required for sendToUser');
    }

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

    const channels = dto.channels || await getUserEnabledChannels(
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

    return notification;
  }

  async sendToAudience(dto: SendNotificationDto, template: any) {
    // Get users based on target audience
    const where: any = {};
    if (dto.targetAudience === 'customers') {
      where.role = 'CUSTOMER';
    } else if (dto.targetAudience === 'vendors') {
      where.role = 'VENDOR';
    } else if (dto.targetAudience === 'venue_owners') {
      where.role = 'VENUE_OWNER';
    } else if (dto.targetAudience === 'admins') {
      where.role = 'ADMIN';
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true },
    });

    const notifications = await this.prisma.notification.createMany({
      data: users.map(user => ({
        userId: user.id,
        type: dto.type,
        title: template.title,
        message: template.message,
        priority: dto.priority ?? 'NORMAL',
        eventId: dto.eventId,
      })),
    });

    // Queue notifications for delivery
    for (const user of users) {
      const channels = dto.channels || ['IN_APP'];
      for (const channel of channels) {
        if (channel === NotificationChannel.IN_APP) {
          this.gateway.emitToUser(user.id, { userId: user.id, ...template });
        }
      }
    }

    return { count: notifications.count, targetAudience: dto.targetAudience };
  }

  async sendToAll(dto: SendNotificationDto, template: any) {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });

    const notifications = await this.prisma.notification.createMany({
      data: users.map(user => ({
        userId: user.id,
        type: dto.type,
        title: template.title,
        message: template.message,
        priority: dto.priority ?? 'NORMAL',
        eventId: dto.eventId,
      })),
    });

    // Queue notifications for delivery
    for (const user of users) {
      const channels = dto.channels || ['IN_APP'];
      for (const channel of channels) {
        if (channel === NotificationChannel.IN_APP) {
          this.gateway.emitToUser(user.id, { userId: user.id, ...template });
        }
      }
    }

    return { count: notifications.count, targetAudience: 'all' };
  }

  // ============================================================================
  // COMPOSE AND SEND MESSAGE (with email + notification)
  // ============================================================================

  /**
   * Compose and send a custom message to a specific user
   * Creates in-app notification AND sends email
   */
  async composeAndSendMessage(dto: ComposeMessageDto, senderId: number) {
    // Validate recipient user exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!recipient) {
      throw new NotFoundException(`User ID ${dto.userId} not found`);
    }

    // Create in-app notification
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: 'SYSTEM_ALERT',
        title: dto.title,
        message: dto.message,
        priority: dto.priority ?? 'NORMAL',
        metadata: dto.metadata || {},
      },
    });

    // Send via WebSocket for real-time delivery
    this.gateway.emitToUser(dto.userId, notification);

    // Send email if channel includes EMAIL  
    const channels = dto.channels || ['IN_APP'];
    let emailSent = false;
    let emailError: string | null = null;

    if (channels.includes('EMAIL') && recipient.email) {
      try {
        // Use static method to send email (EmailProvider needs ConfigService injection)
        emailSent = await this.sendEmailNotification(
          recipient.email,
          dto.title,
          dto.message,
        );
      } catch (error) {
        emailError = error.message;
        console.error('Failed to send email:', error.message);
      }
    }

    // Log the message sending action
    await this.prisma.auditLog.create({
      data: {
        actorId: senderId,
        action: 'MESSAGE_SENT',
        entityType: 'Notification',
        entityId: notification.id.toString(),
        severity: 'INFO',
        source: 'ADMIN',
        description: `Message sent to user ${dto.userId}`,
        metadata: JSON.stringify({
          recipientId: dto.userId,
          recipientEmail: recipient.email,
          channels,
          emailSent,
          emailError,
        }),
      },
    });

    return {
      success: true,
      notification: {
        id: notification.id,
        userId: dto.userId,
        title: dto.title,
        priority: notification.priority,
        createdAt: notification.createdAt,
      },
      email: {
        sent: emailSent,
        error: emailError,
        recipientEmail: recipient.email,
      },
    };
  }

  /**
   * Handle action (accept/reject) on a notification
   */
  async handleAction(userId: number, dto: NotificationActionDto) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: dto.notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Mark as read
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Helper method to send email notification
   */
  private async sendEmailNotification(to: string, subject: string, message: string): Promise<boolean> {
    const nodemailer = require('nodemailer');
    
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    
    if (!gmailUser || !gmailAppPassword) {
      console.warn('Email not configured - skipping email send');
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    const emailFrom = process.env.EMAIL_FROM || 'no-reply@nearzro.com';

    await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">${subject}</h2>
          <div style="color: #555; line-height: 1.6;">${message}</div>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            This is an automated message from NearZro Event Management System.
          </p>
        </div>
      `,
    });

    return true;
  }
}
