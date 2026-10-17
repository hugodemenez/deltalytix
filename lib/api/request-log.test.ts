import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { apiError, oauthError } from "@/lib/api/errors"
import { jsonError } from "@/lib/api/json-error"
import {
  assertNoSecretsInLogPayload,
  buildPublicApiRequestLogFields,
  hashUserIdForLog,
  inferTokenTypeFromBearer,
  isPublicApiLogPath,
  logPublicApiRequest,
  readErrorCodeFromResponse,
  runWithPublicApiRequestLogContext,
  serializePublicApiRequestLog,
  setPublicApiRequestLogContext,
} from "@/lib/api/request-log"
import { withPublicApiRequestLog } from "@/lib/api/with-request-log"

describe("public API request log", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("scopes logging to /api/v1 and /api/oauth paths", () => {
    expect(isPublicApiLogPath("/api/v1/me")).toBe(true)
    expect(isPublicApiLogPath("/api/oauth/token")).toBe(true)
    expect(isPublicApiLogPath("/api/ai/chat")).toBe(false)
    expect(isPublicApiLogPath("/dashboard")).toBe(false)
  })

  it("infers token type from bearer prefixes without storing the token", () => {
    expect(inferTokenTypeFromBearer(null)).toBe("none")
    expect(inferTokenTypeFromBearer("dltx_pat_abc123")).toBe("pat")
    expect(inferTokenTypeFromBearer("dltx_at_abc123")).toBe("oauth")
    expect(inferTokenTypeFromBearer("totally-unknown")).toBe("unknown")
  })

  it("hashes user ids so raw ids are not logged", () => {
    const hash = hashUserIdForLog("user_123")
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain("user_123")

    const fields = buildPublicApiRequestLogFields({
      method: "GET",
      route: "/api/v1/me",
      status: 200,
      latencyMs: 12.4,
      context: {
        tokenType: "oauth",
        appId: "app-1",
        clientId: "dltx_app_deadbeef",
        userId: "user_123",
      },
    })

    expect(fields.userIdHash).toBe(hash)
    expect(JSON.stringify(fields)).not.toContain("user_123")
  })

  it("includes errorCode on 4xx/5xx from the jsonError envelope", async () => {
    const response = jsonError({
      code: "unauthorized",
      message: "Missing access token",
      hint: "Present a bearer token.",
    })
    await expect(readErrorCodeFromResponse(response)).resolves.toBe(
      "unauthorized",
    )

    const api = apiError(403, "insufficient_scope", "Missing scopes")
    await expect(readErrorCodeFromResponse(api)).resolves.toBe("forbidden")
  })

  it("includes OAuth RFC error codes from token/revoke responses", async () => {
    const response = oauthError(400, "invalid_grant", "Expired code")
    await expect(readErrorCodeFromResponse(response)).resolves.toBe(
      "invalid_grant",
    )
  })

  it("omits errorCode on success and on empty bodies", async () => {
    await expect(
      readErrorCodeFromResponse(NextResponse.json({ ok: true }, { status: 200 })),
    ).resolves.toBeUndefined()
    await expect(
      readErrorCodeFromResponse(new NextResponse(null, { status: 500 })),
    ).resolves.toBeUndefined()
  })

  it("emits one JSON log line without secrets or Authorization material", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    const accessToken = "dltx_at_0123456789abcdef0123456789abcdef"
    const refreshToken = "dltx_rt_0123456789abcdef0123456789abcdef"
    const pat = "dltx_pat_0123456789abcdef0123456789abcdef"
    const clientSecret = "dltx_secret_0123456789abcdef0123456789abcdef"

    const fields = buildPublicApiRequestLogFields({
      method: "GET",
      route: "/api/v1/trades",
      status: 401,
      latencyMs: 8,
      context: {
        tokenType: "unknown",
        appId: null,
        clientId: "dltx_app_abcdef012345",
        userId: null,
      },
      errorCode: "unauthorized",
    })

    logPublicApiRequest(fields)

    expect(info).toHaveBeenCalledTimes(1)
    const line = String(info.mock.calls[0]?.[0])
    const parsed = JSON.parse(line) as Record<string, unknown>

    expect(parsed).toMatchObject({
      msg: "public_api_request",
      method: "GET",
      route: "/api/v1/trades",
      status: 401,
      tokenType: "unknown",
      clientId: "dltx_app_abcdef012345",
      errorCode: "unauthorized",
    })
    expect(typeof parsed.latencyMs).toBe("number")

    assertNoSecretsInLogPayload(line, [
      accessToken,
      refreshToken,
      pat,
      clientSecret,
      "Bearer ",
      "Authorization",
    ])
    expect(line).not.toContain(accessToken)
    expect(line).not.toContain(refreshToken)
    expect(line).not.toContain(pat)
    expect(line).not.toContain(clientSecret)
    expect(line).not.toContain("Bearer ")
  })

  it("refuses to serialize fields that embed token-shaped values", () => {
    expect(() =>
      serializePublicApiRequestLog({
        method: "POST",
        route: "/api/oauth/token",
        status: 200,
        latencyMs: 1,
        tokenType: "client",
        appId: null,
        clientId: "dltx_at_should_not_be_a_client_id",
        userIdHash: null,
      }),
    ).toThrow(/leak a token-shaped value/)
  })

  it("logs a wrapped /api/v1 handler once with auth context and error code", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    const secret = "dltx_at_feedfacadeadbeefcafebabe01234567"

    const handler = withPublicApiRequestLog(async () => {
      setPublicApiRequestLogContext({
        tokenType: "oauth",
        appId: "app-42",
        clientId: "dltx_app_cafebabe0001",
        userId: "user_abc",
      })
      return apiError(401, "unauthorized", "Invalid or revoked access token")
    })

    const request = new NextRequest("https://example.test/api/v1/me", {
      headers: { Authorization: `Bearer ${secret}` },
    })

    const response = await handler(request, {})
    expect(response.status).toBe(401)
    expect(info).toHaveBeenCalledTimes(1)

    const line = String(info.mock.calls[0]?.[0])
    const parsed = JSON.parse(line) as Record<string, unknown>

    expect(parsed).toMatchObject({
      msg: "public_api_request",
      method: "GET",
      route: "/api/v1/me",
      status: 401,
      tokenType: "oauth",
      appId: "app-42",
      clientId: "dltx_app_cafebabe0001",
      userIdHash: hashUserIdForLog("user_abc"),
      errorCode: "unauthorized",
    })
    expect(line).not.toContain(secret)
    expect(line).not.toContain("user_abc")
  })

  it("does not log non-public API catch-all misses", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)

    const handler = withPublicApiRequestLog(async (request) =>
      jsonError({
        code: "not_found",
        message: "missing",
        hint: "check openapi",
        request,
      }),
    )

    const response = await handler(
      new NextRequest("https://example.test/api/ai/nope"),
      {},
    )
    expect(response.status).toBe(404)
    expect(info).not.toHaveBeenCalled()
  })

  it("turns unexpected handler throws into jsonError and still logs", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    const handler = withPublicApiRequestLog(async () => {
      throw new Error(`boom dltx_secret_0123456789abcdef0123456789abcdef`)
    })

    const response = await handler(
      new NextRequest("https://example.test/api/v1/accounts"),
      {},
    )
    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe("internal_error")

    expect(info).toHaveBeenCalledTimes(1)
    const line = String(info.mock.calls[0]?.[0])
    expect(line).toContain('"errorCode":"internal_error"')
    expect(line).not.toContain("dltx_secret_")
  })

  it("keeps OAuth unexpected errors on the RFC shape", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    const handler = withPublicApiRequestLog(async () => {
      throw new Error("boom")
    })

    const response = await handler(
      new NextRequest("https://example.test/api/oauth/token", { method: "POST" }),
      {},
    )
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: "server_error",
    })

    const line = String(info.mock.calls[0]?.[0])
    expect(line).toContain('"errorCode":"server_error"')
    expect(line).toContain('"/api/oauth/token"')
  })

  it("merges request-log context only inside the active ALS scope", () => {
    expect(() =>
      setPublicApiRequestLogContext({ userId: "outside" }),
    ).not.toThrow()

    const seen = runWithPublicApiRequestLogContext({ tokenType: "none" }, () => {
      setPublicApiRequestLogContext({
        tokenType: "pat",
        userId: "inside",
      })
      return buildPublicApiRequestLogFields({
        method: "GET",
        route: "/api/v1/me",
        status: 200,
        latencyMs: 1,
      })
    })

    expect(seen.tokenType).toBe("pat")
    expect(seen.userIdHash).toBe(hashUserIdForLog("inside"))

    // Outside the run the store is empty.
    expect(
      buildPublicApiRequestLogFields({
        method: "GET",
        route: "/api/v1/me",
        status: 200,
        latencyMs: 1,
      }).userIdHash,
    ).toBeNull()
  })
})
