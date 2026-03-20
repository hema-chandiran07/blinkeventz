// src/payments/payments.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {ApiBearerAuth,ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/auth-request.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiBearerAuth()
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ✅ Get all payments (Admin only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all payments (Admin only)' })
  async getAllPayments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.paymentsService.getAllPayments(page, limit, status);
  }

  // ✅ Create payment order for logged-in user (with cart)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('create-order')
  @ApiOperation({ summary: 'Create Razorpay order for cart' })
  @ApiBody({ schema: { properties: { cartId: { type: 'number' } } } })
  createOrder(
    @Req() req: AuthRequest,
    @Body() body: { cartId: number },
  ) {
    return this.paymentsService.createOrder(
      req.user.userId,
      body.cartId,
    );
  }

  // ✅ Create payment order (simplified - for checkout without cart)
  @Public()
  @Post('create-order-simple')
  @ApiOperation({ summary: 'Create Razorpay order (simplified)' })
  @ApiBody({
    schema: {
      properties: {
        amount: { type: 'number' },
        currency: { type: 'string', default: 'INR' },
        items: { type: 'array' }
      }
    }
  })
  createOrderSimple(
    @Body() body: { amount: number; currency?: string; items?: any[] },
  ) {
    return this.paymentsService.createOrderSimple(
      body.amount,
      body.currency || 'INR',
      body.items,
    );
  }

  // ✅ Confirm payment
  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  @ApiOperation({ summary: 'Confirm Razorpay payment' })
  confirm(
    @Req() req: AuthRequest,
    @Body()
    body: {
      cartId?: number;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      items?: any[];
      customerDetails?: any;
    },
  ) {
    return this.paymentsService.confirmPayment(
      req.user.userId,
      body,
    );
  }

  // ✅ Export payments to CSV (Admin only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('export')
  @ApiOperation({ summary: 'Export payments to CSV' })
  async exportPayments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 1000,
    @Query('status') status?: string,
  ) {
    return this.paymentsService.exportPaymentsToCsv(page, limit, status);
  }
}
