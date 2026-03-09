// src/cart/cart.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItem } from '@prisma/client';
import { CartWithItems, CheckoutResponse } from './cart.types';

const PLATFORM_FEE_PERCENTAGE = 0.02; // 2%
const TAX_PERCENTAGE = 0.18; // 18% GST

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: number | null): Promise<any> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    let cart = await this.prisma.cart.findFirst({
      where: { userId: userId ?? undefined, status: 'ACTIVE' },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId: userId ?? undefined, status: 'ACTIVE' },
      });
    }

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
    });

    // Calculate totals
    const subtotal = items.reduce((sum: any, item: any) => sum + item.totalPrice, 0);
    const platformFee = Math.round(subtotal * 0.02);
    const tax = Math.round((subtotal + platformFee) * 0.18);
    const total = subtotal + platformFee + tax;

    return {
      id: cart.id,
      status: cart.status,
      items,
      subtotal,
      platformFee,
      tax,
      totalAmount: total,
    };
  }

  async addItem(userId: number | null, dto: AddCartItemDto) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    let cart = await this.prisma.cart.findFirst({
      where: { userId: userId ?? undefined, status: 'ACTIVE' },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId: userId ?? undefined, status: 'ACTIVE' },
      });
    }

    // Fetch item details to get price
    let unitPrice = dto.unitPrice || 0;
    let name = dto.itemType.toString();

    if (dto.venueId) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: dto.venueId },
      });
      if (!venue) {
        throw new NotFoundException('Venue not found');
      }
      unitPrice = venue.basePriceEvening || venue.basePriceMorning || venue.basePriceFullDay || 0;
      name = venue.name;
    } else if (dto.vendorServiceId) {
      const service = await this.prisma.vendorService.findUnique({
        where: { id: dto.vendorServiceId },
        include: { vendor: true },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }
      // Calculate price based on pricing model
      if (service.pricingModel === 'PER_PERSON' && dto.meta && typeof dto.meta === 'object' && 'guestCount' in dto.meta) {
        const meta = dto.meta as any;
        unitPrice = service.baseRate * (meta.guestCount || 1);
      } else {
        unitPrice = service.baseRate;
      }
      name = `${service.name} (${service.vendor.businessName})`;
    }

    const totalPrice = unitPrice * (dto.quantity || 1);

    const item = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        itemType: dto.itemType as any,
        venueId: dto.venueId,
        vendorServiceId: dto.vendorServiceId,
        addonId: dto.addonId,
        date: dto.date ? new Date(dto.date) : null,
        timeSlot: dto.timeSlot,
        quantity: dto.quantity || 1,
        unitPrice,
        totalPrice,
        meta: dto.meta as any,
      },
    });

    return {
      ...item,
      name,
    };
  }

  async updateItem(userId: number | null, cartItemId: number, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { id: item.cartId },
    });

    if (!cart || cart.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    if (cart.status !== 'ACTIVE') {
      throw new BadRequestException('Cart is locked');
    }

    // Recalculate price if guest count changed for PER_PERSON pricing
    let totalPrice = item.totalPrice;
    if (dto.meta && item.vendorServiceId) {
      const vendorService = await this.prisma.vendorService.findUnique({ where: { id: item.vendorServiceId } });
      if (vendorService?.pricingModel === 'PER_PERSON') {
        const meta = dto.meta as any;
        if (meta.guestCount) {
          totalPrice = Math.round(vendorService.baseRate * meta.guestCount);
        }
      }
    }

    const updatedItem = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity: dto.quantity,
        meta: dto.meta as any,
        totalPrice,
      },
    });

    return updatedItem;
  }

  async removeItem(userId: number | null, cartItemId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { id: item.cartId },
    });

    if (!cart || cart.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return { success: true };
  }

  async clearCart(userId: number | null) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const cart = await this.prisma.cart.findFirst({
      where: { userId: userId ?? undefined, status: 'ACTIVE' },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { success: true };
  }

  async checkout(userId: number): Promise<any> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId: userId ?? undefined, status: 'ACTIVE' },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
    });

    const subtotal = items.reduce((sum: any, item: any) => sum + item.totalPrice, 0);
    const platformFee = Math.round(subtotal * 0.02);
    const tax = Math.round((subtotal + platformFee) * 0.18);
    const total = subtotal + platformFee + tax;

    return {
      cartId: cart.id,
      items,
      subtotal,
      platformFee,
      tax,
      totalAmount: total,
    };
  }
}
