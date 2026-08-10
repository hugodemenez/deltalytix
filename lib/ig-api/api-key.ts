/**
 * Personal Labs keys are a continuous token (no spaces). Paste from IG often
 * carries leading/trailing whitespace, newlines, or zero-width characters that
 * still look “correct” in a password field and then fail as api-key-invalid.
 */
const ZERO_WIDTH_AND_BOM =
  /[\u200B-\u200D\uFEFF\u00A0]/g;

export function sanitizeIgApiKey(raw: string): string {
  return raw.replace(ZERO_WIDTH_AND_BOM, "").replace(/\s+/g, "").trim();
}

/** Safe fingerprint for logs — never the full key. */
export function igApiKeyFingerprint(apiKey: string): string {
  const key = sanitizeIgApiKey(apiKey);
  if (!key) return "empty";
  const suffix = key.length <= 4 ? "****" : key.slice(-4);
  return `len=${key.length}…${suffix}`;
}
