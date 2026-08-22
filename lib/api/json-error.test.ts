import { describe, expect, it } from "vitest";
import { API_ERROR_STATUS, apiErrorBody, jsonError } from "./json-error";

const request = new Request("https://deltalytix.app/api/anything");

describe("API error envelope", () => {
  it("carries a code, a message, a hint, the status, and a docs link", () => {
    const { error } = apiErrorBody({
      code: "not_found",
      message: "No API route matches GET /api/nope.",
      hint: "Check /openapi.json.",
      request,
    });

    expect(error).toMatchObject({
      code: "not_found",
      message: "No API route matches GET /api/nope.",
      hint: "Check /openapi.json.",
      status: 404,
      documentation_url: "https://deltalytix.app/docs/api",
    });
  });

  it("maps every code to its HTTP status", () => {
    for (const [code, status] of Object.entries(API_ERROR_STATUS)) {
      const body = apiErrorBody({
        code: code as keyof typeof API_ERROR_STATUS,
        message: "message",
        hint: "hint",
        request,
      });

      expect(body.error.status).toBe(status);
    }
  });

  it("lets a caller override the status", () => {
    const body = apiErrorBody({
      code: "bad_request",
      message: "m",
      hint: "h",
      status: 418,
      request,
    });

    expect(body.error.status).toBe(418);
  });

  it("includes required scopes and field details only when given", () => {
    const bare = apiErrorBody({ code: "forbidden", message: "m", hint: "h", request });
    expect(bare.error).not.toHaveProperty("required_scopes");
    expect(bare.error).not.toHaveProperty("details");

    const rich = apiErrorBody({
      code: "forbidden",
      message: "m",
      hint: "h",
      requiredScopes: ["trades:read"],
      details: [{ field: "accountId", message: "required" }],
      request,
    });
    expect(rich.error.required_scopes).toEqual(["trades:read"]);
    expect(rich.error.details).toEqual([{ field: "accountId", message: "required" }]);
  });

  it("responds as uncacheable JSON with the mapped status", async () => {
    const response = jsonError({
      code: "rate_limited",
      message: "Too many requests.",
      hint: "Retry after 60 seconds.",
      request,
      headers: { "retry-after": "60" },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "rate_limited", status: 429 },
    });
  });
});
