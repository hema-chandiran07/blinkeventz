import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

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

    const data: any = {
      userId,
      rating: dto.rating,
      title: dto.title,
      comment: dto.comment,
      status: 'PENDING',
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
          },
        },
      },
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

    return this.prisma.review.update({
      where: { id },
      data: dto,
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
