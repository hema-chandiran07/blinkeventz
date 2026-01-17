import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { NotificationEvent } from '../events/notification.event';
import { NotificationQueue } from '../queue/notification.queue';

@Injectable()
export class NotificationListener {
  constructor(private readonly queue: NotificationQueue) {}

  @OnEvent('notification.send')
  async handle(event: NotificationEvent) {
    await this.queue.add(event);
  }
}
