import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Bank')
@Controller('webhooks/bank')
export class BankWebhookController {
  constructor(private prisma: PrismaService) {}

  @Post('verification')
  async handleWebhook(@Body() payload: any) {
    const { referenceId, verified } = payload;

    return this.prisma.bankAccount.update({
      where: { referenceId },
      data: { isVerified: verified },
    });
  }
}
