// src/cart/cart.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/auth-request.interface';

@ApiTags('Cart')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ✅ Get or create cart for logged-in user
  @Post()
  getOrCreate(@Req() req: AuthRequest) {
    return this.cartService.getOrCreateCart(req.user.userId);
  }

  @Post('items')
  addItem(@Req() req: AuthRequest, @Body() dto: AddCartItemDto) {
    return this.cartService.addItemForUser(req.user.userId, dto);
  }

@Delete('items/:cartItemId')
removeItem(
  @Req() req: AuthRequest,
  @Param('cartItemId') cartItemId: string,
) {
  return this.cartService.removeItem(req.user.userId, +cartItemId);
}


  @Get()
  getMyCart(@Req() req: AuthRequest) {
    return this.cartService.getActiveCart(req.user.userId);
  }

  @Post('checkout')
  checkout(@Req() req: AuthRequest) {
    return this.cartService.checkoutByUser(req.user.userId);
  }
}
