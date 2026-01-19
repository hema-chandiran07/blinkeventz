import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappProvider {
  async send(to: string, message: string) {
    console.log('💬 WhatsApp sent to', to);
  }
}
