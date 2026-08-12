import { fetchIgDealHistory } from "@/lib/ig-api/fetch-history";
import { mapIgAuthError } from "@/lib/ig-api/errors";
import {
  getIgCredentialsForSync,
  importIgSyncedHistory,
} from "./actions";
import type { IgTradesResult } from "./ig-types";

const HISTORY_START = "2000-01-01";

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Interactive sync: decrypt credentials on the server, call IG from the
 * browser (Companion egress), then import trades on the server.
 */
export async function syncIgFromBrowser(
  accountId: string,
): Promise<IgTradesResult> {
  const revealed = await getIgCredentialsForSync(accountId);
  if ("error" in revealed) {
    return { error: revealed.error };
  }

  const { credentials, connectionId } = revealed;

  try {
    const history = await fetchIgDealHistory({
      credentials,
      from: HISTORY_START,
      to: todayUtcDate(),
    });

    return importIgSyncedHistory({
      accountId: credentials.identifier,
      connectionId,
      perAccount: history.perAccount,
      accounts: history.accounts,
      credentials,
    });
  } catch (error) {
    return {
      ...mapIgAuthError(error, credentials.environment),
    };
  }
}
