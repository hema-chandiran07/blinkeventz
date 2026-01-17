import { Controller, Post, Body,UseGuards} from '@nestjs/common';
import { ApiTags ,ApiBearerAuth} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notifications.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  @Roles(Role.ADMIN,Role.SUPPORT, Role.EVENT_MANAGER)
  async create(@Body() dto: CreateNotificationDto) {
    await this.service.send(dto);
    return { success: true };
  }
}
