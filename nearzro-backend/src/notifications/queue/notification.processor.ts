import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { WhatsappProvider } from '../providers/whatsapp.provider';

@Processor('notifications') // ✅ SAME NAME
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

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

    try {
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
    } catch (error: any) {
      // Log with job metadata for observability
      this.logger.error({
        event: 'NOTIFICATION_PROCESSING_FAILED',
        jobId: job.id,
        jobName: job.name,
        notificationId,
        channel,
        error: error.message,
        stack: error.stack,
      });

      // Distinguish permanent failures (validation) from transient (network)
      const isTransient = this.isTransientError(error);
      if (!isTransient) {
        // Permanent failure - do not retry
        return;
      }
      // Transient error - rethrow to let BullMQ retry with backoff
      throw error;
    }
  }

  /**
   * Determines if an error is transient (network/timeout) vs permanent (validation)
   */
  private isTransientError(error: any): boolean {
    const transientPatterns = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|network|timeout/i;
    return transientPatterns.test(error.message);
  }
}
