import { Cart, CartItem, VendorService, Venue } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type CartWithItems = Cart & {
  items: CartItemWithRelations[];
};

export type CartItemWithRelations = CartItem & {
  venue?: Venue | null;
  vendorService?: (VendorService & { vendor?: { businessName: string } | null }) | null;
};

export interface CartResponse {
  id: number;
  status: string;
  isExpress: boolean;
  expressFee: string;
  items: CartItemResponse[];
  subtotal: string;
  platformFee: string;
  tax: string;
  totalAmount: string;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemResponse {
  id: number;
  itemType: string;
  venueId?: number | null;
  vendorServiceId?: number | null;
  addonId?: number | null;
  date?: Date | string | null;
  timeSlot?: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  meta?: Record<string, unknown> | null;
  name: string;
}

export interface CheckoutResponse {
  cartId: number;
  items: CartItemResponse[];
  subtotal: string;
  platformFee: string;
  tax: string;
  totalAmount: string;
  isExpress: boolean;
  expressFee: string;
  status: 'CHECKOUT_SUCCESS';
}

export interface CartTotal {
  subtotal: Decimal;
  platformFee: Decimal;
  tax: Decimal;
  total: Decimal;
}

// Pricing constants
export const PLATFORM_FEE_PERCENTAGE = 0.02; // 2%
export const TAX_PERCENTAGE = 0.18; // 18% GST
export const CART_EXPIRATION_DAYS = 30;