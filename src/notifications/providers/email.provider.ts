import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailProvider {
  async send(to: string, subject: string, body: string) {
    console.log('📧 EMAIL sent to', to);
  }
}
