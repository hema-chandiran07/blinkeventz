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
        data: { userId },
        include: { items: true },
      });
    }

    return cart;
  }

  async addItem(cartId: number, dto: AddCartItemDto): Promise<CartItem> {
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

  async removeItem(cartItemId: number): Promise<CartItem> {
    return this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  async getCart(cartId: number): Promise<CartWithItems | null> {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });
  }

  async checkout(cartId: number): Promise<CheckoutResponse> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const totalAmount = cart.items.reduce(
      (sum: number, item: CartItem) => sum + item.totalPrice,
      0,
    );

    await this.prisma.cart.update({
      where: { id: cartId },
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
