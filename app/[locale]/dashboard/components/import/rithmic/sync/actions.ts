'use server'
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/server/auth"
import { Synchronization } from "@prisma/client"

export async function getRithmicSynchronizations() {
  console.log('CHECKING RITHMIC SYNCHRONIZATIONS')
  const userId = await getUserId()
  const synchronizations = await prisma.synchronization.findMany({
    where: { userId: userId, service: "rithmic" },
  })
  return synchronizations
}

export async function setRithmicSynchronization(synchronization: Partial<Synchronization>) {
  console.log('SETTING RITHMIC SYNCHRONIZATION')
  const userId = await getUserId()
  
  // Ensure accountId is the credential ID, not username
  if (!synchronization.accountId) {
    throw new Error('accountId (credential ID) is required')
  }
  
  await prisma.synchronization.upsert({
    where: { 
      userId_service_accountId: {
        userId: userId,
        service: synchronization.service || 'rithmic',
        accountId: synchronization.accountId
      }
    },
    update: {
      ...synchronization,
      userId: userId
    },
    create: {
      ...synchronization,
      service: synchronization.service || 'rithmic',
      accountId: synchronization.accountId,
      lastSyncedAt: synchronization.lastSyncedAt || new Date(),
      userId: userId
    },
  })
}

export async function deleteRithmicSynchronization(credentialId: string) {
  console.log('DELETING RITHMIC SYNCHRONIZATION', credentialId)
  const userId = await getUserId()
  
  await prisma.synchronization.deleteMany({
    where: { 
      userId: userId,
      service: 'rithmic',
      accountId: credentialId
    }
  })
}