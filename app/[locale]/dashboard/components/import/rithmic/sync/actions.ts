'use server'
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/server/auth"
import { Synchronization } from "@/prisma/generated/prisma/client"
import { capturePostHogEvent } from "@/lib/posthog-server"
import {
  encryptConnectionToken,
  withDecryptedConnectionToken,
} from "@/lib/connection-token-crypto"

export async function getRithmicSynchronizations() {
  console.log('CHECKING RITHMIC SYNCHRONIZATIONS')
  const userId = await getUserId()
  const synchronizations = await prisma.synchronization.findMany({
    where: { userId: userId, service: "rithmic" },
  })
  return synchronizations.map(withDecryptedConnectionToken)
}

export async function setRithmicSynchronization(synchronization: Partial<Synchronization>) {
  console.log('SETTING RITHMIC SYNCHRONIZATION')
  const userId = await getUserId()
  const service = synchronization.service || 'rithmic'
  const accountId = synchronization.accountId || ''
  const existingSynchronization = await prisma.synchronization.findUnique({
    where: {
      userId_service_accountId: { userId, service, accountId },
    },
    select: { id: true },
  })
  const encryptedToken =
    synchronization.token !== undefined
      ? encryptConnectionToken(synchronization.token)
      : undefined
  await prisma.synchronization.upsert({
    where: { 
      userId_service_accountId: {
        userId: userId,
        service,
        accountId
      }
    },
    update: {
      ...synchronization,
      ...(encryptedToken !== undefined ? { token: encryptedToken } : {}),
      userId: userId,
      includedFeeTypes: undefined, // Rithmic has no fee differentiator
    },
    create: {
      ...synchronization,
      ...(encryptedToken !== undefined ? { token: encryptedToken } : {}),
      service,
      accountId,
      lastSyncedAt: synchronization.lastSyncedAt || new Date(),
      userId: userId,
      includedFeeTypes: undefined, // Rithmic has no fee differentiator
    },
  })

  await capturePostHogEvent({
    distinctId: userId,
    event: 'integration_connected',
    properties: {
      integration: service,
      is_first_connection: !existingSynchronization,
    },
  })
}

export async function removeRithmicSynchronization(accountId: string) {
  console.log('REMOVING RITHMIC SYNCHRONIZATION')
  const userId = await getUserId()

  await prisma.synchronization.deleteMany({
    where: {
      userId,
      service: "rithmic",
      accountId,
    },
  })
}
