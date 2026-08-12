import type { IgApiEnvironment } from "./types";

/**
 * IG reports failures as dotted error codes (`error.security.invalid-details`).
 * Map the ones a trader can act on; anything unmapped still surfaces the raw
 * code so support has something to go on.
 *
 * `error.security.api-key-invalid` is the same code for a mistyped key and for
 * a Live/Demo mismatch — do not lead with environment alone.
 *
 * Check allowance before the generic `api-key` substring match: IG's
 * `exceeded-api-key-allowance` contains "api-key" and must not look like a
 * rejected key.
 */
export function mapIgAuthError(
  error: unknown,
  environment: IgApiEnvironment,
): { error: string; errorParams?: Record<string, string | number> } {
  const reason = error instanceof Error ? error.message : "Unknown error";
  const code = reason.toLowerCase();
  const environmentLabel = environment === "demo" ? "Demo" : "Live";

  if (code.includes("invalid-details")) {
    return { error: "IG_INVALID_CREDENTIALS" };
  }
  if (
    code.includes("authenticationrequest.identifier") ||
    (code.includes("pattern.invalid") && code.includes("identifier"))
  ) {
    return { error: "IG_IDENTIFIER_INVALID" };
  }
  if (code.includes("api-key-disabled") || code.includes("api-key-revoked")) {
    return { error: "IG_API_KEY_DISABLED" };
  }
  if (code.includes("allowance") || code.includes("too-many-requests")) {
    return { error: "IG_RATE_LIMITED" };
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

  return { error: "AUTH_FAILED", errorParams: { reason } };
}
