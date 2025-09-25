'use server'
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/server/auth"
import { Synchronization } from "@prisma/client"

export async function getRithmicSynchronizations() {
  const userId = await getUserId()
  const synchronizations = await prisma.synchronization.findMany({
    where: { userId: userId, service: "rithmic" },
  })
  return synchronizations
}

export async function setRithmicSynchronization(synchronization: Partial<Synchronization>) {
  const userId = await getUserId()
  await prisma.synchronization.upsert({
    where: { 
      userId: userId,
      id: synchronization.id 
    },
    update: {
      ...synchronization,
      userId: userId
    },
    create: {
      ...synchronization,
      service: synchronization.service || '',
      accountId: synchronization.accountId || '',
      lastSyncedAt: synchronization.lastSyncedAt || new Date(),
      userId: userId
    },
  })
}