import {
  createIgSession,
  fetchIgTransactions,
  listIgAccounts,
  switchIgAccount,
  type IgApiAccount,
  type IgApiEnvironment,
  type IgApiTransaction,
} from "./client";

export type IgHistoryCredentials = {
  identifier: string;
  password: string;
  apiKey: string;
  environment: IgApiEnvironment;
  accountIds?: string[];
};

export type IgAccountTransactions = {
  accountId: string;
  transactions: IgApiTransaction[];
  error?: string;
};

/**
 * Login + pull ALL_DEAL history for every account. Safe to call from the
 * browser (same egress as IG's API Companion) or from the server (cron).
 */
export async function fetchIgDealHistory(params: {
  credentials: IgHistoryCredentials;
  from: string;
  to: string;
}): Promise<{
  accounts: IgApiAccount[];
  currentAccountId: string | null;
  perAccount: IgAccountTransactions[];
}> {
  const { credentials, from, to } = params;

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

  const tokens = {
    cst: session.cst,
    securityToken: session.securityToken,
  };
  let activeAccountId = session.currentAccountId;
  const perAccount: IgAccountTransactions[] = [];

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
        from,
        to,
        type: "ALL_DEAL",
      });

      perAccount.push({ accountId, transactions });
    } catch (error) {
      perAccount.push({
        accountId,
        transactions: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    accounts,
    currentAccountId: session.currentAccountId,
    perAccount,
  };
}
