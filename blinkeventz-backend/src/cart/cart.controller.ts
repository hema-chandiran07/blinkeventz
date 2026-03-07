import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public()
  @Get()
  async getCart(@Req() req: any) {
    const userId = req.user?.id || null; // Allow guest carts
    return this.cartService.getCart(userId);
  }

  @Public()
  @Post('items')
  async addItem(@Req() req: any, @Body() dto: AddCartItemDto) {
    const userId = req.user?.id || null;
    return this.cartService.addItem(userId, dto);
  }

  @Public()
  @Patch('items/:id')
  async updateItem(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = req.user?.id || null;
    return this.cartService.updateItem(userId, +id, dto);
  }

  @Public()
  @Delete('items/:id')
  async removeItem(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || null;
    return this.cartService.removeItem(userId, +id);
  }

  @Public()
  @Delete('clear')
  async clearCart(@Req() req: any) {
    const userId = req.user?.id || null;
    return this.cartService.clearCart(userId);
  }
}
