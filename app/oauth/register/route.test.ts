import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { count, createAttempt, deleteMany, createApp } = vi.hoisted(() => ({
  count: vi.fn(),
  createAttempt: vi.fn(),
  deleteMany: vi.fn(),
  createApp: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthRegistrationAttempt: {
      count,
      create: createAttempt,
      deleteMany,
    },
    oAuthApp: { create: createApp },
  },
}))

import { POST } from "./route"

function post(body: unknown, ip = "203.0.113.10") {
  return POST(
    new NextRequest("https://www.deltalytix.app/oauth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "www.deltalytix.app",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    }),
  )
}

describe("POST /oauth/register", () => {
  beforeEach(() => {
    count.mockReset().mockResolvedValue(0)
    createAttempt.mockReset().mockResolvedValue({ id: "attempt" })
    deleteMany.mockReset().mockResolvedValue({ count: 0 })
    createApp.mockReset().mockResolvedValue({ createdAt: new Date("2026-04-02T00:00:00.000Z") })
  })

  it("registers a public client and does not return a secret", async () => {
    const response = await post({
      client_name: "Claude",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      token_endpoint_auth_method: "none",
    })
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.token_endpoint_auth_method).toBe("none")
    expect(body.client_id).toMatch(/^dltx_app_/)
    expect(body.client_secret).toBeUndefined()
    expect(body.redirect_uris).toEqual(["https://claude.ai/api/mcp/auth_callback"])
    expect(createApp).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
          name: "Claude",
          dynamicallyRegistered: true,
          tokenEndpointAuthMethod: "none",
          clientSecretHash: null,
        }),
      }),
    )
  })

  it("rate limits the tenth registration from one address", async () => {
    count.mockResolvedValue(10)
    const response = await post({
      client_name: "Claude",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
    })
    expect(response.status).toBe(429)
    expect(createApp).not.toHaveBeenCalled()
  })

  it("rejects a wildcard redirect URI", async () => {
    const response = await post({
      client_name: "Claude",
      redirect_uris: ["https://claude.ai/*"],
    })
    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("invalid_client_metadata")
    expect(createApp).not.toHaveBeenCalled()
  })
})
