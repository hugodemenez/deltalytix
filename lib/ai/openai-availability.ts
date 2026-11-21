/** Error code returned by AI routes when no usable OpenAI key is configured. */
export const AI_UNAVAILABLE_ERROR = "AI_UNAVAILABLE";

const PLACEHOLDER_KEYS = {
  openai: ["dummy", "placeholder", "your_openai_api_key_here"],
  gateway: [
    "dummy",
    "placeholder",
    "your_ai_gateway_api_key",
    "your_gateway_api_key_here",
  ],
} as const;

export type PlaceholderApiKeyKind = keyof typeof PLACEHOLDER_KEYS;

/**
 * Self-host / VPS setups ship placeholder keys so the app can boot.
 * Treat those as unavailable instead of sending requests that fail mid-stream.
 * `openai` and `gateway` use different sample strings.
 */
export function isPlaceholderApiKey(
  apiKey: string | undefined | null,
  kind: PlaceholderApiKeyKind = "openai",
): boolean {
  if (typeof apiKey !== "string") return true;
  const normalized = apiKey.trim().toLowerCase();
  if (!normalized) return true;
  return (PLACEHOLDER_KEYS[kind] as readonly string[]).includes(normalized);
}

export function getOpenAiAvailabilityError(
  apiKey: string | undefined | null = process.env.OPENAI_API_KEY,
): { error: typeof AI_UNAVAILABLE_ERROR } | null {
  if (isPlaceholderApiKey(apiKey, "openai")) {
    return { error: AI_UNAVAILABLE_ERROR };
  }
  return null;
}

export function parseFormatTradesApiError(raw: string): {
  code: string | null;
} {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof parsed.error === "string"
    ) {
      return { code: parsed.error };
    }
  } catch {
    // useObject surfaces the raw response body as Error.message
  }
  return { code: null };
}
