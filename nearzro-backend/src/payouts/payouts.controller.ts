import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Roles(Role.ADMIN)
  @Get()
  getAllPayouts(@Query() query: any) {
    return this.payoutsService.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  getPayoutById(@Param('id') id: string) {
    return this.payoutsService.findOne(+id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  approvePayout(@Param('id') id: string) {
    return this.payoutsService.approve(+id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  rejectPayout(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.payoutsService.reject(+id, body.reason);
  }

  @Roles(Role.ADMIN)
  @Post(':id/process')
  processPayout(@Param('id') id: string) {
    return this.payoutsService.process(+id);
  }

  @Roles(Role.ADMIN)
  @Get('export/csv')
  async exportPayouts(@Res() res: any) {
    const data = await this.payoutsService.export();
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="payouts.csv"');
    res.send(data);
  }

  // Venue Owner - Get my payouts (must be before :id route to avoid conflict)
  @UseGuards(JwtAuthGuard)
  @Get('venue-owner/me')
  async getVenueOwnerPayouts(@Req() req: any, @Query() query: any) {
    return this.payoutsService.findByVenueOwner(req.user.userId, query);
  }

  // Venue Owner - Get my payout stats
  @UseGuards(JwtAuthGuard)
  @Get('venue-owner/stats')
  async getVenueOwnerStats(@Req() req: any) {
    return this.payoutsService.getVenueOwnerStats(req.user.userId);
  }
}

