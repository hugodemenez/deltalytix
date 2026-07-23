'use server'
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/server/auth"
import { Connection } from "@/prisma/generated/prisma/client"
import { toDecryptedConnectionViews } from "@/lib/connection-view"
import { encryptConnectionToken } from "@/lib/connection-token-crypto"
import { capturePostHogEvent } from "@/lib/posthog-server"
import { upsertAccountsForNumbers } from "@/server/connections"
import { invalidateConnectionsPageCache } from "@/app/[locale]/dashboard/connections/data"

export async function getRithmicSynchronizations() {
  console.log('CHECKING RITHMIC SYNCHRONIZATIONS')
  const userId = await getUserId()
  const connections = await prisma.connection.findMany({
    where: { userId: userId, service: "rithmic" },
  })
  return toDecryptedConnectionViews(connections)
}

/**
 * Upsert the Rithmic Connection and optionally attach trading accounts so they
 * leave the Connections page "standalone / imported without broker sync" bucket.
 */
export async function setRithmicSynchronization(
  synchronization: Partial<Connection> & {
    accountId?: string
    /** Trading account numbers to attach to this Connection */
    accountNumbers?: string[]
  }
) {
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
  const connection = await prisma.connection.upsert({
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

  const accountNumbers = synchronization.accountNumbers ?? []
  if (accountNumbers.length > 0) {
    await upsertAccountsForNumbers(userId, accountNumbers, connection.id)
  }

  await invalidateConnectionsPageCache(userId)

  await capturePostHogEvent({
    distinctId: userId,
    event: 'integration_connected',
    properties: {
      integration: service,
      is_first_connection: !existingConnection,
    },
  })

  return connection
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

  await invalidateConnectionsPageCache(userId)
}
