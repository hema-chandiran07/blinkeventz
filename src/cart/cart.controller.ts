import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post(':userId')
  getOrCreate(@Param('userId') userId: string) {
    return this.cartService.getOrCreateCart(+userId);
  }

  @Post(':cartId/items')
  addItem(@Param('cartId') cartId: string, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(+cartId, dto);
  }

  @Delete('items/:cartItemId')
  removeItem(@Param('cartItemId') cartItemId: string) {
    return this.cartService.removeItem(+cartItemId);
  }

  @Get(':cartId')
  getCart(@Param('cartId') cartId: string) {
    return this.cartService.getCart(+cartId);
  }

  @Post(':cartId/checkout')
  checkout(@Param('cartId') cartId: string) {
    return this.cartService.checkout(+cartId);
  }
}
