import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InAppProvider {
  async send(notification: any) {
    // Already handled via WebSocket
  }
}
