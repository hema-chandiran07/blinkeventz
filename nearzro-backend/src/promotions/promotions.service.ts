import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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

     const data: any = {
       code: dto.code,
       discountType: dto.discountType,
       discountValue: dto.discountValue,
       validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
       validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
       usageLimit: dto.usageLimit,
       minCartValue: dto.minCartValue,
       vendorId: dto.vendorId,
       description: dto.description,
       isActive: dto.isActive,
       maxDiscount: dto.maxDiscount,
     };

     // Remove undefined fields
     Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

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

  /**
   * DEPRECATED: Use applyPromotionCode for atomic validation + usage increment
   */
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

  /**
   * Atomically validates and consumes a promotion code in a single SQL operation.
   * Prevents race conditions on usage limits.
   */
  async applyPromotionCode(code: string, cartValue?: number): Promise<{ valid: boolean; code: string; discountType: string; discountValue: number; discountAmount: number; description: string | null }> {
    // Atomic UPDATE that increments usedCount only if promotion is valid and usage limit not exceeded.
    const result = await this.prisma.$queryRaw`
      UPDATE "Promotion"
      SET "usedCount" = "usedCount" + 1
      WHERE code = ${code}
        AND "isActive" = true
        AND NOW() >= "validFrom"
        AND NOW() <= "validUntil"
        AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")
        AND (${cartValue} IS NULL OR "minCartValue" IS NULL OR ${cartValue} >= "minCartValue")
      RETURNING *
    ` as any[];

    if (!result || result.length === 0) {
      // No rows updated: either invalid code, inactive, expired, or limit reached.
      // For security, do not reveal which condition failed; return generic conflict.
      throw new ConflictException('Promotion limit reached');
    }

    const promotion = result[0];

    // Calculate discount amount (same logic as validateCode)
    let discountAmount = 0;
    if (promotion.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((cartValue || 0) * (promotion.discountValue / 100));
      if (promotion.maxDiscount) {
        discountAmount = Math.min(discountAmount, promotion.maxDiscount);
      }
    } else {
      // FIX 5b: Cap flat discount at cart value to prevent negative totals
      discountAmount = Math.min(promotion.discountValue, cartValue || 0);
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
