import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';

@Injectable()
export class PushProvider {
  async send(userId: number, payload: any) {
    // Firebase FCM implementation here
    console.log('Push sent to user', userId, payload);
  }
}

