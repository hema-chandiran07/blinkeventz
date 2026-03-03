import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus } from '@prisma/client';

export class UpdateKycStatusDto {
  @ApiProperty({
    enum: [KycStatus.VERIFIED, KycStatus.REJECTED],
    description: 'New KYC status',
  })
  @IsEnum(KycStatus)
  status: KycStatus;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required when rejecting)',
    example: 'Document is blurry and unreadable',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
