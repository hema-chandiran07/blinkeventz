import {
  Controller,
  Post,
  Body,
  Req,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationActionDto } from './dto/notification-action.dto';
@ApiBearerAuth() 
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard,RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

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

