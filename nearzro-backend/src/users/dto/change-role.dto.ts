import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class ChangeRoleDto {
  @ApiProperty({ enum: ['CUSTOMER', 'VENDOR', 'VENUE_OWNER', 'ADMIN', 'EVENT_MANAGER', 'SUPPORT'] })
  @IsNotEmpty()
  @IsString()
  role: Role;
}