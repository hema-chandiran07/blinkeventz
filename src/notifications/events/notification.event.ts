import { NotificationType } from '../enums/notification-type.enum';

export class NotificationEvent {
  constructor(
    public readonly userId: number,
    public readonly type: NotificationType,
    public readonly payload: Record<string, any>,
  ) {}
}
