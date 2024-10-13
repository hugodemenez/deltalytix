'use server'
import prisma from '@/lib/prisma'
import { Notification } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  if (!userId) {
    return 0
  }

  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  })
}

export async function getRecentNotifications(userId: string, limit: number = 5): Promise<Notification[]> {
  if (!userId) {
    return []
  }

  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  })
}

export async function markNotificationAsRead(id: string): Promise<void> {
  console.log('markNotificationAsRead', id)
  if (!id) {
    return
  }

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  })
  revalidatePath('/[locale]/(dashboard)/','layout')
}
