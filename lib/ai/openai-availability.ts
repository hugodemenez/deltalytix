/** Error code returned by AI routes when no usable OpenAI key is configured. */
export const AI_UNAVAILABLE_ERROR = "AI_UNAVAILABLE";

const PLACEHOLDER_KEYS = new Set([
  "dummy",
  "placeholder",
  "your_openai_api_key_here",
]);

/**
 * Self-host / VPS setups ship `OPENAI_API_KEY=dummy` so the app can boot
 * without a real key. Treat that (and other placeholders) as unavailable
 * instead of sending requests that fail mid-stream.
 */
export function isPlaceholderOpenAiApiKey(
  apiKey: string | undefined | null,
): boolean {
  if (typeof apiKey !== "string") return true;
  const normalized = apiKey.trim().toLowerCase();
  if (!normalized) return true;
  return PLACEHOLDER_KEYS.has(normalized);
}

export function getOpenAiAvailabilityError(
  apiKey: string | undefined | null = process.env.OPENAI_API_KEY,
): { error: typeof AI_UNAVAILABLE_ERROR } | null {
  if (isPlaceholderOpenAiApiKey(apiKey)) {
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
