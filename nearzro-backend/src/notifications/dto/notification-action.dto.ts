import { IsEnum, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationAction {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}

export class NotificationActionDto {
@ApiProperty({ example: 12 })
  @IsInt()
  notificationId: number;

  @ApiProperty({ example: 12 })
  @IsEnum(NotificationAction)
  action: NotificationAction;
}
