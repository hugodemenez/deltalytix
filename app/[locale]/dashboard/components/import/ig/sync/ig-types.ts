import type { IgApiEnvironment } from "@/lib/ig-api/types";

export interface IgStoredCredentials {
  identifier: string;
  password: string;
  apiKey: string;
  environment: IgApiEnvironment;
  accountIds?: string[];
  accountNames?: Record<string, string>;
  /**
   * UTC calendar date (YYYY-MM-DD) when the user started trading.
   * Sync walks from this date to today via /history/transactions.
   */
  historyStartDate?: string;
}

export interface IgSyncStats {
  tradingAccounts: number;
  rawTransactions: number;
  closedTrades: number;
  skippedRows: number;
  fetchFailures: number;
}

export interface IgTradesResult {
  processedTrades?: unknown[];
  savedCount?: number;
  tradesCount?: number;
  error?: string;
  errorParams?: Record<string, string | number>;
  syncStats?: IgSyncStats;
}

export type IgActionResult =
  | { success: true; message?: string; accountCount?: number }
  | {
      success?: false;
      error: string;
      errorParams?: Record<string, string | number>;
    };
