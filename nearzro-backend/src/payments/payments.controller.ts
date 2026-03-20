// src/payments/payments.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthRequest } from '../auth/auth-request.interface';
import { Public } from '../common/decorators/public.decorator';
import { CreatePaymentDto, CreateSimplePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentOrderResponseDto, PaymentConfirmResponseDto, PaymentStatusResponseDto } from './dto/payment-response.dto';

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

  // ============================================================
  // ENDPOINT 1: Create Payment Order (with cart)
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Razorpay payment order for cart',
    description: 'Creates a payment order and locks the cart. Returns Razorpay order data for client-side payment.'
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment order created successfully',
    type: PaymentOrderResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid cart or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createOrder(
    @Req() req: AuthRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreatePaymentDto,
  ): Promise<PaymentOrderResponseDto> {
    const requestId = this.normalizeHeader(req.headers['x-request-id']);
    return this.paymentsService.createOrder(req.user.userId, dto, requestId);
  }

  // ============================================================
  // ENDPOINT 2: Create Simplified Payment (no cart)
  // ============================================================

  @Public()
  @Post('create-order-simple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Razorpay payment order (simplified)',
    description: 'Creates a payment order without a cart. For booking flows where cart is not used.'
  })
  @ApiBody({ type: CreateSimplePaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment order created successfully',
    type: PaymentOrderResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid amount or validation error' })
  async createOrderSimple(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateSimplePaymentDto,
    @Headers('x-request-id') rawRequestId?: string,
  ): Promise<PaymentOrderResponseDto> {
    const requestId = this.normalizeHeader(rawRequestId);
    return this.paymentsService.createOrderSimple(dto, requestId);
  }

  /**
   * Helper to normalize header values (string | string[] | undefined) to string | undefined
   */
  private normalizeHeader(value: string | string[] | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value[0];
    return value;
  }

  // ============================================================
  // ENDPOINT 3: Confirm Payment (Client Callback - FALLBACK)
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm payment (client callback)',
    description: 'CONFIRMATION IS PRIMARY SOURCE OF TRUTH. This endpoint verifies payment signature and confirms payment.'
  })
  @ApiBody({ type: ConfirmPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed successfully',
    type: PaymentConfirmResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid signature or payment already confirmed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async confirmPayment(
    @Req() req: AuthRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: ConfirmPaymentDto,
  ): Promise<PaymentConfirmResponseDto> {
    const requestId = this.normalizeHeader(req.headers['x-request-id']);
    return this.paymentsService.confirmPayment(req.user.userId, dto, requestId);
  }

  // ============================================================
  // ENDPOINT 4: Get Payment Status
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get('status/:paymentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment status by ID' })
  @ApiParam({ name: 'paymentId', type: Number, description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved',
    type: PaymentStatusResponseDto
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your payment' })
  async getPaymentStatus(
    @Req() req: AuthRequest,
    @Param('paymentId', ParseIntPipe) paymentId: number,
  ): Promise<PaymentStatusResponseDto> {
    return this.paymentsService.getPaymentStatus(paymentId, req.user.userId);
  }

  // ============================================================
  // ENDPOINT 5: Get Payment by Order ID
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get('order/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment by Razorpay order ID' })
  @ApiParam({ name: 'orderId', type: String, description: 'Razorpay order ID' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your payment' })
  async getPaymentByOrderId(
    @Req() req: AuthRequest,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.getPaymentByOrderId(orderId, req.user.userId);
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
