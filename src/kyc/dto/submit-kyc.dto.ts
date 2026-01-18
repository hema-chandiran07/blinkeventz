import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';

export class SubmitKycDto {
  @ApiProperty({ enum: $Enums.KycDocType })
  @IsEnum($Enums.KycDocType)
  docType: $Enums.KycDocType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  docNumber: string;

  @ApiProperty()
  @IsUrl()
  docFileUrl: string;
}
