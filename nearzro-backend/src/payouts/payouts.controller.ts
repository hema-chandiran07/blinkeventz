import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Roles(Role.ADMIN)
  @Get()
  getAllPayouts(@Query() query: any) {
    return this.payoutsService.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  getPayoutById(@Param('id') id: string) {
    return this.payoutsService.findOne(+id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  approvePayout(@Param('id') id: string) {
    return this.payoutsService.approve(+id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  rejectPayout(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.payoutsService.reject(+id, body.reason);
  }

  @Roles(Role.ADMIN)
  @Post(':id/process')
  processPayout(@Param('id') id: string) {
    return this.payoutsService.process(+id);
  }

  @Roles(Role.ADMIN)
  @Get('export/csv')
  async exportPayouts(@Res() res: any) {
    const data = await this.payoutsService.export();
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="payouts.csv"');
    res.send(data);
  }

  // Venue Owner - Get my payouts (must be before :id route to avoid conflict)
  @UseGuards(JwtAuthGuard)
  @Get('venue-owner/me')
  async getVenueOwnerPayouts(@Req() req: any, @Query() query: any) {
    return this.payoutsService.findByVenueOwner(req.user.userId, query);
  }

  // Venue Owner - Get my payout stats
  @UseGuards(JwtAuthGuard)
  @Get('venue-owner/stats')
  async getVenueOwnerStats(@Req() req: any) {
    return this.payoutsService.getVenueOwnerStats(req.user.userId);
  }

  // ── Razorpay X Webhook ──────────────────────────────────────────────────
  // Receives payout.processed / payout.reversed / payout.failed events and
  // moves the payout status to COMPLETED or FAILED accordingly.
  @Public()
  @Post('webhook/razorpay-x')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay X payout webhook (payout.processed / payout.failed)' })
  async handleRazorpayXWebhook(
    @Body() body: any,
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      if (!signature) {
        throw new UnauthorizedException('Missing Razorpay-X webhook signature');
      }
      // Use raw body bytes for accurate HMAC (req.rawBody enabled via main.ts rawBody:true)
      const rawBody: Buffer = req.rawBody ?? Buffer.from(JSON.stringify(body));
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        throw new UnauthorizedException('Invalid Razorpay-X webhook signature');
      }
    }

    await this.payoutsService.handleWebhookEvent(body);
    return { received: true };
  }
}


