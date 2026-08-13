import { sanitizeIgApiKey } from "@/lib/ig-api/api-key";
import {
  createIgSession,
  listIgAccounts,
  type IgApiAccount,
  type IgApiEnvironment,
} from "@/lib/ig-api/client";
import { mapIgAuthError } from "@/lib/ig-api/errors";
import { isValidIgIdentifier } from "@/lib/ig-api/identifier";
import { saveIgConnection } from "./actions";
import type { IgActionResult } from "./ig-types";

/**
 * Authenticate against IG from the browser (same egress as API Companion),
 * then persist the connection on the server without a second IG login.
 *
 * Server-side POST /session from Vercel was returning api-key-invalid for
 * keys Companion accepted with HTTP 200.
 */
export async function connectIgFromBrowser(params: {
  identifier: string;
  password: string;
  apiKey: string;
  environment: IgApiEnvironment;
}): Promise<IgActionResult> {
  const trimmedIdentifier = params.identifier.trim();
  const trimmedApiKey = sanitizeIgApiKey(params.apiKey);

  if (!trimmedIdentifier || !params.password || !trimmedApiKey) {
    return { error: "CREDENTIALS_REQUIRED" };
  }
  if (!isValidIgIdentifier(trimmedIdentifier)) {
    return { error: "IG_IDENTIFIER_INVALID" };
  }

  try {
    const session = await createIgSession({
      identifier: trimmedIdentifier,
      password: params.password,
      apiKey: trimmedApiKey,
      environment: params.environment,
    });

    let accounts: IgApiAccount[] = session.accounts;
    if (accounts.length === 0) {
      accounts = await listIgAccounts({
        apiKey: trimmedApiKey,
        environment: params.environment,
        tokens: { cst: session.cst, securityToken: session.securityToken },
      });
    }

    if (accounts.length === 0) {
      return { error: "NO_ACCOUNTS" };
    }

    return saveIgConnection({
      identifier: trimmedIdentifier,
      password: params.password,
      apiKey: trimmedApiKey,
      environment: params.environment,
      accounts,
    });
  } catch (error) {
    return mapIgAuthError(error, params.environment);
  }
}
