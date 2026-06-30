import type { UIMessage } from "ai";

export const SUPPORT_API_LIMITS = {
  maxBodyBytes: 32 * 1024,
  maxMessages: 12,
  windowMs: 5 * 60 * 1000,
  maxRequestsPerWindow: 10,
} as const;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

type SupportApiErrorType =
  | "invalid_request"
  | "request_too_large"
  | "rate_limit_exceeded";

type SupportApiError = {
  ok: false;
  status: number;
  type: SupportApiErrorType;
  message: string;
  retryAfter?: number;
};

type SupportApiSuccess = {
  ok: true;
  messages: UIMessage[];
};

type SupportRequestPayload = {
  messages?: unknown;
};

const globalForSupportApi = globalThis as typeof globalThis & {
  __deltalytixSupportApiRateLimits?: RateLimitStore;
};

function getRateLimitStore(): RateLimitStore {
  globalForSupportApi.__deltalytixSupportApiRateLimits ??= new Map();
  return globalForSupportApi.__deltalytixSupportApiRateLimits;
}

function errorResult(
  status: number,
  type: SupportApiErrorType,
  message: string,
  retryAfter?: number,
): SupportApiError {
  return {
    ok: false,
    status,
    type,
    message,
    retryAfter,
  };
}

function parseContentLength(req: Request): number | undefined {
  const rawLength = req.headers.get("content-length");
  if (!rawLength) return undefined;

  const parsedLength = Number(rawLength);
  if (!Number.isFinite(parsedLength) || parsedLength < 0) return undefined;

  return parsedLength;
}

function isUiMessageLike(value: unknown): value is UIMessage {
  if (!value || typeof value !== "object") return false;

  const role = (value as { role?: unknown }).role;
  return role === "user" || role === "assistant" || role === "system";
}

function compactMessages(messages: UIMessage[]): UIMessage[] {
  const compacted = [...messages];

  if (compacted[0]?.role === "assistant") {
    compacted.shift();
  }

  return compacted;
}

export function getSupportClientKey(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const cloudflareIp = req.headers.get("cf-connecting-ip")?.trim();

  return cloudflareIp || realIp || forwardedIp || "unknown";
}

export function checkSupportRateLimit(
  clientKey: string,
  now = Date.now(),
  store = getRateLimitStore(),
):
  | { allowed: true }
  | { allowed: false; retryAfter: number } {
  const existing = store.get(clientKey);

  if (!existing || existing.resetAt <= now) {
    store.set(clientKey, {
      count: 1,
      resetAt: now + SUPPORT_API_LIMITS.windowMs,
    });
    return { allowed: true };
  }

  if (existing.count >= SUPPORT_API_LIMITS.maxRequestsPerWindow) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true };
}

export async function parseSupportRequest(
  req: Request,
): Promise<SupportApiSuccess | SupportApiError> {
  const contentLength = parseContentLength(req);
  if (
    contentLength !== undefined &&
    contentLength > SUPPORT_API_LIMITS.maxBodyBytes
  ) {
    return errorResult(
      413,
      "request_too_large",
      "Support requests must be smaller than 32KB.",
    );
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > SUPPORT_API_LIMITS.maxBodyBytes) {
    return errorResult(
      413,
      "request_too_large",
      "Support requests must be smaller than 32KB.",
    );
  }

  let payload: SupportRequestPayload;
  try {
    payload = JSON.parse(rawBody) as SupportRequestPayload;
  } catch {
    return errorResult(400, "invalid_request", "Request body must be valid JSON.");
  }

  if (!payload || !Array.isArray(payload.messages)) {
    return errorResult(400, "invalid_request", "Request body must include messages.");
  }

  if (payload.messages.length > SUPPORT_API_LIMITS.maxMessages + 1) {
    return errorResult(
      400,
      "invalid_request",
      `Support requests are limited to ${SUPPORT_API_LIMITS.maxMessages} messages.`,
    );
  }

  if (!payload.messages.every(isUiMessageLike)) {
    return errorResult(400, "invalid_request", "Messages must use valid chat roles.");
  }

  const messages = compactMessages(payload.messages);

  if (messages.length === 0) {
    return errorResult(400, "invalid_request", "Request must include a user message.");
  }

  if (messages.length > SUPPORT_API_LIMITS.maxMessages) {
    return errorResult(
      400,
      "invalid_request",
      `Support requests are limited to ${SUPPORT_API_LIMITS.maxMessages} messages.`,
    );
  }

  return { ok: true, messages };
}

export function supportApiErrorResponse(error: SupportApiError): Response {
  return new Response(
    JSON.stringify({
      error: error.type,
      message: error.message,
      type: error.type,
      retryAfter: error.retryAfter,
    }),
    {
      status: error.status,
      headers: {
        "Content-Type": "application/json",
        ...(error.retryAfter
          ? { "Retry-After": String(error.retryAfter) }
          : {}),
      },
    },
  );
}

export function resetSupportRateLimitsForTest(): void {
  getRateLimitStore().clear();
}
