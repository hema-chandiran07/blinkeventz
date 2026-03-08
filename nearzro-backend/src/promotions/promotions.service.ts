import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        ...dto,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
      },
    });
  }

  async findAll(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [promotions, total] = await Promise.all([
      this.prisma.promotion.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promotion.count(),
    ]);

    return {
      data: promotions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return promotion;
  }

  async update(id: number, dto: UpdatePromotionDto) {
    await this.findOne(id); // Check if exists

    const data: any = { ...dto };
    if (dto.validFrom) data.validFrom = new Date(dto.validFrom);
    if (dto.validUntil) data.validUntil = new Date(dto.validUntil);

    return this.prisma.promotion.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Check if exists

    return this.prisma.promotion.delete({
      where: { id },
    });
  }

  async validateCode(code: string, cartValue?: number) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { code },
    });

    if (!promotion) {
      throw new NotFoundException('Invalid promotion code');
    }

    // Check if active
    if (!promotion.isActive) {
      throw new BadRequestException('Promotion is not active');
    }

    // Check dates
    const now = new Date();
    if (now < promotion.validFrom) {
      throw new BadRequestException('Promotion is not yet valid');
    }
    if (now > promotion.validUntil) {
      throw new BadRequestException('Promotion has expired');
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
      throw new BadRequestException('Promotion usage limit reached');
    }

    // Check minimum cart value
    if (promotion.minCartValue && cartValue && cartValue < promotion.minCartValue) {
      throw new BadRequestException(
        `Minimum cart value of ₹${promotion.minCartValue} required`,
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (promotion.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((cartValue || 0) * (promotion.discountValue / 100));
      if (promotion.maxDiscount) {
        discountAmount = Math.min(discountAmount, promotion.maxDiscount);
      }
    } else {
      // FLAT discount
      discountAmount = promotion.discountValue;
    }

    return {
      valid: true,
      code: promotion.code,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      discountAmount,
      description: promotion.description,
    };
  }

  async incrementUsage(promotionId: number) {
    return this.prisma.promotion.update({
      where: { id: promotionId },
      data: {
        usedCount: { increment: 1 },
      },
    });
  }
}
