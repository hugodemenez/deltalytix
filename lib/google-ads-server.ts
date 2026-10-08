import "server-only";

import { createHash } from "node:crypto";

import { normalizeEmailForAds } from "./google-ads";

/** Hex SHA-256 of the normalised email, as Google's `sha256_email_address`. */
export function hashEmailForAds(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = normalizeEmailForAds(email);
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}
