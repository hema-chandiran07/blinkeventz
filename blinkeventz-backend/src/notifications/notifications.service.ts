import { Injectable } from '@nestjs/common';
import { NotificationQueue } from './queue/notification.queue';
import { CreateNotificationDto } from './dto/create-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly queue: NotificationQueue) {}

  async send(dto: CreateNotificationDto) {
    await this.queue.add(dto);
  }
}
