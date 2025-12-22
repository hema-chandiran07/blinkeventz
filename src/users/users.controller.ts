import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req) {
    return req.user;
  }
}
