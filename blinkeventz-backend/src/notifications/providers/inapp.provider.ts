import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InAppProvider {
  constructor(private readonly prisma: PrismaService) {}

  async send(data: any) {
    await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
        status: 'SENT',
      },
    });
  }
}
