'use server'
import prisma from '@/lib/prisma'
import { Notification } from '@prisma/client'
import { revalidatePath } from 'next/cache'

interface NotificationSummary {
  recent: Notification[];
  unreadCount: number;
}

export async function getNotificationSummary(userId: string, limit: number = 5): Promise<NotificationSummary> {
  if (!userId) {
    return { recent: [], unreadCount: 0 };
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  const unreadCount = notifications.filter(notification => notification.readAt === null).length;

  return {
    recent: notifications,
    unreadCount,
  };
}

export async function markNotificationAsRead(id: string): Promise<void> {
  if (!id) {
    return;
  }

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  revalidatePath('/[locale]/(dashboard)/','layout');
}
