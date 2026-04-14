import { Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { EmailProvider } from '../notifications/providers/email.provider';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly emailProvider: EmailProvider) {}

  async submitContactForm(dto: CreateContactDto): Promise<{ success: boolean; message: string }> {
    this.logger.log(`New contact form submission from: ${dto.email}`);
    
    this.logger.log(`Contact details: ${JSON.stringify({
      name: dto.name,
      email: dto.email,
      message: dto.message,
      timestamp: new Date().toISOString(),
    })}`);

    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@nearzro.com';
      
      const subject = `New Contact Form Submission from ${dto.name}`;
      const textContent = `Name: ${dto.name}\nEmail: ${dto.email}\nMessage: ${dto.message}\n\nSubmitted at: ${new Date().toISOString()}`;
      const htmlContent = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${dto.name}</p>
        <p><strong>Email:</strong> ${dto.email}</p>
        <p><strong>Message:</strong></p>
        <p>${dto.message}</p>
        <hr/>
        <p><em>Submitted at: ${new Date().toISOString()}</em></p>
      `;

      await this.emailProvider.send(adminEmail, subject, textContent, htmlContent);
      this.logger.log(`Contact form email sent to admin: ${adminEmail}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to send contact email: ${errorMessage}`);
    }

    return { success: true, message: 'Message received successfully' };
  }
}