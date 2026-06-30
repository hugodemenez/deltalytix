import { beforeEach, describe, expect, it } from "vitest";
import {
  SUPPORT_API_LIMITS,
  checkSupportRateLimit,
  getSupportClientKey,
  parseSupportRequest,
  resetSupportRateLimitsForTest,
} from "./support-api-guard";

function supportRequest(
  body: unknown,
  headers?: HeadersInit,
): Request {
  return new Request("https://example.com/api/ai/support", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("parseSupportRequest", () => {
  it("accepts valid messages and drops an initial assistant greeting", async () => {
    const result = await parseSupportRequest(
      supportRequest({
        messages: [
          { id: "greeting", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
          { id: "question", role: "user", parts: [{ type: "text", text: "Help" }] },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.role).toBe("user");
    }
  });

  it("rejects malformed JSON", async () => {
    const result = await parseSupportRequest(supportRequest("{not json"));

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      type: "invalid_request",
    });
  });

  it("rejects bodies larger than the public support limit", async () => {
    const body = JSON.stringify({
      messages: [
        {
          id: "question",
          role: "user",
          parts: [{ type: "text", text: "x".repeat(SUPPORT_API_LIMITS.maxBodyBytes) }],
        },
      ],
    });

    const result = await parseSupportRequest(supportRequest(body));

    expect(result).toMatchObject({
      ok: false,
      status: 413,
      type: "request_too_large",
    });
  });

  it("rejects conversations with too many messages", async () => {
    const result = await parseSupportRequest(
      supportRequest({
        messages: Array.from({ length: SUPPORT_API_LIMITS.maxMessages + 2 }, (_, index) => ({
          id: String(index),
          role: "user",
          parts: [{ type: "text", text: "Help" }],
        })),
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      type: "invalid_request",
    });
  });
});

describe("support API rate limiting", () => {
  beforeEach(() => {
    resetSupportRateLimitsForTest();
  });

  it("uses forwarded IP headers to identify clients", () => {
    const req = supportRequest(
      { messages: [] },
      {
        "x-forwarded-for": "203.0.113.10, 198.51.100.4",
      },
    );

    expect(getSupportClientKey(req)).toBe("203.0.113.10");
  });

  it("blocks requests after the per-window allowance is exhausted", () => {
    const store = new Map<string, { count: number; resetAt: number }>();
    const now = 1_000;

    for (let index = 0; index < SUPPORT_API_LIMITS.maxRequestsPerWindow; index += 1) {
      expect(checkSupportRateLimit("203.0.113.10", now, store)).toEqual({
        allowed: true,
      });
    }

    expect(checkSupportRateLimit("203.0.113.10", now, store)).toEqual({
      allowed: false,
      retryAfter: SUPPORT_API_LIMITS.windowMs / 1000,
    });

    expect(
      checkSupportRateLimit(
        "203.0.113.10",
        now + SUPPORT_API_LIMITS.windowMs + 1,
        store,
      ),
    ).toEqual({ allowed: true });
  });
});
