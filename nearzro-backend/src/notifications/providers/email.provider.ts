import { Injectable } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailProvider {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async send(to: string, subject: string, text: string) {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM!,
      subject,
      text,
    });
  }
}
