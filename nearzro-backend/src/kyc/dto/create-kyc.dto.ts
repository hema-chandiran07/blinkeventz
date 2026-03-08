import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KycDocType } from '@prisma/client';

export class CreateKycDto {
  @ApiProperty({ enum: KycDocType })
  @IsNotEmpty()
  @IsEnum(KycDocType)
  docType: KycDocType;

  @ApiProperty({ example: '123456789012' })
  @IsNotEmpty()
  @IsString()
  docNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ifscCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  branchName?: string;
}
