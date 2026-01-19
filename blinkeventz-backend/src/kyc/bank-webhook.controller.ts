import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import * as crypto from 'crypto';

@ApiTags('Bank')
@Controller('webhooks/bank')
export class BankWebhookController {
  constructor(private prisma: PrismaService) {}

  @Post('verification')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-signature') signature: string,
  ) {
    /**
     * 1️⃣ Verify webhook signature (HMAC)
     */
    const secret = process.env.BANK_WEBHOOK_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    /**
     * 2️⃣ Validate payload
     */
    const { referenceId, verified } = payload;

    if (!referenceId || typeof verified !== 'boolean') {
      throw new BadRequestException('Invalid webhook payload');
    }

    /**
     * 3️⃣ Fetch bank account
     */
    const account = await this.prisma.bankAccount.findUnique({
      where: { referenceId },
    });

    if (!account) {
      throw new NotFoundException(
        'Bank account not found for referenceId',
      );
    }

    /**
     * 4️⃣ Idempotency check
     * Ignore duplicate verification callbacks
     */
    if (account.isVerified && verified === true) {
      return {
        message: 'Bank account already verified',
      };
    }

    /**
     * 5️⃣ Update verification status
     */
    await this.prisma.bankAccount.update({
      where: { referenceId },
      data: {
        isVerified: verified,
      },
    });

    /**
     * 6️⃣ (Optional) Audit log
     */
    await this.prisma.bankWebhookLog.create({
      data: {
        referenceId,
        payload,
        status: verified ? 'VERIFIED' : 'FAILED',
      },
    });

    return {
      success: true,
      referenceId,
      verified,
    };
  }
}
