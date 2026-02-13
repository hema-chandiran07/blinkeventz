// src/notifications/providers/sms.provider.ts
import { Injectable } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class SmsProvider {
  private client: Twilio;

  constructor() {
    this.client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
  }

  async send(to: string, message: string) {
    await this.client.messages.create({
      from: process.env.TWILIO_SMS_FROM!,
      to,
      body: message,
    });
  }
}
