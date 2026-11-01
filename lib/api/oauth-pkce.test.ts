import { describe, expect, it } from "vitest"
import { authorizePkceProblem, isPublicOAuthClient } from "./oauth-pkce"

const challenge = "a".repeat(43)

describe("authorizePkceProblem", () => {
  it("requires S256 for a public client and keeps PKCE optional for a confidential client", () => {
    const publicClient = { tokenEndpointAuthMethod: "none", clientSecretHash: null }
    const confidential = {
      tokenEndpointAuthMethod: "client_secret_basic",
      clientSecretHash: "hash",
    }

    expect(isPublicOAuthClient(publicClient)).toBe(true)
    expect(isPublicOAuthClient(confidential)).toBe(false)
    expect(authorizePkceProblem(publicClient, undefined, undefined)).toMatch(/Public clients/)
    expect(authorizePkceProblem(publicClient, challenge, "plain")).toMatch(/S256/)
    expect(authorizePkceProblem(publicClient, challenge, "S256")).toBeNull()
    expect(authorizePkceProblem(confidential, undefined, undefined)).toBeNull()
    expect(authorizePkceProblem(confidential, challenge, "S256")).toBeNull()
    expect(authorizePkceProblem(confidential, challenge, "plain")).toMatch(/S256/)
  })
})
