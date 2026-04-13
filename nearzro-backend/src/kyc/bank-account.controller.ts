import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BankAccountService } from './bank-account/bank-account.service';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { Request } from 'express';
import { Audit, AUDIT_META_KEY } from '../audit/decorators/audit.decorator';
import { AuditSeverity, AuditSource } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: { userId: number; email: string; role?: string };
}

// ─────────────────────────────────────────────────────────────
// Bank Account Controller
// ─────────────────────────────────────────────────────────────

@ApiTags('Bank Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bank-account')  // Changed to singular for frontend compatibility
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Get()
  @ApiOperation({ summary: 'Get my bank accounts' })
  async getMyBankAccounts(@Req() req: AuthenticatedRequest) {
    return this.bankAccountService.getBankAccounts(req.user.userId);
  }

  @Post()
  @Audit({
    action: 'BANK_ACCOUNT_CREATE',
    entityType: 'BankAccount',
    severity: AuditSeverity.INFO,
    source: AuditSource.USER,
  })
  @ApiOperation({ summary: 'Add a new bank account' })
  async addBankAccount(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddBankAccountDto,
  ) {
    return this.bankAccountService.addBankAccount(req.user.userId, dto);
  }

  @Get('venue-owner')
  @ApiOperation({ summary: 'Get venue owner bank account' })
  async getVenueOwnerBankAccount(@Req() req: AuthenticatedRequest) {
    const accounts = await this.bankAccountService.getBankAccounts(req.user.userId);
    if (!accounts || accounts.length === 0) {
      return { message: 'No bank account found', account: null };
    }
    return accounts[0];
  }

  @Get('vendor')
  @ApiOperation({ summary: 'Get vendor bank account' })
  async getVendorBankAccount(@Req() req: AuthenticatedRequest) {
    const accounts = await this.bankAccountService.getBankAccounts(req.user.userId);
    if (!accounts || accounts.length === 0) {
      return { success: true, data: null, message: 'No bank account found' };
    }
    return { success: true, data: accounts[0] };
  }

  @Patch(':id/verify')
  @Audit({
    action: 'BANK_ACCOUNT_VERIFY',
    entityType: 'BankAccount',
    severity: AuditSeverity.WARNING,
    source: AuditSource.ADMIN,
  })
  @ApiOperation({ summary: 'Verify a bank account (admin only)' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async verifyBankAccount(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bankAccountService.verifyBankAccount(id, req.user.userId);
  }

  // ─────────────────────────────────────────────────────────
  // NEW: Update bank account (PATCH)
  // ─────────────────────────────────────────────────────────

  @Patch(':id')
  @Audit({
    action: 'BANK_ACCOUNT_UPDATE',
    entityType: 'BankAccount',
    severity: AuditSeverity.INFO,
    source: AuditSource.USER,
  })
  @ApiOperation({ summary: 'Update bank account details' })
  @ApiParam({ name: 'id', type: Number, description: 'Bank Account ID' })
  async updateBankAccount(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<AddBankAccountDto>,
  ) {
    return this.bankAccountService.updateBankAccount(req.user.userId, id, dto);
  }

  // ─────────────────────────────────────────────────────────
  // NEW: Update bank account (PUT alias for frontend compatibility)
  // ─────────────────────────────────────────────────────────

  @Put(':id')
  @Audit({
    action: 'BANK_ACCOUNT_UPDATE',
    entityType: 'BankAccount',
    severity: AuditSeverity.INFO,
    source: AuditSource.USER,
  })
  @ApiOperation({ summary: 'Update bank account details (PUT)' })
  @ApiParam({ name: 'id', type: Number, description: 'Bank Account ID' })
  async updateBankAccountPut(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<AddBankAccountDto>,
  ) {
    return this.bankAccountService.updateBankAccount(req.user.userId, id, dto);
  }

  // ─────────────────────────────────────────────────────────
  // NEW: Delete bank account
  // ─────────────────────────────────────────────────────────

  @Delete(':id')
  @Audit({
    action: 'BANK_ACCOUNT_DELETE',
    entityType: 'BankAccount',
    severity: AuditSeverity.WARNING,
    source: AuditSource.USER,
  })
  @ApiOperation({ summary: 'Delete bank account' })
  @ApiParam({ name: 'id', type: Number, description: 'Bank Account ID' })
  async deleteBankAccount(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bankAccountService.deleteBankAccount(req.user.userId, id);
  }
}

// ─────────────────────────────────────────────────────────────
// Bank Account Controller (Alias for /bank-account singular)
// ─────────────────────────────────────────────────────────────

@Controller('bank-account')
export class BankAccountAliasController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Get('venue-owner')
  @ApiOperation({ summary: 'Get venue owner bank account (alias)' })
  @UseGuards(JwtAuthGuard)
  async getVenueOwnerBankAccount(@Req() req: AuthenticatedRequest) {
    const accounts = await this.bankAccountService.getBankAccounts(req.user.userId);
    if (!accounts || accounts.length === 0) {
      throw new NotFoundException('No bank account found for venue owner');
    }
    return accounts[0];
  }
}
