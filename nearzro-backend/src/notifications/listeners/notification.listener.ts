import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { NotificationEvent } from '../events/notification.event';
import { NotificationQueue } from '../queue/notification.queue';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationListener {
  constructor(private readonly queue: NotificationQueue) {}

  @OnEvent('notification.send')
  async handle(event: NotificationEvent) {
    // ✅ IN_APP handled elsewhere (WebSocket)
    if (event.channel === NotificationChannel.IN_APP) {
      return;
    }

    await this.queue.add({
      notificationId: event.notificationId,
      channel: event.channel, // now type-safe
    });
  }
}
