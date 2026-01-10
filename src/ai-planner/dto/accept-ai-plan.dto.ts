import { ApiProperty } from '@nestjs/swagger';

export class AcceptAIPlanDto {
  @ApiProperty({ example: true })
  accept: boolean;
}
