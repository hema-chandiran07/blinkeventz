import { Controller, Get, Post, Body, UseGuards, Req, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Vendor Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDOR)
@Controller('vendors/reviews')
export class VendorReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all reviews for the current vendor
   */
  @Get('me')
  @ApiOperation({ summary: 'Get all reviews for current vendor' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  async getMyReviews(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('rating') rating?: string,
  ) {
    const userId = req.user.userId;

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const where: any = { vendorId: vendor.id };

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (rating) {
      where.rating = parseInt(rating);
    }

    const reviews = await this.prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            eventType: true,
            date: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate review analytics
    const totalReviews = reviews.length;
    const approvedReviews = reviews.filter(r => r.status === 'APPROVED').length;
    const pendingReviews = reviews.filter(r => r.status === 'PENDING').length;

    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    const responseRate = approvedReviews > 0
      ? (reviews.filter(r => r.response).length / approvedReviews) * 100
      : 0;

    return {
      reviews: reviews.map(r => ({
        id: r.id,
        customerName: r.user?.name || 'Anonymous',
        customerEmail: r.user?.email,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        helpful: r.helpful,
        response: r.response,
        respondedAt: r.respondedAt,
        event: r.event ? {
          id: r.event.id,
          type: r.event.eventType,
          date: r.event.date,
        } : null,
      })),
      analytics: {
        totalReviews,
        approvedReviews,
        pendingReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        responseRate: Math.round(responseRate * 10) / 10,
      },
    };
  }

  /**
   * Reply to a review
   */
  @Post('me/response')
  @ApiOperation({ summary: 'Reply to a customer review' })
  async replyToReview(
    @Req() req: any,
    @Body() body: { reviewId: number; response: string },
  ) {
    const userId = req.user.userId;

    if (!body.reviewId) {
      throw new BadRequestException('Review ID is required');
    }

    if (!body.response || !body.response.trim()) {
      throw new BadRequestException('Response text is required');
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const review = await this.prisma.review.findFirst({
      where: {
        id: body.reviewId,
        vendorId: vendor.id,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found or does not belong to you');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: body.reviewId },
      data: {
        response: body.response.trim(),
        respondedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: updatedReview.id,
      message: 'Review response posted successfully',
      response: updatedReview.response,
      respondedAt: updatedReview.respondedAt,
    };
  }

  /**
   * Get review analytics summary
   */
  @Get('me/analytics')
  @ApiOperation({ summary: 'Get detailed review analytics' })
  async getReviewAnalytics(@Req() req: any) {
    const userId = req.user.userId;

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const reviews = await this.prisma.review.findMany({
      where: { vendorId: vendor.id },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const reviewsByMonth: any = {};
    reviews.forEach(review => {
      const month = new Date(review.createdAt).toISOString().slice(0, 7);
      if (!reviewsByMonth[month]) {
        reviewsByMonth[month] = { count: 0, totalRating: 0 };
      }
      reviewsByMonth[month].count++;
      reviewsByMonth[month].totalRating += review.rating;
    });

    const monthlyTrend = Object.entries(reviewsByMonth)
      .map(([month, data]: [string, any]) => ({
        month,
        count: data.count,
        averageRating: Math.round((data.totalRating / data.count) * 10) / 10,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    const topReviews = reviews
      .filter(r => r.status === 'APPROVED')
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        customerName: r.user?.name || 'Anonymous',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        helpful: r.helpful,
      }));

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      monthlyTrend,
      topReviews,
      ratingDistribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      },
      recentReviews: reviews.slice(0, 5).map(r => ({
        id: r.id,
        customerName: r.user?.name || 'Anonymous',
        rating: r.rating,
        comment: r.comment?.slice(0, 100),
        createdAt: r.createdAt,
        status: r.status,
      })),
    };
  }
}
