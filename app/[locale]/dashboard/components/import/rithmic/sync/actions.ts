'use server'
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/server/auth"
import { Connection } from "@/prisma/generated/prisma/client"
import { toDecryptedConnectionViews } from "@/lib/connection-view"
import { encryptConnectionToken } from "@/lib/connection-token-crypto"
import { capturePostHogEvent } from "@/lib/posthog-server"

export async function getRithmicSynchronizations() {
  console.log('CHECKING RITHMIC SYNCHRONIZATIONS')
  const userId = await getUserId()
  const connections = await prisma.connection.findMany({
    where: { userId: userId, service: "rithmic" },
  })
  return toDecryptedConnectionViews(connections)
}

export async function setRithmicSynchronization(synchronization: Partial<Connection> & { accountId?: string }) {
  console.log('SETTING RITHMIC SYNCHRONIZATION')
  const userId = await getUserId()
  const service = synchronization.service || 'rithmic'
  const externalId = synchronization.externalId || synchronization.accountId || ''
  const encryptedToken =
    synchronization.token !== undefined
      ? encryptConnectionToken(synchronization.token)
      : undefined
  const existingConnection = await prisma.connection.findUnique({
    where: {
      userId_service_externalId: { userId, service, externalId },
    },
    select: { id: true },
  })
  await prisma.connection.upsert({
    where: { 
      userId_service_externalId: {
        userId: userId,
        service,
        externalId,
      }
    },
    update: {
      service,
      externalId,
      lastSyncedAt: synchronization.lastSyncedAt || new Date(),
      ...(encryptedToken !== undefined ? { token: encryptedToken } : {}),
      tokenExpiresAt: synchronization.tokenExpiresAt,
      dailySyncTime: synchronization.dailySyncTime,
      environment: synchronization.environment,
      userId: userId,
      includedFeeTypes: undefined, // Rithmic has no fee differentiator
    },
    create: {
      service,
      externalId,
      lastSyncedAt: synchronization.lastSyncedAt || new Date(),
      token: encryptedToken ?? null,
      tokenExpiresAt: synchronization.tokenExpiresAt,
      dailySyncTime: synchronization.dailySyncTime,
      environment: synchronization.environment || 'demo',
      userId: userId,
      includedFeeTypes: undefined, // Rithmic has no fee differentiator
    },
  })

  await capturePostHogEvent({
    distinctId: userId,
    event: 'integration_connected',
    properties: {
      integration: service,
      is_first_connection: !existingConnection,
    },
  })
}

export async function removeRithmicSynchronization(accountId: string) {
  console.log('REMOVING RITHMIC SYNCHRONIZATION')
  const userId = await getUserId()

  await prisma.connection.deleteMany({
    where: {
      userId,
      service: "rithmic",
      externalId: accountId,
    },
  })
}
