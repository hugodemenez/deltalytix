"use server";

import { createClient, getUserId } from "@/server/auth";
import { saveTradesAction } from "@/server/database";
import { prisma } from "@/lib/prisma";
import {
  decryptConnectionToken,
  encryptConnectionToken,
  hasConnectionTokenEncryptionKey,
} from "@/lib/connection-token-crypto";
import { toDecryptedConnectionViews } from "@/lib/connection-view";
import { invalidateConnectionsPageCache } from "@/app/[locale]/dashboard/connections/data";
import { upsertAccountsForNumbers } from "@/server/connections";
import { createTradeWithDefaults } from "@/lib/trade-factory";
import { generateDeterministicTradeId } from "@/lib/trade-id-utils";
import type { IgApiAccount, IgApiEnvironment, IgApiTransaction } from "@/lib/ig-api/client";
import {
  igApiKeyFingerprint,
  sanitizeIgApiKey,
} from "@/lib/ig-api/api-key";
import { mapIgAuthError } from "@/lib/ig-api/errors";
import { fetchIgDealHistory } from "@/lib/ig-api/fetch-history";
import { isValidIgIdentifier } from "@/lib/ig-api/identifier";
import { mapIgApiTransactions } from "@/lib/ig-api/transactions-to-trades";
import type {
  IgActionResult,
  IgStoredCredentials,
  IgTradesResult,
} from "./ig-types";

const SERVICE = "ig";
/**
 * Every sync pulls the full history. Pagination is driven by transaction count,
 * not by span, so an early floor costs nothing for a recent account, and saving
 * trades is idempotent (deterministic ids + duplicate check). Syncing forward
 * from `lastSyncedAt` instead would be faster but unsound: the watermark
 * advances even when individual accounts fail, and IG can book deals with a
 * date earlier than when they appear.
 */
const HISTORY_START = "2000-01-01";

const logger = {
  info: (message: string) => console.log(`[IG] ${message}`),
  warn: (message: string) => console.warn(`[IG] ${message}`),
  error: (message: string, error?: unknown) =>
    console.error(
      `[IG] ${message}`,
      error instanceof Error ? error.message : (error ?? ""),
    ),
};

function parseStoredCredentials(
  tokenField: string,
): IgStoredCredentials | null {
  try {
    const parsed = JSON.parse(tokenField) as IgStoredCredentials;
    const apiKey = sanitizeIgApiKey(parsed.apiKey ?? "");
    if (
      !parsed.identifier ||
      !parsed.password ||
      !apiKey ||
      (parsed.environment !== "live" && parsed.environment !== "demo")
    ) {
      return null;
    }
    return { ...parsed, apiKey };
  } catch {
    return null;
  }
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function persistIgCredentials(
  userId: string,
  tokenJson: string,
  externalId: string,
) {
  const encryptedToken = encryptConnectionToken(tokenJson);

  const connection = await prisma.connection.upsert({
    where: {
      userId_service_externalId: {
        userId,
        service: SERVICE,
        externalId,
      },
    },
    update: {
      token: encryptedToken,
      lastSyncedAt: new Date(),
      environment: (JSON.parse(tokenJson) as IgStoredCredentials).environment,
      includedFeeTypes: undefined,
    },
    create: {
      userId,
      service: SERVICE,
      externalId,
      token: encryptedToken,
      lastSyncedAt: new Date(),
      environment: (JSON.parse(tokenJson) as IgStoredCredentials).environment,
    },
  });

  await invalidateConnectionsPageCache(userId);
  return connection;
}

/**
 * Persist an IG connection after the browser has already authenticated with
 * IG (same egress as API Companion). Server-side POST /session from Vercel
 * was rejected with api-key-invalid for keys that Companion accepted — so we
 * never call IG from this action on connect.
 */
export async function saveIgConnection(params: {
  identifier: string;
  password: string;
  apiKey: string;
  environment: IgApiEnvironment;
  accounts: IgApiAccount[];
}): Promise<IgActionResult> {
  const environment = params.environment;
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "USER_NOT_AUTHENTICATED" };
    }

    const trimmedIdentifier = params.identifier.trim();
    const trimmedApiKey = sanitizeIgApiKey(params.apiKey);
    if (!trimmedIdentifier || !params.password || !trimmedApiKey) {
      return { error: "CREDENTIALS_REQUIRED" };
    }

    if (!hasConnectionTokenEncryptionKey()) {
      logger.error("ENCRYPTION_KEY is not configured — refusing to connect IG");
      return { error: "ENCRYPTION_KEY_MISSING" };
    }

    if (!isValidIgIdentifier(trimmedIdentifier)) {
      logger.warn(
        `Rejecting identifier that does not match IG API pattern (length=${trimmedIdentifier.length})`,
      );
      return { error: "IG_IDENTIFIER_INVALID" };
    }

    if (!Array.isArray(params.accounts) || params.accounts.length === 0) {
      return { error: "NO_ACCOUNTS" };
    }

    const accountIds = params.accounts.map((a) => a.accountId).filter(Boolean);
    if (accountIds.length === 0) {
      return { error: "NO_ACCOUNTS" };
    }

    const accountNames = Object.fromEntries(
      params.accounts.map((a) => [a.accountId, a.accountName || a.accountId]),
    );

    logger.info(
      `Saving IG connection ${trimmedIdentifier} on ${environment} (apiKey ${igApiKeyFingerprint(trimmedApiKey)}, accounts=${accountIds.length})`,
    );

    const stored: IgStoredCredentials = {
      identifier: trimmedIdentifier,
      password: params.password,
      apiKey: trimmedApiKey,
      environment,
      accountIds,
      accountNames,
    };

    const connection = await persistIgCredentials(
      userId,
      JSON.stringify(stored),
      trimmedIdentifier,
    );

    await upsertAccountsForNumbers(userId, accountIds, connection.id);
    await invalidateConnectionsPageCache(userId);

    return {
      success: true,
      accountCount: accountIds.length,
      message: "Connected",
    };
  } catch (error) {
    logger.error("saveIgConnection failed", error);
    return mapIgAuthError(error, environment);
  }
}

/** @deprecated Prefer browser login + saveIgConnection. Kept for callers. */
export async function authenticateIg(
  identifier: string,
  password: string,
  apiKey: string,
  environment: IgApiEnvironment,
  accounts?: IgApiAccount[],
): Promise<IgActionResult> {
  if (accounts && accounts.length > 0) {
    return saveIgConnection({
      identifier,
      password,
      apiKey,
      environment,
      accounts,
    });
  }
  // Legacy path: no pre-fetched accounts. Refuse rather than server-login —
  // IG rejects many valid keys from datacenter egress with api-key-invalid.
  logger.warn(
    "authenticateIg called without browser-fetched accounts — refusing server-side IG login",
  );
  return {
    error: "AUTH_FAILED",
    errorParams: {
      reason:
        "IG login must run in the browser (same path as API Companion). Refresh and try again.",
    },
  };
}

/**
 * Decrypt stored IG credentials for an interactive (browser) sync.
 * Only the connection owner can read them; clear from client memory after use.
 */
export async function getIgCredentialsForSync(accountId: string): Promise<
  | { credentials: IgStoredCredentials; connectionId: string }
  | { error: string }
> {
  const tokenResult = await getIgToken(accountId);
  if (tokenResult.error || !tokenResult.storedTokenJson || !tokenResult.connectionId) {
    return { error: tokenResult.error || "NO_TOKEN_RECONNECT" };
  }
  const credentials = parseStoredCredentials(tokenResult.storedTokenJson);
  if (!credentials) {
    return { error: "INVALID_STORED_CREDENTIALS" };
  }
  return { credentials, connectionId: tokenResult.connectionId };
}

/**
 * Map + save transactions already fetched from IG in the browser (or server).
 */
export async function importIgSyncedHistory(params: {
  accountId: string;
  connectionId: string;
  perAccount: Array<{
    accountId: string;
    transactions: IgApiTransaction[];
    error?: string;
  }>;
  accounts?: IgApiAccount[];
  /** Cron passes the owning user; interactive sync uses the session. */
  userId?: string;
  /** When set, skip re-loading/persisting credentials from the connection row. */
  credentials?: IgStoredCredentials;
}): Promise<IgTradesResult> {
  const syncStats = {
    tradingAccounts: 0,
    rawTransactions: 0,
    closedTrades: 0,
    skippedRows: 0,
    fetchFailures: 0,
  };

  try {
    let userId = params.userId ?? null;
    if (!userId) {
      userId = await getUserId();
    }
    if (!userId) {
      return { error: "USER_NOT_AUTHENTICATED", syncStats };
    }

    let credentials = params.credentials ?? null;
    if (!credentials) {
      const tokenResult = await getIgToken(params.accountId);
      if (tokenResult.error || !tokenResult.storedTokenJson) {
        return { error: tokenResult.error || "NO_TOKEN_RECONNECT", syncStats };
      }
      if (
        tokenResult.connectionId &&
        tokenResult.connectionId !== params.connectionId
      ) {
        return { error: "INVALID_STORED_CREDENTIALS", syncStats };
      }
      credentials = parseStoredCredentials(tokenResult.storedTokenJson);
      if (!credentials) {
        return { error: "INVALID_STORED_CREDENTIALS", syncStats };
      }
    }

    if (params.accounts && params.accounts.length > 0) {
      credentials.accountIds = params.accounts.map((a) => a.accountId);
      credentials.accountNames = Object.fromEntries(
        params.accounts.map((a) => [a.accountId, a.accountName || a.accountId]),
      );
      await persistIgCredentials(
        userId,
        JSON.stringify(credentials),
        credentials.identifier,
      );
      await upsertAccountsForNumbers(
        userId,
        credentials.accountIds,
        params.connectionId,
      );
    }

    syncStats.tradingAccounts = params.perAccount.length;

    const allTrades = [];
    for (const entry of params.perAccount) {
      if (entry.error) {
        syncStats.fetchFailures += 1;
        logger.warn(
          `IG history fetch failed for ${entry.accountId}: ${entry.error}`,
        );
        continue;
      }
      const transactions = Array.isArray(entry.transactions)
        ? entry.transactions
        : [];
      syncStats.rawTransactions += transactions.length;
      const { trades, skippedRows } = mapIgApiTransactions(transactions);
      syncStats.skippedRows += skippedRows.length;

      for (const trade of trades) {
        const tradeData = {
          accountNumber: entry.accountId,
          entryId: `ig_${trade.closeId}_entry`,
          closeId: trade.closeId,
          instrument: trade.instrument,
          entryPrice: trade.entryPrice,
          closePrice: trade.closePrice,
          entryDate: trade.entryDate,
          closeDate: trade.closeDate,
          quantity: trade.quantity,
          side: trade.side,
          userId,
        };
        allTrades.push(
          createTradeWithDefaults({
            id: generateDeterministicTradeId(tradeData),
            accountNumber: entry.accountId,
            quantity: trade.quantity,
            entryId: tradeData.entryId,
            closeId: trade.closeId,
            instrument: trade.instrument,
            entryPrice: trade.entryPrice,
            closePrice: trade.closePrice,
            entryDate: trade.entryDate,
            closeDate: trade.closeDate,
            pnl: trade.pnl,
            timeInPosition: trade.timeInPosition,
            side: trade.side,
            commission: trade.commission,
            comment: trade.comment,
            userId,
          }),
        );
      }
    }

    syncStats.closedTrades = allTrades.length;

    if (
      syncStats.fetchFailures > 0 &&
      syncStats.fetchFailures === params.perAccount.length &&
      allTrades.length === 0
    ) {
      return {
        error: "SYNC_FETCH_FAILED",
        errorParams: {
          failures: syncStats.fetchFailures,
          total: params.perAccount.length,
        },
        syncStats,
      };
    }

    await prisma.connection.updateMany({
      where: {
        userId,
        service: SERVICE,
        externalId: credentials.identifier,
      },
      data: { lastSyncedAt: new Date() },
    });

    const saveResult =
      allTrades.length > 0
        ? await saveTradesAction(allTrades, {
            userId,
            connectionId: params.connectionId,
          })
        : null;

    await invalidateConnectionsPageCache(userId);

    let savedCount = 0;
    if (saveResult) {
      if (saveResult.error === "DUPLICATE_TRADES") {
        return {
          error: "DUPLICATE_TRADES",
          syncStats,
          tradesCount: allTrades.length,
        };
      }
      if (saveResult.error && saveResult.error !== "NO_TRADES_ADDED") {
        return {
          error: "SAVE_TRADES_FAILED",
          errorParams: { detail: String(saveResult.error) },
          syncStats,
        };
      }
      savedCount = saveResult.numberOfTradesAdded;
    }

    return {
      processedTrades: allTrades,
      savedCount,
      tradesCount: allTrades.length,
      syncStats,
    };
  } catch (error) {
    logger.error("importIgSyncedHistory failed", error);
    return {
      error: "SYNC_FAILED",
      errorParams: {
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      syncStats,
    };
  }
}

export async function storeIgToken(tokenJson: string, accountId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");
  return persistIgCredentials(userId, tokenJson, accountId);
}

export async function getIgToken(accountId: string) {
  const userId = await getUserId();
  if (!userId) {
    return { error: "USER_NOT_AUTHENTICATED" as const };
  }

  const row = await prisma.connection.findUnique({
    where: {
      userId_service_externalId: {
        userId,
        service: SERVICE,
        externalId: accountId,
      },
    },
  });

  if (!row?.token) {
    return { error: "NO_TOKEN_RECONNECT" as const };
  }

  const storedTokenJson = decryptConnectionToken(row.token);
  if (!storedTokenJson) {
    return { error: "NO_TOKEN_RECONNECT" as const };
  }

  return {
    storedTokenJson,
    lastSyncedAt: row.lastSyncedAt,
    connectionId: row.id,
  };
}

export async function removeIgToken(accountId: string) {
  const userId = await getUserId();
  if (!userId) {
    return { error: "USER_NOT_AUTHENTICATED" as const };
  }

  await prisma.connection.deleteMany({
    where: {
      userId,
      service: SERVICE,
      externalId: accountId,
    },
  });

  await invalidateConnectionsPageCache(userId);
  return { success: true as const };
}

export async function getIgSynchronizations() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "USER_NOT_AUTHENTICATED" as const };
    }

    const synchronizations = await prisma.connection.findMany({
      where: { userId, service: SERVICE },
      orderBy: { updatedAt: "desc" },
    });

    return { synchronizations: toDecryptedConnectionViews(synchronizations) };
  } catch (error) {
    logger.error("getIgSynchronizations failed", error);
    return { error: "LOAD_SYNCHRONIZATIONS_FAILED" as const };
  }
}

export async function getIgTrades(
  initialTokenJson: string,
  options?: { userId?: string; connectionId?: string },
): Promise<IgTradesResult> {
  const syncStats = {
    tradingAccounts: 0,
    rawTransactions: 0,
    closedTrades: 0,
    skippedRows: 0,
    fetchFailures: 0,
  };
  // Hoisted so the catch below can tell the user which environment IG rejected.
  let environment: IgApiEnvironment = "live";

  try {
    const credentials = parseStoredCredentials(initialTokenJson);
    if (!credentials) {
      return { error: "INVALID_STORED_CREDENTIALS", syncStats };
    }
    environment = credentials.environment;

    let userId = options?.userId ?? null;
    if (!userId) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return { error: "USER_NOT_AUTHENTICATED", syncStats };
      }
      userId = user.id;
    }
    if (!userId) {
      return { error: "USER_NOT_AUTHENTICATED", syncStats };
    }

    const historyEnd = todayUtcDate();

    logger.info(
      `Session login for ${credentials.identifier} (${credentials.environment}) [server]`,
    );

    const history = await fetchIgDealHistory({
      credentials,
      from: HISTORY_START,
      to: historyEnd,
    });

    const accountIds =
      history.accounts.length > 0
        ? history.accounts.map((a) => a.accountId)
        : (credentials.accountIds ?? []);

    if (history.accounts.length > 0) {
      credentials.accountIds = accountIds;
      credentials.accountNames = Object.fromEntries(
        history.accounts.map((a) => [a.accountId, a.accountName || a.accountId]),
      );
      await persistIgCredentials(
        userId,
        JSON.stringify(credentials),
        credentials.identifier,
      );
    }

    syncStats.tradingAccounts = accountIds.length;
    if (accountIds.length === 0) {
      return { processedTrades: [], savedCount: 0, tradesCount: 0, syncStats };
    }

    let connectionId = options?.connectionId;
    if (!connectionId) {
      const connection = await prisma.connection.findUnique({
        where: {
          userId_service_externalId: {
            userId,
            service: SERVICE,
            externalId: credentials.identifier,
          },
        },
        select: { id: true },
      });
      connectionId = connection?.id;
    }
    if (connectionId) {
      await upsertAccountsForNumbers(userId, accountIds, connectionId);
      await invalidateConnectionsPageCache(userId);
    } else {
      return { error: "NO_TOKEN_RECONNECT", syncStats };
    }

    return importIgSyncedHistory({
      accountId: credentials.identifier,
      connectionId,
      perAccount: history.perAccount,
      accounts: history.accounts,
      userId,
      credentials,
    });
  } catch (error) {
    logger.error("getIgTrades failed", error);
    // Stored credentials go stale (password changed, key revoked). Say which,
    // rather than "try again in a few minutes" on something retrying cannot fix.
    const mapped = mapIgAuthError(error, environment);
    if (mapped.error !== "AUTH_FAILED") {
      return { error: mapped.error, errorParams: mapped.errorParams, syncStats };
    }
    return {
      error: "SYNC_FAILED",
      errorParams: {
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      syncStats,
    };
  }
}
