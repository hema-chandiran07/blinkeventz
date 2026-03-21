import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationActionDto } from './dto/notification-action.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiBearerAuth()
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard,RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // ✅ Get all notifications for admin (using query param for admin flag)
  @Get()
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
  @Get('unread/count')
  async getUnreadCount(@Req() req: any) {
    return this.service.getUnreadCount(req.user.id);
  }

  // ✅ ALIAS: Get unread count (frontend expects /unread-count)
  @Get('unread-count')
  async getUnreadCountAlias(@Req() req: any) {
    return this.service.getUnreadCount(req.user.id);
  }

  // ✅ Mark notification as read
  @Post(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: number) {
    return this.service.markAsRead(id, req.user.id);
  }

  // ✅ Mark all as read
  @Post('read-all')
  async markAllAsRead(@Req() req: any) {
    return this.service.markAllAsRead(req.user.id);
  }

  @Post('send')
  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.SUPPORT)
  async send(@Body() dto: SendNotificationDto) {
    await this.service.send(dto);
    return { success: true };
  }

  @Post('action')
  @Roles(
    Role.CUSTOMER,
    Role.VENDOR,
    Role.VENUE_OWNER,
  )
  async action(@Req() req, @Body() dto: NotificationActionDto) {
    await this.service.handleAction(req.user.id, dto);
    return { success: true };
  }
}

