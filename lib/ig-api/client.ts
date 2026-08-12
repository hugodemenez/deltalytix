import {
  IgApiError,
  igApiBaseUrl,
  type IgApiAccount,
  type IgApiEnvironment,
  type IgApiErrorBody,
  type IgApiSessionTokens,
  type IgApiTransaction,
} from "./types";

export type {
  IgApiAccount,
  IgApiEnvironment,
  IgApiSessionTokens,
  IgApiTransaction,
} from "./types";
export { IgApiError, igApiBaseUrl } from "./types";

type SessionResult = IgApiSessionTokens & {
  currentAccountId: string | null;
  accounts: IgApiAccount[];
};

function authHeaders(
  apiKey: string,
  tokens?: IgApiSessionTokens,
  version = "1",
): HeadersInit {
  const headers: Record<string, string> = {
    "X-IG-API-KEY": apiKey,
    "Content-Type": "application/json; charset=UTF-8",
    Accept: "application/json; charset=UTF-8",
    Version: version,
  };
  if (tokens) {
    headers.CST = tokens.cst;
    headers["X-SECURITY-TOKEN"] = tokens.securityToken;
  }
  return headers;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as IgApiErrorBody;
    return body.errorCode || body.error || body.message || response.statusText;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

/**
 * Create a v2 trading session. Tokens live in response headers (CST +
 * X-SECURITY-TOKEN) and are valid for several hours with activity.
 */
export async function createIgSession(params: {
  identifier: string;
  password: string;
  apiKey: string;
  environment: IgApiEnvironment;
}): Promise<SessionResult> {
  const url = `${igApiBaseUrl(params.environment)}/session`;
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(params.apiKey, undefined, "2"),
    // encryptedPassword: false matches IG API Companion / trading-ig defaults.
    // Some regional accounts require true + RSA; those map to a dedicated error.
    body: JSON.stringify({
      identifier: params.identifier,
      password: params.password,
      encryptedPassword: false,
    }),
  });

  if (!response.ok) {
    throw new IgApiError(
      "AUTH_FAILED",
      await readErrorMessage(response),
      response.status,
    );
  }

  const cst = response.headers.get("CST");
  const securityToken = response.headers.get("X-SECURITY-TOKEN");
  if (!cst || !securityToken) {
    throw new IgApiError(
      "AUTH_FAILED",
      "IG session response was missing CST or X-SECURITY-TOKEN headers",
      response.status,
    );
  }

  const body = (await response.json()) as {
    currentAccountId?: string;
    accounts?: IgApiAccount[];
  };

  return {
    cst,
    securityToken,
    currentAccountId: body.currentAccountId ?? null,
    accounts: Array.isArray(body.accounts) ? body.accounts : [],
  };
}

export async function listIgAccounts(params: {
  apiKey: string;
  environment: IgApiEnvironment;
  tokens: IgApiSessionTokens;
}): Promise<IgApiAccount[]> {
  const url = `${igApiBaseUrl(params.environment)}/accounts`;
  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders(params.apiKey, params.tokens, "1"),
  });

  if (!response.ok) {
    throw new IgApiError(
      "ACCOUNTS_FAILED",
      await readErrorMessage(response),
      response.status,
    );
  }

  const body = (await response.json()) as { accounts?: IgApiAccount[] };
  return Array.isArray(body.accounts) ? body.accounts : [];
}

/** Switch the active account for subsequent history requests. */
export async function switchIgAccount(params: {
  apiKey: string;
  environment: IgApiEnvironment;
  tokens: IgApiSessionTokens;
  accountId: string;
}): Promise<void> {
  const url = `${igApiBaseUrl(params.environment)}/session`;
  const response = await fetch(url, {
    method: "PUT",
    headers: authHeaders(params.apiKey, params.tokens, "1"),
    body: JSON.stringify({ accountId: params.accountId }),
  });

  if (!response.ok) {
    throw new IgApiError(
      "SWITCH_ACCOUNT_FAILED",
      await readErrorMessage(response),
      response.status,
    );
  }
}

/** Ceiling on pages per account, so a bad `totalPages` cannot loop forever. */
const MAX_TRANSACTION_PAGES = 200;

/**
 * Fetch paginated transaction history (v2) for the active account.
 * `from` / `to` are YYYY-MM-DD.
 */
export async function fetchIgTransactions(params: {
  apiKey: string;
  environment: IgApiEnvironment;
  tokens: IgApiSessionTokens;
  from: string;
  to: string;
  type?: "ALL" | "ALL_DEAL" | "DEPOSIT" | "WITHDRAWAL";
  pageSize?: number;
}): Promise<IgApiTransaction[]> {
  const pageSize = Math.min(Math.max(params.pageSize ?? 500, 1), 500);
  const type = params.type ?? "ALL_DEAL";
  const transactions: IgApiTransaction[] = [];
  let pageNumber = 1;
  let totalPages: number | null = null;

  while (pageNumber <= MAX_TRANSACTION_PAGES) {
    const search = new URLSearchParams({
      type,
      from: params.from,
      to: params.to,
      pageSize: String(pageSize),
      pageNumber: String(pageNumber),
    });
    const url = `${igApiBaseUrl(params.environment)}/history/transactions?${search}`;
    const response = await fetch(url, {
      method: "GET",
      headers: authHeaders(params.apiKey, params.tokens, "2"),
    });

    if (!response.ok) {
      throw new IgApiError(
        "TRANSACTIONS_FAILED",
        await readErrorMessage(response),
        response.status,
      );
    }

    const body = (await response.json()) as {
      transactions?: IgApiTransaction[];
      metadata?: {
        pageData?: {
          pageNumber?: number;
          pageSize?: number;
          totalPages?: number;
        };
      };
      metaData?: {
        pageData?: {
          pageNumber?: number;
          pageSize?: number;
          totalPages?: number;
        };
      };
    };

    const page = Array.isArray(body.transactions) ? body.transactions : [];
    transactions.push(...page);

    const pageData =
      body.metadata?.pageData ?? body.metaData?.pageData ?? undefined;
    if (typeof pageData?.totalPages === "number" && pageData.totalPages > 0) {
      totalPages = pageData.totalPages;
    }

    if (totalPages !== null) {
      if (pageNumber >= totalPages) break;
    } else if (page.length < pageSize) {
      // No usable metadata: a short page is the only reliable end-of-history
      // signal. Stopping on `totalPages ?? 1` instead would silently truncate
      // every account whose first page came back full.
      break;
    }

    pageNumber += 1;
  }

  return transactions;
}
