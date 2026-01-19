// src/cart/cart.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartStatus, CartItem } from '@prisma/client';
import { CartWithItems, CheckoutResponse } from './cart.types';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(userId: number): Promise<CartWithItems> {
    let cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: { items: true },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId, status: CartStatus.ACTIVE },
        include: { items: true },
      });
    }

    return cart;
  }

  async getActiveCart(userId: number) {
    return this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: { items: true },
    });
  }

  async addItemForUser(userId: number, dto: AddCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException('Cart is locked');
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        itemType: dto.itemType,
        vendorServiceId: dto.vendorServiceId,
        venueId: dto.venueId,
        addonId: dto.addonId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        totalPrice: dto.unitPrice * dto.quantity,
        meta: dto.meta,
      },
    });
  }

  async removeItem(userId: number, cartItemId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    if (item.cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException('Cart is locked');
    }

    return this.prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  async checkoutByUser(userId: number): Promise<CheckoutResponse> {
    // 🔒 Step 1: Lock cart
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: CartStatus.LOCKED },
    });

    // 🔢 Step 2: Calculate total
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

    // 💳 Step 3: (Later → payment integration)

    // ✅ Step 4: Complete cart
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: CartStatus.COMPLETED },
    });

    return {
      cartId: cart.id,
      totalAmount,
      itemsCount: cart.items.length,
      status: 'CHECKOUT_SUCCESS',
    };
  }
}
