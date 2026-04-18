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
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart with items and totals' })
  async getCart(@Req() req: any) {
    const userId = req.user.userId;
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Optional key for idempotent requests',
    required: false,
  })
  async addItem(
    @Req() req: any,
    @Body() dto: AddCartItemDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const userId = req.user.userId;
    return this.cartService.addItem(userId, dto, idempotencyKey);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity or metadata' })
  async updateItem(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = req.user.userId;
    return this.cartService.updateItem(userId, id, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.userId;
    return this.cartService.removeItem(userId, id);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from cart' })
  async clearCart(@Req() req: any) {
    const userId = req.user.userId;
    return this.cartService.clearCart(userId);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process checkout - lock cart and return payment data' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Optional key for idempotent checkout requests',
    required: false,
  })
  async checkout(
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const userId = req.user.userId;
    return this.cartService.checkout(userId, idempotencyKey);
  }

  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock cart - reactivate a locked cart' })
  async unlockCart(@Req() req: any) {
    const userId = req.user.userId;
    return this.cartService.unlockCart(userId);
  }
}
