import { describe, expect, it } from "vitest"
import { audienceMatchesRequest, resourceIndicatorProblem } from "./oauth-resource"

const issuer = "https://www.deltalytix.app"

describe("resource indicator", () => {
  it("accepts only this issuer's MCP server", () => {
    expect(resourceIndicatorProblem(`${issuer}/api/mcp`, issuer)).toBeNull()
    expect(resourceIndicatorProblem(`${issuer}/api/mcp/`, issuer)).toBeNull()
    expect(resourceIndicatorProblem(`${issuer}/api/v1/trades`, issuer)).not.toBeNull()
    expect(resourceIndicatorProblem("https://evil.example/api/mcp", issuer)).not.toBeNull()
    expect(resourceIndicatorProblem(`${issuer}/api/mcp?x=1`, issuer)).not.toBeNull()
  })

  it("binds a token to the resource origin and path", () => {
    const request = new Request("https://www.deltalytix.app/api/mcp")
    expect(audienceMatchesRequest(`${issuer}/api/mcp`, request)).toBe(true)
    expect(audienceMatchesRequest(`${issuer}/api/mcp/`, request)).toBe(true)
    expect(
      audienceMatchesRequest(
        `${issuer}/api/mcp`,
        new Request("https://www.deltalytix.app/api/v1/trades"),
      ),
    ).toBe(false)
    expect(
      audienceMatchesRequest(`${issuer}/api/mcp`, new Request("http://localhost:3000/api/mcp")),
    ).toBe(false)
    expect(
      audienceMatchesRequest(`${issuer}/api/mcp`, new Request("https://evil.example/api/mcp")),
    ).toBe(false)
    expect(
      audienceMatchesRequest(
        `${issuer}/api/mcp`,
        new Request("https://www.deltalytix.app:8443/api/mcp"),
      ),
    ).toBe(false)
  })
})
