import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsProvider {
  async send(to: string, message: string) {
    console.log('📩 SMS sent to', to);
  }
}
