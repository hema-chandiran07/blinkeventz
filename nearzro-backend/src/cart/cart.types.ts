import { Cart, CartItem } from '@prisma/client';

export type CartWithItems = Cart & {
  items: CartItem[];
};

export interface CheckoutResponse {
  cartId: number;
  totalAmount: number;
  itemsCount: number;
  status: 'CHECKOUT_SUCCESS';
}
