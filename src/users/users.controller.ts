import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import{ApiBearerAuth, ApiTags} from '@nestjs/swagger';
@ApiTags('USER')
@ApiBearerAuth()
@Controller('user')
export class UsersController {

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  adminRoute() {
    return 'ADMIN ACCESS GRANTED';
  }
}
