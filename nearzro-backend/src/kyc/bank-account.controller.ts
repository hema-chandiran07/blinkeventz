import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BankAccountService } from './bank-account/bank-account.service';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: number; email: string; role?: string };
}

// ─────────────────────────────────────────────────────────────
// Bank Account Controller
// ─────────────────────────────────────────────────────────────

@ApiTags('Bank Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new bank account' })
  async addBankAccount(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddBankAccountDto,
  ) {
    return this.bankAccountService.addBankAccount(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my bank accounts (masked)' })
  async getMyBankAccounts(@Req() req: AuthenticatedRequest) {
    return this.bankAccountService.getBankAccounts(req.user.userId);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify a bank account (admin only)' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async verifyBankAccount(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bankAccountService.verifyBankAccount(id, req.user.userId);
  }
}
