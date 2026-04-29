// src/cart/cart.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
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
import { CartCalculationService } from '../business-rules/cart-calculation.service';
import { getMinHoursForExpressByArea } from '../express/express.rules';
import { AREA_TIER_MAP } from '../express/express.constants';
import { SettingsService } from '../settings/settings.service';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CartCacheService,
    private readonly eventService: CartEventService,
    private readonly cartCalculationService: CartCalculationService,
    private readonly settingsService: SettingsService,
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
   * FIXED: publishEvent moved OUTSIDE the transaction to prevent rollback on outbox failure
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

    // Use SERIALIZABLE transaction for race condition prevention
    const result = await this.prisma.$transaction(
      async (tx) => {
        // Log incoming DTO for debugging
        this.logger.debug({ dto }, 'addItem received DTO');

        // Validate that exactly one item reference is provided
        const itemRefs = [dto.venueId, dto.vendorServiceId, dto.addonId].filter(
          Boolean,
        );
        this.logger.debug({ itemRefs, count: itemRefs.length }, 'Item references');

        if (itemRefs.length !== 1) {
          this.logger.error({ dto }, 'Invalid item references - must have exactly one');
          throw new BadRequestException(
            'Exactly one of venueId, vendorServiceId, or addonId is required',
          );
        }

        // Find or create cart (idempotent) - with P2002 race condition handling
        let cart = await tx.cart.findFirst({
          where: { userId, status: 'ACTIVE' },
        });

<<<<<<< Updated upstream
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

        try {
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
          this.logger.log({ itemId: item.id, cartId: cart.id }, 'CartItem created successfully');
        } catch (createError) {
          this.logger.error({ createError, dto }, 'Failed to create CartItem');
          throw new InternalServerErrorException(
            `Failed to create cart item: ${createError.message}`,
          );
        }
      }

      // DO NOT call publishEvent inside transaction - return immediately
      return { item, name, cartId: cart.id };
    });
=======
        if (!cart) {
          try {
            cart = await tx.cart.create({
              data: {
                userId,
                status: 'ACTIVE',
                expiresAt: this.getExpirationDate(),
              },
            });
          } catch (e: any) {
            // Handle unique constraint race condition (P2002)
            if (e.code === 'P2002') {
              this.logger.warn('Cart unique constraint hit, finding existing cart');
              cart = await tx.cart.findFirst({
                where: { userId, status: 'ACTIVE' },
              });
              if (!cart) {
                throw new InternalServerErrorException('Failed to find or create cart');
              }
            } else {
              throw e;
            }
          }
        } else if (cart.status !== 'ACTIVE') {
          throw new ForbiddenException('Cart is locked and cannot be modified');
        }

        // Fetch price and validate item exists
        const { unitPrice, name } = await this.resolveItemPrice(tx, dto);

        // FIX 3: Use atomic upsert with unique constraint to prevent race conditions
        const upsertWhere = {
          cartId: cart.id,
          venueId: dto.venueId || null,
          vendorServiceId: dto.vendorServiceId || null,
          addonId: dto.addonId || null,
          date: dto.date ? new Date(dto.date) : null,
          timeSlot: dto.timeSlot || null,
        } as any;

        const item = await tx.cartItem.upsert({
          where: {
            cartId_venueId_vendorServiceId_addonId_date_timeSlot: upsertWhere,
          },
          create: {
            cartId: cart.id,
            itemType: dto.itemType as any,
            venueId: dto.venueId || null,
            vendorServiceId: dto.vendorServiceId || null,
            addonId: dto.addonId || null,
            date: dto.date ? new Date(dto.date) : null,
            timeSlot: dto.timeSlot || null,
            quantity: dto.quantity || 1,
            unitPrice,
            totalPrice: new Decimal(unitPrice).mul(dto.quantity || 1).toNumber(),
            meta: dto.meta as Prisma.JsonObject,
          },
          update: {
            quantity: { increment: dto.quantity || 1 },
            totalPrice: { increment: unitPrice * (dto.quantity || 1) },
          },
        });

        // DO NOT call publishEvent inside transaction - return immediately
        return { item, name, cartId: cart.id };
      },
      { isolationLevel: 'Serializable' }
    );
>>>>>>> Stashed changes

    // FIXED: Publish event AFTER transaction commits - cannot rollback cart
    try {
      await this.eventService.publishEvent(this.prisma, 'CART_ITEM_ADDED', {
        userId,
        cartId: result.cartId,
        itemId: result.item.id,
      });
    } catch (eventError) {
      // Already logged inside publishEvent - non-critical, continue
      this.logger.debug({ eventError }, 'Event publishing failed but cart operation succeeded');
    }

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
   * Update cart item with price re-validation from database
   * SECURITY: Never trust frontend prices - always re-validate
   * FIXED: publishEvent moved OUTSIDE the transaction
   */
  async updateItem(
    userId: number,
    cartItemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartItemResponse> {
    const startTime = Date.now();

    const result = await this.prisma.$transaction(async (tx) => {
      // Find item with cart and relations
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

      // SECURITY: Re-validate price from database - never trust frontend
      let currentUnitPrice: number;
      let currentItemName: string;

      // Handle VENUE items - re-fetch current price from DB
      if (item.venueId) {
        const venue = await tx.venue.findUnique({ where: { id: item.venueId } });
        if (!venue) {
          throw new NotFoundException('Venue is no longer available');
        }
        
        // Get price based on timeSlot
        if (item.timeSlot === 'MORNING') {
          currentUnitPrice = venue.basePriceMorning || 0;
        } else if (item.timeSlot === 'EVENING') {
          currentUnitPrice = venue.basePriceEvening || 0;
        } else {
          currentUnitPrice = venue.basePriceFullDay || venue.basePriceEvening || venue.basePriceMorning || 0;
        }
        currentItemName = venue.name;
      }
      // Handle VENDOR_SERVICE items - verify still active and get current price
      else if (item.vendorServiceId) {
        const vendorService = await tx.vendorService.findUnique({
          where: { id: item.vendorServiceId },
          include: { vendor: { select: { businessName: true } } },
        });

        if (!vendorService) {
          throw new NotFoundException('Service is no longer available');
        }
        
        if (!vendorService.isActive) {
          throw new BadRequestException('This service is no longer available');
        }

        // Handle PER_PERSON pricing
        if (vendorService.pricingModel === 'PER_PERSON') {
          const guestCount = dto.meta?.guestCount || (item.meta as any)?.guestCount || 1;
          currentUnitPrice = vendorService.baseRate * guestCount;
        } else {
          currentUnitPrice = vendorService.baseRate;
        }
        currentItemName = `${vendorService.name} (${vendorService.vendor?.businessName})`;
      }
      // Handle ADDON items
      else if (item.addonId) {
        currentUnitPrice = item.unitPrice.toNumber();
        currentItemName = 'Addon';
      } else {
        currentUnitPrice = item.unitPrice.toNumber();
        currentItemName = 'Item';
      }

      // Calculate new total with validated price from DB
      const newQuantity = dto.quantity || item.quantity || 1;
      const totalPrice = currentUnitPrice * newQuantity;

      const updatedItem = await tx.cartItem.update({
        where: { id: cartItemId },
        data: {
          quantity: newQuantity,
          meta: dto.meta as Prisma.JsonObject,
          unitPrice: currentUnitPrice,
          totalPrice,
        },
      });

      // DO NOT call publishEvent inside transaction - return immediately
      return { item: updatedItem, name: currentItemName };
    });

    // FIXED: Publish event AFTER transaction commits
    try {
      await this.eventService.publishEvent(this.prisma, 'CART_ITEM_UPDATED', {
        userId,
        cartId: result.item.cartId,
        itemId: cartItemId,
      });
    } catch (eventError) {
      // Already logged inside publishEvent - non-critical
    }

    // Invalidate cache
    await this.cacheService.invalidateCart(userId);

    this.logger.log(
      { userId, cartItemId, duration: Date.now() - startTime },
      'Cart item updated with re-validated price',
    );

    return this.formatCartItemResponse(result.item, result.name);
  }

  /**
   * Remove item from cart with authorization check
   * FIXED: publishEvent moved OUTSIDE the transaction
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

      // DO NOT call publishEvent inside transaction - return immediately
      return { cartId: item.cartId };
    });

    // FIXED: Publish event AFTER transaction commits
    try {
      await this.eventService.publishEvent(this.prisma, 'CART_ITEM_REMOVED', {
        userId,
        cartId: result.cartId,
        itemId: cartItemId,
      });
    } catch (eventError) {
      // Already logged inside publishEvent - non-critical
    }

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
   * FIXED: publishEvent moved OUTSIDE the transaction
   */
  async clearCart(userId: number): Promise<{ success: boolean; itemCount: number }> {
    const startTime = Date.now();

    const result = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, status: 'ACTIVE' },
      });

      if (!cart) {
        return { itemCount: 0, cartId: null, alreadyCleared: true };
      }

      const result = await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // DO NOT call publishEvent inside transaction - return immediately
      return { itemCount: result.count, cartId: cart.id, alreadyCleared: false };
    });

    // Handle case where cart was already cleared
    if (result.alreadyCleared) {
      return { success: true, itemCount: 0 };
    }

    // FIXED: Publish event AFTER transaction commits
    try {
      await this.eventService.publishEvent(this.prisma, 'CART_CLEARED', {
        userId,
        cartId: result.cartId!,
        itemCount: result.itemCount,
      });
    } catch (eventError) {
      // Already logged inside publishEvent - non-critical
    }

    // Invalidate cache
    await this.cacheService.invalidateCart(userId);

    this.logger.log(
      { userId, itemCount: result.itemCount, duration: Date.now() - startTime },
      'Cart cleared',
    );

    return { success: true, itemCount: result.itemCount };
  }

  /**
   * Process checkout with full validation - locks cart and returns secure payload
   * SECURITY: All prices re-validated from DB, never trust frontend calculations
   * FIXED: publishEvent wrapped in try/catch and OUTSIDE any transaction
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

    // EXPRESS VALIDATION: Check time constraints if express booking
    if (cart.isExpress && cart.items.some(item => item.date)) {
      const areas = new Map<string, Date>();
      for (const item of cart.items) {
        if (!item.date) continue;
        if (item.venueId) {
          const venue = await this.prisma.venue.findUnique({ where: { id: item.venueId } });
          if (venue) {
            areas.set(venue.area, item.date);
          }
        } else if (item.vendorServiceId) {
          const service = await this.prisma.vendorService.findUnique({
            where: { id: item.vendorServiceId },
            include: { vendor: { select: { area: true } } }
          });
          if (service?.vendor?.area) {
            areas.set(service.vendor.area, item.date);
          }
        }
      }
      for (const [area, eventDate] of areas) {
        const minHours = getMinHoursForExpressByArea(area);
        const eventTime = new Date(eventDate).getTime();
        const now = Date.now();
        const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);
        
        if (hoursUntilEvent < minHours) {
          const message = `Express booking for area "${area}" requires at least ${minHours} hour(s) before the event. Current lead time: ${hoursUntilEvent.toFixed(1)} hours`;
          throw new BadRequestException(message);
        }
      }
    }

    // SECURITY: Validate all items are still available before locking
    interface ValidatedCartItem {
      id: number;
      itemType: string;
      venueId: number | null;
      vendorServiceId: number | null;
      addonId: number | null;
      date: Date | null;
      timeSlot: string | null;
      quantity: number;
      meta: any;
      totalPrice: any;
      validatedPrice: number;
      itemName: string;
    }
    
    const validatedItems: ValidatedCartItem[] = [];
    for (const item of cart.items) {
      let validatedPrice: number;
      let itemName: string;

      if (item.venueId) {
        const venue = await this.prisma.venue.findUnique({ where: { id: item.venueId } });
        if (!venue) {
          throw new BadRequestException(`Venue "${item.venue?.name || 'Unknown'}" is no longer available`);
        }
        // Re-calculate price with current DB value
        if (item.timeSlot === 'MORNING') {
          validatedPrice = venue.basePriceMorning || 0;
        } else if (item.timeSlot === 'EVENING') {
          validatedPrice = venue.basePriceEvening || 0;
        } else {
          validatedPrice = venue.basePriceFullDay || venue.basePriceEvening || venue.basePriceMorning || 0;
        }
        itemName = venue.name;
      } 
      else if (item.vendorServiceId) {
        const service = await this.prisma.vendorService.findUnique({ 
          where: { id: item.vendorServiceId },
          include: { vendor: { select: { businessName: true } } }
        });
        if (!service || !service.isActive) {
          throw new BadRequestException(`Service "${item.vendorService?.name || 'Unknown'}" is no longer available`);
        }
        validatedPrice = service.baseRate;
        itemName = `${service.name} (${service.vendor?.businessName})`;
      } 
      else {
        validatedPrice = Number(item.totalPrice);
        itemName = 'Item';
      }

      validatedItems.push({
        id: item.id,
        itemType: item.itemType,
        venueId: item.venueId,
        vendorServiceId: item.vendorServiceId,
        addonId: item.addonId,
        date: item.date,
        timeSlot: item.timeSlot,
        quantity: item.quantity,
        meta: item.meta,
        totalPrice: item.totalPrice,
        validatedPrice,
        itemName,
      });
    }

    // Lock cart during checkout
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: 'LOCKED' },
    });

    // Calculate totals using validated prices from DB
    const subtotal = validatedItems.reduce(
      (sum, item) => sum.add(new Decimal(item.validatedPrice * (item.quantity || 1))),
      new Decimal(0)
    );

    // EXPRESS FEE: Fetch from platform settings
    let expressFeeDecimal = new Decimal(0);
    if (cart.isExpress) {
      const settings = await this.settingsService.getPlatformSettings();
      expressFeeDecimal = new Decimal(settings.expressFeeFixed.toNumber());
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { expressFee: expressFeeDecimal.toNumber() },
      });
    }

    // Platform fee calculated on (subtotal + expressFee)
    const settings = await this.settingsService.getPlatformSettings();
    const platformFeeRate = settings.platformFeePercent.toNumber() / 100;
    const platformFee = subtotal.add(expressFeeDecimal).mul(new Decimal(platformFeeRate));

    // Tax calculated on (subtotal + platformFee) - expressFee is NOT taxable
    const taxRate = settings.gstPercent.toNumber() / 100;
    const tax = subtotal.add(platformFee).mul(new Decimal(taxRate));

    const totalAmount = subtotal.add(expressFeeDecimal).add(platformFee).add(tax);

    // FIX 5: Prevent zero/negative totals after discounts
    if (totalAmount.toNumber() <= 0) {
      throw new BadRequestException('Invalid total after discounts');
    }

    const items = validatedItems.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      venueId: item.venueId,
      vendorServiceId: item.vendorServiceId,
      addonId: item.addonId,
      date: item.date,
      timeSlot: item.timeSlot,
      quantity: item.quantity,
      unitPrice: item.validatedPrice.toString(),
      totalPrice: (item.validatedPrice * (item.quantity || 1)).toString(),
      meta: item.meta as Record<string, unknown> | undefined,
      name: item.itemName,
    }));

    // FIXED: Publish checkout event AFTER operation with try/catch
    // Not inside a transaction - but still wrapped for safety
    try {
      await this.eventService.publishEvent(this.prisma, 'CART_CHECKED_OUT', {
        userId,
        cartId: cart.id,
        totalAmount: totalAmount.toString(),
        itemCount: cart.items.length,
      });
    } catch (eventError) {
      // Already logged inside publishEvent - non-critical, checkout succeeded
      this.logger.debug({ eventError }, 'Checkout event publishing failed but checkout succeeded');
    }

    // Invalidate cache
    await this.cacheService.invalidateCart(userId);

    this.logger.log(
      { 
        userId, 
        cartId: cart.id, 
        totalAmount: totalAmount.toString(),
        duration: Date.now() - startTime,
      },
      'Checkout completed with validated prices',
    );

    return {
      cartId: cart.id,
      items,
      subtotal: subtotal.toString(),
      platformFee: platformFee.toString(),
      tax: tax.toString(),
      totalAmount: totalAmount.toString(),
      isExpress: cart.isExpress,
      expressFee: expressFeeDecimal.toString(),
      status: 'CHECKOUT_SUCCESS',
    };
  }

  /**
   * Toggle express booking on cart
   */
   async toggleCartExpress(userId: number, isExpress: boolean): Promise<{ success: boolean; isExpress: boolean; expressFee: string }> {
     const cart = await this.prisma.cart.findFirst({
       where: { userId, status: 'ACTIVE' },
     });

     if (!cart) {
       throw new NotFoundException('Cart not found');
     }

      let expressFee = 0;
      if (isExpress) {
        const settings = await this.settingsService.getPlatformSettings();
        expressFee = settings.expressFeeFixed.toNumber();
      }

     await this.prisma.cart.update({
       where: { id: cart.id },
       data: { isExpress, expressFee },
     });

     await this.cacheService.invalidateCart(userId);

     this.logger.log({ userId, cartId: cart.id, isExpress, expressFee }, 'Express toggle updated');

     return { success: true, isExpress, expressFee: expressFee.toString() };
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
    * Format cart response - FIXED to resolve item names from relations
    */
  private formatCartResponse(
    cart: Cart & { items: CartItemWithRelations[] },
  ): CartResponse {
    const totals = this.calculateTotals(cart.items);

    return {
      id: cart.id,
      status: cart.status,
      isExpress: cart.isExpress,
      expressFee: cart.expressFee?.toString() ?? '0',
      // Map to CartItemResponse with resolved names from included relations
      items: cart.items.map((item) => {
        let name = 'Item';
        if (item.venue) {
          name = item.venue.name;
        } else if (item.vendorService) {
          name = `${item.vendorService.name} (${item.vendorService.vendor?.businessName ?? ''})`;
        }
        return this.formatCartItemResponse(item, name);
      }),
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
   * Unlock cart - reactivate a locked cart so user can add items again
   * Used when user leaves checkout without completing payment
   */
  async unlockCart(userId: number): Promise<{ success: boolean }> {
    const startTime = Date.now();

    await this.prisma.cart.updateMany({
      where: { userId, status: 'LOCKED' },
      data: { status: 'ACTIVE' },
    });

    await this.cacheService.invalidateCart(userId);

    this.logger.log(
      { userId, duration: Date.now() - startTime },
      'Cart unlocked',
    );

    return { success: true };
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