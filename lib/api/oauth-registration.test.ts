import { describe, expect, it } from "vitest"
import { validateClientRegistration } from "./oauth-registration"

const redirect = "https://claude.ai/api/mcp/auth_callback"

describe("validateClientRegistration", () => {
  it("registers a public client and defaults to read scopes", () => {
    const parsed = validateClientRegistration({
      client_name: "Claude",
      redirect_uris: [redirect, "http://localhost:3118/callback"],
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.tokenEndpointAuthMethod).toBe("none")
    expect(parsed.value.scope).toEqual([
      "profile:read",
      "trades:read",
      "accounts:read",
      "connections:read",
      "metrics:read",
    ])
    expect(parsed.value.scope).not.toContain("trades:write")
  })

  it("rejects wildcards, cleartext off loopback, and unknown scopes", () => {
    expect(
      validateClientRegistration({
        client_name: "Claude",
        redirect_uris: ["https://claude.ai/*"],
      }).ok,
    ).toBe(false)
    expect(
      validateClientRegistration({
        client_name: "Claude",
        redirect_uris: ["http://evil.example/callback"],
      }).ok,
    ).toBe(false)
    const unknown = validateClientRegistration({
      client_name: "Claude",
      redirect_uris: [redirect],
      scope: "openid journal:read",
    })
    expect(unknown.ok).toBe(false)
  })

  it("accepts the known ChatGPT and Cursor redirect URIs", () => {
    const parsed = validateClientRegistration({
      client_name: "Cursor",
      redirect_uris: [
        "https://www.cursor.com/agents/mcp/oauth/callback",
        "http://localhost:8787/callback",
        "https://chatgpt.com/connector_platform_oauth_redirect",
        "https://chatgpt.com/connector/oauth/cb_123",
      ],
      token_endpoint_auth_method: "none",
    })
    expect(parsed.ok).toBe(true)
  })
})
