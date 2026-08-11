import { NextResponse } from "next/server"
import { apiError } from "@/lib/api/errors"
import { prisma } from "@/lib/prisma"
import { decryptConnectionToken } from "@/lib/connection-token-crypto"
import {
  connectIbkrFlexAccount,
  syncIbkrAccount,
} from "@/app/[locale]/dashboard/components/import/ibkr/sync/actions"
import {
  authenticateDxFeed,
  getDxFeedTrades,
} from "@/app/[locale]/dashboard/components/import/dxfeed/sync/actions"
import {
  setCustomTradovateToken,
  getTradovateTrades,
  type TradovateEnvironment,
} from "@/app/[locale]/dashboard/components/import/tradovate/sync/actions"
import {
  authenticateRithmicProtocol,
  getRithmicProtocolTrades,
} from "@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/actions"

/** Broker services that can be created and synced via API v1. */
export const SERVER_SYNCABLE_SERVICES = [
  "ibkr",
  "tradovate",
  "dxfeed",
  "rithmic-protocol",
] as const

export type ServerSyncableService = (typeof SERVER_SYNCABLE_SERVICES)[number]

export function isServerSyncableService(
  service: string | undefined | null,
): service is ServerSyncableService {
  return (
    typeof service === "string" &&
    (SERVER_SYNCABLE_SERVICES as readonly string[]).includes(service)
  )
}

type ConnectionRow = {
  id: string
  service: string
  externalId: string
  environment: string | null
  token: string | null
  tokenExpiresAt: Date | null
  includedFeeTypes: unknown
  accounts: { number: string }[]
}

async function loadConnection(
  userId: string,
  service: string,
  externalId: string,
): Promise<ConnectionRow | null> {
  return prisma.connection.findUnique({
    where: {
      userId_service_externalId: { userId, service, externalId },
    },
    select: {
      id: true,
      service: true,
      externalId: true,
      environment: true,
      token: true,
      tokenExpiresAt: true,
      includedFeeTypes: true,
      accounts: { select: { number: true } },
    },
  })
}

function connectionCreateResponse(
  connection: ConnectionRow | null,
  service: string,
  externalId: string,
  sync?: {
    imported: number
    duplicates: number
    warning?: string
    stats?: unknown
  },
) {
  return {
    id: connection?.id,
    service,
    externalId,
    environment: connection?.environment ?? undefined,
    accountNumbers: connection?.accounts.map((a) => a.number) ?? [],
    imported: sync?.imported ?? 0,
    duplicates: sync?.duplicates ?? 0,
    warning: sync?.warning,
    stats: sync?.stats,
  }
}

export type CreateConnectionBody = {
  service?: string
  // ibkr
  token?: string
  queryId?: string
  // dxfeed
  login?: string
  password?: string
  propFirmId?: string
  // rithmic-protocol
  username?: string
  systemName?: string
  historyStartDate?: string
  gatewayId?: string
  // tradovate
  accessToken?: string
  expiresAt?: string
  environment?: string
  externalId?: string
}

type SyncOk = {
  ok: true
  imported: number
  duplicates: number
  warning?: string
  stats?: unknown
}

type SyncFail = {
  ok: false
  message: string
  response: NextResponse
}

async function syncStoredConnection(
  userId: string,
  connection: ConnectionRow,
): Promise<SyncOk | SyncFail> {
  if (connection.service === "ibkr") {
    const result = await syncIbkrAccount(connection.externalId, { userId })
    if (result.error && result.savedCount == null && !result.stats) {
      return {
        ok: false,
        message: result.error,
        response: apiError(400, "sync_failed", result.error, result.errorParams),
      }
    }
    const imported = result.savedCount ?? 0
    const total = result.tradesCount ?? imported
    return {
      ok: true,
      imported,
      duplicates: Math.max(0, total - imported),
      warning: result.error || undefined,
      stats: result.stats,
    }
  }

  if (connection.service === "dxfeed") {
    const plaintext = decryptConnectionToken(connection.token)
    if (!plaintext) {
      return {
        ok: false,
        message: "Missing DxFeed credentials",
        response: apiError(400, "sync_failed", "Missing DxFeed credentials"),
      }
    }

    const result = await getDxFeedTrades(plaintext, {
      userId,
      accountId: connection.externalId,
    })
    if (result.error) {
      return {
        ok: false,
        message: result.error,
        response: apiError(400, "sync_failed", result.error, result.errorParams),
      }
    }
    const imported = result.savedCount ?? 0
    const total = result.tradesCount ?? imported
    return {
      ok: true,
      imported,
      duplicates: Math.max(0, total - imported),
      stats: result.syncStats,
    }
  }

  if (connection.service === "rithmic-protocol") {
    const plaintext = decryptConnectionToken(connection.token)
    if (!plaintext) {
      return {
        ok: false,
        message: "Missing Rithmic Protocol credentials",
        response: apiError(
          400,
          "sync_failed",
          "Missing Rithmic Protocol credentials",
        ),
      }
    }

    const result = await getRithmicProtocolTrades(plaintext, {
      userId,
      connectionId: connection.id,
    })
    if (result.error) {
      return {
        ok: false,
        message: result.error,
        response: apiError(400, "sync_failed", result.error, result.errorParams),
      }
    }
    const imported = result.savedCount ?? 0
    const total = result.tradesCount ?? imported
    return {
      ok: true,
      imported,
      duplicates: Math.max(0, total - imported),
      stats: result.syncStats,
    }
  }

  if (connection.service === "tradovate") {
    const plaintext = decryptConnectionToken(connection.token)
    if (!plaintext) {
      return {
        ok: false,
        message: "Missing Tradovate access token",
        response: apiError(400, "sync_failed", "Missing Tradovate access token"),
      }
    }

    try {
      const parsed = JSON.parse(plaintext) as { authError?: string }
      if (typeof parsed.authError === "string" && parsed.authError.length > 0) {
        return {
          ok: false,
          message: parsed.authError,
          response: apiError(400, "sync_failed", parsed.authError),
        }
      }
    } catch {
      // plain access token
    }

    if (connection.tokenExpiresAt && connection.tokenExpiresAt <= new Date()) {
      return {
        ok: false,
        message: "Token expired",
        response: apiError(400, "sync_failed", "Token expired"),
      }
    }

    const includedFeeTypes = connection.includedFeeTypes as
      | Record<string, boolean>
      | null
      | undefined
    const environment: TradovateEnvironment =
      connection.environment === "live" ? "live" : "demo"

    const result = await getTradovateTrades(plaintext, {
      userId,
      includedFeeTypes: includedFeeTypes ?? undefined,
      environment,
      connectionExternalId: connection.externalId,
    })
    if (result.error) {
      return {
        ok: false,
        message: result.error,
        response: apiError(400, "sync_failed", result.error),
      }
    }
    const imported = result.savedCount ?? 0
    const total = result.ordersCount ?? imported
    return {
      ok: true,
      imported,
      duplicates: Math.max(0, total - imported),
    }
  }

  return {
    ok: false,
    message: `Sync is not available for service "${connection.service}"`,
    response: apiError(
      422,
      "unsupported_service",
      `Sync is not available for service "${connection.service}"`,
      { supported: [...SERVER_SYNCABLE_SERVICES] },
    ),
  }
}

async function syncAfterCreate(
  userId: string,
  service: ServerSyncableService,
  externalId: string,
): Promise<{
  connection: ConnectionRow | null
  sync?: SyncOk
}> {
  const connection = await loadConnection(userId, service, externalId)
  if (!connection) return { connection: null }

  const sync = await syncStoredConnection(userId, connection)
  if (!sync.ok) {
    // Connection was created; return it with a warning rather than failing create.
    return {
      connection,
      sync: {
        ok: true,
        imported: 0,
        duplicates: 0,
        warning: sync.message || "Initial sync failed",
      },
    }
  }
  return { connection, sync }
}

export async function createServerSyncableConnection(
  userId: string,
  body: CreateConnectionBody,
): Promise<NextResponse> {
  const service = body.service?.toLowerCase()
  if (!isServerSyncableService(service)) {
    return apiError(
      422,
      "unsupported_service",
      "Only server-syncable connection services are supported in v1",
      { supported: [...SERVER_SYNCABLE_SERVICES] },
    )
  }

  if (service === "ibkr") {
    if (!body.token || !body.queryId) {
      return apiError(
        400,
        "validation_error",
        "token and queryId are required for IBKR Flex connections",
      )
    }

    const result = await connectIbkrFlexAccount(
      `token=${body.token}\nqueryId=${body.queryId}`,
      { userId },
    )

    if (!result.success) {
      return apiError(
        400,
        "connection_failed",
        result.error || "Failed to connect IBKR Flex account",
        result.errorParams,
      )
    }

    const connection = await loadConnection(userId, "ibkr", result.accountId!)
    const imported = result.savedCount ?? 0
    const total = result.tradesCount ?? imported
    return NextResponse.json(
      connectionCreateResponse(connection, "ibkr", result.accountId!, {
        imported,
        duplicates: Math.max(0, total - imported),
        stats: result.stats,
      }),
      { status: 201 },
    )
  }

  if (service === "dxfeed") {
    if (!body.login || !body.password || !body.propFirmId) {
      return apiError(
        400,
        "validation_error",
        "login, password, and propFirmId are required for DxFeed connections",
      )
    }

    const result = await authenticateDxFeed(
      body.login,
      body.password,
      body.propFirmId,
      { userId },
    )
    if ("error" in result && result.error) {
      return apiError(400, "connection_failed", result.error, result.errorParams)
    }

    const { connection, sync } = await syncAfterCreate(userId, "dxfeed", body.login)
    return NextResponse.json(
      connectionCreateResponse(connection, "dxfeed", body.login, sync),
      { status: 201 },
    )
  }

  if (service === "rithmic-protocol") {
    if (
      !body.username ||
      !body.password ||
      !body.systemName ||
      !body.historyStartDate
    ) {
      return apiError(
        400,
        "validation_error",
        "username, password, systemName, and historyStartDate are required for Rithmic Protocol connections",
      )
    }

    const result = await authenticateRithmicProtocol(
      body.username,
      body.password,
      body.systemName,
      body.historyStartDate,
      body.gatewayId,
      { userId },
    )
    if ("error" in result && result.error) {
      return apiError(
        400,
        "connection_failed",
        result.error,
        "errorParams" in result ? result.errorParams : undefined,
      )
    }

    const { connection, sync } = await syncAfterCreate(
      userId,
      "rithmic-protocol",
      body.username,
    )
    return NextResponse.json(
      connectionCreateResponse(connection, "rithmic-protocol", body.username, sync),
      { status: 201 },
    )
  }

  // tradovate
  if (!body.accessToken || !body.expiresAt) {
    return apiError(
      400,
      "validation_error",
      "accessToken and expiresAt are required for Tradovate connections",
    )
  }

  const environment: TradovateEnvironment =
    body.environment === "live" ? "live" : "demo"
  const externalId = (body.externalId?.trim() || "default").slice(0, 128)

  const storeResult = await setCustomTradovateToken(
    body.accessToken,
    body.expiresAt,
    externalId,
    environment,
    { userId },
  )
  if ("error" in storeResult && storeResult.error) {
    return apiError(400, "connection_failed", storeResult.error)
  }

  const { connection, sync } = await syncAfterCreate(userId, "tradovate", externalId)
  return NextResponse.json(
    connectionCreateResponse(connection, "tradovate", externalId, sync),
    { status: 201 },
  )
}

export async function syncServerSyncableConnection(
  userId: string,
  connectionId: string,
): Promise<NextResponse> {
  const connection = await prisma.connection.findFirst({
    where: { id: connectionId, userId },
    select: {
      id: true,
      service: true,
      externalId: true,
      environment: true,
      token: true,
      tokenExpiresAt: true,
      includedFeeTypes: true,
      accounts: { select: { number: true } },
    },
  })

  if (!connection) {
    return apiError(404, "not_found", "Connection not found")
  }

  if (!isServerSyncableService(connection.service)) {
    return apiError(
      422,
      "unsupported_service",
      `Sync is not available for service "${connection.service}"`,
      { supported: [...SERVER_SYNCABLE_SERVICES] },
    )
  }

  const result = await syncStoredConnection(userId, connection)
  if (!result.ok) return result.response

  return NextResponse.json({
    status: "completed",
    imported: result.imported,
    duplicates: result.duplicates,
    warning: result.warning,
    stats: result.stats,
  })
}
