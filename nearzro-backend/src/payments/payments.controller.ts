// src/payments/payments.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
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
  BadRequestException,
  UseInterceptors} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { AuthRequest } from '../auth/auth-request.interface';
import { Public } from '../common/decorators/public.decorator';
import { CreatePaymentDto, CreateSimplePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentOrderResponseDto, PaymentConfirmResponseDto, PaymentStatusResponseDto } from './dto/payment-response.dto';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================
  constructor(private readonly paymentsService: PaymentsService) {}

  // ✅ Get all payments (Admin only)
  @ApiBearerAuth()
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

  // ✅ Get payment by ID (Admin only) - For transaction detail page
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Payment ID' })
  @ApiOperation({ summary: 'Get payment by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentById(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getPaymentById(id);
  }

  // ============================================
  // REFUND ENDPOINTS (Admin only)
  // ============================================

  /// 👑 ADMIN → Process refund for a payment
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/refund')
  @ApiParam({ name: 'id', type: Number, description: 'Payment ID' })
  @ApiOperation({ summary: 'Process refund for a payment (Admin only)' })
  @ApiBody({ schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', description: 'Refund amount' }, reason: { type: 'string', description: 'Reason for refund' } } } })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid refund request' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async processRefund(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Body() body: { amount: number; reason?: string }
  ) {
    return this.paymentsService.processRefund(id, body.amount, body.reason, req.user.userId);
  }

  /// 👑 ADMIN → Get refund history for a payment
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id/refunds')
  @ApiParam({ name: 'id', type: Number, description: 'Payment ID' })
  @ApiOperation({ summary: 'Get refund history for a payment (Admin only)' })
  @ApiResponse({ status: 200, description: 'Refund history retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getRefundHistory(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getRefundHistory(id);
  }

   // ============================================================
   // ENDPOINT 1: Create Payment Order (with cart)
   // ============================================================

   @ApiBearerAuth()
   @UseGuards(JwtAuthGuard)
   @Post('create-order')
   @HttpCode(HttpStatus.OK)
   @UseInterceptors(IdempotencyInterceptor)
   @ApiOperation({
     summary: 'Create Razorpay payment order for cart',
     description: 'Creates a payment order and locks the cart. Returns Razorpay order data for client-side payment. Requires Idempotency-Key header.',
   })
   @ApiBody({ type: CreatePaymentDto })
   @ApiResponse({
     status: 200,
     description: 'Payment order created successfully',
     type: PaymentOrderResponseDto
   })
   @ApiResponse({ status: 400, description: 'Invalid cart or validation error, or missing Idempotency-Key' })
   @ApiResponse({ status: 401, description: 'Unauthorized' })
   async createOrder(
     @Req() req: AuthRequest,
     @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreatePaymentDto,
     @Headers('idempotency-key') idempotencyKey?: string,
     @Headers('x-idempotency-key') xIdempotencyKey?: string,
   ): Promise<PaymentOrderResponseDto> {
     // Require Idempotency-Key header
     const key = idempotencyKey || xIdempotencyKey;
     if (!key) {
       throw new BadRequestException('Idempotency-Key header is required');
     }

     const requestId = this.normalizeHeader(req.headers['x-request-id']);
     return this.paymentsService.createOrder(req.user.userId, dto, requestId);
   }

  // ============================================================
  // ENDPOINT 2: Create Simplified Payment (no cart)
  // ============================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.VENUE_OWNER, Role.VENDOR, Role.ADMIN)
  @Post('create-order-simple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Razorpay payment order (simplified)',
    description: 'Creates a payment order without a cart. For booking flows where cart is not used. Requires authentication.'
  })
  @ApiBody({ type: CreateSimplePaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment order created successfully',
    type: PaymentOrderResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid amount or validation error' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async createOrderSimple(
    @Req() req: AuthRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateSimplePaymentDto,
    @Headers('x-request-id') rawRequestId?: string,
  ): Promise<PaymentOrderResponseDto> {
    const requestId = this.normalizeHeader(rawRequestId);
    return this.paymentsService.createOrderSimple(dto, requestId, req.user.userId);
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

  @ApiBearerAuth()
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

  @ApiBearerAuth()
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

  @ApiBearerAuth()
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
  @ApiBearerAuth()
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

  // ============================================================
  // ADMIN ACTIONS: Approve, Reject, Refund
  // ============================================================

  // Approve payment (admin action)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  @ApiParam({ name: 'id', type: Number, description: 'Payment ID' })
  async approvePayment(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.approvePayment(id);
  }

  // Reject payment (admin action)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  @ApiParam({ name: 'id', type: Number, description: 'Payment ID' })
  async rejectPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    return this.paymentsService.rejectPayment(id, body.reason);
  }

  // NOTE: Duplicate POST refund endpoint removed (HIGH-07).
  // Use PATCH /:id/refund (processRefund) which tracks cumulative refund amounts.
}

