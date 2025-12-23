import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartStatus } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // 1️⃣ Get or Create Active Cart
  async getOrCreateCart(userId: number) {
    let cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: { items: true },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    return cart;
  }

  // 2️⃣ Add Item to Cart
  async addItem(cartId: number, dto: AddCartItemDto) {
    const totalPrice = dto.unitPrice * dto.quantity;

    return this.prisma.cartItem.create({
      data: {
        cartId,
        itemType: dto.itemType,
        venueId: dto.venueId,
        vendorServiceId: dto.vendorServiceId,
        addonId: dto.addonId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        totalPrice,
        meta: dto.meta,
      },
    });
  }

  // 3️⃣ Remove Cart Item
  async removeItem(cartItemId: number) {
    return this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  // 4️⃣ Get Cart with Items
  async getCart(cartId: number) {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });
  }

  // 5️⃣ Checkout
  async checkout(cartId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { status: CartStatus.COMPLETED },
    });

    return {
      cartId,
      totalAmount,
      itemsCount: cart.items.length,
      status: 'CHECKOUT_SUCCESS',
    };
  }
}
