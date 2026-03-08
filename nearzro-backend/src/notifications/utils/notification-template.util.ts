import { NotificationType } from '@prisma/client';
import { notificationTemplates } from '../templates';

export function resolveTemplate(type: NotificationType, data: any = {}) {
  return notificationTemplates[type]?.(data) ?? {
    title: 'Notification',
    message: 'You have a new notification',
  };
}
