import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { WhatsappProvider } from '../providers/whatsapp.provider';

@Processor('notifications') // ✅ SAME NAME
export class NotificationProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailProvider,
    private readonly sms: SmsProvider,
    private readonly whatsapp: WhatsappProvider,
  ) {}

  @Process('send')
  async handle(
    job: Job<{
      notificationId: number;
      channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
    }>,
  ) {
    const { notificationId, channel } = job.data;

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true },
    });

    if (!notification || !notification.user) return;

    const { user, title, message } = notification;

    switch (channel) {
      case 'EMAIL':
        if (user.email) await this.email.send(user.email, title, message);
        break;

      case 'SMS':
        if (user.phone) await this.sms.send(user.phone, message);
        break;

      case 'WHATSAPP':
        if (user.phone) await this.whatsapp.send(user.phone, message);
        break;
    }
  }
}
