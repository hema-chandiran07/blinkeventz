import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KycDocType } from '@prisma/client';

export class SubmitKycDto {
  @ApiProperty({
    enum: KycDocType,
    description: 'Type of KYC document',
    example: 'AADHAAR',
  })
  @IsEnum(KycDocType)
  docType: KycDocType;

  @ApiProperty({
    description: 'Document number (e.g., Aadhaar, PAN)',
    example: '1234-5678-9012',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  docNumber: string;
}
