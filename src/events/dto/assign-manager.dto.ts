import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignManagerDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  managerId: number;
}
