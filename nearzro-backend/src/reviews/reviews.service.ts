import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

   async create(userId: number, dto: CreateReviewDto) {
     // Check if user already reviewed this entity
     const where: any = { userId };
     if (dto.venueId) where.venueId = dto.venueId;
     if (dto.vendorId) where.vendorId = dto.vendorId;
     if (dto.eventId) where.eventId = dto.eventId;

     const existing = await this.prisma.review.findFirst({ where });
     if (existing) {
       throw new BadRequestException('You have already reviewed this');
     }

     // Auto-approve ALL reviews (bypass admin approval requirement)
     let status: 'PENDING' | 'APPROVED' = 'APPROVED';

     // Sanitize title and comment to prevent XSS
     const sanitizedTitle = dto.title ? sanitizeHtml(dto.title, { allowedTags: [], allowedAttributes: {} }) : undefined;
     const sanitizedComment = dto.comment ? sanitizeHtml(dto.comment, { allowedTags: [], allowedAttributes: {} }) : undefined;

     const data: any = {
       userId,
       rating: dto.rating,
       title: sanitizedTitle,
       comment: sanitizedComment,
       status,
     };

     if (dto.venueId) data.venueId = dto.venueId;
     if (dto.vendorId) data.vendorId = dto.vendorId;
     if (dto.eventId) data.eventId = dto.eventId;

     return this.prisma.review.create({
       data,
       include: {
         user: {
           select: {
             id: true,
             name: true,
             image: true,
           },
         },
       },
     });
   }

  /**
   * Check if user has a COMPLETED booking with vendor or venue
   */
  private async checkVerifiedBooking(userId: number, vendorId?: number, venueId?: number): Promise<boolean> {
    if (!vendorId && !venueId) return false;

    // Find bookings for this user that are COMPLETED
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        slot: {
          include: {
            vendor: true,
            venue: true,
          },
        },
      },
    });

    return bookings.some(booking => {
      if (vendorId && booking.slot?.vendorId === vendorId) return true;
      if (venueId && booking.slot?.venueId === venueId) return true;
      return false;
    });
  }

  async findByVenue(venueId: number, approvedOnly: boolean = true) {
    const where: any = { venueId };
    if (approvedOnly) where.status = 'APPROVED';

    return this.prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByVendor(vendorId: number, approvedOnly: boolean = true) {
    const where: any = { vendorId };
    if (approvedOnly) where.status = 'APPROVED';

    return this.prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByVendorUser(userId: number, approvedOnly: boolean = false) {
    // Get vendor profile for this user
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      select: { id: true, businessName: true },
    });

    if (!vendor) {
      return { reviews: [], analytics: this.getEmptyAnalytics() };
    }

    const where: any = { vendorId: vendor.id };
    if (approvedOnly) where.status = 'APPROVED';

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
      },
      orderBy: { createdAt: 'desc' },
    });

    const analytics = await this.calculateAnalytics(reviews);
    return {
      reviews,
      analytics: {
        ...analytics,
        businessName: vendor.businessName,
      },
    };
  }

  async findByVenueOwner(userId: number, approvedOnly: boolean = false) {
    // Get all venues owned by this user
    const venues = await this.prisma.venue.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, city: true },
    });

    if (!venues.length) {
      return { reviews: [], analytics: this.getEmptyAnalytics() };
    }

    const venueIds = venues.map((v) => v.id);
    const where: any = { venueId: { in: venueIds } };
    if (approvedOnly) where.status = 'APPROVED';

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
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const analytics = await this.calculateAnalytics(reviews);
    return { reviews, analytics };
  }

  private async calculateAnalytics(reviews: any[]) {
    const totalReviews = reviews.length;
    if (totalReviews === 0) return this.getEmptyAnalytics();

    const approvedReviews = reviews.filter((r) => r.status === 'APPROVED').length;
    const pendingReviews = reviews.filter((r) => r.status === 'PENDING').length;
    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    const ratingDistribution: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    };
    reviews.forEach((r) => {
      ratingDistribution[Math.round(r.rating)] = (ratingDistribution[Math.round(r.rating)] || 0) + 1;
    });

    // Check if review has a response (assuming there's a field like 'response' or similar)
    // Looking at the schema, we might need a separate relation or a field on Review
    const respondedReviews = reviews.filter((r) => r.response).length;
    const responseRate = Math.round((respondedReviews / totalReviews) * 100);

    return {
      totalReviews,
      approvedReviews,
      pendingReviews,
      averageRating: parseFloat(averageRating.toFixed(1)),
      ratingDistribution,
      responseRate,
    };
  }

  private getEmptyAnalytics() {
    return {
      totalReviews: 0,
      approvedReviews: 0,
      pendingReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      responseRate: 0,
    };
  }

  async findByUser(userId: number) {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        venue: true,
        vendor: true,
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

   async update(id: number, userId: number, dto: UpdateReviewDto) {
     const review = await this.prisma.review.findUnique({ where: { id } });
     if (!review) {
       throw new NotFoundException('Review not found');
     }
     if (review.userId !== userId) {
       throw new ForbiddenException('You can only update your own reviews');
     }

     // Prepare update data, sanitizing text fields
     const updateData: any = { ...dto };
     if (dto.title !== undefined) {
       updateData.title = sanitizeHtml(dto.title, { allowedTags: [], allowedAttributes: {} });
     }
     if (dto.comment !== undefined) {
       updateData.comment = sanitizeHtml(dto.comment, { allowedTags: [], allowedAttributes: {} });
     }

     return this.prisma.review.update({
       where: { id },
       data: updateData,
     });
   }

  async remove(id: number, userId: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    return this.prisma.review.delete({ where: { id } });
  }

  async vote(reviewId: number, userId: number, helpful: boolean) {
    // Check if already voted
    const existing = await this.prisma.reviewVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    if (existing) {
      // Update vote
      return this.prisma.reviewVote.update({
        where: { id: existing.id },
        data: { helpful },
      });
    }

    // Create new vote
    await this.prisma.reviewVote.create({
      data: { reviewId, userId, helpful },
    });

    // Update helpful count
    const helpfulCount = await this.prisma.reviewVote.count({
      where: { reviewId, helpful: true },
    });

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { helpful: helpfulCount },
    });
  }

  async findAllForModeration(status?: string, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (status) where.status = status;
    
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          venue: true,
          vendor: true,
          event: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async moderate(id: number, status: 'APPROVED' | 'REJECTED') {
    return this.prisma.review.update({
      where: { id },
      data: { status },
    });
  }

  async calculateAverageRating(entityType: 'venue' | 'vendor', entityId: number) {
    const result = await this.prisma.review.aggregate({
      _avg: { rating: true },
      _count: true,
      where: {
        [entityType === 'venue' ? 'venueId' : 'vendorId']: entityId,
        status: 'APPROVED',
      },
    });

    return {
      average: result._avg.rating || 0,
      count: result._count,
    };
  }
}
