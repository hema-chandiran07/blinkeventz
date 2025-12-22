import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartStatus, ItemType } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

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

  async addItem(cartId: number, dto: AddCartItemDto) {
    const totalPrice = dto.unitPrice * dto.quantity;

    return this.prisma.cartItem.create({
      data: {
        cartId,
        itemType: dto.itemType,
        vendorServiceId: dto.vendorServiceId,
        venueId: dto.venueId,
        addonId: dto.addonId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        totalPrice,
        meta: dto.meta,
      },
    });
  }

  async removeItem(cartItemId: number) {
    return this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  async getCart(cartId: number) {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });
  }

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
