import { Controller, Get, Post, Body, Req,Param } from '@nestjs/common';
import { KycService } from './kyc.service';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { Request } from 'express';
import { ApiTags,ApiBearerAuth } from '@nestjs/swagger';

interface AuthRequest extends Request {
  user: { id: string };
}
@ApiBearerAuth()
@ApiTags('Bank')
@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly kycService: KycService) {}
@Post()
addBankAccount(
  @Req() req: AuthRequest,
  @Body() dto: AddBankAccountDto,
) {
  const userId = Number(req.user.id);

  return this.kycService.addBankAccount(userId, dto);
}

  @Get(':userId')
  getBankAccounts(@Param('userId') userId: string) {
    return this.kycService.getBankAccounts(+userId);
  }
}
