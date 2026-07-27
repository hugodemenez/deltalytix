// app/api/cron/daily-sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decryptConnectionToken } from '@/lib/connection-token-crypto'
import { isDailySyncDue } from '@/lib/daily-sync-schedule'
import { getDxFeedTrades } from '@/app/[locale]/dashboard/components/import/dxfeed/sync/actions'
import { getRithmicProtocolTrades } from '@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/actions'
import { invalidateConnectionsPageCache } from '@/app/[locale]/dashboard/connections/data'

export const maxDuration = 300

/**
 * Services this cron can sync unattended. Tradovate is deliberately absent: its
 * schedule is already driven by /api/cron/renew-tradovate-token, which has to
 * refresh the OAuth token in the same pass.
 */
const SYNCABLE_SERVICES = ['dxfeed', 'rithmic-protocol'] as const

/** Stop starting new syncs past this point so the function returns before its limit. */
const WALL_CLOCK_BUDGET_MS = 240_000

/** The broker was reached and the connection is up to date — not a failure. */
const DUPLICATE_TRADES = 'DUPLICATE_TRADES'

async function syncConnection(connection: {
  service: string
  userId: string
  externalId: string
  token: string | null
}): Promise<{ ok: boolean; reason?: string }> {
  const storedTokenJson = decryptConnectionToken(connection.token)
  if (!storedTokenJson) {
    return { ok: false, reason: 'NO_TOKEN' }
  }

  const error =
    connection.service === 'dxfeed'
      ? (
          await getDxFeedTrades(storedTokenJson, {
            userId: connection.userId,
            accountId: connection.externalId,
          })
        ).error
      : (
          await getRithmicProtocolTrades(storedTokenJson, {
            userId: connection.userId,
          })
        ).error

  if (!error || error === DUPLICATE_TRADES) return { ok: true }
  return { ok: false, reason: error }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startedAt = Date.now()
  const now = new Date()

  try {
    const connections = await prisma.connection.findMany({
      where: {
        service: { in: [...SYNCABLE_SERVICES] },
        token: { not: null },
        dailySyncTime: { not: null },
        // DxFeed stamps an epoch expiry when the broker rejects a token; without
        // this the cron would retry a dead connection on every tick until the
        // catch-up window closes. Rithmic Protocol stores credentials, not a
        // token with an expiry, so its rows carry null here.
        OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { gt: now } }],
      },
      select: {
        id: true,
        userId: true,
        service: true,
        externalId: true,
        token: true,
        dailySyncTime: true,
        lastSyncedAt: true,
      },
    })

    const due = connections.filter((connection) =>
      isDailySyncDue(connection.dailySyncTime, connection.lastSyncedAt, now),
    )

    let synced = 0
    let failed = 0
    let deferred = 0
    const touchedUserIds = new Set<string>()

    // Sequential on purpose: a Rithmic Protocol sync opens a gateway session and
    // pulls up to 30-day fill windows. Running these in parallel starves the
    // function and trips broker-side rate limits.
    for (const connection of due) {
      if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) {
        // Still inside the catch-up window, so the next tick picks these up.
        deferred = due.length - (synced + failed)
        break
      }

      try {
        const result = await syncConnection(connection)
        if (result.ok) {
          synced++
          touchedUserIds.add(connection.userId)
        } else {
          failed++
          console.warn(
            `[CRON daily-sync] ${connection.service}/${connection.id} failed: ${result.reason}`,
          )
        }
      } catch (error) {
        failed++
        console.error(
          `[CRON daily-sync] ${connection.service}/${connection.id} threw:`,
          error,
        )
      }
    }

    await Promise.allSettled(
      [...touchedUserIds].map((userId) => invalidateConnectionsPageCache(userId)),
    )

    return NextResponse.json({
      success: true,
      candidates: connections.length,
      due: due.length,
      synced,
      failed,
      deferred,
    })
  } catch (error) {
    console.error('[CRON daily-sync] job error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
