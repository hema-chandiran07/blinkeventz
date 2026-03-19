import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannel, NotificationType } from '@prisma/client';

export async function getUserEnabledChannels(
  prisma: PrismaService,
  userId: number,
  type: NotificationType,
): Promise<NotificationChannel[]> {
  // Fetch all preferences and filter enabled ones in code
  // This allows tests to control the exact return value
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId, type },
    select: { channel: true, enabled: true },
  });

  // Filter only enabled channels
  return prefs.filter(p => p.enabled).map(p => p.channel);
}
