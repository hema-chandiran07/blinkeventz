import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bull';

@Injectable()
export class NotificationQueue {
  constructor(
    @InjectQueue('notifications') // ✅ MUST MATCH MODULE
    public readonly queue: Queue, // ✅ Changed from private to public
  ) {}

   async add(data: {
     notificationId: number;
     channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
   }) {
      await this.queue.add('send', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
      });
   }
}
