import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KycStatus } from '@prisma/client';

export class UpdateKycStatusDto {
  @ApiProperty({ enum: KycStatus })
  @IsNotEmpty()
  @IsEnum(KycStatus)
  status: KycStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
