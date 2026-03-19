// src/cart/cart.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma, Cart, CartItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  CartResponse,
  CartItemResponse,
  CartItemWithRelations,
  CheckoutResponse,
  CartTotal,
  PLATFORM_FEE_PERCENTAGE,
  TAX_PERCENTAGE,
  CART_EXPIRATION_DAYS,
} from './cart.types';
import { CartCacheService } from './cart.cache.service';
import { CartEventService, CartEventType } from './cart-event.service';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CartCacheService,
    private readonly eventService: CartEventService,
  ) {}

  /**
   * Get cart with all items and calculated totals
   * Uses single query with include for N+1 prevention
   * Includes Redis caching
   */
  async getCart(userId: number): Promise<CartResponse> {
    const startTime = Date.now();
    
    // Try cache first
    const cached = await this.cacheService.getCart(userId);
    if (cached) {
      this.logger.debug(
        { userId, duration: Date.now() - startTime, source: 'cache' },
        'Cart retrieved from cache',
      );
      return cached;
    }

    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            venue: true,
            vendorService: {
              include: {
                vendor: {
                  select: { businessName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      // Create new cart if doesn't exist
      const newCart = await this.prisma.cart.create({
        data: {
          userId,
          status: 'ACTIVE',
          expiresAt: this.getExpirationDate(),
        },
        include: { items: true },
      });

      const response = this.formatCartResponse(newCart);
      await this.cacheService.setCart(userId, response);
      
      this.logger.debug(
        { userId, duration: Date.now() - startTime, source: 'db_new' },
        'New cart created',
      );
      return response;
    }

    // Check and update expiration
    if (cart.expiresAt && new Date(cart.expiresAt) < new Date()) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { status: 'EXPIRED' },
      });
      throw new ForbiddenException('Cart has expired');
    }

    const response = this.formatCartResponse(cart);
    
    // Cache the response
    await this.cacheService.setCart(userId, response);
    
    this.logger.debug(
      { userId, duration: Date.now() - startTime, source: 'db', itemCount: cart.items.length },
      'Cart retrieved from database',
    );
    
    return response;
  }

  /**
   * Add item to cart with transaction safety
   */
  async addItem(
    userId: number,
    dto: AddCartItemDto,
    idempotencyKey?: string,
  ): Promise<CartItemResponse> {
    const startTime = Date.now();
    
    // Check idempotency
    if (idempotencyKey) {
      const isDuplicate = await this.cacheService.checkAndSetIdempotencyKey(
        `${userId}:addItem:${idempotencyKey}`,
      );
      if (isDuplicate) {
        throw new BadRequestException('Duplicate request - item may already be added');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Validate that exactly one item reference is provided
      const itemRefs = [dto.venueId, dto.vendorServiceId, dto.addonId].filter(
        Boolean,
      );
      if (itemRefs.length !== 1) {
        throw new BadRequestException(
          'Exactly one of venueId, vendorServiceId, or addonId is required',
        );
      }

      // Find or create cart (idempotent)
      let cart = await tx.cart.findFirst({
        where: { userId, status: 'ACTIVE' },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: {
            userId,
            status: 'ACTIVE',
            expiresAt: this.getExpirationDate(),
          },
        });
      } else if (cart.status !== 'ACTIVE') {
        throw new ForbiddenException('Cart is locked and cannot be modified');
      }

      // Fetch price and validate item exists
      const { unitPrice, name } = await this.resolveItemPrice(tx, dto);

      // Check for duplicate item - merge if exists
      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          itemType: dto.itemType as any,
          venueId: dto.venueId,
          vendorServiceId: dto.vendorServiceId,
          addonId: dto.addonId,
          date: dto.date ? new Date(dto.date) : undefined,
          timeSlot: dto.timeSlot || undefined,
        },
      });

      let item: CartItem;

      if (existingItem) {
        // Merge: increase quantity using Decimal operations
        const existingQty = new Decimal(existingItem.quantity || 1);
        const newQuantity = existingQty.plus(dto.quantity || 1);
        const existingTotal = new Decimal(existingItem.totalPrice.toString());
        const newTotalPrice = existingTotal.mul(newQuantity).div(existingQty);

        const updated = await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity.toNumber(),
            totalPrice: newTotalPrice.toNumber(),
          },
        });

        item = updated;
      } else {
        // Create new item
        const quantity = dto.quantity || 1;
        const totalPrice = new Decimal(unitPrice).mul(quantity);

        item = await tx.cartItem.create({
          data: {
            cartId: cart.id,
            itemType: dto.itemType as any,
            venueId: dto.venueId,
            vendorServiceId: dto.vendorServiceId,
            addonId: dto.addonId,
            date: dto.date ? new Date(dto.date) : null,
            timeSlot: dto.timeSlot || null,
            quantity,
            unitPrice,
            totalPrice: totalPrice.toNumber(),
            meta: dto.meta as Prisma.JsonObject,
          },
        });
      }

      // Publish event
      await this.eventService.publishEvent(tx, 'CART_ITEM_ADDED', {
        userId,
        cartId: cart.id,
        itemId: item.id,
      });

      return { item, name, cartId: cart.id };
    });

    // Invalidate cache
    await this.cacheService.invalidateCart(userId);

    this.logger.log(
      { 
        userId, 
        cartId: result.cartId, 
        itemId: result.item.id,
        duration: Date.now() - startTime,
      },
      'Item added to cart',
    );

    return this.formatCartItemResponse(result.item, result.name);
  }

  /**
   * Update cart item with authorization check
   */
  async updateItem(
    userId: number,
    cartItemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartItemResponse> {
    const startTime = Date.now();

    const result = await this.prisma.$transaction(async (tx) => {
      // Find item with cart
      const item = await tx.cartItem.findUnique({
        where: { id: cartItemId },
        include: { cart: true },
      });

      if (!item) {
        throw new NotFoundException('Cart item not found');
      }

      // Authorization: user must own the cart
      if (item.cart.userId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to modify this cart item',
        );
      }

      // Check cart status
      if (item.cart.status !== 'ACTIVE') {
        throw new BadRequestException('Cart is locked or completed');
      }

      // Recalculate price if needed using Decimal
      let totalPrice = new Decimal(item.totalPrice.toString());
      let unitPrice = new Decimal(item.unitPrice.toString());

      // If quantity changed or meta changed for PER_PERSON pricing
      if (dto.quantity !== undefined || dto.meta) {
        if (item.vendorServiceId) {
          const vendorService = await tx.vendorService.findUnique({
            where: { id: item.vendorServiceId },
          });

          if (vendorService?.pricingModel === 'PER_PERSON') {
            const guestCount =
              dto.meta?.guestCount ||
              (item.meta as any)?.guestCount ||
              1;
            unitPrice = new Decimal(vendorService.baseRate).mul(guestCount);
            totalPrice = unitPrice;
          }
        }

        if (dto.quantity !== undefined) {
          totalPrice = unitPrice.mul(dto.quantity);
        }
      }

      const updatedItem = await tx.cartItem.update({
        where: { id: cartItemId },
        data: {
          quantity: dto.quantity,
          meta: dto.meta as Prisma.JsonObject,
          unitPrice: unitPrice.toNumber(),
          totalPrice: totalPrice.toNumber(),
        },
      });

      // Publish event
      await this.eventService.publishEvent(tx, 'CART_ITEM_UPDATED', {
        userId,
        cartId: item.cartId,
        itemId: cartItemId,
      });

      const name = await this.getItemName(tx, item);
      return { item: updatedItem, name };
    });

    // Invalidate cache
    await this.cacheService.invalidateCart(userId);

    this.logger.log(
      { userId, cartItemId, duration: Date.now() - startTime },
      'Cart item updated',
    );

    return this.formatCartItemResponse(result.item, result.name);
  }

  /**
   * Remove item from cart with authorization check
   */
  async removeItem(userId: number, cartItemId: number): Promise<{ success: boolean }> {
    const startTime = Date.now();

    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findUnique({
        where: { id: cartItemId },
        include: { cart: true },
      });

      if (!item) {
        throw new NotFoundException('Cart item not found');
      }

      if (item.cart.userId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to remove this item',
        );
      }

      if (item.cart.status !== 'ACTIVE') {
        throw new BadRequestException('Cart is locked or completed');
      }

      await tx.cartItem.delete({
        where: { id: cartItemId },
      });

      // Publish event
      await this.eventService.publishEvent(tx, 'CART_ITEM_REMOVED', {
        userId,
        cartId: item.cartId,
        itemId: cartItemId,
      });

      return { cartId: item.cartId };
    });

    // Invalidate cache
    await this.cacheService.invalidateCart(userId);

    this.logger.log(
      { userId, cartItemId, duration: Date.now() - startTime },
      'Cart item removed',
    );

    return { success: true };
  }

  /**
   * Clear all items from cart
   */
  async clearCart(userId: number): Promise<{ success: boolean; itemCount: number }> {
    const startTime = Date.now();

    const result = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, status: 'ACTIVE' },
      });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      const result = await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Publish event
      await this.eventService.publishEvent(tx, 'CART_CLEARED', {
        userId,
        cartId: cart.id,
        itemCount: result.count,
      });

      return { itemCount: result.count, cartId: cart.id };
    });

    // Invalidate cache
    await this.cacheService.invalidateCart(userId);

    this.logger.log(
      { userId, itemCount: result.itemCount, duration: Date.now() - startTime },
      'Cart cleared',
    );

    return { success: true, itemCount: result.itemCount };
  }

  /**
   * Process checkout - returns cart data for payment
   */
  async checkout(
    userId: number,
    idempotencyKey?: string,
  ): Promise<CheckoutResponse> {
    const startTime = Date.now();

    // Check idempotency
    if (idempotencyKey) {
      const isDuplicate = await this.cacheService.checkAndSetIdempotencyKey(
        `${userId}:checkout:${idempotencyKey}`,
      );
      if (isDuplicate) {
        throw new BadRequestException('Duplicate checkout request');
      }
    }

    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            venue: true,
            vendorService: {
              include: {
                vendor: { select: { businessName: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Lock cart during checkout
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: 'LOCKED' },
    });

    const totals = this.calculateTotals(cart.items);

    const items = cart.items.map((item) =>
      this.formatCartItemResponse(item, item.venue?.name || 'Unknown'),
    );

    // Publish checkout event
    await this.eventService.publishEvent(this.prisma, 'CART_CHECKED_OUT', {
      userId,
      cartId: cart.id,
      totalAmount: totals.total.toString(),
      itemCount: cart.items.length,
    });

    // Invalidate cache
    await this.cacheService.invalidateCart(userId);

    this.logger.log(
      { 
        userId, 
        cartId: cart.id, 
        totalAmount: totals.total.toString(),
        duration: Date.now() - startTime,
      },
      'Checkout completed',
    );

    return {
      cartId: cart.id,
      items,
      subtotal: totals.subtotal.toString(),
      platformFee: totals.platformFee.toString(),
      tax: totals.tax.toString(),
      totalAmount: totals.total.toString(),
      status: 'CHECKOUT_SUCCESS',
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Resolve item price server-side (never trust client)
   */
  private async resolveItemPrice(
    tx: TransactionClient,
    dto: AddCartItemDto,
  ): Promise<{ unitPrice: number; name: string }> {
    if (dto.venueId) {
      const venue = await tx.venue.findUnique({
        where: { id: dto.venueId },
      });

      if (!venue) {
        throw new NotFoundException('Venue not found');
      }

      let price = 0;
      if (dto.timeSlot === 'MORNING') {
        price = venue.basePriceMorning || 0;
      } else if (dto.timeSlot === 'EVENING') {
        price = venue.basePriceEvening || 0;
      } else {
        price = venue.basePriceFullDay || venue.basePriceEvening || venue.basePriceMorning || 0;
      }

      return { unitPrice: price, name: venue.name };
    }

    if (dto.vendorServiceId) {
      const service = await tx.vendorService.findUnique({
        where: { id: dto.vendorServiceId },
        include: { vendor: { select: { businessName: true } } },
      });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      if (!service.isActive) {
        throw new BadRequestException('Service is not available');
      }

      let price = service.baseRate;

      // Calculate for PER_PERSON pricing
      if (service.pricingModel === 'PER_PERSON' && dto.meta?.guestCount) {
        price = service.baseRate * dto.meta.guestCount;
      }

      return {
        unitPrice: price,
        name: `${service.name} (${service.vendor.businessName})`,
      };
    }

    // Addon - could be extended with actual addon prices
    if (dto.addonId) {
      return { unitPrice: 0, name: 'Addon' };
    }

    throw new BadRequestException('Invalid item reference');
  }

  /**
   * Get item name for response
   */
  private async getItemName(
    tx: TransactionClient,
    item: CartItem & { cart: Cart },
  ): Promise<string> {
    if (item.venueId) {
      const venue = await tx.venue.findUnique({ where: { id: item.venueId } });
      return venue?.name || 'Unknown Venue';
    }

    if (item.vendorServiceId) {
      const service = await tx.vendorService.findUnique({
        where: { id: item.vendorServiceId },
        include: { vendor: { select: { businessName: true } } },
      });
      return service
        ? `${service.name} (${service.vendor.businessName})`
        : 'Unknown Service';
    }

    return 'Item';
  }

  /**
   * Calculate cart totals using Decimal
   */
  private calculateTotals(items: CartItemWithRelations[]): CartTotal {
    const zero = new Decimal(0);
    const subtotal = items.reduce(
      (sum, item) => sum.add(new Decimal(item.totalPrice.toString())),
      zero,
    );

    const platformFee = subtotal.mul(PLATFORM_FEE_PERCENTAGE);
    const tax = subtotal.add(platformFee).mul(TAX_PERCENTAGE);
    const total = subtotal.add(platformFee).add(tax);

    return { 
      subtotal, 
      platformFee, 
      tax, 
      total 
    };
  }

  /**
   * Format cart response
   */
  private formatCartResponse(
    cart: Cart & { items: CartItem[] },
  ): CartResponse {
    const totals = this.calculateTotals(cart.items as CartItemWithRelations[]);

    return {
      id: cart.id,
      status: cart.status,
      items: cart.items as CartItemWithRelations[],
      subtotal: totals.subtotal.toString(),
      platformFee: totals.platformFee.toString(),
      tax: totals.tax.toString(),
      totalAmount: totals.total.toString(),
      expiresAt: cart.expiresAt,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Format cart item response
   */
  private formatCartItemResponse(
    item: CartItem,
    name: string,
  ): CartItemResponse {
    return {
      id: item.id,
      itemType: item.itemType,
      venueId: item.venueId,
      vendorServiceId: item.vendorServiceId,
      addonId: item.addonId,
      date: item.date,
      timeSlot: item.timeSlot,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
      meta: item.meta as Record<string, unknown> | undefined,
      name,
    };
  }

  /**
   * Get cart expiration date
   */
  private getExpirationDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + CART_EXPIRATION_DAYS);
    return date;
  }
}
