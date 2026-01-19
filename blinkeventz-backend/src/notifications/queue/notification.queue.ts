import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationQueue {
  constructor(
    @InjectQueue('notifications')
    private readonly queue: Queue,
  ) {}

  async add(data: any) {
    await this.queue.add('send-notification', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
