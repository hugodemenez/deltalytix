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
import {
  createIgSession,
  fetchIgTransactions,
  listIgAccounts,
  switchIgAccount,
  type IgApiEnvironment,
} from "@/lib/ig-api/client";
import { mapIgApiTransactions } from "@/lib/ig-api/transactions-to-trades";
import type {
  IgActionResult,
  IgStoredCredentials,
  IgTradesResult,
} from "./ig-types";

const SERVICE = "ig";
const HISTORY_START_MIN = "2010-01-01";

const logger = {
  info: (message: string) => console.log(`[IG] ${message}`),
  warn: (message: string) => console.warn(`[IG] ${message}`),
  error: (message: string, error?: unknown) =>
    console.error(
      `[IG] ${message}`,
      error instanceof Error ? error.message : (error ?? ""),
    ),
};

/**
 * IG reports failures as dotted error codes (`error.security.invalid-details`).
 * Map the ones a trader can act on to their own message; anything unmapped
 * still surfaces the raw code so support has something to go on.
 */
function mapIgAuthError(
  error: unknown,
  environment: IgApiEnvironment,
): { error: string; errorParams?: Record<string, string | number> } {
  const reason =
    error instanceof Error ? error.message : "Unknown error";
  const code = reason.toLowerCase();
  const environmentLabel = environment === "demo" ? "Demo" : "Live";

  if (code.includes("invalid-details")) {
    return { error: "IG_INVALID_CREDENTIALS" };
  }
  if (code.includes("api-key-disabled") || code.includes("api-key-revoked")) {
    return { error: "IG_API_KEY_DISABLED" };
  }
  if (code.includes("api-key")) {
    return {
      error: "IG_API_KEY_REJECTED",
      errorParams: { environment: environmentLabel },
    };
  }
  if (
    code.includes("too-many-failed-attempts") ||
    code.includes("account-locked") ||
    code.includes("client-suspended")
  ) {
    return { error: "IG_ACCOUNT_LOCKED" };
  }
  if (code.includes("encryption.required")) {
    return { error: "IG_PASSWORD_ENCRYPTION_REQUIRED" };
  }
  if (code.includes("allowance") || code.includes("too-many-requests")) {
    return { error: "IG_RATE_LIMITED" };
  }

  return { error: "AUTH_FAILED", errorParams: { reason } };
}

function parseHistoryStartDate(value: string): string | null {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  if (date.getTime() > todayUtc.getTime()) return null;
  const min = new Date(`${HISTORY_START_MIN}T00:00:00.000Z`);
  if (date.getTime() < min.getTime()) return null;
  return trimmed;
}

function parseStoredCredentials(
  tokenField: string,
): IgStoredCredentials | null {
  try {
    const parsed = JSON.parse(tokenField) as IgStoredCredentials;
    if (
      !parsed.identifier ||
      !parsed.password ||
      !parsed.apiKey ||
      (parsed.environment !== "live" && parsed.environment !== "demo")
    ) {
      return null;
    }
    return parsed;
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

export async function authenticateIg(
  identifier: string,
  password: string,
  apiKey: string,
  environment: IgApiEnvironment,
  historyStartDate: string,
): Promise<IgActionResult> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "USER_NOT_AUTHENTICATED" };
    }

    const normalizedHistoryStart = parseHistoryStartDate(historyStartDate);
    if (!normalizedHistoryStart) {
      return { error: "HISTORY_START_REQUIRED" };
    }

    const trimmedIdentifier = identifier.trim();
    const trimmedApiKey = apiKey.trim();
    if (!trimmedIdentifier || !password || !trimmedApiKey) {
      return { error: "CREDENTIALS_REQUIRED" };
    }

    // Fail before touching IG: without a key we could not store the credentials
    // anyway, and the raw crypto error is meaningless to a trader.
    if (!hasConnectionTokenEncryptionKey()) {
      logger.error("ENCRYPTION_KEY is not configured — refusing to connect IG");
      return { error: "ENCRYPTION_KEY_MISSING" };
    }

    logger.info(
      `Authenticating ${trimmedIdentifier} on ${environment}`,
    );

    const session = await createIgSession({
      identifier: trimmedIdentifier,
      password,
      apiKey: trimmedApiKey,
      environment,
    });

    let accounts = session.accounts;
    if (accounts.length === 0) {
      accounts = await listIgAccounts({
        apiKey: trimmedApiKey,
        environment,
        tokens: { cst: session.cst, securityToken: session.securityToken },
      });
    }

    if (accounts.length === 0) {
      return { error: "NO_ACCOUNTS" };
    }

    const accountIds = accounts.map((a) => a.accountId);
    const accountNames = Object.fromEntries(
      accounts.map((a) => [a.accountId, a.accountName || a.accountId]),
    );

    const stored: IgStoredCredentials = {
      identifier: trimmedIdentifier,
      password,
      apiKey: trimmedApiKey,
      environment,
      accountIds,
      accountNames,
      historyStartDate: normalizedHistoryStart,
    };

    const connection = await persistIgCredentials(
      userId,
      JSON.stringify(stored),
      trimmedIdentifier,
    );

    await upsertAccountsForNumbers(userId, accountIds, connection.id);
    await invalidateConnectionsPageCache(userId);

    logger.info(
      `Login ok accounts=${accountIds.length} historyStart=${normalizedHistoryStart}`,
    );

    return {
      success: true,
      accountCount: accountIds.length,
      message: "Connected",
    };
  } catch (error) {
    logger.error("authenticateIg failed", error);
    return mapIgAuthError(error, environment);
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

    const historyStart =
      parseHistoryStartDate(credentials.historyStartDate ?? "") ??
      HISTORY_START_MIN;
    const historyEnd = todayUtcDate();

    logger.info(
      `Session login for ${credentials.identifier} (${credentials.environment})`,
    );

    const session = await createIgSession({
      identifier: credentials.identifier,
      password: credentials.password,
      apiKey: credentials.apiKey,
      environment: credentials.environment,
    });

    let accounts = session.accounts;
    if (accounts.length === 0) {
      accounts = await listIgAccounts({
        apiKey: credentials.apiKey,
        environment: credentials.environment,
        tokens: { cst: session.cst, securityToken: session.securityToken },
      });
    }

    const accountIds =
      accounts.length > 0
        ? accounts.map((a) => a.accountId)
        : (credentials.accountIds ?? []);

    if (accounts.length > 0) {
      credentials.accountIds = accountIds;
      credentials.accountNames = Object.fromEntries(
        accounts.map((a) => [a.accountId, a.accountName || a.accountId]),
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
    }

    const tokens = {
      cst: session.cst,
      securityToken: session.securityToken,
    };
    let activeAccountId = session.currentAccountId;

    const allTrades = [];
    for (const accountId of accountIds) {
      try {
        if (activeAccountId !== accountId) {
          await switchIgAccount({
            apiKey: credentials.apiKey,
            environment: credentials.environment,
            tokens,
            accountId,
          });
          activeAccountId = accountId;
        }

        const transactions = await fetchIgTransactions({
          apiKey: credentials.apiKey,
          environment: credentials.environment,
          tokens,
          from: historyStart,
          to: historyEnd,
          type: "ALL_DEAL",
        });

        syncStats.rawTransactions += transactions.length;
        const { trades, skippedRows } = mapIgApiTransactions(transactions);
        syncStats.skippedRows += skippedRows.length;

        for (const trade of trades) {
          const tradeData = {
            accountNumber: accountId,
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
              accountNumber: accountId,
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
      } catch (error) {
        syncStats.fetchFailures += 1;
        logger.warn(
          `Failed fetching transactions for ${accountId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    syncStats.closedTrades = allTrades.length;

    if (
      syncStats.fetchFailures > 0 &&
      syncStats.fetchFailures === accountIds.length
    ) {
      return {
        error: "SYNC_FETCH_FAILED",
        errorParams: {
          failures: syncStats.fetchFailures,
          total: accountIds.length,
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
        ? await saveTradesAction(allTrades, { userId, connectionId })
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
