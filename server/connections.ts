'use server'

import { prisma } from '@/lib/prisma'

/**
 * Upsert trading accounts by number and optionally attach them to a Connection.
 * Returns a map of accountNumber → Account.id for dual-writing Trade.accountId.
 */
export async function upsertAccountsForNumbers(
  userId: string,
  accountNumbers: string[],
  connectionId?: string | null
): Promise<Map<string, string>> {
  const uniqueNumbers = [...new Set(accountNumbers.filter(Boolean))]
  const accountIdByNumber = new Map<string, string>()

  if (uniqueNumbers.length === 0) {
    return accountIdByNumber
  }

  for (const number of uniqueNumbers) {
    const account = await prisma.account.upsert({
      where: {
        number_userId: {
          number,
          userId,
        },
      },
      update: connectionId
        ? { connectionId }
        : {},
      create: {
        number,
        userId,
        ...(connectionId ? { connectionId } : {}),
      },
      select: { id: true, number: true },
    })
    accountIdByNumber.set(account.number, account.id)
  }

  return accountIdByNumber
}

/**
 * Ensure a Connection row exists for a broker sync service.
 */
export async function ensureConnection(params: {
  userId: string
  service: string
  externalId: string
  token?: string | null
  tokenExpiresAt?: Date | null
  environment?: string
  lastSyncedAt?: Date
  dailySyncTime?: Date | null
  includedFeeTypes?: unknown
}) {
  const {
    userId,
    service,
    externalId,
    token,
    tokenExpiresAt,
    environment = 'demo',
    lastSyncedAt = new Date(),
    dailySyncTime,
    includedFeeTypes,
  } = params

  return prisma.connection.upsert({
    where: {
      userId_service_externalId: {
        userId,
        service,
        externalId,
      },
    },
    update: {
      lastSyncedAt,
      ...(token !== undefined ? { token } : {}),
      ...(tokenExpiresAt !== undefined ? { tokenExpiresAt } : {}),
      ...(dailySyncTime !== undefined ? { dailySyncTime } : {}),
      ...(includedFeeTypes !== undefined
        ? { includedFeeTypes: includedFeeTypes as object }
        : {}),
      environment,
    },
    create: {
      userId,
      service,
      externalId,
      lastSyncedAt,
      token: token ?? null,
      tokenExpiresAt: tokenExpiresAt ?? null,
      dailySyncTime: dailySyncTime ?? null,
      includedFeeTypes: includedFeeTypes as object | undefined,
      environment,
    },
  })
}

export async function getConnectionsForUser(userId: string) {
  return prisma.connection.findMany({
    where: { userId },
    include: {
      accounts: {
        select: {
          id: true,
          number: true,
          propfirm: true,
          connectionId: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ service: 'asc' }, { createdAt: 'asc' }],
  })
}
