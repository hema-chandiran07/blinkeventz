import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { WhatsappProvider } from '../providers/whatsapp.provider';
import { InAppProvider } from '../providers/inapp.provider';
import { NotificationChannel } from '../enums/notification-channel.enum';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  constructor(
    private readonly email: EmailProvider,
    private readonly sms: SmsProvider,
    private readonly whatsapp: WhatsappProvider,
    private readonly inApp: InAppProvider,
  ) {
    super();
  }

  async process(job: Job) {
    const data = job.data;

    switch (data.channel) {
      case NotificationChannel.EMAIL:
        await this.email.send(data.to, data.title, data.message);
        break;

      case NotificationChannel.SMS:
        await this.sms.send(data.to, data.message);
        break;

      case NotificationChannel.WHATSAPP:
        await this.whatsapp.send(data.to, data.message);
        break;

      case NotificationChannel.IN_APP:
      default:
        await this.inApp.send(data);
    }
  }
}
