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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  // Create Review (User)
  @Post()
  create(@Req() req: any, @Body() dto: CreateReviewDto) {
    return this.service.create(req.user.userId, dto);
  }

  // Get Venue Reviews (Public)
  @Get('venue/:venueId')
  getVenueReviews(@Param('venueId') venueId: string, @Query('approved') approved: boolean = true) {
    return this.service.findByVenue(+venueId, approved);
  }

  // Get Vendor Reviews (Public)
  @Get('vendor/:vendorId')
  getVendorReviews(@Param('vendorId') vendorId: string, @Query('approved') approved: boolean = true) {
    return this.service.findByVendor(+vendorId, approved);
  }

  // Get My Reviews (User)
  @Get('my')
  getMyReviews(@Req() req: any) {
    return this.service.findByUser(req.user.userId);
  }

  // Update Own Review (User)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.service.update(+id, req.user.userId, dto);
  }

  // Delete Own Review (User)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(+id, req.user.userId);
  }

  // Vote Review (User)
  @Post(':id/vote')
  vote(@Req() req: any, @Param('id') id: string, @Body('helpful') helpful: boolean) {
    return this.service.vote(+id, req.user.userId, helpful);
  }

  // Get All Reviews for Moderation (Admin)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  getAllForModeration(@Query('status') status?: string) {
    return this.service.findAllForModeration(status);
  }

  // Approve Review (Admin)
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.moderate(+id, 'APPROVED');
  }

  // Reject Review (Admin)
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.service.moderate(+id, 'REJECTED');
  }
}
