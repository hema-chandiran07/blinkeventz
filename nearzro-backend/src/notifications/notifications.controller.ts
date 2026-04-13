import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ComposeMessageDto } from './dto/compose-message.dto';
import { DebugLiveDto } from './dto/debug-live.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationActionDto } from './dto/notification-action.dto';
import { Public } from '../common/decorators/public.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';
import { NotificationQueue } from './queue/notification.queue';

@ApiTags('Notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly service: NotificationsService,
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly whatsappProvider: WhatsappProvider,
    private readonly queue: NotificationQueue,
  ) {}

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  // ✅ Health check endpoint (public, no auth required)
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Check notification service health' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is degraded or down' })
  async healthCheck() {
    const checks = {
      email: false,
      sms: false,
      whatsapp: false,
      redis: false,
    };

    // Check email provider
    try {
      checks.email = this.emailProvider.isConnected();
    } catch (e) {
      checks.email = false;
    }

    // Check SMS provider
    try {
      checks.sms = this.smsProvider.isConnected();
    } catch (e) {
      checks.sms = false;
    }

    // Check WhatsApp provider
    try {
      checks.whatsapp = this.whatsappProvider.isConnected();
    } catch (e) {
      checks.whatsapp = false;
    }

    // Check Redis queue
    try {
      await this.queue.queue.client.ping();
      checks.redis = true;
    } catch (e) {
      checks.redis = false;
    }

    const allHealthy = Object.values(checks).every(v => v);
    const anyHealthy = Object.values(checks).some(v => v);

    return {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'down',
      services: checks,
      circuitBreakers: {
        email: this.emailProvider.getCircuitBreakerState(),
        sms: this.smsProvider.getCircuitBreakerState(),
        whatsapp: this.whatsappProvider.getCircuitBreakerState(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // DEBUG ENDPOINT
  // ============================================================================

  // ✅ Debug-live endpoint - sends real notifications
  @Public()
  @Post('debug-live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send real notifications for debugging (non-production only)' })
  @ApiResponse({ status: 200, description: 'Notifications sent successfully' })
  @ApiResponse({ status: 403, description: 'Endpoint disabled in production' })
  @ApiResponse({ status: 400, description: 'Invalid input or provider not configured' })
  async debugLive(@Body() dto: DebugLiveDto) {
    // ✅ Safety: Block in production
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Debug endpoint is disabled in production');
    }

    // ✅ Validate at least one channel is provided
    if (!dto.email && !dto.phone) {
      return {
        success: false,
        error: 'At least one of email or phone is required',
      };
    }

    const results: {
      email?: { messageId?: string; error?: string };
      sms?: { sid?: string; error?: string };
      whatsapp?: { sid?: string; error?: string };
    } = {};

    const message = dto.message || 'Test notification from NearZro';

    // ✅ Send Email
    if (dto.email) {
      this.logger.log(`📧 Sending email to ${dto.email}`);
      try {
        const emailResult = await this.emailProvider.send(
          dto.email,
          'NearZro Debug Notification',
          message,
          `<p>${message}</p>`,
        );
        results.email = { messageId: emailResult.messageId };
        this.logger.log(`✅ Email sent successfully to ${dto.email}. Message ID: ${emailResult.messageId}`);
      } catch (error) {
        results.email = { error: error.message };
        this.logger.error(`❌ Failed to send email to ${dto.email}:`, error.message);
      }
    }

    // ✅ Send SMS
    if (dto.phone) {
      this.logger.log(`📱 Sending SMS to ${dto.phone}`);
      try {
        const smsResult = await this.smsProvider.send(dto.phone, message);
        results.sms = { sid: smsResult.sid };
        this.logger.log(`✅ SMS sent successfully to ${dto.phone}. SID: ${smsResult.sid}`);
      } catch (error) {
        results.sms = { error: error.message };
        this.logger.error(`❌ Failed to send SMS to ${dto.phone}:`, error.message);
      }

      // ✅ Send WhatsApp
      this.logger.log(`💬 Sending WhatsApp to ${dto.phone}`);
      try {
        const whatsappResult = await this.whatsappProvider.send(dto.phone, message);
        results.whatsapp = { sid: whatsappResult.sid };
        this.logger.log(`✅ WhatsApp sent successfully to ${dto.phone}. SID: ${whatsappResult.sid}`);
      } catch (error) {
        results.whatsapp = { error: error.message };
        this.logger.error(`❌ Failed to send WhatsApp to ${dto.phone}:`, error.message);
      }
    }

    // ✅ Determine overall success
    const hasErrors = Object.values(results).some(r => r.error);
    const hasSuccess = Object.values(results).some(r => !r.error);

    return {
      success: hasSuccess && !hasErrors,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // GET NOTIFICATIONS
  // ============================================================================

  // ✅ Get all notifications for admin (using query param for admin flag)
  @ApiBearerAuth()
  @Get()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
  @ApiOperation({ summary: 'Get notifications (user or admin)' })
  async getNotifications(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('read') read?: string,
    @Query('admin') admin?: string,
  ) {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) || 1 : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) || 20 : limit;
    const readBool = read === 'true' ? true : read === 'false' ? false : undefined;

    // If admin query param is present and user is admin, return all notifications
    if (admin === 'true' && req.user.role === 'ADMIN') {
      return this.service.getAllNotifications(pageNum, limitNum);
    }

    // Otherwise return user-specific notifications
    return this.service.getUserNotifications(req.user.id, pageNum, limitNum, readBool);
  }

  // ✅ Get unread count
  @ApiBearerAuth()
  @Get('unread/count')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: any) {
    return this.service.getUnreadCount(req.user.id);
  }

  // ✅ ALIAS: Get unread count (frontend expects /unread-count)
  @ApiBearerAuth()
  @Get('unread-count')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Get unread notification count (alias)' })
  async getUnreadCountAlias(@Req() req: any) {
    return this.service.getUnreadCount(req.user.id);
  }

  // ============================================================================
  // MARK AS READ
  // ============================================================================

  // ✅ Mark notification as read (POST - as per existing implementation)
  @ApiBearerAuth()
  @Post(':id/read')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Req() req: any, @Param('id') id: number) {
    return this.service.markAsRead(id, req.user.id);
  }

  // ✅ ALIAS: Mark notification as read (PATCH - for frontend compatibility)
  @ApiBearerAuth()
  @Patch(':id/read')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @ApiOperation({ summary: 'Mark notification as read (PATCH alias)' })
  async markAsReadPatch(@Req() req: any, @Param('id') id: number) {
    return this.service.markAsRead(id, req.user.id);
  }

  // ✅ Mark all as read (POST - as per existing implementation)
  @ApiBearerAuth()
  @Post('read-all')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    return this.service.markAllAsRead(req.user.id);
  }

  // ✅ ALIAS: Mark all as read (PATCH - for frontend compatibility)
  @ApiBearerAuth()
  @Patch('read-all')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Mark all notifications as read (PATCH alias)' })
  async markAllAsReadPatch(@Req() req: any) {
    return this.service.markAllAsRead(req.user.id);
  }

  // ============================================================================
  // DELETE NOTIFICATIONS
  // ============================================================================

  // ✅ Delete single notification
  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.deleteNotification(id, req.user.id);
  }

  // ✅ Delete all notifications (clear all)
  @ApiBearerAuth()
  @Delete()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Delete all notifications (clear all)' })
  async deleteAllNotifications(@Req() req: any) {
    return this.service.deleteAllNotifications(req.user.id);
  }

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  // ✅ Get notification preferences
  @ApiBearerAuth()
  @Get('preferences')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Req() req: any) {
    return this.service.getPreferences(req.user.id);
  }

  // ✅ Update notification preferences
  @ApiBearerAuth()
  @Patch('preferences')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'BOOKING_CONFIRMED' },
        channel: { type: 'string', enum: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH'] },
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  async updatePreferences(
    @Req() req: any,
    @Body() dto: { type: string; channel: string; enabled: boolean },
  ) {
    return this.service.updatePreference(req.user.id, dto.type, dto.channel, dto.enabled);
  }

  // ============================================================================
  // SEND NOTIFICATIONS (ADMIN ONLY)
  // ============================================================================

  @ApiBearerAuth()
  @Post('send')
  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.SUPPORT)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send notification (admin only)' })
  async send(@Body() dto: SendNotificationDto) {
    await this.service.send(dto);
    return { success: true };
  }

  @ApiBearerAuth()
  @Post('action')
  @Roles(
    Role.CUSTOMER,
    Role.VENDOR,
    Role.VENUE_OWNER,
  )
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle notification action (accept/reject)' })
  async action(@Req() req, @Body() dto: NotificationActionDto) {
    await this.service.handleAction(req.user.id, dto);
    return { success: true };
  }

  // ============================================================================
  // COMPOSE MESSAGE (ADMIN, EVENT_MANAGER, SUPPORT)
  // ============================================================================

  @ApiBearerAuth()
  @Post('compose')
  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.SUPPORT)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compose and send a message to a specific user via email + notification' })
  @ApiBody({ type: ComposeMessageDto })
  async composeMessage(@Req() req: any, @Body() dto: ComposeMessageDto) {
    return this.service.composeAndSendMessage(dto, req.user.id);
  }
}
