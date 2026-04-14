import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { EmailProvider } from '../notifications/providers/email.provider';

@Module({
  controllers: [ContactController],
  providers: [ContactService, EmailProvider],
})
export class ContactModule {}