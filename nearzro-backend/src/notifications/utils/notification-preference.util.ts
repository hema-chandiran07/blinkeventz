import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannel, NotificationType } from '@prisma/client';

export async function getUserEnabledChannels(
  prisma: PrismaService,
  userId: number,
  type: NotificationType,
): Promise<NotificationChannel[]> {
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId, type, enabled: true },
    select: { channel: true },
  });

  return prefs.map(p => p.channel);
}
