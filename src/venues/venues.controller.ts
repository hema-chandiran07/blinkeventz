import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('venues')
export class VenuesController {

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  createVenue(@Body() body: any) {
    return {
      message: 'VENUE CREATED',
      data: body,
    };
  }

  @Get()
  getVenues() {
    return 'PUBLIC VENUE LIST';
  }
}
