import { Controller, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from '../settings/settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdatePlatformSettingsDto } from '../settings/dto/update-platform-settings.dto';
import type { JwtUser } from '../auth/auth-request.interface';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Patch('platform')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update platform-wide fee settings (Admin only)' })
  @ApiBody({ type: UpdatePlatformSettingsDto })
  @ApiResponse({ status: 200, description: 'Platform settings updated successfully' })
  async updatePlatformSettings(@Body() dto: UpdatePlatformSettingsDto, @Req() req: any) {
    const user = req.user as JwtUser;
    return this.settingsService.updatePlatformSettings(dto, user.userId);
  }
}
