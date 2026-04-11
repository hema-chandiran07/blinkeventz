import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhotoCategory, ImageQuality } from '@prisma/client';

export interface CreatePortfolioImageDto {
  title?: string;
  description?: string;
  category?: PhotoCategory;
  quality?: ImageQuality;
  tags?: string[];
  isFeatured?: boolean;
}

export interface ReorderPortfolioImagesDto {
  imageIds: number[];
}

export interface SetCoverImageDto {
  imageId: number;
}

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // VENDOR PORTFOLIO MANAGEMENT
  // ============================================

  async getVendorPortfolio(userId: number, includeInactive = false) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      select: { id: true, businessName: true, username: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const where: any = { vendorId: vendor.id };
    if (!includeInactive) {
      where.isActive = true;
    }

    const images = await this.prisma.portfolioImage.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // Count by category
    const categoryCounts: Record<string, number> = {};
    images.forEach(img => {
      categoryCounts[img.category] = (categoryCounts[img.category] || 0) + 1;
    });

    const coverImage = images.find(img => img.isCover);

    return {
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      username: vendor.username,
      totalImages: images.length,
      coverImage: coverImage || null,
      images,
      categories: categoryCounts,
    };
  }

  async createVendorPortfolioImage(
    userId: number,
    imageUrl: string,
    dto: CreatePortfolioImageDto,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Check image limit (max 50)
    const existingCount = await this.prisma.portfolioImage.count({
      where: { vendorId: vendor.id, isActive: true },
    });

    if (existingCount >= 50) {
      throw new BadRequestException('Maximum 50 portfolio images allowed');
    }

    // If setting as cover, unset other covers
    if (dto.isFeatured || dto.category === PhotoCategory.MAIN) {
      await this.prisma.portfolioImage.updateMany({
        where: { vendorId: vendor.id, isCover: true },
        data: { isCover: false },
      });
    }

    // Get max order
    const maxOrder = await this.prisma.portfolioImage.aggregate({
      where: { vendorId: vendor.id },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order || 0) + 1;

    const image = await this.prisma.portfolioImage.create({
      data: {
        vendorId: vendor.id,
        imageUrl,
        title: dto.title || null,
        description: dto.description || null,
        category: dto.category || PhotoCategory.GALLERY,
        quality: dto.quality || ImageQuality.HD,
        tags: dto.tags || [],
        isCover: dto.category === PhotoCategory.MAIN,
        isFeatured: dto.isFeatured || false,
        order: nextOrder,
      },
    });

    return image;
  }

  async updateVendorPortfolioImage(
    userId: number,
    imageId: number,
    dto: Partial<CreatePortfolioImageDto>,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const existingImage = await this.prisma.portfolioImage.findUnique({
      where: { id: imageId },
    });

    if (!existingImage) {
      throw new NotFoundException('Portfolio image not found');
    }

    if (existingImage.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to modify this image');
    }

    // Validate category
    if (dto.category && !Object.values(PhotoCategory).includes(dto.category)) {
      throw new BadRequestException('Invalid category');
    }

    // Validate quality
    if (dto.quality && !Object.values(ImageQuality).includes(dto.quality)) {
      throw new BadRequestException('Invalid quality');
    }

    // If setting as cover, unset other covers
    if (dto.isFeatured || dto.category === PhotoCategory.MAIN) {
      await this.prisma.portfolioImage.updateMany({
        where: { vendorId: vendor.id, isCover: true, id: { not: imageId } },
        data: { isCover: false },
      });
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.quality !== undefined) updateData.quality = dto.quality;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;
    if (dto.category === PhotoCategory.MAIN) updateData.isCover = true;

    updateData.updatedAt = new Date();

    const updatedImage = await this.prisma.portfolioImage.update({
      where: { id: imageId },
      data: updateData,
    });

    return updatedImage;
  }

  async softDeleteVendorPortfolioImage(userId: number, imageId: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const existingImage = await this.prisma.portfolioImage.findUnique({
      where: { id: imageId },
    });

    if (!existingImage) {
      throw new NotFoundException('Portfolio image not found');
    }

    if (existingImage.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to delete this image');
    }

    // Soft delete
    await this.prisma.portfolioImage.update({
      where: { id: imageId },
      data: { isActive: false, updatedAt: new Date() },
    });

    return { success: true, message: 'Image deleted successfully' };
  }

  async restoreVendorPortfolioImage(userId: number, imageId: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const existingImage = await this.prisma.portfolioImage.findUnique({
      where: { id: imageId },
    });

    if (!existingImage) {
      throw new NotFoundException('Portfolio image not found');
    }

    if (existingImage.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to restore this image');
    }

    await this.prisma.portfolioImage.update({
      where: { id: imageId },
      data: { isActive: true, updatedAt: new Date() },
    });

    return { success: true, message: 'Image restored successfully' };
  }

  async setVendorCoverImage(userId: number, imageId: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const image = await this.prisma.portfolioImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException('Portfolio image not found');
    }

    if (image.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to modify this image');
    }

    // Unset all covers
    await this.prisma.portfolioImage.updateMany({
      where: { vendorId: vendor.id, isCover: true },
      data: { isCover: false },
    });

    // Set new cover
    const updatedImage = await this.prisma.portfolioImage.update({
      where: { id: imageId },
      data: { isCover: true, updatedAt: new Date() },
    });

    return {
      success: true,
      message: 'Cover image updated successfully',
      coverImage: updatedImage,
    };
  }

  async reorderVendorPortfolioImages(userId: number, imageIds: number[]) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Verify all images belong to this vendor
    const images = await this.prisma.portfolioImage.findMany({
      where: {
        id: { in: imageIds },
        vendorId: vendor.id,
      },
      select: { id: true },
    });

    if (images.length !== imageIds.length) {
      throw new BadRequestException('Some images do not belong to your portfolio');
    }

    // Update order in transaction
    await this.prisma.$transaction(
      imageIds.map((imageId, index) =>
        this.prisma.portfolioImage.update({
          where: { id: imageId },
          data: { order: index, updatedAt: new Date() },
        }),
      ),
    );

    return {
      success: true,
      message: 'Portfolio reordered successfully',
      reorderedCount: imageIds.length,
    };
  }

  // ============================================
  // PUBLIC PORTFOLIO (Customer View)
  // ============================================

  async getPublicVendorPortfolio(vendorId: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, businessName: true, username: true, city: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const images = await this.prisma.portfolioImage.findMany({
      where: { vendorId, isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // Count by category
    const categoryCounts: Record<string, number> = {};
    images.forEach(img => {
      categoryCounts[img.category] = (categoryCounts[img.category] || 0) + 1;
    });

    const coverImage = images.find(img => img.isCover);

    return {
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      username: vendor.username,
      city: vendor.city,
      totalImages: images.length,
      coverImage: coverImage || null,
      images: images.map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        title: img.title,
        description: img.description,
        category: img.category,
        order: img.order,
        quality: img.quality,
        tags: img.tags,
      })),
      categories: categoryCounts,
    };
  }

  async getFeaturedVendors(limit: number = 12) {
    // Get vendors with featured portfolio images
    const vendors = await this.prisma.vendor.findMany({
      where: {
        portfolioImages: {
          some: {
            isFeatured: true,
            isActive: true,
          },
        },
      },
      include: {
        portfolioImages: {
          where: { isCover: true, isActive: true },
          take: 1,
        },
        services: {
          where: { isActive: true },
          take: 1,
        },
      },
      take: limit,
    });

    return vendors.map(vendor => ({
      id: vendor.id,
      businessName: vendor.businessName,
      businessType: vendor.businessType,
      city: vendor.city,
      area: vendor.area,
      coverImage: vendor.portfolioImages[0]?.imageUrl || vendor.businessImages[0] || null,
      galleryCount: vendor.portfolioImages.length,
      basePrice: vendor.basePrice,
    }));
  }

  // ============================================
  // VENUE PORTFOLIO MANAGEMENT
  // ============================================

  async getVenuePortfolio(ownerId: number, includeInactive = false) {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      select: { id: true, name: true, city: true },
    });

    if (venues.length === 0) {
      return { venues: [], totalImages: 0, images: [] };
    }

    const venueIds = venues.map(v => v.id);

    const where: any = { venueId: { in: venueIds } };
    if (!includeInactive) {
      where.isActive = true;
    }

    const images = await this.prisma.venuePhoto.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // Count by category
    const categoryCounts: Record<string, number> = {};
    images.forEach(img => {
      categoryCounts[img.category] = (categoryCounts[img.category] || 0) + 1;
    });

    const coverImage = images.find(img => img.isCover);

    return {
      venues: venues.map(v => ({ id: v.id, name: v.name, city: v.city })),
      totalImages: images.length,
      coverImage: coverImage || null,
      images,
      categories: categoryCounts,
    };
  }

  async createVenuePortfolioImage(
    ownerId: number,
    venueId: number,
    imageUrl: string,
    dto: CreatePortfolioImageDto,
  ) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, ownerId: true },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    if (venue.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this venue');
    }

    // Check image limit (max 50 per venue)
    const existingCount = await this.prisma.venuePhoto.count({
      where: { venueId, isActive: true },
    });

    if (existingCount >= 50) {
      throw new BadRequestException('Maximum 50 portfolio images allowed per venue');
    }

    // If setting as cover, unset other covers
    if (dto.isFeatured || dto.category === PhotoCategory.MAIN) {
      await this.prisma.venuePhoto.updateMany({
        where: { venueId, isCover: true },
        data: { isCover: false },
      });
    }

    // Get max order
    const maxOrder = await this.prisma.venuePhoto.aggregate({
      where: { venueId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order || 0) + 1;

    const image = await this.prisma.venuePhoto.create({
      data: {
        venueId,
        url: imageUrl,
        title: dto.title || null,
        description: dto.description || null,
        category: dto.category || PhotoCategory.GALLERY,
        quality: dto.quality || ImageQuality.HD,
        tags: dto.tags || [],
        isCover: dto.category === PhotoCategory.MAIN,
        isFeatured: dto.isFeatured || false,
        order: nextOrder,
      },
    });

    return image;
  }

  async updateVenuePortfolioImage(
    ownerId: number,
    imageId: number,
    dto: Partial<CreatePortfolioImageDto>,
  ) {
    const existingImage = await this.prisma.venuePhoto.findUnique({
      where: { id: imageId },
      include: { venue: { select: { ownerId: true } } },
    });

    if (!existingImage) {
      throw new NotFoundException('Venue photo not found');
    }

    if (existingImage.venue.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have permission to modify this image');
    }

    // Validate category
    if (dto.category && !Object.values(PhotoCategory).includes(dto.category)) {
      throw new BadRequestException('Invalid category');
    }

    // Validate quality
    if (dto.quality && !Object.values(ImageQuality).includes(dto.quality)) {
      throw new BadRequestException('Invalid quality');
    }

    // If setting as cover, unset other covers
    if (dto.isFeatured || dto.category === PhotoCategory.MAIN) {
      await this.prisma.venuePhoto.updateMany({
        where: { venueId: existingImage.venueId, isCover: true, id: { not: imageId } },
        data: { isCover: false },
      });
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.quality !== undefined) updateData.quality = dto.quality;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;
    if (dto.category === PhotoCategory.MAIN) updateData.isCover = true;

    updateData.updatedAt = new Date();

    const updatedImage = await this.prisma.venuePhoto.update({
      where: { id: imageId },
      data: updateData,
    });

    return updatedImage;
  }

  async softDeleteVenuePortfolioImage(ownerId: number, imageId: number) {
    const existingImage = await this.prisma.venuePhoto.findUnique({
      where: { id: imageId },
      include: { venue: { select: { ownerId: true } } },
    });

    if (!existingImage) {
      throw new NotFoundException('Venue photo not found');
    }

    if (existingImage.venue.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have permission to delete this image');
    }

    // Soft delete
    await this.prisma.venuePhoto.update({
      where: { id: imageId },
      data: { isActive: false, updatedAt: new Date() },
    });

    return { success: true, message: 'Image deleted successfully' };
  }

  async restoreVenuePortfolioImage(ownerId: number, imageId: number) {
    const existingImage = await this.prisma.venuePhoto.findUnique({
      where: { id: imageId },
      include: { venue: { select: { ownerId: true } } },
    });

    if (!existingImage) {
      throw new NotFoundException('Venue photo not found');
    }

    if (existingImage.venue.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have permission to restore this image');
    }

    await this.prisma.venuePhoto.update({
      where: { id: imageId },
      data: { isActive: true, updatedAt: new Date() },
    });

    return { success: true, message: 'Image restored successfully' };
  }

  async setVenueCoverImage(ownerId: number, imageId: number) {
    const image = await this.prisma.venuePhoto.findUnique({
      where: { id: imageId },
      include: { venue: { select: { ownerId: true } } },
    });

    if (!image) {
      throw new NotFoundException('Venue photo not found');
    }

    if (image.venue.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have permission to modify this image');
    }

    // Unset all covers for this venue
    await this.prisma.venuePhoto.updateMany({
      where: { venueId: image.venueId, isCover: true },
      data: { isCover: false },
    });

    // Set new cover
    const updatedImage = await this.prisma.venuePhoto.update({
      where: { id: imageId },
      data: { isCover: true, updatedAt: new Date() },
    });

    return {
      success: true,
      message: 'Cover image updated successfully',
      coverImage: updatedImage,
    };
  }

  async reorderVenuePortfolioImages(ownerId: number, venueId: number, imageIds: number[]) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, ownerId: true },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    if (venue.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this venue');
    }

    // Verify all images belong to this venue
    const images = await this.prisma.venuePhoto.findMany({
      where: {
        id: { in: imageIds },
        venueId: venue.id,
      },
      select: { id: true },
    });

    if (images.length !== imageIds.length) {
      throw new BadRequestException('Some images do not belong to this venue');
    }

    // Update order in transaction
    await this.prisma.$transaction(
      imageIds.map((imageId, index) =>
        this.prisma.venuePhoto.update({
          where: { id: imageId },
          data: { order: index, updatedAt: new Date() },
        }),
      ),
    );

    return {
      success: true,
      message: 'Portfolio reordered successfully',
      reorderedCount: imageIds.length,
    };
  }

  // ============================================
  // PUBLIC VENUE PORTFOLIO (Customer View)
  // ============================================

  async getPublicVenuePortfolio(venueId: number) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, name: true, city: true, type: true },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    const images = await this.prisma.venuePhoto.findMany({
      where: { venueId, isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // Count by category
    const categoryCounts: Record<string, number> = {};
    images.forEach(img => {
      categoryCounts[img.category] = (categoryCounts[img.category] || 0) + 1;
    });

    const coverImage = images.find(img => img.isCover);

    return {
      venueId: venue.id,
      venueName: venue.name,
      venueType: venue.type,
      city: venue.city,
      totalImages: images.length,
      coverImage: coverImage || null,
      images: images.map(img => ({
        id: img.id,
        url: img.url,
        title: img.title,
        description: img.description,
        category: img.category,
        order: img.order,
        quality: img.quality,
        tags: img.tags,
      })),
      categories: categoryCounts,
    };
  }

  async getFeaturedVenues(limit: number = 12) {
    const venues = await this.prisma.venue.findMany({
      where: {
        photos: {
          some: {
            isFeatured: true,
            isActive: true,
          },
        },
        status: 'ACTIVE',
      },
      include: {
        photos: {
          where: { isCover: true, isActive: true },
          take: 1,
        },
      },
      take: limit,
    });

    return venues.map(venue => ({
      id: venue.id,
      name: venue.name,
      type: venue.type,
      city: venue.city,
      area: venue.area,
      coverImage: venue.photos[0]?.url || venue.venueImages[0] || null,
      galleryCount: venue.photos.length,
      basePriceMorning: venue.basePriceMorning,
    }));
  }
}
